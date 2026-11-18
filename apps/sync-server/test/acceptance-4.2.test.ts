import { describe, expect, it, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { createSyncServer } from '../src/server.js';
import { openSyncServerDb } from '../src/db/open.js';
import { encodeCursor } from 'vyapara-shared';

const require = createRequire(import.meta.url);
let DatabaseCtor: any;
try { DatabaseCtor = require('better-sqlite3'); } catch { DatabaseCtor = require(path.resolve(process.cwd(), 'apps/desktop/node_modules/better-sqlite3')); }

const ENROLLMENT = 'test-enrollment-secret-123456';
const ORG = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ORG2 = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const DEV = '11111111-1111-4111-8111-111111111111';
const DEV2 = '22222222-2222-4222-8222-222222222222';
const LEGACY_DEFAULT_ORG = '00000000-0000-4000-8000-000000000001';

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
function makeEvent(deviceId: string, overrides: Record<string, any> = {}) {
  const eventId = overrides.eventId ?? randomUUID();
  return {
    eventId,
    deviceId,
    idempotencyKey: overrides.idempotencyKey ?? `idem-${eventId}`,
    eventType: overrides.eventType ?? 'sale.created',
    aggregateType: overrides.aggregateType ?? 'transaction',
    aggregateId: overrides.aggregateId ?? randomUUID(),
    schemaVersion: overrides.schemaVersion ?? 1,
    createdAt: overrides.createdAt ?? new Date().toISOString(),
    payload: overrides.payload ?? salePayload(eventId),
  };
}
async function json(res: Response) { return res.json() as Promise<any>; }

describe('Phase 4.2 acceptance - migration verification', () => {
  const tmps: string[] = [];
  afterEach(() => {
    for (const p of tmps.splice(0)) { try { fs.rmSync(p, { force: true, recursive: false }); } catch {} try { fs.rmSync(p + '-wal', { force: true }); } catch {} try { fs.rmSync(p + '-shm', { force: true }); } catch {} }
  });

  it('fresh database initialization applies migrations 001 and 002 with required schema', () => {
    const dbPath = path.join(os.tmpdir(), `vyapara-sync-fresh-${randomUUID()}.db`);
    tmps.push(dbPath);
    const db = openSyncServerDb(dbPath);
    try {
      const migs = db.sqlite.prepare('SELECT name FROM _migrations ORDER BY id').all() as any[];
      expect(migs.map(m => m.name)).toEqual(['001-sync-server-core', '002-tenant-isolation', '003-remote-versioning', '004-licensing']);
      const tables = db.sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all() as any[];
      expect(tables.map(t => t.name)).toEqual(expect.arrayContaining(['sync_organizations','sync_devices','sync_events','sync_event_ack_log','_migrations','licenses']));
      const fk = db.sqlite.prepare('PRAGMA foreign_keys').get() as any;
      expect((fk as any).foreign_keys ?? Object.values(fk as any)[0]).toBe(1);
      const devCols = db.sqlite.prepare('PRAGMA table_info(sync_devices)').all() as any[];
      expect(devCols.some(c => c.name === 'organization_id' && c.notnull === 1)).toBe(true);
      const evCols = db.sqlite.prepare('PRAGMA table_info(sync_events)').all() as any[];
      expect(evCols.some(c => c.name === 'organization_id' && c.notnull === 1)).toBe(true);
      const idx = db.sqlite.prepare("SELECT name FROM sqlite_master WHERE type='index'").all() as any[];
      const names = idx.map(i => i.name);
      expect(names).toEqual(expect.arrayContaining(['idx_sync_events_org_seq','idx_sync_events_device_seq','idx_sync_events_aggregate','idx_sync_devices_org','idx_sync_ack_device_created','idx_sync_ack_org_created']));
      // unique constraints
      db.sqlite.prepare("INSERT INTO sync_organizations(organization_id,name,created_at) VALUES(?,?,datetime('now'))").run(ORG,'o');
      db.sqlite.prepare("INSERT INTO sync_devices(device_id,organization_id,enrollment_secret_hash,status,created_at,updated_at) VALUES(?,?,?,'active',datetime('now'),datetime('now'))").run(DEV,ORG,'h');
      db.sqlite.prepare("INSERT INTO sync_events(organization_id,event_id,device_id,idempotency_key,event_type,aggregate_type,aggregate_id,schema_version,created_at,payload_json,received_at,ingest_status) VALUES(?,?,?,?,?,?,?,?,?,?,?, 'accepted')").run(ORG,'e1',DEV,'k1','sale.created','transaction','a1',1,'c','{}','r');
      expect(() => db.sqlite.prepare("INSERT INTO sync_events(organization_id,event_id,device_id,idempotency_key,event_type,aggregate_type,aggregate_id,schema_version,created_at,payload_json,received_at,ingest_status) VALUES(?,?,?,?,?,?,?,?,?,?,?, 'accepted')").run(ORG,'e1',DEV,'k2','sale.created','transaction','a1',1,'c','{}','r')).toThrow(/UNIQUE/i);
      expect(() => db.sqlite.prepare("INSERT INTO sync_events(organization_id,event_id,device_id,idempotency_key,event_type,aggregate_type,aggregate_id,schema_version,created_at,payload_json,received_at,ingest_status) VALUES(?,?,?,?,?,?,?,?,?,?,?, 'accepted')").run(ORG,'e2',DEV,'k1','sale.created','transaction','a1',1,'c','{}','r')).toThrow(/UNIQUE/i);
    } finally { db.close(); }
  });

  it('migrates populated legacy (001) database preserving server_seq, data, and ack history; backfills default org without silent production provisioning', () => {
    const dbPath = path.join(os.tmpdir(), `vyapara-sync-legacy-${randomUUID()}.db`);
    tmps.push(dbPath);
    const legacy = new DatabaseCtor(dbPath);
    try {
      legacy.pragma('foreign_keys = ON');
      legacy.exec(`
CREATE TABLE _migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, applied_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE sync_devices (
  device_id TEXT PRIMARY KEY,
  device_name TEXT,
  enrollment_secret_hash TEXT NOT NULL,
  token_hash TEXT,
  token_expires_at TEXT,
  status TEXT NOT NULL CHECK(status IN ('active','revoked','inactive')) DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  revoked_at TEXT,
  revoke_reason TEXT
);
CREATE TABLE sync_events (
  server_seq INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  event_type TEXT NOT NULL,
  aggregate_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  schema_version INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  received_at TEXT NOT NULL,
  ingest_status TEXT NOT NULL CHECK(ingest_status IN ('accepted','duplicate','conflict')) DEFAULT 'accepted',
  UNIQUE(device_id, event_id),
  UNIQUE(device_id, idempotency_key),
  FOREIGN KEY(device_id) REFERENCES sync_devices(device_id)
);
CREATE TABLE sync_event_ack_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  outcome TEXT NOT NULL,
  server_seq INTEGER,
  code TEXT,
  message TEXT,
  created_at TEXT NOT NULL
);
INSERT INTO _migrations(name) VALUES ('001-sync-server-core');
INSERT INTO sync_devices(device_id,device_name,enrollment_secret_hash,status,created_at,updated_at) VALUES ('${DEV}','Legacy','hash','active','2026-01-01T00:00:00.000Z','2026-01-01T00:00:00.000Z');
INSERT INTO sync_events(server_seq,event_id,device_id,idempotency_key,event_type,aggregate_type,aggregate_id,schema_version,created_at,payload_json,received_at,ingest_status)
VALUES (10,'ev-10','${DEV}','idem-10','sale.created','transaction','agg',1,'c1','{"a":1}','r1','accepted');
INSERT INTO sync_events(server_seq,event_id,device_id,idempotency_key,event_type,aggregate_type,aggregate_id,schema_version,created_at,payload_json,received_at,ingest_status)
VALUES (25,'ev-25','${DEV}','idem-25','sale.created','transaction','agg',1,'c2','{"b":2}','r2','accepted');
INSERT INTO sync_event_ack_log(id,device_id,event_id,idempotency_key,outcome,server_seq,code,message,created_at)
VALUES (7,'${DEV}','ev-10','idem-10','accepted',10,NULL,NULL,'r1');
INSERT INTO sync_event_ack_log(id,device_id,event_id,idempotency_key,outcome,server_seq,code,message,created_at)
VALUES (8,'${DEV}','ev-25','idem-25','duplicate',25,'DUPLICATE','Event already ingested','r2');
`);
    } finally { legacy.close(); }

    const migrated = openSyncServerDb(dbPath);
    try {
      const migs = migrated.sqlite.prepare('SELECT name FROM _migrations ORDER BY id').all() as any[];
      expect(migs.map(m => m.name)).toEqual(['001-sync-server-core', '002-tenant-isolation', '003-remote-versioning', '004-licensing']);
      const orgs = migrated.sqlite.prepare('SELECT * FROM sync_organizations').all() as any[];
      expect(orgs).toHaveLength(1);
      expect(orgs[0].organization_id).toBe(LEGACY_DEFAULT_ORG);
      expect(orgs[0].name).toBe('default-migrated-organization'); // explicit/dev-migration marker, not production provisioning
      const dev = migrated.sqlite.prepare('SELECT device_id, organization_id FROM sync_devices WHERE device_id=?').get(DEV) as any;
      expect(dev.organization_id).toBe(LEGACY_DEFAULT_ORG);
      const evs = migrated.sqlite.prepare('SELECT server_seq,event_id,organization_id,payload_json FROM sync_events ORDER BY server_seq').all() as any[];
      expect(evs.map(e => e.server_seq)).toEqual([10,25]);
      expect(evs.every(e => e.organization_id === LEGACY_DEFAULT_ORG)).toBe(true);
      expect(JSON.parse(evs[0].payload_json)).toEqual({a:1});
      const acks = migrated.sqlite.prepare('SELECT id,server_seq,organization_id,outcome FROM sync_event_ack_log ORDER BY id').all() as any[];
      expect(acks.map(a => [a.id,a.server_seq,a.outcome,a.organization_id])).toEqual([[7,10,'accepted',LEGACY_DEFAULT_ORG],[8,25,'duplicate',LEGACY_DEFAULT_ORG]]);
      // server_seq sequence preserved for new inserts
      migrated.sqlite.prepare("INSERT INTO sync_events(organization_id,event_id,device_id,idempotency_key,event_type,aggregate_type,aggregate_id,schema_version,created_at,payload_json,received_at,ingest_status) VALUES(?,?,?,?,?,?,?,?,?,?,?, 'accepted')").run(LEGACY_DEFAULT_ORG,'ev-new',DEV,'idem-new','sale.created','transaction','agg',1,'c','{}','r');
      const next = migrated.sqlite.prepare("SELECT server_seq FROM sync_events WHERE event_id='ev-new'").get() as any;
      expect(next.server_seq).toBe(26);
    } finally { migrated.close(); }
  });

  it('migration is idempotent when reopened and _migrations guard prevents reapplication', () => {
    const dbPath = path.join(os.tmpdir(), `vyapara-sync-idem-${randomUUID()}.db`);
    tmps.push(dbPath);
    const db1 = openSyncServerDb(dbPath);
    db1.close();
    const db2 = openSyncServerDb(dbPath);
    try {
      const migs = db2.sqlite.prepare('SELECT name FROM _migrations ORDER BY id').all() as any[];
      expect(migs.map(m => m.name)).toEqual(['001-sync-server-core', '002-tenant-isolation', '003-remote-versioning', '004-licensing']);
      const orgs = db2.sqlite.prepare('SELECT organization_id FROM sync_organizations').all() as any[];
      expect(orgs.filter(o => o.organization_id === LEGACY_DEFAULT_ORG)).toHaveLength(1);
    } finally { db2.close(); }
  });
});

describe('Phase 4.2 acceptance - focused security/contract checks', () => {
  let app: ReturnType<typeof createSyncServer>;
  let baseUrl: string;
  afterEach(async () => { if (app) await app.close(); });

  async function start() {
    app = createSyncServer({ dbPath: ':memory:', config: { enrollmentSecret: ENROLLMENT, adminToken: 'admin-secret-token' } });
    const addr = await app.listen(0);
    baseUrl = `http://127.0.0.1:${addr.port}`;
  }
  async function register(deviceId: string, org: string) {
    const res = await fetch(`${baseUrl}/v1/sync/devices/register`, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({deviceId, organizationId: org, enrollmentSecret: ENROLLMENT}) });
    return { res, body: await json(res) };
  }

  it('organization membership cannot be self-rebound across orgs and upload stores org from trusted server-side identity', async () => {
    await start();
    const a = await register(DEV, ORG);
    expect(a.res.status).toBe(201);
    const rebound = await register(DEV, ORG2);
    expect(rebound.res.status).toBe(403);
    expect(rebound.body.error.code).toBe('DEVICE_ORG_MISMATCH');
    const ev = makeEvent(DEV);
    const up = await fetch(`${baseUrl}/v1/sync/events/upload`, { method:'POST', headers:{'content-type':'application/json', authorization:`Bearer ${a.body.data.deviceToken}`}, body: JSON.stringify({deviceId: DEV, events:[ev]}) });
    expect(up.status).toBe(200);
    const row = app.db.sqlite.prepare('SELECT organization_id, device_id FROM sync_events WHERE event_id=?').get(ev.eventId) as any;
    expect(row.organization_id).toBe(ORG);
    expect(row.device_id).toBe(DEV);
  });

  it('rejects token renewal with mismatched claimed deviceId and rejects upload when body deviceId mismatches authenticated token', async () => {
    await start();
    const a = await register(DEV, ORG);
    const renewBad = await fetch(`${baseUrl}/v1/sync/devices/token/renew`, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({deviceId: DEV2, deviceToken: a.body.data.deviceToken}) });
    expect(renewBad.status).toBe(403);
    const upBad = await fetch(`${baseUrl}/v1/sync/events/upload`, { method:'POST', headers:{'content-type':'application/json', authorization:`Bearer ${a.body.data.deviceToken}`}, body: JSON.stringify({deviceId: DEV2, events:[makeEvent(DEV2)]}) });
    expect(upBad.status).toBe(403);
  });

  it('revocation authz: other-device token cannot revoke target; admin and same-device token can', async () => {
    await start();
    const a = await register(DEV, ORG);
    const b = await register(DEV2, ORG);
    const other = await fetch(`${baseUrl}/v1/sync/devices/revoke`, { method:'POST', headers:{'content-type':'application/json', authorization:`Bearer ${b.body.data.deviceToken}`}, body: JSON.stringify({deviceId: DEV}) });
    expect(other.status).toBe(403);
    const self = await fetch(`${baseUrl}/v1/sync/devices/revoke`, { method:'POST', headers:{'content-type':'application/json', authorization:`Bearer ${b.body.data.deviceToken}`}, body: JSON.stringify({deviceId: DEV2}) });
    expect(self.status).toBe(200);
    const admin = await fetch(`${baseUrl}/v1/sync/devices/revoke`, { method:'POST', headers:{'content-type':'application/json', authorization:`Bearer admin-secret-token`}, body: JSON.stringify({deviceId: DEV}) });
    expect(admin.status).toBe(200);
  });

  it('expired/invalid/inactive token states are rejected', async () => {
    await start();
    const a = await register(DEV, ORG);
    // expire token
    app.db.sqlite.prepare('UPDATE sync_devices SET token_expires_at=? WHERE device_id=?').run('2000-01-01T00:00:00.000Z', DEV);
    const expired = await fetch(`${baseUrl}/v1/sync/events/download`, { headers:{ authorization:`Bearer ${a.body.data.deviceToken}` } });
    expect(expired.status).toBe(401);
    const bodyExp = await json(expired); expect(bodyExp.error.code).toBe('TOKEN_EXPIRED');
    // inactive
    app.db.sqlite.prepare("UPDATE sync_devices SET status='inactive', token_expires_at=? WHERE device_id=?").run('2999-01-01T00:00:00.000Z', DEV);
    const inactive = await fetch(`${baseUrl}/v1/sync/events/download`, { headers:{ authorization:`Bearer ${a.body.data.deviceToken}` } });
    expect(inactive.status).toBe(403);
    const bodyIn = await json(inactive); expect(bodyIn.error.code).toBe('DEVICE_INACTIVE');
    // invalid token
    const inv = await fetch(`${baseUrl}/v1/sync/events/download`, { headers:{ authorization:`Bearer not-a-real-token` } });
    expect(inv.status).toBe(401);
  });

  it('cross-tenant cursor rejected even when seq exists; legacy/unbound cursor does not leak other tenant events', async () => {
    await start();
    const a = await register(DEV, ORG);
    const b = await register(DEV2, ORG2);
    const evA = makeEvent(DEV); const evB = makeEvent(DEV2);
    await fetch(`${baseUrl}/v1/sync/events/upload`, { method:'POST', headers:{'content-type':'application/json', authorization:`Bearer ${a.body.data.deviceToken}`}, body: JSON.stringify({deviceId: DEV, events:[evA]}) });
    const upB = await fetch(`${baseUrl}/v1/sync/events/upload`, { method:'POST', headers:{'content-type':'application/json', authorization:`Bearer ${b.body.data.deviceToken}`}, body: JSON.stringify({deviceId: DEV2, events:[evB]}) });
    const seqB = (await json(upB)).data.results[0].serverSeq;
    const forged = encodeCursor(seqB - 1, ORG2);
    const bad = await fetch(`${baseUrl}/v1/sync/events/download?cursor=${encodeURIComponent(forged)}`, { headers:{ authorization:`Bearer ${a.body.data.deviceToken}` } });
    expect(bad.status).toBe(400);
    // legacy cursor format {s} (no org binding) is accepted by decoder but query remains org-scoped
    const legacy = Buffer.from(JSON.stringify({ s: 0 }), 'utf8').toString('base64url');
    const ok = await fetch(`${baseUrl}/v1/sync/events/download?cursor=${encodeURIComponent(legacy)}`, { headers:{ authorization:`Bearer ${a.body.data.deviceToken}` } });
    const body = await json(ok);
    expect(ok.status).toBe(200);
    expect(body.data.events.every((e:any)=> e.eventId !== evB.eventId)).toBe(true);
  });

  it('secrets are not leaked in error responses; tokens/secrets stored as hashes only', async () => {
    await start();
    const bad = await fetch(`${baseUrl}/v1/sync/devices/register`, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({deviceId: DEV, organizationId: ORG, enrollmentSecret: 'wrong-secret-but-16chars'}) });
    const txt = await bad.text();
    expect(txt).not.toContain('wrong-secret-but-16chars');
    expect(txt).not.toContain(ENROLLMENT);
    const a = await register(DEV, ORG);
    const deviceRow = app.db.sqlite.prepare('SELECT token_hash,enrollment_secret_hash FROM sync_devices WHERE device_id=?').get(DEV) as any;
    expect(deviceRow.token_hash).toBeTruthy();
    expect(deviceRow.enrollment_secret_hash).toBeTruthy();
    expect(deviceRow.token_hash).not.toBe(a.body.data.deviceToken);
    expect(deviceRow.enrollment_secret_hash).not.toBe(ENROLLMENT);
  });

  it('malformed/oversized inputs are rejected safely', async () => {
    await start();
    const a = await register(DEV, ORG);
    const big = 'x'.repeat(1024 * 1024 + 10);
    const tooBig = await fetch(`${baseUrl}/v1/sync/events/upload`, { method:'POST', headers:{'content-type':'application/json', authorization:`Bearer ${a.body.data.deviceToken}`}, body: `{"deviceId":"${DEV}","events":[],"pad":"${big}"}` });
    expect(tooBig.status).toBe(413);
    const malformed = await fetch(`${baseUrl}/v1/sync/events/upload`, { method:'POST', headers:{'content-type':'application/json', authorization:`Bearer ${a.body.data.deviceToken}`}, body: '{bad-json' });
    expect(malformed.status).toBe(400);
  });
});
