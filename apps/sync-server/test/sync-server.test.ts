import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createSyncServer } from '../src/server.js';
import { encodeCursor } from 'vyapara-shared';

const ENROLLMENT = 'test-enrollment-secret-123456';
const DEVICE_ID = '11111111-1111-4111-8111-111111111111';
const DEVICE_ID_2 = '22222222-2222-4222-8222-222222222222';
const DEVICE_ID_B = '33333333-3333-4333-8333-333333333333';
const ORG_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ORG_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

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

function makeEvent(overrides: Record<string, any> = {}) {
  const eventId = overrides.eventId ?? randomUUID();
  return {
    eventId,
    deviceId: overrides.deviceId ?? DEVICE_ID,
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

describe('Phase 4.2 sync server (hardened tenant isolation)', () => {
  let app: ReturnType<typeof createSyncServer>;
  let baseUrl: string;

  beforeEach(async () => {
    app = createSyncServer({ dbPath: ':memory:', config: { enrollmentSecret: ENROLLMENT, adminToken: 'admin-secret-token' } });
    const addr = await app.listen(0);
    baseUrl = `http://127.0.0.1:${addr.port}`;
  });
  afterEach(async () => { await app.close(); });

  async function register(deviceId = DEVICE_ID, organizationId = ORG_A) {
    const res = await fetch(`${baseUrl}/v1/sync/devices/register`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ deviceId, organizationId, enrollmentSecret: ENROLLMENT, deviceName: 'Test Device' }),
    });
    return { res, body: await json(res) };
  }

  async function upload(token: string, deviceId: string, events: any[]) {
    const res = await fetch(`${baseUrl}/v1/sync/events/upload`, {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ deviceId, events }),
    });
    return { res, body: await json(res) };
  }

  async function download(token: string, query = '') {
    const res = await fetch(`${baseUrl}/v1/sync/events/download${query}`, { headers: { authorization: `Bearer ${token}` } });
    return { res, body: await json(res) };
  }

  it('1. valid device authentication/register and token works', async () => {
    const { res, body } = await register();
    expect(res.status).toBe(201);
    expect(body.ok).toBe(true);
    expect(body.data.deviceId).toBe(DEVICE_ID);
    expect(body.data.organizationId).toBe(ORG_A);
    expect(body.data.deviceToken).toBeTruthy();
    const ev = makeEvent();
    const up = await upload(body.data.deviceToken, DEVICE_ID, [ev]);
    expect(up.res.status).toBe(200);
  });

  it('2. invalid and revoked device authentication', async () => {
    const { body } = await register();
    const bad = await upload('wrongtoken', DEVICE_ID, [makeEvent()]);
    expect(bad.res.status).toBe(401);
    const rev = await fetch(`${baseUrl}/v1/sync/devices/revoke`, {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer admin-secret-token' },
      body: JSON.stringify({ deviceId: DEVICE_ID, reason: 'test' }),
    });
    expect(rev.status).toBe(200);
    const after = await upload(body.data.deviceToken, DEVICE_ID, [makeEvent()]);
    expect(after.res.status).toBe(403);
  });

  it('3. valid event upload', async () => {
    const { body } = await register();
    const ev = makeEvent();
    const out = await upload(body.data.deviceToken, DEVICE_ID, [ev]);
    expect(out.res.status).toBe(200);
    expect(out.body.data.results[0].status).toBe('accepted');
    expect(out.body.data.acceptedCount).toBe(1);
    expect(out.body.data.results[0].serverSeq).toBeGreaterThan(0);
  });

  it('4. duplicate event submission (same eventId)', async () => {
    const { body } = await register();
    const ev = makeEvent();
    await upload(body.data.deviceToken, DEVICE_ID, [ev]);
    const out = await upload(body.data.deviceToken, DEVICE_ID, [ev]);
    expect(out.body.data.results[0].status).toBe('duplicate');
    expect(out.body.data.duplicateCount).toBe(1);
  });

  it('5. duplicate idempotency key with different eventId -> conflict', async () => {
    const { body } = await register();
    const ev1 = makeEvent({ idempotencyKey: 'same-idem' });
    const ev2 = makeEvent({ idempotencyKey: 'same-idem' });
    await upload(body.data.deviceToken, DEVICE_ID, [ev1]);
    const out = await upload(body.data.deviceToken, DEVICE_ID, [ev2]);
    expect(out.body.data.results[0].status).toBe('conflict');
  });

  it('6. invalid event payload rejected per-event', async () => {
    const { body } = await register();
    const ev = makeEvent({ payload: { bad: true } });
    const out = await upload(body.data.deviceToken, DEVICE_ID, [ev]);
    expect(out.res.status).toBe(200);
    expect(out.body.data.results[0].status).toBe('rejected');
    expect(out.body.data.rejectedCount).toBe(1);
  });

  it('7. unsupported schema version rejected per-event', async () => {
    const { body } = await register();
    const ev = makeEvent({ schemaVersion: 999 });
    const out = await upload(body.data.deviceToken, DEVICE_ID, [ev]);
    expect(out.body.data.results[0].status).toBe('rejected');
    expect(out.body.data.results[0].code).toBe('SCHEMA_UNSUPPORTED');
  });

  it('8. partial batch failure behavior (mixed valid/invalid) and durable accepted items', async () => {
    const { body } = await register();
    const good = makeEvent();
    const bad = makeEvent({ schemaVersion: 999 });
    const out = await upload(body.data.deviceToken, DEVICE_ID, [good, bad]);
    expect(out.body.data.acceptedCount).toBe(1);
    expect(out.body.data.rejectedCount).toBe(1);
    const dl = await download(body.data.deviceToken);
    expect(dl.body.data.events.some((e: any) => e.eventId === good.eventId)).toBe(true);
    expect(dl.body.data.events.some((e: any) => e.eventId === bad.eventId)).toBe(false);
  });

  it('9. durable acknowledgment - event persisted before 200 response', async () => {
    const { body } = await register();
    const ev = makeEvent();
    const out = await upload(body.data.deviceToken, DEVICE_ID, [ev]);
    expect(out.res.status).toBe(200);
    const row = app.db.sqlite.prepare('SELECT event_id, server_seq, organization_id FROM sync_events WHERE event_id = ?').get(ev.eventId) as any;
    expect(row).toBeTruthy();
    expect(row.server_seq).toBeGreaterThan(0);
    expect(row.organization_id).toBe(ORG_A);
  });

  it('10/11/12. incremental download, pagination/cursor continuation, repeated requests (tenant-scoped)', async () => {
    const { body } = await register();
    const evs = [makeEvent(), makeEvent(), makeEvent()];
    await upload(body.data.deviceToken, DEVICE_ID, evs);

    const p1 = await download(body.data.deviceToken, '?limit=2');
    expect(p1.body.data.events.length).toBe(2);
    expect(p1.body.data.hasMore).toBe(true);
    expect(p1.body.data.nextCursor).toBeTruthy();
    expect(p1.body.data.events.every((e: any) => e.deviceId === DEVICE_ID)).toBe(true);
    const p1b = await download(body.data.deviceToken, '?limit=2');
    expect(p1b.body.data.events.map((e: any) => e.eventId)).toEqual(p1.body.data.events.map((e: any) => e.eventId));

    const p2 = await download(body.data.deviceToken, `?limit=2&cursor=${encodeURIComponent(p1.body.data.nextCursor)}`);
    expect(p2.body.data.events.length).toBe(1);
    expect(p2.body.data.hasMore).toBe(false);
    expect(p2.body.data.nextCursor).toBeNull();
    const allIds = [...p1.body.data.events, ...p2.body.data.events].map((e: any) => e.eventId);
    expect(new Set(allIds).size).toBe(3);
  });

  it('13. concurrent duplicate submissions handled safely', async () => {
    const { body } = await register();
    const ev = makeEvent();
    const req = () => upload(body.data.deviceToken, DEVICE_ID, [ev]);
    const [r1, r2, r3] = await Promise.all([req(), req(), req()]);
    const statuses = [r1.body, r2.body, r3.body].map(o => o.data.results[0].status).sort();
    expect(statuses.filter(s => s === 'accepted').length).toBe(1);
    expect(statuses.filter(s => s === 'duplicate').length).toBe(2);
    const count = (app.db.sqlite.prepare('SELECT COUNT(*) as c FROM sync_events WHERE event_id = ?').get(ev.eventId) as any).c;
    expect(count).toBe(1);
  });

  it('14. unauthorized access rejected', async () => {
    const { body } = await register();
    const noAuth = await fetch(`${baseUrl}/v1/sync/events/upload`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ deviceId: DEVICE_ID, events: [makeEvent()] }),
    });
    expect(noAuth.status).toBe(401);
    const dlNoAuth = await fetch(`${baseUrl}/v1/sync/events/download`);
    expect(dlNoAuth.status).toBe(401);
    const reg2 = await register(DEVICE_ID_2, ORG_B);
    const wrong = await download(reg2.body.data.deviceToken, `?deviceId=${DEVICE_ID}`);
    expect([401, 403]).toContain(wrong.res.status);
  });

  it('15. database rollback on failed transaction leaves no durable ack', async () => {
    const { body } = await register();
    const ev = makeEvent();
    app.db.sqlite.exec(`CREATE TRIGGER fail_ack BEFORE INSERT ON sync_event_ack_log WHEN NEW.event_id = '${ev.eventId}' BEGIN SELECT RAISE(ABORT,'boom'); END;`);
    const res = await upload(body.data.deviceToken, DEVICE_ID, [ev]);
    expect(res.res.status).toBe(500);
    const stored = (app.db.sqlite.prepare('SELECT COUNT(*) as c FROM sync_events WHERE event_id = ?').get(ev.eventId) as any).c;
    expect(stored).toBe(0);
  });

  it('device token renewal works and revoked cannot renew', async () => {
    const { body } = await register();
    const renew = await fetch(`${baseUrl}/v1/sync/devices/token/renew`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ deviceId: DEVICE_ID, deviceToken: body.data.deviceToken }),
    });
    const rb = await json(renew);
    expect(renew.status).toBe(200);
    expect(rb.data.deviceToken).toBeTruthy();
    expect(rb.data.organizationId).toBe(ORG_A);
    await fetch(`${baseUrl}/v1/sync/devices/revoke`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer admin-secret-token' }, body: JSON.stringify({ deviceId: DEVICE_ID }) });
    const renew2 = await fetch(`${baseUrl}/v1/sync/devices/token/renew`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ deviceId: DEVICE_ID, deviceToken: rb.data.deviceToken }) });
    expect(renew2.status).toBe(403);
  });
});

describe('Phase 4.2.1 security/data isolation', () => {
  let app: ReturnType<typeof createSyncServer>;
  let baseUrl: string;

  beforeEach(async () => {
    app = createSyncServer({ dbPath: ':memory:', config: { enrollmentSecret: ENROLLMENT, adminToken: 'admin-secret-token' } });
    const addr = await app.listen(0);
    baseUrl = `http://127.0.0.1:${addr.port}`;
  });
  afterEach(async () => { await app.close(); });

  async function register(deviceId: string, organizationId: string) {
    const res = await fetch(`${baseUrl}/v1/sync/devices/register`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ deviceId, organizationId, enrollmentSecret: ENROLLMENT, deviceName: deviceId }),
    });
    return { res, body: await json(res) };
  }
  async function upload(token: string, deviceId: string, events: any[]) {
    const res = await fetch(`${baseUrl}/v1/sync/events/upload`, {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ deviceId, events }),
    });
    return { res, body: await json(res) };
  }
  async function download(token: string, query = '') {
    const res = await fetch(`${baseUrl}/v1/sync/events/download${query}`, { headers: { authorization: `Bearer ${token}` } });
    return { res, body: await json(res) };
  }

  it('Device A cannot download Device B unauthorized (other tenant) events', async () => {
    const a = await register(DEVICE_ID, ORG_A);
    const b = await register(DEVICE_ID_B, ORG_B);
    const evB = makeEvent({ deviceId: DEVICE_ID_B });
    await upload(b.body.data.deviceToken, DEVICE_ID_B, [evB]);
    const dlA = await download(a.body.data.deviceToken);
    expect(dlA.res.status).toBe(200);
    expect(dlA.body.data.events.find((e: any) => e.eventId === evB.eventId)).toBeUndefined();
  });

  it('Device A cannot request another tenant data by changing deviceId param', async () => {
    const a = await register(DEVICE_ID, ORG_A);
    const b = await register(DEVICE_ID_B, ORG_B);
    await upload(b.body.data.deviceToken, DEVICE_ID_B, [makeEvent({ deviceId: DEVICE_ID_B })]);
    const dl = await download(a.body.data.deviceToken, `?deviceId=${DEVICE_ID_B}`);
    expect(dl.res.status).toBe(403);
  });

  it('Unauthenticated download is rejected', async () => {
    const res = await fetch(`${baseUrl}/v1/sync/events/download`);
    expect(res.status).toBe(401);
  });

  it('Revoked device download is rejected', async () => {
    const a = await register(DEVICE_ID, ORG_A);
    await fetch(`${baseUrl}/v1/sync/devices/revoke`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer admin-secret-token' }, body: JSON.stringify({ deviceId: DEVICE_ID }) });
    const dl = await download(a.body.data.deviceToken);
    expect(dl.res.status).toBe(403);
  });

  it('Cursor cannot be manipulated to bypass authorization', async () => {
    const a = await register(DEVICE_ID, ORG_A);
    const b = await register(DEVICE_ID_B, ORG_B);
    const evB = makeEvent({ deviceId: DEVICE_ID_B });
    const upB = await upload(b.body.data.deviceToken, DEVICE_ID_B, [evB]);
    const seqB = upB.body.data.results[0].serverSeq;
    const forged = encodeCursor(seqB - 1, ORG_B);
    const dl = await download(a.body.data.deviceToken, `?cursor=${encodeURIComponent(forged)}`);
    expect(dl.res.status).toBe(400);
    expect(dl.body.error.code).toBe('INVALID_CURSOR');
  });

  it('Pagination does not leak records across tenants', async () => {
    const a = await register(DEVICE_ID, ORG_A);
    const b = await register(DEVICE_ID_B, ORG_B);
    const aEv = makeEvent({ deviceId: DEVICE_ID });
    const bEv = makeEvent({ deviceId: DEVICE_ID_B });
    await upload(a.body.data.deviceToken, DEVICE_ID, [aEv]);
    await upload(b.body.data.deviceToken, DEVICE_ID_B, [bEv]);
    await upload(a.body.data.deviceToken, DEVICE_ID, [makeEvent({ deviceId: DEVICE_ID })]);
    const dlA = await download(a.body.data.deviceToken, '?limit=10');
    expect(dlA.body.data.events.every((e: any) => e.eventId !== bEv.eventId)).toBe(true);
    const orgAIds = dlA.body.data.events.map((e: any) => e.eventId);
    expect(orgAIds).toContain(aEv.eventId);
  });

  it('Repeated download requests remain deterministic', async () => {
    const a = await register(DEVICE_ID, ORG_A);
    await upload(a.body.data.deviceToken, DEVICE_ID, [makeEvent(), makeEvent(), makeEvent()]);
    const d1 = await download(a.body.data.deviceToken, '?limit=2');
    const d2 = await download(a.body.data.deviceToken, '?limit=2');
    expect(d2.body.data.events.map((e: any) => e.eventId)).toEqual(d1.body.data.events.map((e: any) => e.eventId));
  });

  it('Existing upload idempotency remains functional under tenant scope', async () => {
    const a = await register(DEVICE_ID, ORG_A);
    const ev = makeEvent({ deviceId: DEVICE_ID });
    await upload(a.body.data.deviceToken, DEVICE_ID, [ev]);
    const dup = await upload(a.body.data.deviceToken, DEVICE_ID, [ev]);
    expect(dup.body.data.results[0].status).toBe('duplicate');
  });

  it('Existing transaction rollback guarantees remain intact', async () => {
    const a = await register(DEVICE_ID, ORG_A);
    const ev = makeEvent({ deviceId: DEVICE_ID });
    app.db.sqlite.exec(`CREATE TRIGGER fail_ack BEFORE INSERT ON sync_event_ack_log WHEN NEW.event_id = '${ev.eventId}' BEGIN SELECT RAISE(ABORT,'boom'); END;`);
    const res = await upload(a.body.data.deviceToken, DEVICE_ID, [ev]);
    expect(res.res.status).toBe(500);
    const stored = (app.db.sqlite.prepare('SELECT COUNT(*) as c FROM sync_events WHERE event_id = ?').get(ev.eventId) as any).c;
    expect(stored).toBe(0);
  });
});
