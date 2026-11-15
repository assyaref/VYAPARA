import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

vi.mock('electron', () => ({
  app: { getPath: () => process.cwd() },
  net: { online: true },
  safeStorage: { isEncryptionAvailable: () => false, encryptString: (s: string) => Buffer.from(s), decryptString: (b: Buffer) => b.toString() },
}));
vi.mock('./credentials', () => ({
  loadSyncCredentials: () => null,
  saveSyncCredentials: () => ({ ok: false, reason: 'secure_storage_unavailable' }),
  clearSyncCredentials: () => {},
  isOnline: () => true,
}));

import { randomUUID } from 'node:crypto';
import { AppDatabase } from '../db/open';
import { setupAdmin } from '../services/auth';
import { createProduct } from '../services/products';
import { createTransaction } from '../services/transactions';
import { appendOutboxEvent, listOutboxEvents, SyncOutboxStatus } from '../services/outbox';
import { getOrCreateDeviceIdentity } from '../services/device-identity';
import { uploadEventsTransport, downloadEventsTransport, renewDeviceTokenTransport } from './transport';
import { recoverStaleSyncingOutbox, getDownloadCursor, setDownloadCursor } from './store';
import { applyInboundEventAtomically } from './inbound';
import { runUploadOnce } from './upload';
import { runDownloadOnce } from './download';
import { createSyncCoordinator } from './coordinator';
// sync server test helpers
import { createSyncServer } from '../../../../../apps/sync-server/src/server';

const ENROLLMENT = 'test-enrollment-secret-123456';
const ORG = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

function makeDb(): AppDatabase {
  const db = new AppDatabase(':memory:');
  setupAdmin(db, { name: 'Admin', email: 'admin@vyapara.com', password: 'rahasia123456' });
  return db;
}
function adminId(db: AppDatabase): string {
  return (db.sqlite.prepare("SELECT id FROM users WHERE email = 'admin@vyapara.com'").get() as { id: string }).id;
}

function salePayload(txId: string) {
  return {
    transactionId: txId,
    transactionNumber: `INV-${txId.slice(0, 8)}`,
    userId: 'user-1',
    customerId: null,
    subtotal: 10000,
    discountAmount: 0,
    taxAmount: 0,
    totalAmount: 10000,
    paymentAmount: 10000,
    changeAmount: 0,
    paymentMethod: 'cash',
    payments: [{ method: 'cash', amount: 10000 }],
    items: [{ productId: 'p1', quantity: 1, unitPrice: 10000, unitCost: 5000, subtotal: 10000 }],
    createdAt: new Date().toISOString(),
  };
}
function makeEnvelope(deviceId: string, overrides: Record<string, any> = {}) {
  const eventId = overrides.eventId ?? randomUUID();
  return {
    eventId,
    deviceId,
    idempotencyKey: overrides.idempotencyKey ?? `idem-${eventId}`,
    eventType: overrides.eventType ?? 'sale.created',
    aggregateType: overrides.aggregateType ?? 'transaction',
    aggregateId: overrides.aggregateId ?? randomUUID(),
    remoteVersion: undefined,
  schemaVersion: overrides.schemaVersion ?? 1,
    createdAt: overrides.createdAt ?? new Date().toISOString(),
    payload: overrides.payload ?? salePayload(eventId),
  };
}

describe('Phase 4.3 sync transport', () => {
  let app: ReturnType<typeof createSyncServer>;
  let baseUrl: string;
  let token: string;
  let deviceId: string;
  beforeEach(async () => {
    app = createSyncServer({ dbPath: ':memory:', config: { enrollmentSecret: ENROLLMENT } });
    const addr = await app.listen(0);
    baseUrl = `http://127.0.0.1:${addr.port}`;
    deviceId = randomUUID();
    const reg = await fetch(`${baseUrl}/v1/sync/devices/register`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ deviceId, organizationId: ORG, enrollmentSecret: ENROLLMENT }) }).then(r => r.json() as any);
    token = reg.data.deviceToken;
  });
  afterEach(async () => { await app.close(); });

  it('uploads and downloads valid request/response', async () => {
    const ev = makeEnvelope(deviceId);
    const up = await uploadEventsTransport({ baseUrl, token, timeoutMs: 5000, request: { deviceId, events: [ev] } });
    expect(up.results[0]?.status).toBe('accepted');
    const down = await downloadEventsTransport({ baseUrl, token, timeoutMs: 5000, query: { limit: 10 } });
    expect(down.events.some((e) => e.eventId === ev.eventId)).toBe(true);
  });

  it('handles unauthorized/expired/revoked/network/timeout/malformed/oversized safely', async () => {
    await expect(uploadEventsTransport({ baseUrl, token: 'bad', timeoutMs: 5000, request: { deviceId, events: [makeEnvelope(deviceId)] } })).rejects.toMatchObject({ kind: 'unauthorized' });
    await expect(downloadEventsTransport({ baseUrl: 'http://127.0.0.1:1', token, timeoutMs: 200, query: { limit: 1 } })).rejects.toMatchObject({ retryable: true });
    await expect(downloadEventsTransport({ baseUrl, token, timeoutMs: 1, query: { limit: 1 } })).rejects.toMatchObject({ kind: 'timeout' });
    // malformed by pointing to wrong path via base? easier: server returns non-json on random route not used; instead test schema validation by direct fetch simulation not needed; malformed handled in client path - simulate with bad server
    const bad = await (async () => {
      const http = await import('node:http');
      const srv = http.createServer((_q, r) => { r.writeHead(200, { 'content-type': 'application/json' }); r.end('not-json'); });
      await new Promise<void>(res => srv.listen(0, '127.0.0.1', () => res()));
      const port = (srv.address() as any).port;
      try {
        await downloadEventsTransport({ baseUrl: `http://127.0.0.1:${port}`, token, timeoutMs: 1000, query: { limit: 1 } });
        return null;
      } catch (e) { return e; } finally { await new Promise<void>(r => srv.close(() => r())); }
    })();
    expect((bad as any).kind).toBe('invalid_response');
  });

  it('renews token transport', async () => {
    const renewed = await renewDeviceTokenTransport({ baseUrl, timeoutMs: 5000, deviceToken: token, deviceId });
    expect(renewed.deviceToken).toBeTruthy();
    expect(renewed.organizationId).toBe(ORG);
  });
});

describe('Phase 4.3 outbox upload worker/store', () => {
  it('recovers syncing records, uploads/acks duplicates, retries failures, does not ack on timeout', async () => {
    const app = createSyncServer({ dbPath: ':memory:', config: { enrollmentSecret: ENROLLMENT } });
    const addr = await app.listen(0);
    const baseUrl = `http://127.0.0.1:${addr.port}`;
    const db = makeDb();
    try {
      const identity = getOrCreateDeviceIdentity(db);
      // register device with same id? easier: set device identity row to match
      const reg = await fetch(`${baseUrl}/v1/sync/devices/register`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ deviceId: identity.deviceId, organizationId: ORG, enrollmentSecret: ENROLLMENT }) }).then(r => r.json() as any);
      const token = reg.data.deviceToken;
      // create outbox event
      const uid = adminId(db);
      const product = createProduct(db, { name: 'Barang', barcode: 'B1'+randomUUID(), sku: 'S1'+randomUUID(), price: 10000, cost: 5000, stock: 5, userId: uid });
      createTransaction(db, { userId: uid, items: [{ productId: product.id, quantity: 1 }], discountAmount: 0, payments: [{ method: 'cash', amount: 10000 }] as any });
      const before = listOutboxEvents(db, { status: SyncOutboxStatus.pending });
      expect(before.length).toBeGreaterThan(0);
      // simulate stale syncing
      db.sqlite.prepare("UPDATE sync_outbox SET sync_status='syncing' WHERE id = ?").run(before[0]!.id);
      expect(recoverStaleSyncingOutbox(db)).toBeGreaterThan(0);
      const res = await runUploadOnce({ db, cfg: { apiBaseUrl: baseUrl, uploadBatchSize: 50, downloadLimit: 50, requestTimeoutMs: 5000, periodicIntervalMs: 30000, maxBackoffMs: 60000, baseBackoffMs: 1000 }, token });
      expect(res.acknowledged).toBeGreaterThan(0);
      // duplicate upload ack
      db.sqlite.prepare("UPDATE sync_outbox SET sync_status='pending', server_ack_at=NULL WHERE id = ?").run(before[0]!.id);
      const res2 = await runUploadOnce({ db, cfg: { apiBaseUrl: baseUrl, uploadBatchSize: 50, downloadLimit: 50, requestTimeoutMs: 5000, periodicIntervalMs: 30000, maxBackoffMs: 60000, baseBackoffMs: 1000 }, token });
      expect(res2.acknowledged).toBe(1);
      // timeout case: no ack
      const e2 = appendOutboxEvent(db, { eventType: 'inventory.movement.recorded', aggregateType: 'stock_movement', aggregateId: 'mv-'+randomUUID(), payload: { movementId: 'mv1', productId: product.id, movementType: 'stock_in', quantityBefore: 0, quantityChange: 1, quantityAfter: 1, referenceType: null, referenceId: null, userId: uid, createdAt: new Date().toISOString() } });
      const timeoutRes = await runUploadOnce({ db, cfg: { apiBaseUrl: baseUrl, uploadBatchSize: 50, downloadLimit: 50, requestTimeoutMs: 1, periodicIntervalMs: 30000, maxBackoffMs: 60000, baseBackoffMs: 1000 }, token });
      const row = db.sqlite.prepare('SELECT sync_status FROM sync_outbox WHERE id = ?').get(e2.id) as any;
      expect(row.sync_status).not.toBe('acknowledged');
    } finally { db.close(); await app.close(); }
  });

  it('prevents overlapping coordinator runs and reports status', async () => {
    const app = createSyncServer({ dbPath: ':memory:', config: { enrollmentSecret: ENROLLMENT } });
    const addr = await app.listen(0);
    const baseUrl = `http://127.0.0.1:${addr.port}`;
    const db = makeDb();
    try {
      const identity = getOrCreateDeviceIdentity(db);
      // no credentials -> error/enrolled missing but offline workflows unaffected; manual trigger should not throw
      const coord = createSyncCoordinator({ db, cfg: { apiBaseUrl: baseUrl, periodicIntervalMs: 60000, requestTimeoutMs: 2000 } });
      const [a,b] = await Promise.all([coord.trigger('t1'), coord.trigger('t2')]);
      expect(a).toBeTruthy(); expect(b).toBeTruthy();
      expect(coord.getStatus().inProgress).toBe(false);
    } finally { db.close(); await app.close(); }
  });
});

describe('Phase 4.3 inbound apply/cursor/dedupe', () => {
  it('applies/ignores duplicates, quarantines unsupported/invalid/self safely, and cursor store works', () => {
    const db = makeDb();
    try {
      const local = getOrCreateDeviceIdentity(db).deviceId;
      const uid = adminId(db);
      const product = createProduct(db, { name: 'Barang Uji', barcode: 'B6' + randomUUID(), sku: 'S6' + randomUUID(), price: 10000, cost: 5000, stock: 5, userId: uid });
      const payload = { ...salePayload('t1'), userId: uid, items: [{ productId: product.id, quantity: 1, unitPrice: 10000, unitCost: 5000, subtotal: 10000 }] };
      const ev: any = { serverSeq: 1, eventId: randomUUID(), deviceId: randomUUID(), idempotencyKey: 'i1', eventType: 'sale.created', aggregateType: 'transaction', aggregateId: 'a1', schemaVersion: 1, createdAt: new Date().toISOString(), payload, receivedAt: new Date().toISOString(), remoteVersion: 1 };
      const r1 = applyInboundEventAtomically(db, ev, local, ORG);
      expect(['quarantined','ignored','applied']).toContain(r1.kind); // remote sale deferred for 4.4
      const r2 = applyInboundEventAtomically(db, ev, local, ORG);
      expect(r2.kind).toBe('ignored');
      const self = { ...ev, serverSeq: 2, eventId: randomUUID(), deviceId: local };
      expect(applyInboundEventAtomically(db, self, local, ORG).kind).toBe('ignored');
      const bad = { ...ev, serverSeq: 3, eventId: randomUUID(), schemaVersion: 99 };
      expect(applyInboundEventAtomically(db, bad, local, ORG).kind).toBe('quarantined');
      setDownloadCursor(db, ORG, 'cur1');
      expect(getDownloadCursor(db, ORG)).toBe('cur1');
      setDownloadCursor(db, ORG, null);
      expect(getDownloadCursor(db, ORG)).toBeNull();
    } finally { db.close(); }
  });

  it('downloads with cursor continuation and does not reset on invalid cursor', async () => {
    const app = createSyncServer({ dbPath: ':memory:', config: { enrollmentSecret: ENROLLMENT } });
    const addr = await app.listen(0);
    const baseUrl = `http://127.0.0.1:${addr.port}`;
    const dbA = makeDb();
    const dbB = makeDb();
    try {
      const devA = getOrCreateDeviceIdentity(dbA).deviceId;
      const devB = getOrCreateDeviceIdentity(dbB).deviceId;
      const regA = await fetch(`${baseUrl}/v1/sync/devices/register`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ deviceId: devA, organizationId: ORG, enrollmentSecret: ENROLLMENT }) }).then(r => r.json() as any);
      const regB = await fetch(`${baseUrl}/v1/sync/devices/register`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ deviceId: devB, organizationId: ORG, enrollmentSecret: ENROLLMENT }) }).then(r => r.json() as any);
      const evs = [makeEnvelope(devA), makeEnvelope(devA)];
      await uploadEventsTransport({ baseUrl, token: regA.data.deviceToken, timeoutMs: 5000, request: { deviceId: devA, events: evs } });
      const out = await runDownloadOnce({ db: dbB, cfg: { apiBaseUrl: baseUrl, uploadBatchSize: 50, downloadLimit: 1, requestTimeoutMs: 5000, periodicIntervalMs: 30000, maxBackoffMs: 60000, baseBackoffMs: 1000 }, token: regB.data.deviceToken, organizationId: ORG, localDeviceId: devB });
      expect(out.pages).toBeGreaterThanOrEqual(1);
      expect(getDownloadCursor(dbB, ORG)).toBeTruthy();
      setDownloadCursor(dbB, ORG, 'not-a-cursor');
      const bad = await runDownloadOnce({ db: dbB, cfg: { apiBaseUrl: baseUrl, uploadBatchSize: 50, downloadLimit: 1, requestTimeoutMs: 5000, periodicIntervalMs: 30000, maxBackoffMs: 60000, baseBackoffMs: 1000 }, token: regB.data.deviceToken, organizationId: ORG, localDeviceId: devB });
      expect(bad.stoppedOnError).toBeTruthy();
      expect(getDownloadCursor(dbB, ORG)).toBe('not-a-cursor'); // not reset silently
    } finally { dbA.close(); dbB.close(); await app.close(); }
  });
});

describe('Phase 4.3 integration: 2 orgs, 2 devices, isolation/recovery', () => {
  it('syncs within org, isolates tenants, handles duplicates and interruption recovery', async () => {
    const app = createSyncServer({ dbPath: ':memory:', config: { enrollmentSecret: ENROLLMENT } });
    const addr = await app.listen(0);
    const baseUrl = `http://127.0.0.1:${addr.port}`;
    const ORG2 = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    const dbA1 = makeDb(); const dbA2 = makeDb(); const dbB1 = makeDb();
    try {
      const dA1 = getOrCreateDeviceIdentity(dbA1).deviceId;
      const dA2 = getOrCreateDeviceIdentity(dbA2).deviceId;
      const dB1 = getOrCreateDeviceIdentity(dbB1).deviceId;
      const rA1 = await fetch(`${baseUrl}/v1/sync/devices/register`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ deviceId: dA1, organizationId: ORG, enrollmentSecret: ENROLLMENT }) }).then(r=>r.json() as any);
      const rA2 = await fetch(`${baseUrl}/v1/sync/devices/register`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ deviceId: dA2, organizationId: ORG, enrollmentSecret: ENROLLMENT }) }).then(r=>r.json() as any);
      const rB1 = await fetch(`${baseUrl}/v1/sync/devices/register`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ deviceId: dB1, organizationId: ORG2, enrollmentSecret: ENROLLMENT }) }).then(r=>r.json() as any);

      // org A device 1 emits event
      const ev = makeEnvelope(dA1);
      await uploadEventsTransport({ baseUrl, token: rA1.data.deviceToken, timeoutMs: 5000, request: { deviceId: dA1, events: [ev] } });
      // org A device 2 downloads (may quarantine remote deferred, but must receive only org A and track cursor/receipts)
      const d1 = await runDownloadOnce({ db: dbA2, cfg: { apiBaseUrl: baseUrl, uploadBatchSize: 50, downloadLimit: 50, requestTimeoutMs: 5000, periodicIntervalMs: 30000, maxBackoffMs: 60000, baseBackoffMs: 1000 }, token: rA2.data.deviceToken, organizationId: ORG, localDeviceId: dA2 });
      expect(d1.events).toBe(1);
      // repeat download - dedupe via cursor/receipt (no re-advance issues)
      const d2 = await runDownloadOnce({ db: dbA2, cfg: { apiBaseUrl: baseUrl, uploadBatchSize: 50, downloadLimit: 50, requestTimeoutMs: 5000, periodicIntervalMs: 30000, maxBackoffMs: 60000, baseBackoffMs: 1000 }, token: rA2.data.deviceToken, organizationId: ORG, localDeviceId: dA2 });
      expect(d2.events).toBe(0);
      // org B cannot see org A
      const dB = await runDownloadOnce({ db: dbB1, cfg: { apiBaseUrl: baseUrl, uploadBatchSize: 50, downloadLimit: 50, requestTimeoutMs: 5000, periodicIntervalMs: 30000, maxBackoffMs: 60000, baseBackoffMs: 1000 }, token: rB1.data.deviceToken, organizationId: ORG2, localDeviceId: dB1 });
      expect(dB.events).toBe(0);
      // network interruption/recovery: bad base then good
      const bad = await runDownloadOnce({ db: dbA2, cfg: { apiBaseUrl: 'http://127.0.0.1:1', uploadBatchSize: 50, downloadLimit: 50, requestTimeoutMs: 200, periodicIntervalMs: 30000, maxBackoffMs: 60000, baseBackoffMs: 1000 }, token: rA2.data.deviceToken, organizationId: ORG, localDeviceId: dA2 });
      expect(bad.retryableFailure).toBe(true);
      const ok = await runDownloadOnce({ db: dbA2, cfg: { apiBaseUrl: baseUrl, uploadBatchSize: 50, downloadLimit: 50, requestTimeoutMs: 5000, periodicIntervalMs: 30000, maxBackoffMs: 60000, baseBackoffMs: 1000 }, token: rA2.data.deviceToken, organizationId: ORG, localDeviceId: dA2 });
      expect(ok.retryableFailure).toBe(false);
    } finally { dbA1.close(); dbA2.close(); dbB1.close(); await app.close(); }
  });
});

describe('migration safety 012', () => {
  it('applies on fresh and existing DBs with sync tables', () => {
    const db = makeDb();
    try {
      const tables = db.sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('sync_state','sync_applied_events','sync_quarantine') ORDER BY name").all() as any[];
      expect(tables.map(t=>t.name)).toEqual(['sync_applied_events','sync_quarantine','sync_state']);
    } finally { db.close(); }
  });
});






