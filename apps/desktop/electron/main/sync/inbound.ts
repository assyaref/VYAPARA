import { randomUUID } from 'node:crypto';
import type { AppDatabase } from '../db/open.js';
import { syncEventEnvelopeSchema, SYNC_SCHEMA_VERSION, SYNC_EVENT_TYPES } from 'vyapara-shared';
import { nowIso, safeErrorSummary } from './types';
import { detectConflictForEvent, upsertEntityVersion } from './conflict-detector.js';
import { classifyConflict, createConflictRecord, applyAutoResolution, updateConflictStatus } from './conflict-resolver.js';
import type { EntityType } from './conflict-types.js';
import { createTransaction, type TransactionInput } from '../services/transactions.js';
import { recordStockMovement, type StockMovementInput } from '../services/inventory.js';
import { recordCustomerTransaction } from '../services/customer.js';
import { createSalesReturn } from '../services/sales-returns.js';
import { AppError } from '../errors.js';

export type InboundEvent = {
  serverSeq: number;
  eventId: string;
  deviceId: string;
  idempotencyKey: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  schemaVersion: number;
  createdAt: string;
  payload: Record<string, unknown>;
  receivedAt: string;
  /** Remote entity version supplied by the server. Required for causal conflict detection. */
  remoteVersion?: number;
};

export type ApplyOutcome =
  | { kind: 'applied' }
  | { kind: 'ignored'; reason: string }
  | { kind: 'quarantined'; code: string; reason: string }
  | { kind: 'rejected'; code: string; reason: string }
  | { kind: 'failed'; code: string; reason: string; retryable: boolean }
  | { kind: 'conflict_detected'; conflictId: string; classification: string };

function payloadHash(payload: unknown): string {
  try { return JSON.stringify(payload); } catch { return '[unserializable]'; }
}

function insertReceipt(db: AppDatabase, ev: InboundEvent, orgId: string | null, status: 'applied'|'quarantined'|'ignored', reason: string | null): void {
  const now = nowIso();
  db.sqlite
    .prepare(
      `INSERT INTO sync_applied_events (
        event_id, device_id, organization_id, idempotency_key, event_type, aggregate_type, aggregate_id,
        schema_version, server_seq, payload_hash, status, reason, applied_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(ev.eventId, ev.deviceId, orgId, ev.idempotencyKey, ev.eventType, ev.aggregateType, ev.aggregateId, ev.schemaVersion, ev.serverSeq, payloadHash(ev.payload).slice(0,2000), status, reason, now, now);
}

function insertQuarantine(db: AppDatabase, ev: InboundEvent, orgId: string | null, code: string, message: string, conflictId?: string): void {
  db.sqlite
    .prepare(
      `INSERT INTO sync_quarantine (
        id, event_id, device_id, organization_id, idempotency_key, event_type, aggregate_type, aggregate_id,
        schema_version, server_seq, payload, reason_code, reason_message, quarantined_at, conflict_id, remote_version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(randomUUID(), ev.eventId, ev.deviceId, orgId, ev.idempotencyKey, ev.eventType, ev.aggregateType, ev.aggregateId, ev.schemaVersion, ev.serverSeq, JSON.stringify(ev.payload), code, message.slice(0,1000), nowIso(), conflictId ?? null, ev.remoteVersion ?? null);
}

function validateInbound(ev: InboundEvent): Extract<ApplyOutcome, { kind: 'quarantined' }> | null {
  if (ev.schemaVersion !== SYNC_SCHEMA_VERSION) {
    return { kind: 'quarantined', code: 'SCHEMA_UNSUPPORTED', reason: `Unsupported schema version ${ev.schemaVersion}` };
  }
  if (!SYNC_EVENT_TYPES.includes(ev.eventType as any)) {
    return { kind: 'quarantined', code: 'EVENT_TYPE_UNSUPPORTED', reason: `Unsupported event type ${ev.eventType}` };
  }
  const parsed = syncEventEnvelopeSchema.safeParse({
    eventId: ev.eventId,
    deviceId: ev.deviceId,
    idempotencyKey: ev.idempotencyKey,
    eventType: ev.eventType,
    aggregateType: ev.aggregateType,
    aggregateId: ev.aggregateId,
    schemaVersion: ev.schemaVersion,
    createdAt: ev.createdAt,
    payload: ev.payload,
  });
  if (!parsed.success) {
    return { kind: 'quarantined', code: 'INVALID_PAYLOAD', reason: 'Inbound event failed schema validation' };
  }
  // Remote version is required metadata for causal conflict detection. Reject
  // events that omit it so stale/concurrent changes cannot bypass detection.
  if (typeof ev.remoteVersion !== 'number' || !Number.isFinite(ev.remoteVersion) || ev.remoteVersion < 0) {
    return { kind: 'quarantined', code: 'MISSING_REMOTE_VERSION', reason: 'Remote entity version is required' };
  }
  return null;
}

function getEntityTypeFromEvent(eventType: string): EntityType {
  const typeMap: Record<string, EntityType> = {
    'product.created': 'product',
    'product.updated': 'product',
    'category.created': 'category',
    'category.updated': 'category',
    'supplier.created': 'supplier',
    'supplier.updated': 'supplier',
    'customer.created': 'customer',
    'customer.updated': 'customer',
    'sale.created': 'transaction',
    'customer.payment.recorded': 'payment',
    'sales_return.created': 'sales_return',
    'inventory.movement.recorded': 'stock_movement',
    'inventory.adjustment.recorded': 'stock_adjustment',
  };
  return typeMap[eventType] || 'product';
}

function applyBusinessEvent(db: AppDatabase, ev: InboundEvent, organizationId: string, localDeviceId: string): void {
  const entityType = getEntityTypeFromEvent(ev.eventType);
  const p = ev.payload as Record<string, unknown>;

  switch (ev.eventType) {
    case 'sale.created':
      applySaleCreated(db, ev, p, organizationId, localDeviceId);
      break;
    case 'inventory.movement.recorded':
      applyInventoryMovement(db, ev, p, organizationId, localDeviceId);
      break;
    case 'customer.payment.recorded':
      applyCustomerPayment(db, ev, p, organizationId, localDeviceId);
      break;
    case 'sales_return.created':
      applySalesReturn(db, ev, p, organizationId, localDeviceId);
      break;
    default:
      throw new AppError('BUSINESS_HANDLER_NOT_FOUND', `No business handler for event type ${ev.eventType}`);
  }

  upsertEntityVersion(db, entityType, ev.aggregateId, organizationId, localDeviceId, ev.remoteVersion);
}

/* ---------------- sale.created ---------------- */

function applySaleCreated(db: AppDatabase, ev: InboundEvent, p: Record<string, unknown>, organizationId: string, localDeviceId: string): void {
  const userId = typeof p.userId === 'string' && p.userId.length > 0 ? p.userId : localUserId(db, organizationId);
  const customerId = typeof p.customerId === 'string' && p.customerId.length > 0 ? p.customerId : undefined;

  const items = Array.isArray(p.items) ? p.items : [];
  if (items.length === 0) {
    throw new AppError('VALIDATION', 'Sale must contain at least one item');
  }

  const txItems: { productId: string; quantity: number }[] = [];
  for (const item of items) {
    if (!item || typeof item !== 'object') {
      throw new AppError('VALIDATION', 'Invalid sale item');
    }
    const it = item as Record<string, unknown>;
    const productId = typeof it.productId === 'string' && it.productId.length > 0 ? it.productId : null;
    const quantity = typeof it.quantity === 'number' ? it.quantity : 0;
    if (!productId || !Number.isFinite(quantity) || quantity <= 0) {
      throw new AppError('VALIDATION', 'Sale item must reference a valid product and quantity');
    }
    txItems.push({ productId, quantity });
  }

  const payments: Array<{ method: string; amount: number }> = Array.isArray(p.payments) ? p.payments : [];
  const totalAmount = typeof p.totalAmount === 'number' ? p.totalAmount : 0;
  const paymentAmount = typeof p.paymentAmount === 'number' ? p.paymentAmount : 0;
  const discountAmount = typeof p.discountAmount === 'number' ? p.discountAmount : 0;
  const taxAmount = typeof p.taxAmount === 'number' ? p.taxAmount : 0;

  const input: TransactionInput = {
    idempotencyKey: ev.idempotencyKey,
    items: txItems,
    discountAmount,
    payments: payments as never,
    customerId,
    notes: typeof p.notes === 'string' ? p.notes : `Synced sale ${ev.eventId}`,
  };

  createTransaction(db, { userId, ...input });
}

/* ---------------- inventory.movement.recorded ---------------- */

function applyInventoryMovement(db: AppDatabase, ev: InboundEvent, p: Record<string, unknown>, organizationId: string, localDeviceId: string): void {
  const productId = typeof p.productId === 'string' && p.productId.length > 0 ? p.productId : null;
  const movementType = typeof p.movementType === 'string' ? p.movementType : 'stock_out';
  const quantityChange = typeof p.quantityChange === 'number' ? p.quantityChange : 0;
  const userId = typeof p.userId === 'string' && p.userId.length > 0 ? p.userId : localUserId(db, organizationId);

  if (!productId) {
    throw new AppError('VALIDATION', 'Inventory movement requires a productId');
  }
  if (!Number.isFinite(quantityChange) || quantityChange === 0) {
    throw new AppError('VALIDATION', 'Inventory movement requires a non-zero quantityChange');
  }

  recordStockMovement(db, {
    productId,
    movementType,
    quantityChange,
    referenceType: 'transaction',
    referenceId: ev.aggregateId,
    notes: typeof p.notes === 'string' ? p.notes : `Synced inventory movement ${ev.eventId}`,
    userId,
    idempotencyKey: ev.idempotencyKey,
  });
}

/* ---------------- customer.payment.recorded ---------------- */

function applyCustomerPayment(db: AppDatabase, ev: InboundEvent, p: Record<string, unknown>, organizationId: string, localDeviceId: string): void {
  const customerId = typeof p.customerId === 'string' && p.customerId.length > 0 ? p.customerId : undefined;
  const amount = typeof p.amount === 'number' ? p.amount : 0;
  const userId = typeof p.userId === 'string' && p.userId.length > 0 ? p.userId : localUserId(db, organizationId);

  if (!customerId) {
    throw new AppError('VALIDATION', 'Customer payment requires a customerId');
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new AppError('VALIDATION', 'Customer payment requires a positive amount');
  }

  recordCustomerTransaction(db, {
    customerId,
    transactionType: 'payment',
    amount,
    referenceType: 'payment',
    referenceId: ev.aggregateId,
    description: typeof p.description === 'string' ? p.description : `Synced customer payment ${ev.eventId}`,
    userId,
    idempotencyKey: ev.idempotencyKey,
  });
}

/* ---------------- sales_return.created ---------------- */

function applySalesReturn(db: AppDatabase, ev: InboundEvent, p: Record<string, unknown>, organizationId: string, localDeviceId: string): void {
  const transactionId = typeof p.transactionId === 'string' && p.transactionId.length > 0 ? p.transactionId : null;
  const userId = typeof p.userId === 'string' && p.userId.length > 0 ? p.userId : localUserId(db, organizationId);

  if (!transactionId) {
    throw new AppError('VALIDATION', 'Sales return requires a transactionId');
  }

  createSalesReturn(db, {
    transactionId,
    notes: typeof p.notes === 'string' ? p.notes : `Synced sales return ${ev.eventId}`,
    userId,
  });
}

/* ---------------- helpers ---------------- */

function localUserId(db: AppDatabase, organizationId: string): string {
  const row = db.sqlite
    .prepare(
      `SELECT id FROM users WHERE organization_id = ? AND is_active = 1 ORDER BY created_at ASC LIMIT 1`,
    )
    .get(organizationId) as { id: string } | undefined;
  if (!row) {
    throw new AppError('NOT_FOUND', `No active user found for organization ${organizationId}`);
  }
  return row.id;
}

export function applyInboundEventAtomically(
  db: AppDatabase,
  ev: InboundEvent,
  localDeviceId: string,
  organizationId: string | null,
): ApplyOutcome {
  const existing = db.sqlite.prepare('SELECT status FROM sync_applied_events WHERE event_id = ?').get(ev.eventId) as { status: string } | undefined;
  if (existing) {
    return { kind: 'ignored', reason: 'duplicate_event' };
  }

  const invalid = validateInbound(ev);
  const tx = db.sqlite.transaction((): ApplyOutcome => {
    if (invalid) {
      insertReceipt(db, ev, organizationId, 'quarantined', `${invalid.code}: ${invalid.reason}`);
      insertQuarantine(db, ev, organizationId, invalid.code, invalid.reason);
      return invalid;
    }
    if (ev.deviceId === localDeviceId) {
      insertReceipt(db, ev, organizationId, 'ignored', 'self_originated');
      return { kind: 'ignored', reason: 'self_originated' };
    }

    const entityType = getEntityTypeFromEvent(ev.eventType);
    const detectedConflict = detectConflictForEvent(db, entityType, ev.aggregateId, organizationId ?? '', ev.deviceId, ev.remoteVersion, ev.eventId, ev.payload, localDeviceId);

    if (detectedConflict) {
      const classification = classifyConflict(detectedConflict);
      const conflictId = createConflictRecord(db, detectedConflict, classification, organizationId ?? '');
      updateConflictStatus(db, conflictId, 'CLASSIFIED', 'Conflict classified by engine');

      if (classification.canAutoResolve && classification.recommendedStrategy) {
        applyAutoResolution(db, conflictId, classification.recommendedStrategy, classification.classificationReason);
        insertReceipt(db, ev, organizationId, 'ignored', `AUTO_RESOLVED: ${classification.classificationReason}`);
        return { kind: 'ignored', reason: `auto_resolved_${classification.recommendedStrategy}` };
      }

      insertReceipt(db, ev, organizationId, 'quarantined', `CONFLICT_DETECTED: ${classification.classificationReason}`);
      insertQuarantine(db, ev, organizationId, 'CONFLICT_DETECTED', classification.classificationReason, conflictId);
      return { kind: 'conflict_detected', conflictId, classification: classification.classificationReason };
    }

    try {
      // Nested savepoint: if the business handler throws after partial writes,
      // the savepoint rolls those writes back; the outer transaction only ever
      // commits the receipt + quarantine records.
      db.sqlite.transaction(() => applyBusinessEvent(db, ev, organizationId ?? '', localDeviceId))();
    } catch (applyErr) {
      // Business handler failure (e.g. sale references a product that does not exist
      // locally). Roll back any partial write and quarantine the event instead of
      // throwing — one poisoned event must not wedge the whole page/drain.
      const msg = safeErrorSummary(applyErr);
      insertReceipt(db, ev, organizationId, 'quarantined', `BUSINESS_APPLY_FAILED: ${msg}`);
      insertQuarantine(db, ev, organizationId, 'BUSINESS_APPLY_FAILED', msg);
      return { kind: 'quarantined', code: 'BUSINESS_APPLY_FAILED', reason: msg };
    }
    insertReceipt(db, ev, organizationId, 'applied', null);
    return { kind: 'applied' };
  });
  return tx();
}

export function reprocessDeferredEvents(
  db: AppDatabase,
  localDeviceId: string,
  organizationId: string | null,
): { processed: number; resolved: number; quarantined: number; recovered: number } {
  const now = nowIso();

  // --- Recovery: reset events stuck in PROCESSING after a crash back to PENDING ---
  let recovered = 0;
  const resetStmt = db.sqlite.prepare(
    `UPDATE sync_quarantine
      SET reason_code = 'DEFERRED_PHASE_4_4',
          reason_message = COALESCE(reason_message || '; ', '') || 'Recovered after interrupted processing',
          next_reprocess_at = datetime(?, '+1 minute')
     WHERE reason_code = 'PROCESSING_PHASE_4_4'
       AND (next_reprocess_at IS NULL OR next_reprocess_at <= ?)
       ${organizationId ? 'AND organization_id = ?' : ''}`,
  );
  const resetResult = organizationId
    ? resetStmt.run(now, now, organizationId)
    : resetStmt.run(now, now);
  recovered = resetResult.changes;

  // --- Select PENDING deferred events, organization-scoped ---
  const events = db.sqlite
    .prepare(
      `SELECT id, event_id, device_id, idempotency_key, event_type, aggregate_type, aggregate_id,
              schema_version, server_seq, payload, remote_version
       FROM sync_quarantine
       WHERE reason_code = 'DEFERRED_PHASE_4_4'
         AND (next_reprocess_at IS NULL OR next_reprocess_at <= ?)
         ${organizationId ? 'AND organization_id = ?' : ''}
       ORDER BY quarantined_at ASC
       LIMIT 50`,
    )
    .all(organizationId ? [now, organizationId] : [now]) as Array<{
      id: string;
      event_id: string;
      device_id: string;
      idempotency_key: string;
      event_type: string;
      aggregate_type: string;
      aggregate_id: string;
      schema_version: number;
      server_seq: number;
      payload: string;
      remote_version: number | null;
    }>;

  let processed = 0;
  let resolved = 0;
  let quarantined = 0;

  for (const row of events) {
    // Mark as PROCESSING atomically (claim the event)
    db.sqlite
      .prepare(
        `UPDATE sync_quarantine
          SET reason_code = 'PROCESSING_PHASE_4_4',
              reason_message = COALESCE(reason_message || '; ', '') || 'Processing started',
              next_reprocess_at = NULL
         WHERE id = ? AND reason_code = 'DEFERRED_PHASE_4_4'`,
      )
      .run(row.id);

    let ev: InboundEvent;
    try {
      ev = {
        serverSeq: row.server_seq,
        eventId: row.event_id,
        deviceId: row.device_id,
        idempotencyKey: row.idempotency_key,
        eventType: row.event_type,
        aggregateType: row.aggregate_type,
        aggregateId: row.aggregate_id,
        schemaVersion: row.schema_version,
        createdAt: now,
        payload: JSON.parse(row.payload),
        receivedAt: now,
        remoteVersion: row.remote_version ?? undefined,
      };
    } catch (parseErr) {
      db.sqlite
        .prepare(
          `UPDATE sync_quarantine
             SET reason_code = 'MALFORMED_PAYLOAD',
                 reason_message = ?,
                 resolved_at = ?
           WHERE id = ?`,
        )
        .run(`Payload parse error: ${(parseErr as Error).message.slice(0, 500)}`, now, row.id);
      quarantined++;
      continue;
    }

    let outcome: ApplyOutcome;
    try {
      outcome = applyInboundEventAtomically(db, ev, localDeviceId, organizationId);
    } catch (applyErr) {
      quarantined++;
      db.sqlite
        .prepare(
          `UPDATE sync_quarantine
             SET reason_code = 'PROCESSING_PHASE_4_4',
                 reason_message = ?,
                 resolution_attempts = COALESCE(resolution_attempts, 0) + 1,
                 next_reprocess_at = datetime(?, '+5 minutes')
           WHERE id = ?`,
        )
        .run(`Application error: ${(applyErr as Error).message.slice(0, 500)}`, now, row.id);
      continue;
    }

    processed++;

    if (outcome.kind === 'applied') {
      resolved++;
      db.sqlite
        .prepare(
          `UPDATE sync_quarantine
             SET reason_code = 'APPLIED',
                 resolved_at = ?
           WHERE id = ?`,
        )
        .run(now, row.id);
    } else if (outcome.kind === 'ignored') {
      const existing = db.sqlite
        .prepare(`SELECT status FROM sync_applied_events WHERE event_id = ?`)
        .get(ev.eventId) as { status: string } | undefined;
      if (existing?.status === 'applied') {
        resolved++;
        db.sqlite
          .prepare(
            `UPDATE sync_quarantine
               SET reason_code = 'DUPLICATE_APPLIED',
                   resolved_at = ?
             WHERE id = ?`,
          )
          .run(now, row.id);
      } else {
        quarantined++;
        db.sqlite
          .prepare(
            `UPDATE sync_quarantine
               SET reason_code = 'DEFERRED_PHASE_4_4',
                   reason_message = COALESCE(reason_message || '; ', '') || 'Ignored: not applied (duplicate or self)',
                   resolution_attempts = COALESCE(resolution_attempts, 0) + 1,
                   next_reprocess_at = datetime(?, '+5 minutes')
             WHERE id = ?`,
          )
          .run(now, row.id);
      }
    } else {
      quarantined++;
      db.sqlite
        .prepare(
          `UPDATE sync_quarantine
             SET reason_code = 'DEFERRED_PHASE_4_4',
                 reason_message = COALESCE(reason_message || '; ', '') || ?,
                 resolution_attempts = COALESCE(resolution_attempts, 0) + 1,
                 next_reprocess_at = datetime(?, '+5 minutes')
           WHERE id = ?`,
        )
        .run(`${outcome.kind}: ${outcomeReason(outcome)}`, now, row.id);
    }
  }

  return { processed, resolved, quarantined, recovered };
}

function outcomeReason(outcome: ApplyOutcome): string {
  if (outcome.kind === 'conflict_detected') return outcome.classification;
  if (outcome.kind === 'applied') return 'applied';
  return outcome.reason;
}

/**
 * Recover events left in PROCESSING state after an application restart.
 * Call this at sync engine startup before normal deferred processing.
 */
export function recoverInterruptedProcessing(
  db: AppDatabase,
  localDeviceId: string,
  organizationId: string | null,
): { recovered: number } {
  return { recovered: reprocessDeferredEvents(db, localDeviceId, organizationId).recovered };
}
