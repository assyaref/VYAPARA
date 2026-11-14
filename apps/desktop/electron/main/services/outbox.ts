import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { AppDatabase } from '../db/open';
import { AppError } from '../errors';
import { getOrCreateDeviceIdentity } from './device-identity';

export const SYNC_SCHEMA_VERSION = 1;

export const syncEventTypes = [
  'sale.created',
  'customer.payment.recorded',
  'sales_return.created',
  'inventory.movement.recorded',
] as const;

export type SyncEventType = (typeof syncEventTypes)[number];

export const SyncOutboxStatus = {
  pending: 'pending',
  syncing: 'syncing',
  acknowledged: 'acknowledged',
  failed: 'failed',
  conflict: 'conflict',
  dead: 'dead',
} as const;

export type SyncOutboxStatusValue = (typeof SyncOutboxStatus)[keyof typeof SyncOutboxStatus];

const paymentMethodSchema = z.enum(['cash', 'qris', 'transfer', 'ewallet', 'credit']);
const isoDateSchema = z.string().min(1).max(64);

const saleItemPayloadSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().int().nonnegative(),
  unitCost: z.number().int().nonnegative(),
  subtotal: z.number().int().nonnegative(),
}).passthrough();

const salePaymentPayloadSchema = z.object({
  method: paymentMethodSchema,
  amount: z.number().int().nonnegative(),
}).passthrough();

export const eventPayloadSchemas: Record<SyncEventType, z.ZodType<Record<string, unknown>>> = {
  'sale.created': z.object({
    transactionId: z.string().min(1),
    transactionNumber: z.string().min(1),
    userId: z.string().min(1),
    customerId: z.string().min(1).nullable(),
    subtotal: z.number().int().nonnegative(),
    discountAmount: z.number().int().nonnegative(),
    taxAmount: z.number().int().nonnegative(),
    totalAmount: z.number().int().nonnegative(),
    paymentAmount: z.number().int().nonnegative(),
    changeAmount: z.number().int().nonnegative(),
    paymentMethod: z.string().min(1),
    payments: z.array(salePaymentPayloadSchema).min(1),
    items: z.array(saleItemPayloadSchema).min(1),
    createdAt: isoDateSchema,
  }).passthrough(),
  'customer.payment.recorded': z.object({
    customerTransactionId: z.string().min(1),
    customerId: z.string().min(1),
    amount: z.number().int(), // negative for payment application
    balanceAfter: z.number().int(),
    referenceType: z.string().min(1).nullable(),
    referenceId: z.string().min(1).nullable(),
    description: z.string().max(300).nullable(),
    transactionDate: z.number().int(),
    userId: z.string().min(1),
  }).passthrough(),
  'sales_return.created': z.object({
    returnId: z.string().min(1),
    returnNumber: z.string().min(1),
    transactionId: z.string().min(1),
    userId: z.string().min(1),
    returnDate: z.union([z.string().min(1), z.number().int()]),
    notes: z.string().max(300).nullable(),
    items: z.array(z.object({
      productId: z.string().min(1),
      quantity: z.number().positive(),
      unitCost: z.number().nonnegative(),
      subtotal: z.number().nonnegative(),
    }).passthrough()).min(1),
  }).passthrough(),
  'inventory.movement.recorded': z.object({
    movementId: z.string().min(1),
    productId: z.string().min(1),
    movementType: z.string().min(1),
    quantityBefore: z.number(),
    quantityChange: z.number(),
    quantityAfter: z.number(),
    referenceType: z.string().min(1).nullable(),
    referenceId: z.string().min(1).nullable(),
    userId: z.string().min(1),
    createdAt: isoDateSchema,
  }).passthrough(),
};

export const outboxEventEnvelopeSchema = z.object({
  eventType: z.enum(syncEventTypes),
  schemaVersion: z.literal(SYNC_SCHEMA_VERSION),
  payload: z.record(z.string(), z.unknown()),
});

export function validateOutboxEvent(eventType: string, schemaVersion: number, payload: Record<string, unknown>): void {
  if (!syncEventTypes.includes(eventType as SyncEventType)) {
    throw new AppError('VALIDATION', `Tipe event sinkronisasi tidak dikenal: ${eventType}`);
  }
  if (schemaVersion !== SYNC_SCHEMA_VERSION) {
    throw new AppError('VALIDATION', `Versi schema event tidak didukung: ${schemaVersion}`);
  }
  const schema = eventPayloadSchemas[eventType as SyncEventType];
  const result = schema.safeParse(payload);
  if (!result.success) {
    throw new AppError('VALIDATION', 'Payload event sinkronisasi tidak valid');
  }
}

// Kept for backward compatibility with existing imports/tests
export const outboxPayloadSchema = z.record(z.string(), z.unknown());

export type OutboxEvent = {
  id: string;
  deviceId: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
  schemaVersion: number;
  createdAt: string;
  syncStatus: SyncOutboxStatusValue;
  retryCount: number;
  lastError: string | null;
  serverAckAt: string | null;
  idempotencyKey: string;
};

type OutboxRow = {
  id: string;
  device_id: string;
  event_type: string;
  aggregate_type: string;
  aggregate_id: string;
  payload: string;
  schema_version: number;
  created_at: string;
  sync_status: SyncOutboxStatusValue;
  retry_count: number;
  last_error: string | null;
  server_ack_at: string | null;
  idempotency_key: string;
};

function mapRow(row: OutboxRow): OutboxEvent {
  return {
    id: row.id,
    deviceId: row.device_id,
    eventType: row.event_type,
    aggregateType: row.aggregate_type,
    aggregateId: row.aggregate_id,
    payload: JSON.parse(row.payload) as Record<string, unknown>,
    schemaVersion: row.schema_version,
    createdAt: row.created_at,
    syncStatus: row.sync_status,
    retryCount: row.retry_count,
    lastError: row.last_error,
    serverAckAt: row.server_ack_at,
    idempotencyKey: row.idempotency_key,
  };
}

export type AppendOutboxInput = {
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
  idempotencyKey?: string;
  schemaVersion?: number;
  createdAt?: string;
};

/** Appends an outbox record using the provided DB connection/transaction context. Must be called inside the same business transaction. */
export function appendOutboxEvent(db: AppDatabase, input: AppendOutboxInput): OutboxEvent {
  const identity = getOrCreateDeviceIdentity(db);
  const schemaVersion = input.schemaVersion ?? SYNC_SCHEMA_VERSION;
  validateOutboxEvent(input.eventType, schemaVersion, input.payload);
  const now = input.createdAt ?? new Date().toISOString();
  const event: OutboxEvent = {
    id: randomUUID(),
    deviceId: identity.deviceId,
    eventType: input.eventType,
    aggregateType: input.aggregateType,
    aggregateId: input.aggregateId,
    payload: input.payload,
    schemaVersion,
    createdAt: now,
    syncStatus: SyncOutboxStatus.pending,
    retryCount: 0,
    lastError: null,
    serverAckAt: null,
    idempotencyKey: input.idempotencyKey ?? randomUUID(),
  };

  try {
    db.sqlite
      .prepare(
        `INSERT INTO sync_outbox (
          id, device_id, event_type, aggregate_type, aggregate_id, payload, schema_version,
          created_at, sync_status, retry_count, last_error, server_ack_at, idempotency_key
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, NULL, ?)`,
      )
      .run(
        event.id,
        event.deviceId,
        event.eventType,
        event.aggregateType,
        event.aggregateId,
        JSON.stringify(event.payload),
        event.schemaVersion,
        event.createdAt,
        event.syncStatus,
        event.idempotencyKey,
      );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('UNIQUE constraint failed') && message.includes('idempotency_key')) {
      throw new AppError('CONFLICT', 'Event sinkronisasi duplikat terdeteksi');
    }
    throw error;
  }

  return event;
}

export function listOutboxEvents(
  db: AppDatabase,
  filters: { status?: SyncOutboxStatusValue; limit?: number } = {},
): OutboxEvent[] {
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (filters.status) {
    clauses.push('sync_status = ?');
    params.push(filters.status);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const limit = filters.limit ?? 200;
  const rows = db.sqlite
    .prepare(
      `SELECT id, device_id, event_type, aggregate_type, aggregate_id, payload, schema_version,
              created_at, sync_status, retry_count, last_error, server_ack_at, idempotency_key
       FROM sync_outbox ${where} ORDER BY created_at ASC LIMIT ?`,
    )
    .all(...params, limit) as OutboxRow[];
  return rows.map(mapRow);
}

export function markOutboxSyncing(db: AppDatabase, id: string): void {
  db.sqlite.prepare("UPDATE sync_outbox SET sync_status = 'syncing' WHERE id = ?").run(id);
}

export function markOutboxAcknowledged(db: AppDatabase, id: string, ackAt = new Date().toISOString()): void {
  db.sqlite
    .prepare("UPDATE sync_outbox SET sync_status = 'acknowledged', server_ack_at = ?, last_error = NULL WHERE id = ?")
    .run(ackAt, id);
}

export function markOutboxFailed(db: AppDatabase, id: string, errorMessage: string, terminal = false): void {
  const status = terminal ? SyncOutboxStatus.dead : SyncOutboxStatus.failed;
  db.sqlite
    .prepare(
      'UPDATE sync_outbox SET sync_status = ?, retry_count = retry_count + 1, last_error = ? WHERE id = ?',
    )
    .run(status, errorMessage.slice(0, 500), id);
}

export function markOutboxConflict(db: AppDatabase, id: string, errorMessage: string): void {
  db.sqlite
    .prepare(
      "UPDATE sync_outbox SET sync_status = 'conflict', retry_count = retry_count + 1, last_error = ? WHERE id = ?",
    )
    .run(errorMessage.slice(0, 500), id);
}
