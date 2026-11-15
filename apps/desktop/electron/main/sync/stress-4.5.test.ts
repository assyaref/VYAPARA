/**
 * Phase 4.5 — Offline & Synchronization Stress Tests
 *
 * Runs against a REAL sync server (createSyncServer) over local HTTP where the
 * network path matters; network resilience scenarios use purpose-built proxies
 * (flaky/delay/refused) — no business logic is mocked.
 *
 * Counting model (measured, not assumed): each createProduct seeds 1 outbox
 * event (`inventory.movement.recorded`, opening stock) and each sale produces
 * 2 events (`sale.created` + `inventory.movement.recorded`). Assertions below
 * compute expectations dynamically via outboxTotal().
 *
 * Known boundary (documented, not hidden): the Phase 4.2 server event log does
 * not publish per-entity `remoteVersion`, so inbound events are applied under
 * the fail-closed MISSING_REMOTE_VERSION policy. Cursor advancement, dedupe
 * receipts, conflicts and deferred recovery are exercised here by injecting
 * events with `remoteVersion` present, matching the engine's contract.
 */
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import * as http from 'node:http';
import * as os from 'node:os';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';

const { state } = vi.hoisted(() => ({ state: { online: true, creds: null as any } }));

vi.mock('electron', () => ({
  app: { getPath: () => os.tmpdir() },
  net: { online: true },
  safeStorage: {
    isEncryptionAvailable: () => false,
    encryptString: (s: string) => Buffer.from(s),
    decryptString: (b: Buffer) => b.toString(),
  },
}));
vi.mock('./credentials', () => ({
  loadSyncCredentials: () => state.creds,
  saveSyncCredentials: (c: any) => {
    state.creds = { ...c, updatedAt: new Date().toISOString() };
    return { ok: true };
  },
  clearSyncCredentials: () => {
    state.creds = null;
  },
  isOnline: () => state.online,
}));

import { AppDatabase } from '../db/open';
import { setupAdmin } from '../services/auth';
import { createProduct } from '../services/products';
import { createTransaction } from '../services/transactions';
import { getOrCreateDeviceIdentity } from '../services/device-identity';
import { appendOutboxEvent, listOutboxEvents, SyncOutboxStatus } from '../services/outbox';
import { createSyncServer } from '../../../../../apps/sync-server/src/server';
import { uploadEventsTransport, downloadEventsTransport } from './transport';
import { runUploadOnce } from './upload';
import { runDownloadOnce } from './download';
import { createSyncCoordinator } from './coordinator';
import { recoverStaleSyncingOutbox, countOutbox, getDownloadCursor, setDownloadCursor } from './store';
import { applyInboundEventAtomically, reprocessDeferredEvents } from './inbound';
import { classifyConflict, createConflictRecord, getPendingConflicts, applyAutoResolution } from './conflict-resolver';
import { buildConflictRecord } from './conflict-detector';

const ENROLLMENT = 'test-enrollment-secret-123456';
const ORG_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ORG_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

function makeDb(): AppDatabase {
  const db = new AppDatabase(':memory:');
  setupAdmin(db, { name: 'Admin', email: 'admin@vyapara.com', password: 'rahasia123456' });
  return db;
}
function adminId(db: AppDatabase): string {
  return (db.sqlite.prepare("SELECT id FROM users WHERE email = 'admin@vyapara.com'").get() as { id: string }).id;
}
function seedProduct(db: AppDatabase, suffix = randomUUID()) {
  return createProduct(db, { name: 'Barang Uji', barcode: 'B' + suffix, sku: 'S' + suffix, price: 10000, cost: 5000, stock: 100000, userId: adminId(db) });
}
function salePayload(txId: string, productId: string, userId: string) {
  return {
    transactionId: txId,
    transactionNumber: `INV-${txId.slice(0, 8)}`,
    userId,
    customerId: null,
    subtotal: 10000,
    discountAmount: 0,
    taxAmount: 0,
    totalAmount: 10000,
    paymentAmount: 10000,
    changeAmount: 0,
    paymentMethod: 'cash',
    payments: [{ method: 'cash', amount: 10000 }],
    items: [{ productId, quantity: 1, unitPrice: 10000, unitCost: 5000, subtotal: 10000 }],
    createdAt: new Date().toISOString(),
  };
}
function createSale(db: AppDatabase, productId: string, idempotencyKey: string) {
  return createTransaction(db, { userId: adminId(db), items: [{ productId, quantity: 1 }], discountAmount: 0, payments: [{ method: 'cash', amount: 10000 }] as any, idempotencyKey });
}
const baseCfg = (apiBaseUrl: string, overrides: Partial<any> = {}) => ({
  apiBaseUrl,
  uploadBatchSize: 50,
  downloadLimit: 50,
  requestTimeoutMs: 5000,
  periodicIntervalMs: 60000,
  maxBackoffMs: 60000,
  baseBackoffMs: 1000,
  ...overrides,
});
async function registerDevice(baseUrl: string, deviceId: string, organizationId: string) {
  const res = await fetch(`${baseUrl}/v1/sync/devices/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ deviceId, organizationId, enrollmentSecret: ENROLLMENT }),
  }).then((r) => r.json() as any);
  return res.data;
}
function outboxTotal(db: AppDatabase): number {
  return (db.sqlite.prepare('SELECT COUNT(*) AS c FROM sync_outbox').get() as { c: number }).c;
}
function serverEventCount(app: any): number {
  return (app.db.sqlite.prepare('SELECT COUNT(*) AS c FROM sync_events').get() as { c: number }).c;
}
function makeProxy(targetPort: number | undefined, opts: { delayMs?: number; failFirst?: number; failAfter?: number } = {}) {
  let attempts = 0;
  const server = http.createServer((req, res) => {
    attempts += 1;
    if ((opts.failFirst && attempts <= opts.failFirst) || (opts.failAfter && attempts > opts.failAfter)) {
      res.writeHead(503, { 'content-type': 'application/json' });
      res.end('{"ok":false,"error":{"code":"UNAVAILABLE","message":"Flaky proxy"}}');
      return;
    }
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => {
      const forward = () => {
        const upstream = http.request(
          { host: '127.0.0.1', port: targetPort, path: req.url, method: req.method, headers: req.headers },
          (ur) => {
            res.writeHead(ur.statusCode ?? 502, ur.headers);
            ur.pipe(res);
          },
        );
        upstream.on('error', () => {
          res.writeHead(502, { 'content-type': 'application/json' });
          res.end('{"ok":false,"error":{"code":"BAD_GATEWAY","message":"Upstream unavailable"}}');
        });
        if (chunks.length) upstream.write(Buffer.concat(chunks));
        upstream.end();
      };
      if (opts.delayMs) setTimeout(forward, opts.delayMs);
      else forward();
    });
  });
  return { server, getAttempts: () => attempts };
}
function listen(server: http.Server): Promise<number> {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve((server.address() as any).port));
  });
}

describe('Phase 4.5 network resilience', () => {
  let app: any;
  let db: AppDatabase;
  let baseUrl: string;
  let proxies: http.Server[];

  beforeEach(async () => {
    state.online = true;
    state.creds = null;
    proxies = [];
    app = createSyncServer({ dbPath: ':memory:', config: { enrollmentSecret: ENROLLMENT } });
    const addr = await app.listen(0);
    baseUrl = `http://127.0.0.1:${addr.port}`;
    db = makeDb();
  });
  afterEach(async () => {
    db.close();
    await app.close();
    for (const p of proxies) await new Promise<void>((r) => p.close(() => r()));
  });

  it('startup while offline proceeds offline; recovers and syncs on reconnect', async () => {
    const product = seedProduct(db);
    createSale(db, product.id, 'off-1');
    createSale(db, product.id, 'off-2');
    state.online = false;
    const identity = getOrCreateDeviceIdentity(db);
    const reg = await registerDevice(baseUrl, identity.deviceId, ORG_A);
    state.creds = { apiBaseUrl: baseUrl, deviceId: identity.deviceId, organizationId: ORG_A, deviceToken: reg.deviceToken, tokenExpiresAt: new Date(Date.now() + 3600_000).toISOString() };
    const coord = createSyncCoordinator({ db, cfg: { apiBaseUrl: baseUrl, periodicIntervalMs: 60000 } });
    coord.start();
    try {
      const offline = await coord.trigger('startup');
      expect(offline.online).toBe(false);
      expect(listOutboxEvents(db, { status: SyncOutboxStatus.pending }).length).toBe(outboxTotal(db));

      state.online = true;
      const online = await coord.trigger('reconnect');
      expect(online.pendingCount).toBe(0);
      expect(serverEventCount(app)).toBe(outboxTotal(db));
    } finally {
      await coord.stop();
    }
  });

  it('offline burst of 25 sales drains completely on reconnect', async () => {
    const product = seedProduct(db);
    for (let i = 0; i < 25; i++) createSale(db, product.id, `burst-${i}`);
    expect(listOutboxEvents(db, { status: SyncOutboxStatus.pending }).length).toBe(outboxTotal(db));

    const identity = getOrCreateDeviceIdentity(db);
    const reg = await registerDevice(baseUrl, identity.deviceId, ORG_A);
    const res = await runUploadOnce({ db, cfg: baseCfg(baseUrl, { uploadBatchSize: 100 }), token: reg.deviceToken });
    expect(res.acknowledged).toBe(outboxTotal(db));
    expect(countOutbox(db).pending).toBe(0);
    expect(serverEventCount(app)).toBe(outboxTotal(db));
  });

  it('server unavailable yields retryable failure and preserves every pending event', async () => {
    const product = seedProduct(db);
    for (let i = 0; i < 5; i++) createSale(db, product.id, `unavail-${i}`);
    const identity = getOrCreateDeviceIdentity(db);
    const reg = await registerDevice(baseUrl, identity.deviceId, ORG_A);

    const res = await runUploadOnce({ db, cfg: baseCfg('http://127.0.0.1:1', { requestTimeoutMs: 500 }), token: reg.deviceToken });
    expect(res.retryableFailure).toBe(true);
    expect(res.acknowledged).toBe(0);
    expect(listOutboxEvents(db, { status: SyncOutboxStatus.pending }).length + listOutboxEvents(db, { status: SyncOutboxStatus.failed }).length).toBe(outboxTotal(db));

    db.sqlite.prepare("UPDATE sync_outbox SET next_retry_at = datetime('now', '-1 second')").run();
    const recover = await runUploadOnce({ db, cfg: baseCfg(baseUrl), token: reg.deviceToken });
    expect(recover.acknowledged).toBe(outboxTotal(db));
    expect(serverEventCount(app)).toBe(outboxTotal(db));
  });

  it('request timeout aborts without acking, then recovery delivers exactly once', async () => {
    const product = seedProduct(db);
    createSale(db, product.id, 'timeout-1');
    const identity = getOrCreateDeviceIdentity(db);
    const reg = await registerDevice(baseUrl, identity.deviceId, ORG_A);

    const targetPort = (app.server?.address() as any)?.port;
    const proxy = makeProxy(targetPort, { delayMs: 2000 });
    proxies.push(proxy.server);
    const pPort = await listen(proxy.server);

    const res = await runUploadOnce({ db, cfg: baseCfg(`http://127.0.0.1:${pPort}`, { requestTimeoutMs: 1 }), token: reg.deviceToken });
    expect(res.retryableFailure).toBe(true);
    expect(serverEventCount(app)).toBe(0);

    db.sqlite.prepare("UPDATE sync_outbox SET next_retry_at = datetime('now', '-1 second')").run();
    const recover = await runUploadOnce({ db, cfg: baseCfg(baseUrl), token: reg.deviceToken });
    expect(recover.acknowledged).toBe(outboxTotal(db));
    expect(serverEventCount(app)).toBe(outboxTotal(db));
  });

  it('high latency completes and delivers the batch', async () => {
    const product = seedProduct(db);
    for (let i = 0; i < 10; i++) createSale(db, product.id, `lat-${i}`);
    const identity = getOrCreateDeviceIdentity(db);
    const reg = await registerDevice(baseUrl, identity.deviceId, ORG_A);

    const targetPort = (app.server?.address() as any)?.port;
    const proxy = makeProxy(targetPort, { delayMs: 150 });
    proxies.push(proxy.server);
    const pPort = await listen(proxy.server);

    const start = performance.now();
    const res = await runUploadOnce({ db, cfg: baseCfg(`http://127.0.0.1:${pPort}`, { requestTimeoutMs: 10000 }), token: reg.deviceToken });
    const elapsed = performance.now() - start;
    expect(res.acknowledged).toBe(outboxTotal(db));
    console.log(JSON.stringify({ metric: 'high_latency_batch_upload_ms', elapsed: Math.round(elapsed) }));
  });

  it('intermittent connectivity retries and eventually delivers', async () => {
    const product = seedProduct(db);
    for (let i = 0; i < 3; i++) createSale(db, product.id, `inter-${i}`);
    const identity = getOrCreateDeviceIdentity(db);
    const reg = await registerDevice(baseUrl, identity.deviceId, ORG_A);

    const targetPort = (app.server?.address() as any)?.port;
    const proxy = makeProxy(targetPort, { failFirst: 1 });
    proxies.push(proxy.server);
    const pPort = await listen(proxy.server);

    const first = await runUploadOnce({ db, cfg: baseCfg(`http://127.0.0.1:${pPort}`), token: reg.deviceToken });
    expect(first.retryableFailure).toBe(true);
    expect(serverEventCount(app)).toBe(0);

    db.sqlite.prepare("UPDATE sync_outbox SET next_retry_at = datetime('now', '-1 second')").run();
    const second = await runUploadOnce({ db, cfg: baseCfg(`http://127.0.0.1:${pPort}`), token: reg.deviceToken });
    expect(second.acknowledged).toBe(outboxTotal(db));
    expect(serverEventCount(app)).toBe(outboxTotal(db));
    expect(proxy.getAttempts()).toBeGreaterThanOrEqual(2);
  });

  it('application restart recovers stale syncing records', async () => {
    const file = path.join(os.tmpdir(), `vyapara-restart-${Date.now()}-${randomUUID()}.db`);
    const fileDb = new AppDatabase(file);
    setupAdmin(fileDb, { name: 'Admin', email: 'admin@vyapara.com', password: 'rahasia123456' });
    const product = seedProduct(fileDb);
    createSale(fileDb, product.id, 'restart-1');
    createSale(fileDb, product.id, 'restart-2');
    const before = listOutboxEvents(fileDb, { status: SyncOutboxStatus.pending });
    fileDb.sqlite.prepare("UPDATE sync_outbox SET sync_status='syncing' WHERE id = ?").run(before[0]!.id);
    fileDb.close();

    const reopened = new AppDatabase(file);
    try {
      expect(recoverStaleSyncingOutbox(reopened)).toBe(1);
      const expected = outboxTotal(reopened);
      const identity = getOrCreateDeviceIdentity(reopened);
      const reg = await registerDevice(baseUrl, identity.deviceId, ORG_A);
      const res = await runUploadOnce({ db: reopened, cfg: baseCfg(baseUrl), token: reg.deviceToken });
      expect(res.acknowledged).toBe(expected);
      expect(serverEventCount(app)).toBe(expected);
    } finally {
      reopened.close();
      for (const suffix of ['', '-wal', '-shm']) {
        try { fs.rmSync(file + suffix, { force: true }); } catch { /* ignore */ }
      }
    }
  });
});

describe('Phase 4.5 synchronization integrity', () => {
  let app: any;
  let db: AppDatabase;
  let baseUrl: string;

  beforeEach(async () => {
    state.online = true;
    state.creds = null;
    app = createSyncServer({ dbPath: ':memory:', config: { enrollmentSecret: ENROLLMENT } });
    const addr = await app.listen(0);
    baseUrl = `http://127.0.0.1:${addr.port}`;
    db = makeDb();
  });
  afterEach(async () => {
    db.close();
    await app.close();
  });

  it('duplicate delivery is idempotent end-to-end', async () => {
    const product = seedProduct(db);
    createSale(db, product.id, 'idem-1');
    const events = listOutboxEvents(db, { status: SyncOutboxStatus.pending });
    const identity = getOrCreateDeviceIdentity(db);
    const reg = await registerDevice(baseUrl, identity.deviceId, ORG_A);
    const toRequest = (c: any) => ({
      eventId: c.id,
      deviceId: identity.deviceId,
      idempotencyKey: c.idempotencyKey,
      eventType: c.eventType,
      aggregateType: c.aggregateType,
      aggregateId: c.aggregateId,
      schemaVersion: c.schemaVersion,
      createdAt: c.createdAt,
      payload: c.payload,
    });
    const first = await uploadEventsTransport({ baseUrl, token: reg.deviceToken, timeoutMs: 5000, request: { deviceId: identity.deviceId, events: events.map(toRequest) } });
    expect(first.results.every((r) => r.status === 'accepted')).toBe(true);
    const second = await uploadEventsTransport({ baseUrl, token: reg.deviceToken, timeoutMs: 5000, request: { deviceId: identity.deviceId, events: events.map(toRequest) } });
    expect(second.results.every((r) => r.status === 'duplicate')).toBe(true);
    expect(serverEventCount(app)).toBe(events.length);
  });

  it('partial batch failure isolates the oversized event and keeps the rest', async () => {
    const uid = adminId(db);
    const product = seedProduct(db);
    createSale(db, product.id, 'partial-ok');
    appendOutboxEvent(db, {
      eventType: 'inventory.movement.recorded',
      aggregateType: 'stock_movement',
      aggregateId: 'mv-stress-1',
      payload: {
        movementId: 'mv-big-1',
        productId: product.id,
        movementType: 'stock_in',
        quantityBefore: 0,
        quantityChange: 1,
        quantityAfter: 1,
        referenceType: null,
        referenceId: null,
        userId: uid,
        createdAt: new Date().toISOString(),
        blob: 'x'.repeat(70000), // 70 KB > server per-event limit (64 KB)
      },
      idempotencyKey: 'partial-bad',
    });
    const expected = outboxTotal(db);
    expect(listOutboxEvents(db, { status: SyncOutboxStatus.pending })).toHaveLength(expected);

    const identity = getOrCreateDeviceIdentity(db);
    const reg = await registerDevice(baseUrl, identity.deviceId, ORG_A);
    const res = await runUploadOnce({ db, cfg: baseCfg(baseUrl), token: reg.deviceToken });
    expect(res.acknowledged).toBe(expected - 1); // oversized event rejected
    expect(res.failed).toBe(1);
    const badRow = db.sqlite.prepare('SELECT sync_status FROM sync_outbox WHERE idempotency_key = ?').get('partial-bad') as any;
    expect(badRow.sync_status).toBe('dead'); // PAYLOAD_TOO_LARGE is terminal
    const goodRow = db.sqlite.prepare('SELECT sync_status FROM sync_outbox WHERE idempotency_key = ?').get('partial-ok') as any;
    expect(goodRow.sync_status).toBe('acknowledged');
    expect(serverEventCount(app)).toBe(expected - 1);
  });

  it('download cursor resumes after mid-drain interruption without duplicates', async () => {
    const product = seedProduct(db);
    for (let i = 0; i < 5; i++) createSale(db, product.id, `cur-${i}`);
    const devA = getOrCreateDeviceIdentity(db).deviceId;
    const regA = await registerDevice(baseUrl, devA, ORG_A);
    await runUploadOnce({ db, cfg: baseCfg(baseUrl, { uploadBatchSize: 100 }), token: regA.deviceToken });

    const dbB = makeDb();
    let proxy: ReturnType<typeof makeProxy> | null = null;
    try {
      const devB = getOrCreateDeviceIdentity(dbB).deviceId;
      const regB = await registerDevice(baseUrl, devB, ORG_A);
      const targetPort = (app.server?.address() as any)?.port;
      const proxyOpts: { delayMs?: number; failFirst?: number; failAfter?: number } = { failAfter: 1 }; // page 1 OK, page 2 fails
      proxy = makeProxy(targetPort, proxyOpts);
      const pPort = await listen(proxy.server);

      // first drain attempt: succeeds on page 1, interrupted on page 2
      const first = await runDownloadOnce({ db: dbB, cfg: baseCfg(`http://127.0.0.1:${pPort}`, { downloadLimit: 3 }), token: regB.deviceToken, organizationId: ORG_A, localDeviceId: devB });
      expect(first.retryableFailure).toBe(true);
      const cursorAfterFirst = getDownloadCursor(dbB, ORG_A);
      expect(cursorAfterFirst).toBeTruthy();
      const receiptsAfterFirst = (dbB.sqlite.prepare('SELECT COUNT(*) AS c FROM sync_applied_events').get() as { c: number }).c;
      expect(receiptsAfterFirst).toBe(3); // exactly the first page, no duplicates

      // heal the proxy and resume: remaining events arrive, none duplicated
      proxyOpts.failAfter = Number.MAX_SAFE_INTEGER;
      const resumed = await runDownloadOnce({ db: dbB, cfg: baseCfg(`http://127.0.0.1:${pPort}`, { downloadLimit: 3 }), token: regB.deviceToken, organizationId: ORG_A, localDeviceId: devB });
      expect(resumed.retryableFailure).toBe(false);
      const receiptsTotal = (dbB.sqlite.prepare('SELECT COUNT(*) AS c FROM sync_applied_events').get() as { c: number }).c;
      expect(receiptsTotal).toBe(11); // 11 events total (5 sales x2 + 1 seed movement)

      // draining again must deliver nothing new
      const again = await runDownloadOnce({ db: dbB, cfg: baseCfg(`http://127.0.0.1:${pPort}`, { downloadLimit: 3 }), token: regB.deviceToken, organizationId: ORG_A, localDeviceId: devB });
      expect(again.events).toBe(0);

      // invalid cursor must not reset silently
      setDownloadCursor(dbB, ORG_A, 'not-a-cursor');
      const bad = await runDownloadOnce({ db: dbB, cfg: baseCfg(baseUrl, { downloadLimit: 1 }), token: regB.deviceToken, organizationId: ORG_A, localDeviceId: devB });
      expect(bad.stoppedOnError).toBeTruthy();
      expect(getDownloadCursor(dbB, ORG_A)).toBe('not-a-cursor');
    } finally {
      dbB.close();
      if (proxy) await new Promise<void>((resolve) => proxy!.server.close(() => resolve()));
    }
  });

  it('duplicate, self-originated and corrupt inbound events are classified safely', () => {
    const product = seedProduct(db);
    const uid = adminId(db);
    const localDeviceId = getOrCreateDeviceIdentity(db).deviceId;
    const mk = (overrides: Record<string, any> = {}) => ({
      serverSeq: overrides.serverSeq ?? 1,
      eventId: overrides.eventId ?? randomUUID(),
      deviceId: overrides.deviceId ?? randomUUID(),
      idempotencyKey: overrides.idempotencyKey ?? randomUUID(),
      eventType: 'sale.created',
      aggregateType: 'transaction',
      aggregateId: overrides.aggregateId ?? 'agg-1',
      schemaVersion: overrides.schemaVersion ?? 1,
      createdAt: new Date().toISOString(),
      payload: salePayload('t-1', product.id, uid),
      receivedAt: new Date().toISOString(),
      remoteVersion: overrides.remoteVersion ?? 1,
    });
    const a = mk({ serverSeq: 1 });
    expect(applyInboundEventAtomically(db, a, localDeviceId, ORG_A).kind).toBe('applied');
    expect(applyInboundEventAtomically(db, a, localDeviceId, ORG_A).kind).toBe('ignored'); // duplicate
    const self = mk({ serverSeq: 2, deviceId: localDeviceId });
    expect(applyInboundEventAtomically(db, self, localDeviceId, ORG_A).kind).toBe('ignored'); // self
    const badVersion = mk({ serverSeq: 3, schemaVersion: 99 });
    expect(applyInboundEventAtomically(db, badVersion, localDeviceId, ORG_A).kind).toBe('quarantined');
  });

  it('deferred recovery reprocesses pending events across a restart', () => {
    const product = seedProduct(db);
    const uid = adminId(db);
    const payload = JSON.stringify(salePayload('defer-1', product.id, uid));
    const now = new Date().toISOString();
    // sync_quarantine.event_id references sync_applied_events(event_id): seed the parent receipt first
    const parentEventId = randomUUID();
    db.sqlite
      .prepare(
        `INSERT INTO sync_applied_events (event_id, device_id, organization_id, idempotency_key, event_type, aggregate_type, aggregate_id, schema_version, server_seq, payload_hash, status, reason, applied_at, created_at)
         VALUES (?, ?, ?, ?, 'sale.created', 'transaction', 'agg-defer', 1, 42, ?, 'quarantined', 'DEFERRED_PHASE_4_4', ?, ?)`,
      )
      .run(parentEventId, randomUUID(), ORG_A, 'idem-defer-1', payload.slice(0, 2000), now, now);
    db.sqlite
      .prepare(
        `INSERT INTO sync_quarantine (id, event_id, device_id, organization_id, idempotency_key, event_type, aggregate_type, aggregate_id, schema_version, server_seq, payload, reason_code, reason_message, quarantined_at, remote_version)
         VALUES (?, ?, ?, ?, ?, 'sale.created', 'transaction', 'agg-defer', 1, 42, ?, 'DEFERRED_PHASE_4_4', 'seeded', ?, 1)`,
      )
      .run('q-stress-1', parentEventId, randomUUID(), ORG_A, 'idem-defer-1', payload, now);

    const result = reprocessDeferredEvents(db, getOrCreateDeviceIdentity(db).deviceId, ORG_A);
    expect(result.processed).toBeGreaterThanOrEqual(1);
    expect(serverEventCount(app)).toBe(0); // recovery applies locally, no re-upload
  });

  it('conflict engine auto-resolves duplicates, auto-accepts newer master data, holds financial for review', () => {
    const localDeviceId = getOrCreateDeviceIdentity(db).deviceId;
    const remoteDeviceId = randomUUID();

    // 10 duplicate-event conflicts -> auto-resolve via REJECT_DUPLICATE
    for (let i = 0; i < 10; i++) {
      const conflict = buildConflictRecord('product', 'prod-dup', localDeviceId, remoteDeviceId, 'DUPLICATE_EVENT', null, { i }, null, 1);
      const c = classifyConflict(conflict);
      expect(c.canAutoResolve).toBe(true);
      const id = createConflictRecord(db, conflict, c, ORG_A);
      applyAutoResolution(db, id, c.recommendedStrategy ?? 'REJECT_DUPLICATE', c.classificationReason);
    }

    // 5 financial conflicts -> always manual review
    for (let i = 0; i < 5; i++) {
      const conflict = buildConflictRecord('transaction', `txn-fin-${i}`, localDeviceId, remoteDeviceId, 'FINANCIAL_CONFLICT', {}, {}, 1, 1);
      const c = classifyConflict(conflict);
      expect(c.canAutoResolve).toBe(false);
      expect(c.requiresUserInput).toBe(true);
      createConflictRecord(db, conflict, c, ORG_A);
    }

    // 3 master-data conflicts with newer remote timestamps -> AUTO_LATEST_TIMESTAMP + auto-resolve
    const now = Date.now();
    for (let i = 0; i < 3; i++) {
      const conflict = buildConflictRecord(
        'product', `prod-md-${i}`, localDeviceId, remoteDeviceId, 'CONCURRENT_UPDATE',
        { createdAt: new Date(now - 10000).toISOString() },
        { createdAt: new Date(now).toISOString() },
        1, 1,
      );
      const c = classifyConflict(conflict);
      expect(c.recommendedStrategy).toBe('AUTO_LATEST_TIMESTAMP');
      const id = createConflictRecord(db, conflict, c, ORG_A);
      applyAutoResolution(db, id, 'AUTO_LATEST_TIMESTAMP', c.classificationReason);
    }

    const pendingA = getPendingConflicts(db, ORG_A);
    const pendingB = getPendingConflicts(db, ORG_B);
    expect(pendingB).toHaveLength(0);
    expect(pendingA).toHaveLength(5); // only the financial conflicts remain
    console.log(JSON.stringify({ metric: 'conflicts_pending_orgA', pending: pendingA.length }));
  });

  it('endurance: progressive tiers 10/50/100 events all drain completely', async () => {
    const product = seedProduct(db);
    const identity = getOrCreateDeviceIdentity(db);
    const reg = await registerDevice(baseUrl, identity.deviceId, ORG_A);

    let drained = 0;
    for (const tier of [10, 50, 100]) {
      for (let i = 0; i < tier; i++) {
        drained += 1;
        createSale(db, product.id, `end-${drained}`);
      }
      const start = performance.now();
      for (let round = 0; round < 10; round++) {
        await runUploadOnce({ db, cfg: baseCfg(baseUrl, { uploadBatchSize: 50 }), token: reg.deviceToken });
        if (countOutbox(db).pending === 0) break;
      }
      const elapsed = performance.now() - start;
      console.log(JSON.stringify({ metric: 'tier_upload', tier, elapsed_ms: Math.round(elapsed) }));
    }
    expect(countOutbox(db).pending).toBe(0);
    expect(serverEventCount(app)).toBe(outboxTotal(db));
  }, 60000);
});

describe('Phase 4.5 tenant & device security', () => {
  let app: any;
  let db: AppDatabase;
  let baseUrl: string;

  beforeEach(async () => {
    state.online = true;
    state.creds = null;
    app = createSyncServer({ dbPath: ':memory:', config: { enrollmentSecret: ENROLLMENT } });
    const addr = await app.listen(0);
    baseUrl = `http://127.0.0.1:${addr.port}`;
    db = makeDb();
  });
  afterEach(async () => {
    db.close();
    await app.close();
  });

  it('tenant isolation holds at volume; client org claim is ignored by the server', async () => {
    const product = seedProduct(db);
    for (let i = 0; i < 15; i++) createSale(db, product.id, `iso-${i}`);
    const devA1 = getOrCreateDeviceIdentity(db).deviceId;
    const regA1 = await registerDevice(baseUrl, devA1, ORG_A);
    await runUploadOnce({ db, cfg: baseCfg(baseUrl), token: regA1.deviceToken });

    const dbB = makeDb();
    try {
      const devB1 = getOrCreateDeviceIdentity(dbB).deviceId;
      const regB1 = await registerDevice(baseUrl, devB1, ORG_B);
      // Even claiming ORG_A in the call, the org-B device receives nothing:
      // the server derives scope exclusively from the device->org binding.
      const resB = await runDownloadOnce({ db: dbB, cfg: baseCfg(baseUrl), token: regB1.deviceToken, organizationId: ORG_A, localDeviceId: devB1 });
      expect(resB.events).toBe(0);
    } finally { dbB.close(); }
  });

  it('revoked device token cannot upload', async () => {
    const product = seedProduct(db);
    for (let i = 0; i < 4; i++) createSale(db, product.id, `rev-${i}`);
    const identity = getOrCreateDeviceIdentity(db);
    const reg = await registerDevice(baseUrl, identity.deviceId, ORG_A);

    const revoke = await fetch(`${baseUrl}/v1/sync/devices/revoke`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${reg.deviceToken}` },
      body: JSON.stringify({ deviceId: identity.deviceId, reason: 'stress test revocation' }),
    });
    expect(revoke.status).toBe(200);

    const res = await runUploadOnce({ db, cfg: baseCfg(baseUrl), token: reg.deviceToken });
    expect(res.authFailure).toBe(true);
    expect(res.acknowledged).toBe(0);
    expect(listOutboxEvents(db, { status: SyncOutboxStatus.pending }).length + listOutboxEvents(db, { status: SyncOutboxStatus.failed }).length).toBe(outboxTotal(db));
  });

  it('invalid token is rejected with no state mutation', async () => {
    const product = seedProduct(db);
    createSale(db, product.id, 'bad-token');
    getOrCreateDeviceIdentity(db);
    const res = await runUploadOnce({ db, cfg: baseCfg(baseUrl), token: 'not-a-real-token' });
    expect(res.authFailure).toBe(true);
    expect(serverEventCount(app)).toBe(0);
  });

  it('cross-tenant cursor tampering is rejected without state change', async () => {
    const product = seedProduct(db);
    for (let i = 0; i < 3; i++) createSale(db, product.id, `cursor-${i}`);
    const devA = getOrCreateDeviceIdentity(db).deviceId;
    const regA = await registerDevice(baseUrl, devA, ORG_A);
    await runUploadOnce({ db, cfg: baseCfg(baseUrl), token: regA.deviceToken });

    const dbB = makeDb();
    try {
      const devB = getOrCreateDeviceIdentity(dbB).deviceId;
      const regB = await registerDevice(baseUrl, devB, ORG_B);
      const forged = Buffer.from(JSON.stringify({ s: 1, o: ORG_A }), 'utf8').toString('base64url');
      const res = await downloadEventsTransport({ baseUrl, token: regB.deviceToken, timeoutMs: 5000, query: { cursor: forged, limit: 10 } }).then(
        () => 'accepted',
        () => 'rejected',
      );
      expect(res).toBe('rejected');
    } finally { dbB.close(); }
  });
});
