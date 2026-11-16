/**
 * Phase 4.6 — Server-side per-aggregate remoteVersion contract.
 * Proves the sync server publishes a monotonic, non-reusing remoteVersion
 * per (organization_id, aggregate_type, aggregate_id) and returns it on
 * download, which is what desktop conflict detection consumes.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createSyncServer } from '../src/server';
import { randomUUID } from 'node:crypto';

const ENROLLMENT = 'test-enrollment-secret-123456';
const ORG = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const DEVICE_ID = '550e8400-e29b-41d4-a716-446655440002';

async function registerDevice(app: ReturnType<typeof createSyncServer>) {
  const addr = await app.listen(0);
  const baseUrl = `http://127.0.0.1:${addr.port}`;
  const res = await fetch(`${baseUrl}/v1/sync/devices/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ deviceId: DEVICE_ID, organizationId: ORG, enrollmentSecret: ENROLLMENT }),
  }).then((r) => r.json() as any);
  return { baseUrl, token: res.data.deviceToken as string };
}

const makeEvent = (aggregateId: string, eventId = randomUUID()) => ({
  eventId,
  deviceId: DEVICE_ID,
  idempotencyKey: `idem-${eventId}`,
  eventType: 'sale.created',
  aggregateType: 'transaction',
  aggregateId,
  schemaVersion: 1,
  createdAt: new Date().toISOString(),
  payload: {
    transactionId: aggregateId,
    transactionNumber: `INV-${aggregateId.slice(0, 8)}`,
    userId: 'u1',
    customerId: null,
    subtotal: 100,
    discountAmount: 0,
    taxAmount: 0,
    totalAmount: 100,
    paymentAmount: 100,
    changeAmount: 0,
    paymentMethod: 'cash',
    payments: [{ method: 'cash', amount: 100 }],
    items: [{ productId: 'p1', quantity: 1, unitPrice: 100, unitCost: 50, subtotal: 100 }],
    createdAt: new Date().toISOString(),
  },
});

describe('Phase 4.6 remoteVersion contract', () => {
  let app: ReturnType<typeof createSyncServer>;

  beforeEach(() => {
    app = createSyncServer({ dbPath: ':memory:', config: { enrollmentSecret: ENROLLMENT } });
  });
  afterEach(async () => {
    await app.close();
  });

  it('assigns monotonic remoteVersion per aggregate and returns them on download', async () => {
    const { baseUrl, token } = await registerDevice(app);
    const agg = `agg-${randomUUID()}`;
    const upload = async (ev: ReturnType<typeof makeEvent>) =>
      fetch(`${baseUrl}/v1/sync/events/upload`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify({ deviceId: DEVICE_ID, events: [ev] }),
      }).then((r) => r.json() as any);

    const r1 = await upload(makeEvent(agg));
    const r2 = await upload(makeEvent(agg));
    const r3 = await upload(makeEvent(agg));
    expect(r1.data.results[0].status).toBe('accepted');
    expect(r2.data.results[0].status).toBe('accepted');
    expect(r3.data.results[0].status).toBe('accepted');

    const dl = await fetch(`${baseUrl}/v1/sync/events/download?limit=10`, {
      headers: { authorization: `Bearer ${token}` },
    }).then((r) => r.json() as any);

    const versions = dl.data.events.map((e: any) => e.remoteVersion);
    expect(versions).toEqual([1, 2, 3]); // monotonic, non-reused
    expect(dl.data.events.every((e: any) => Number.isInteger(e.remoteVersion) && e.remoteVersion >= 1)).toBe(true);
  });
});
