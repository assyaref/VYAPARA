import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { AppDatabase } from '../db/open.js';
import { setupAdmin } from '../services/auth.js';
import { createProduct } from '../services/products.js';
import { applyInboundEventAtomically, reprocessDeferredEvents } from './inbound.js';
import { detectConflictForEvent, upsertEntityVersion, getEntityVersion } from './conflict-detector.js';
import { classifyConflict, createConflictRecord, getPendingConflicts, applyAutoResolution } from './conflict-resolver.js';
import type { DetectedConflict } from './conflict-types.js';

vi.mock('electron', () => ({
  app: { getPath: () => process.cwd() },
  net: { online: true },
  safeStorage: { isEncryptionAvailable: () => false, encryptString: (s: string) => Buffer.from(s), decryptString: (b: Buffer) => b.toString() },
}));

const localDeviceId = '550e8400-e29b-41d4-a716-446655440002';
  const remoteDeviceId = '550e8400-e29b-41d4-a716-446655440003';
  const organizationId = 'org-test-001';

function makeDb(): AppDatabase {
  const db = new AppDatabase(':memory:');
  setupAdmin(db, { name: 'Admin', email: 'admin@vyapara.com', password: 'rahasia123456' });
  return db;
}

describe('Phase 4.4 Conflict Resolution Engine', () => {
  let db: AppDatabase;

  beforeEach(() => {
    db = makeDb();
    vi.useFakeTimers();
  });

  afterEach(() => {
    db.close();
    vi.useRealTimers();
  });

  describe('Conflict Detection', () => {
    it('detects duplicate events correctly', () => {
      const uid = (db.sqlite.prepare("SELECT id FROM users WHERE email = 'admin@vyapara.com'").get() as { id: string }).id;
      const product = createProduct(db, { name: 'Produk Uji Duplikat', barcode: 'BD-' + randomUUID(), sku: 'SD-' + randomUUID(), price: 10000, cost: 5000, stock: 10, userId: uid });
      const ev = {
        serverSeq: 1,
        eventId: '550e8400-e29b-41d4-a716-446655440000',
        deviceId: remoteDeviceId,
        idempotencyKey: 'idem-dup-001',
        eventType: 'sale.created',
        aggregateType: 'sale',
        aggregateId: '550e8400-e29b-41d4-a716-446655440001',
        schemaVersion: 1,
        createdAt: new Date().toISOString(),
        payload: {
          transactionId: 't-dup-001',
          transactionNumber: 'INV-DUP-001',
          userId: uid,
          items: [{ productId: product.id, quantity: 1, unitPrice: 10000, unitCost: 5000, subtotal: 10000 }],
          payments: [{ method: 'cash', amount: 10000 }],
          totalAmount: 10000,
          paymentAmount: 10000,
          discountAmount: 0,
          taxAmount: 0,
          paymentMethod: 'cash',
          createdAt: new Date().toISOString(),
        },
        receivedAt: new Date().toISOString(),
        remoteVersion: 1,
      };

      const firstResult = applyInboundEventAtomically(db, ev, localDeviceId, organizationId);
      expect(firstResult.kind).toBe('applied');

      const secondResult = applyInboundEventAtomically(db, ev, localDeviceId, organizationId);
      expect(secondResult.kind).toBe('ignored');
      expect((secondResult as any).reason).toBe('duplicate_event');
    });

    it('detects concurrent update conflicts', () => {
      upsertEntityVersion(db, 'product', 'prod-001', organizationId, localDeviceId);

      const conflict = detectConflictForEvent(db, 'product', 'prod-001', organizationId, remoteDeviceId, 1, 'event-remote-001', { name: 'Remote Update' }, localDeviceId);

      expect(conflict).not.toBeNull();
      expect(conflict?.conflictCategory).toBe('CONCURRENT_UPDATE');
      expect(conflict?.entityId).toBe('prod-001');
    });

    it('tracks entity versions correctly', () => {
      const v1 = upsertEntityVersion(db, 'product', 'prod-001', organizationId, localDeviceId);
      expect(v1).toBe(1);

      const v2 = upsertEntityVersion(db, 'product', 'prod-001', organizationId, localDeviceId);
      expect(v2).toBe(2);

      const versionRecord = getEntityVersion(db, 'product', 'prod-001', organizationId);
      expect(versionRecord?.currentVersion).toBe(2);
      expect(versionRecord?.lastModifiedDeviceId).toBe(localDeviceId);
    });
  });

  describe('Conflict Classification', () => {
    it('classifies duplicate events as auto-resolvable', () => {
      const conflict: DetectedConflict = {
        entityType: 'product',
        entityId: 'prod-001',
        localDeviceId,
        remoteDeviceId,
        conflictCategory: 'DUPLICATE_EVENT',
        localState: null,
        remoteState: {},
        localVersion: 1,
        remoteVersion: 1,
      };

      const classification = classifyConflict(conflict);
      expect(classification.canAutoResolve).toBe(true);
      expect(classification.requiresUserInput).toBe(false);
      expect(classification.confidence).toBe(1.0);
    });

    it('classifies financial conflicts as requiring manual review', () => {
      const conflict: DetectedConflict = {
        entityType: 'transaction',
        entityId: 'txn-001',
        localDeviceId,
        remoteDeviceId,
        conflictCategory: 'FINANCIAL_CONFLICT',
        localState: {},
        remoteState: {},
        localVersion: 1,
        remoteVersion: 1,
      };

      const classification = classifyConflict(conflict);
      expect(classification.canAutoResolve).toBe(false);
      expect(classification.requiresUserInput).toBe(true);
    });

    it('classifies inventory conflicts as requiring manual review', () => {
      const conflict: DetectedConflict = {
        entityType: 'stock_movement',
        entityId: 'move-001',
        localDeviceId,
        remoteDeviceId,
        conflictCategory: 'INVENTORY_CONFLICT',
        localState: {},
        remoteState: {},
        localVersion: 1,
        remoteVersion: 1,
      };

      const classification = classifyConflict(conflict);
      expect(classification.canAutoResolve).toBe(false);
      expect(classification.requiresUserInput).toBe(true);
    });

    it('classifies master data with newer remote timestamp as auto-resolvable', () => {
      const now = Date.now();
      const conflict: DetectedConflict = {
        entityType: 'product',
        entityId: 'prod-001',
        localDeviceId,
        remoteDeviceId,
        conflictCategory: 'CONCURRENT_UPDATE',
        localState: { createdAt: new Date(now - 10000).toISOString() },
        remoteState: { createdAt: new Date(now).toISOString() },
        localVersion: 1,
        remoteVersion: 1,
      };

      const classification = classifyConflict(conflict);
      expect(classification.canAutoResolve).toBe(true);
      expect(classification.recommendedStrategy).toBe('AUTO_LATEST_TIMESTAMP');
    });
  });

  describe('Conflict Resolution Workflow', () => {
    it('creates conflict records with correct initial status', () => {
      const conflict: DetectedConflict = {
        entityType: 'product',
        entityId: 'prod-001',
        localDeviceId,
        remoteDeviceId,
        conflictCategory: 'CONCURRENT_UPDATE',
        localState: { version: 1 },
        remoteState: { version: 1 },
        localVersion: 1,
        remoteVersion: 1,
      };

      const classification = classifyConflict(conflict);
      const conflictId = createConflictRecord(db, conflict, classification, organizationId);

      const pending = getPendingConflicts(db, organizationId);
      expect(pending).toHaveLength(1);
      const firstPending = pending[0];
      expect(firstPending?.conflictId).toBe(conflictId);
      expect(firstPending?.status).toBe('DETECTED');
    });

    it('applies auto-resolution correctly', () => {
      const conflict: DetectedConflict = {
        entityType: 'product',
        entityId: 'prod-001',
        localDeviceId,
        remoteDeviceId,
        conflictCategory: 'DUPLICATE_EVENT',
        localState: null,
        remoteState: {},
        localVersion: 1,
        remoteVersion: 1,
      };

      const classification = classifyConflict(conflict);
      const conflictId = createConflictRecord(db, conflict, classification, organizationId);
      applyAutoResolution(db, conflictId, 'REJECT_DUPLICATE', 'Duplicate event detected');

      const pending = getPendingConflicts(db, organizationId);
      expect(pending).toHaveLength(0);
    });
  });

  describe('Deferred Event Reprocessing', () => {
    it('reprocesses DEFERRED_PHASE_4_4 events correctly', () => {
      const ev = {
        serverSeq: 100,
        eventId: 'event-deferred-001',
        deviceId: remoteDeviceId,
        idempotencyKey: 'idem-deferred-001',
        eventType: 'product.created',
        aggregateType: 'product',
        aggregateId: 'prod-new-001',
        schemaVersion: 1,
        createdAt: new Date().toISOString(),
        payload: { name: 'New Deferred Product' },
        receivedAt: new Date().toISOString(),
      };

      db.sqlite
        .prepare(
          `INSERT INTO sync_applied_events (event_id, device_id, organization_id, idempotency_key, event_type, aggregate_type, aggregate_id, schema_version, server_seq, payload_hash, status, reason, applied_at, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(ev.eventId, ev.deviceId, organizationId, ev.idempotencyKey, ev.eventType, ev.aggregateType, ev.aggregateId, ev.schemaVersion, ev.serverSeq, JSON.stringify(ev.payload).slice(0, 2000), 'quarantined', 'DEFERRED_PHASE_4_4', new Date().toISOString(), new Date().toISOString());

      db.sqlite
        .prepare(
          `INSERT INTO sync_quarantine (id, event_id, device_id, organization_id, idempotency_key, event_type, aggregate_type, aggregate_id, schema_version, server_seq, payload, reason_code, reason_message, quarantined_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run('q-001', ev.eventId, ev.deviceId, organizationId, ev.idempotencyKey, ev.eventType, ev.aggregateType, ev.aggregateId, ev.schemaVersion, ev.serverSeq, JSON.stringify(ev.payload), 'DEFERRED_PHASE_4_4', 'Phase 4.3 quarantine', new Date().toISOString());

      const result = reprocessDeferredEvents(db, localDeviceId, organizationId);
      expect(result.processed).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Multi-Tenant Isolation', () => {
    it('filters pending conflicts by organization', () => {
      const conflict1: DetectedConflict = {
        entityType: 'product',
        entityId: 'prod-001',
        localDeviceId,
        remoteDeviceId,
        conflictCategory: 'CONCURRENT_UPDATE',
        localState: {},
        remoteState: {},
        localVersion: 1,
        remoteVersion: 1,
      };

      const conflict2: DetectedConflict = {
        entityType: 'product',
        entityId: 'prod-002',
        localDeviceId,
        remoteDeviceId,
        conflictCategory: 'CONCURRENT_UPDATE',
        localState: {},
        remoteState: {},
        localVersion: 1,
        remoteVersion: 1,
      };

      const classification = classifyConflict(conflict1);
      createConflictRecord(db, conflict1, classification, organizationId);

      const org1Conflicts = getPendingConflicts(db, organizationId);
      const org2Conflicts = getPendingConflicts(db, 'org-other-001');

      expect(org1Conflicts.length).toBeGreaterThanOrEqual(1);
      expect(org2Conflicts.length).toBe(0);
    });
  });
});