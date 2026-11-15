import type { SyncServerDb } from '../db/open.js';
import { nowIso } from './crypto.js';
import {
  SYNC_EVENT_TYPES,
  SYNC_LIMITS,
  SYNC_SCHEMA_VERSION,
  decodeCursor,
  encodeCursor,
  syncEventEnvelopeSchema,
  syncUploadEventSchema,
  type PerEventAck,
  type SyncEventEnvelope,
} from 'vyapara-shared';
import type { z } from 'zod';

type ExistingEventRow = {
  server_seq: number;
  event_id: string;
  idempotency_key: string;
  ingest_status: 'accepted' | 'duplicate' | 'conflict';
  organization_id: string;
};

type UploadEventInput = z.infer<typeof syncUploadEventSchema>;

export type AuthScope = {
  deviceId: string;
  organizationId: string;
};

function validateEventBusiness(deviceId: string, event: UploadEventInput): { ok: true; parsed?: SyncEventEnvelope } | { ok: false; code: string; message: string; status: PerEventAck['status'] } {
  if (event.deviceId !== deviceId) {
    return { ok: false, code: 'DEVICE_MISMATCH', message: 'Event deviceId does not match authenticated device', status: 'rejected' };
  }
  if (event.schemaVersion !== SYNC_SCHEMA_VERSION) {
    return { ok: false, code: 'SCHEMA_UNSUPPORTED', message: 'Unsupported schema version', status: 'rejected' };
  }
  if (!SYNC_EVENT_TYPES.includes(event.eventType as any)) {
    return { ok: false, code: 'INVALID_EVENT_TYPE', message: 'Unknown event type', status: 'rejected' };
  }
  const payloadBytes = Buffer.byteLength(JSON.stringify(event.payload ?? {}), 'utf8');
  if (payloadBytes > SYNC_LIMITS.maxPayloadBytesPerEvent) {
    return { ok: false, code: 'PAYLOAD_TOO_LARGE', message: 'Event payload exceeds size limit', status: 'rejected' };
  }
  const parsed = syncEventEnvelopeSchema.safeParse(event);
  if (!parsed.success) {
    return { ok: false, code: 'INVALID_PAYLOAD', message: 'Event payload/envelope invalid for schema version', status: 'rejected' };
  }
  const payload = parsed.data.payload as Record<string, any>;
  const reqStr = (k: string) => typeof payload[k] === 'string' && payload[k].length > 0;
  const reqNum = (k: string) => typeof payload[k] === 'number' && Number.isFinite(payload[k]);
  const reqArr = (k: string) => Array.isArray(payload[k]) && payload[k].length > 0;
  let payloadOk = true;
  switch (parsed.data.eventType) {
    case 'sale.created':
      payloadOk = reqStr('transactionId') && reqStr('transactionNumber') && reqStr('userId') && reqNum('subtotal') && reqNum('totalAmount') && reqArr('payments') && reqArr('items');
      break;
    case 'customer.payment.recorded':
      payloadOk = reqStr('customerTransactionId') && reqStr('customerId') && reqNum('amount') && reqNum('balanceAfter') && reqNum('transactionDate') && reqStr('userId');
      break;
    case 'sales_return.created':
      payloadOk = reqStr('returnId') && reqStr('returnNumber') && reqStr('transactionId') && reqStr('userId') && reqArr('items');
      break;
    case 'inventory.movement.recorded':
      payloadOk = reqStr('movementId') && reqStr('productId') && reqStr('movementType') && reqNum('quantityBefore') && reqNum('quantityChange') && reqNum('quantityAfter') && reqStr('userId') && reqStr('createdAt');
      break;
    default:
      payloadOk = false;
  }
  if (!payloadOk) {
    return { ok: false, code: 'INVALID_PAYLOAD', message: 'Event payload invalid for event type', status: 'rejected' };
  }
  return { ok: true, parsed: parsed.data };
}

export function ingestEventsBatch(
  db: SyncServerDb,
  auth: AuthScope,
  events: UploadEventInput[],
): PerEventAck[] {
  const tx = db.sqlite.transaction((batch: UploadEventInput[]): PerEventAck[] => {
    const results: PerEventAck[] = [];
    const findById = db.sqlite.prepare(
      'SELECT server_seq, event_id, idempotency_key, ingest_status, organization_id FROM sync_events WHERE device_id = ? AND event_id = ?',
    );
    const findByIdem = db.sqlite.prepare(
      'SELECT server_seq, event_id, idempotency_key, ingest_status, organization_id FROM sync_events WHERE device_id = ? AND idempotency_key = ?',
    );
    const insertEvent = db.sqlite.prepare(
      `INSERT INTO sync_events (organization_id, event_id, device_id, idempotency_key, event_type, aggregate_type, aggregate_id, schema_version, created_at, payload_json, received_at, ingest_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'accepted')`,
    );
    const insertAck = db.sqlite.prepare(
      `INSERT INTO sync_event_ack_log (organization_id, device_id, event_id, idempotency_key, outcome, server_seq, code, message, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const receivedAt = nowIso();

    for (const event of batch) {
      const business = validateEventBusiness(auth.deviceId, event);
      if (!business.ok) {
        results.push({
          eventId: event.eventId,
          idempotencyKey: event.idempotencyKey,
          status: business.status,
          serverSeq: null,
          code: business.code,
          message: business.message,
        });
        insertAck.run(auth.organizationId, auth.deviceId, event.eventId, event.idempotencyKey, business.status, null, business.code, business.message, receivedAt);
        continue;
      }
      const acceptedEvent = business.parsed!;

      const existingById = findById.get(auth.deviceId, event.eventId) as ExistingEventRow | undefined;
      const existingByIdem = findByIdem.get(auth.deviceId, event.idempotencyKey) as ExistingEventRow | undefined;
      const existing = existingById ?? existingByIdem;
      if (existing) {
        if (existing.event_id !== acceptedEvent.eventId || existing.idempotency_key !== acceptedEvent.idempotencyKey) {
          const ack: PerEventAck = {
            eventId: acceptedEvent.eventId,
            idempotencyKey: acceptedEvent.idempotencyKey,
            status: 'conflict',
            serverSeq: existing.server_seq,
            code: 'IDEMPOTENCY_CONFLICT',
            message: 'Event identity conflicts with existing idempotency record',
          };
          results.push(ack);
          insertAck.run(auth.organizationId, auth.deviceId, acceptedEvent.eventId, acceptedEvent.idempotencyKey, 'conflict', existing.server_seq, ack.code, ack.message, receivedAt);
          continue;
        }
        const ack: PerEventAck = {
          eventId: existing.event_id,
          idempotencyKey: existing.idempotency_key,
          status: 'duplicate',
          serverSeq: existing.server_seq,
          code: 'DUPLICATE',
          message: 'Event already ingested',
        };
        results.push(ack);
        insertAck.run(auth.organizationId, auth.deviceId, acceptedEvent.eventId, acceptedEvent.idempotencyKey, 'duplicate', existing.server_seq, ack.code, ack.message, receivedAt);
        continue;
      }

      try {
        const info = insertEvent.run(
          auth.organizationId,
          acceptedEvent.eventId,
          auth.deviceId,
          acceptedEvent.idempotencyKey,
          acceptedEvent.eventType,
          acceptedEvent.aggregateType,
          acceptedEvent.aggregateId,
          acceptedEvent.schemaVersion,
          acceptedEvent.createdAt,
          JSON.stringify(acceptedEvent.payload),
          receivedAt,
        );
        const serverSeq = Number(info.lastInsertRowid);
        const ack: PerEventAck = {
          eventId: acceptedEvent.eventId,
          idempotencyKey: acceptedEvent.idempotencyKey,
          status: 'accepted',
          serverSeq,
        };
        results.push(ack);
        insertAck.run(auth.organizationId, auth.deviceId, acceptedEvent.eventId, acceptedEvent.idempotencyKey, 'accepted', serverSeq, null, null, receivedAt);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes('UNIQUE constraint failed')) {
          const again = (findById.get(auth.deviceId, acceptedEvent.eventId) ?? findByIdem.get(auth.deviceId, acceptedEvent.idempotencyKey)) as ExistingEventRow | undefined;
          if (again) {
            const isConflict = again.event_id !== acceptedEvent.eventId || again.idempotency_key !== acceptedEvent.idempotencyKey;
            const ack: PerEventAck = {
              eventId: acceptedEvent.eventId,
              idempotencyKey: acceptedEvent.idempotencyKey,
              status: isConflict ? 'conflict' : 'duplicate',
              serverSeq: again.server_seq,
              code: isConflict ? 'IDEMPOTENCY_CONFLICT' : 'DUPLICATE',
              message: isConflict ? 'Event identity conflicts with existing idempotency record' : 'Event already ingested',
            };
            results.push(ack);
            insertAck.run(auth.organizationId, auth.deviceId, acceptedEvent.eventId, acceptedEvent.idempotencyKey, ack.status, again.server_seq, ack.code, ack.message, receivedAt);
            continue;
          }
        }
        throw err; // unexpected -> transaction rollback, no ack
      }
    }
    return results;
  });

  return tx(events);
}

export function downloadEvents(
  db: SyncServerDb,
  auth: AuthScope,
  options: { cursor?: string; limit: number },
): { events: any[]; nextCursor: string | null; hasMore: boolean } {
  let afterSeq = 0;
  if (options.cursor) {
    const decoded = decodeCursor(options.cursor);
    // Cursor is bound to the authenticated organization; tampering/cross-tenant reuse is rejected.
    if (decoded.organizationId && decoded.organizationId !== auth.organizationId) {
      throw new Error('INVALID_CURSOR');
    }
    afterSeq = decoded.serverSeq;
  }
  const limit = Math.max(1, Math.min(options.limit, SYNC_LIMITS.maxDownloadLimit));
  // Authorization scope is derived ONLY from trusted server-side device->organization binding.
  const rows = db.sqlite
    .prepare(
      `SELECT server_seq, event_id, device_id, idempotency_key, event_type, aggregate_type, aggregate_id, schema_version, created_at, payload_json, received_at
       FROM sync_events
       WHERE organization_id = ? AND server_seq > ?
       ORDER BY server_seq ASC
       LIMIT ?`,
    )
    .all(auth.organizationId, afterSeq, limit + 1) as Array<{
    server_seq: number;
    event_id: string;
    device_id: string;
    idempotency_key: string;
    event_type: string;
    aggregate_type: string;
    aggregate_id: string;
    schema_version: number;
    created_at: string;
    payload_json: string;
    received_at: string;
  }>;
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const events = page.map((r) => ({
    serverSeq: r.server_seq,
    eventId: r.event_id,
    deviceId: r.device_id,
    idempotencyKey: r.idempotency_key,
    eventType: r.event_type,
    aggregateType: r.aggregate_type,
    aggregateId: r.aggregate_id,
    schemaVersion: r.schema_version,
    createdAt: r.created_at,
    payload: JSON.parse(r.payload_json) as Record<string, unknown>,
    receivedAt: r.received_at,
  }));
  const last = page[page.length - 1];
  return {
    events,
    nextCursor: hasMore && last ? encodeCursor(last.server_seq, auth.organizationId) : null,
    hasMore,
  };
}
