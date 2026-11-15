import type { AppDatabase } from '../db/open.js';
import type {
  DetectedConflict,
  ClassificationResult,
  ConflictRecord,
  ConflictStatus,
  ResolutionStrategy,
  ConflictCategory,
} from './conflict-types.js';
import {
  SAFE_AUTO_RESOLVE_CATEGORIES,
  FINANCIAL_ENTITY_TYPES,
  INVENTORY_ENTITY_TYPES,
} from './conflict-types.js';
import { randomUUID } from 'node:crypto';

export function classifyConflict(conflict: DetectedConflict): ClassificationResult {
  const { conflictCategory, entityType, localState, remoteState } = conflict;

  if (SAFE_AUTO_RESOLVE_CATEGORIES.includes(conflictCategory)) {
    return {
      canAutoResolve: true,
      recommendedStrategy: 'REJECT_DUPLICATE',
      confidence: 1.0,
      requiresUserInput: false,
      classificationReason: 'Safe duplicate/out-of-order event, auto-reject',
    };
  }

  if (FINANCIAL_ENTITY_TYPES.includes(entityType)) {
    return {
      canAutoResolve: false,
      recommendedStrategy: null,
      confidence: 1.0,
      requiresUserInput: true,
      classificationReason: 'Financial transaction conflict requires manual review',
    };
  }

  if (INVENTORY_ENTITY_TYPES.includes(entityType)) {
    return {
      canAutoResolve: false,
      recommendedStrategy: null,
      confidence: 1.0,
      requiresUserInput: true,
      classificationReason: 'Inventory conflict requires manual review',
    };
  }

  const localTs = getTimestampFromState(localState);
  const remoteTs = getTimestampFromState(remoteState);

  if (localTs && remoteTs && Math.abs(localTs - remoteTs) < 1000) {
    return {
      canAutoResolve: false,
      recommendedStrategy: null,
      confidence: 0.5,
      requiresUserInput: true,
      classificationReason: 'Concurrent master data update with identical timestamps',
    };
  }

  if (localTs && remoteTs && remoteTs > localTs) {
    return {
      canAutoResolve: true,
      recommendedStrategy: 'AUTO_LATEST_TIMESTAMP',
      confidence: 0.8,
      requiresUserInput: false,
      classificationReason: 'Remote state has more recent timestamp, auto-accept',
    };
  }

  return {
    canAutoResolve: false,
    recommendedStrategy: null,
    confidence: 0.7,
    requiresUserInput: true,
    classificationReason: 'Ambiguous conflict requires manual review',
  };
}

function getTimestampFromState(state: unknown): number | null {
  if (!state || typeof state !== 'object') return null;
  const s = state as Record<string, unknown>;
  if (typeof s.createdAt === 'string') return new Date(s.createdAt).getTime();
  if (typeof s.updatedAt === 'string') return new Date(s.updatedAt).getTime();
  if (typeof s.timestamp === 'number') return s.timestamp;
  return null;
}

export function createConflictRecord(
  db: AppDatabase,
  conflict: DetectedConflict,
  classification: ClassificationResult,
  organizationId: string,
): string {
  const conflictId = randomUUID();
  const now = new Date().toISOString();

  db.sqlite
    .prepare(
      `INSERT INTO sync_conflicts (
        conflict_id, organization_id, entity_type, entity_id, local_version, remote_version,
        local_device_id, remote_device_id, conflict_category, status, detection_timestamp,
        local_state_snapshot, remote_state_snapshot, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      conflictId,
      organizationId,
      conflict.entityType,
      conflict.entityId,
      conflict.localVersion,
      conflict.remoteVersion,
      conflict.localDeviceId,
      conflict.remoteDeviceId,
      conflict.conflictCategory,
      'DETECTED' as ConflictStatus,
      now,
      JSON.stringify(conflict.localState),
      JSON.stringify(conflict.remoteState),
      now,
      now,
    );

  insertConflictHistory(db, conflictId, 'DETECTED', 'DETECTED', 'Conflict detected', null, null, now);

  return conflictId;
}

export function updateConflictStatus(
  db: AppDatabase,
  conflictId: string,
  newStatus: ConflictStatus,
  actionTaken: string,
  userId: string | null = null,
  deviceId: string | null = null,
): void {
  const now = new Date().toISOString();

  const current = db.sqlite
    .prepare('SELECT status FROM sync_conflicts WHERE conflict_id = ?')
    .get(conflictId) as { status: ConflictStatus } | undefined;

  if (!current) return;

  db.sqlite
    .prepare(
      `UPDATE sync_conflicts
       SET status = ?, updated_at = ?, classified_at = CASE WHEN ? = 'CLASSIFIED' THEN ? ELSE classified_at END,
           pending_resolution_at = CASE WHEN ? = 'PENDING_RESOLUTION' THEN ? ELSE pending_resolution_at END,
           resolved_at = CASE WHEN ? = 'RESOLVED' THEN ? ELSE resolved_at END,
           rejected_at = CASE WHEN ? = 'REJECTED' THEN ? ELSE rejected_at END
       WHERE conflict_id = ?`,
    )
    .run(
      newStatus,
      now,
      newStatus,
      now,
      newStatus,
      now,
      newStatus,
      now,
      newStatus,
      now,
      conflictId,
    );

  insertConflictHistory(db, conflictId, current.status, newStatus, actionTaken, userId, deviceId, now);
}

export function insertConflictHistory(
  db: AppDatabase,
  conflictId: string,
  previousStatus: ConflictStatus,
  newStatus: ConflictStatus,
  actionTaken: string,
  userId: string | null,
  deviceId: string | null,
  timestamp: string,
): void {
  const historyId = randomUUID();
  db.sqlite
    .prepare(
      `INSERT INTO sync_conflict_resolution_history (
        history_id, conflict_id, previous_status, new_status, action_taken, user_id, device_id, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(historyId, conflictId, previousStatus, newStatus, actionTaken, userId, deviceId, timestamp);
}

export function applyAutoResolution(
  db: AppDatabase,
  conflictId: string,
  strategy: ResolutionStrategy,
  reason: string,
): boolean {
  const now = new Date().toISOString();

  db.sqlite
    .prepare(
      `UPDATE sync_conflicts
       SET status = 'RESOLVED', resolution_strategy = ?, resolution_reason = ?,
           resolved_at = ?, updated_at = ?
       WHERE conflict_id = ?`,
    )
    .run(strategy, reason, now, now, conflictId);

  insertConflictHistory(db, conflictId, 'CLASSIFIED', 'RESOLVED', `Auto-resolved: ${reason}`, null, null, now);

  return true;
}

export function getPendingConflicts(
  db: AppDatabase,
  organizationId: string,
): ConflictRecord[] {
  const rows = db.sqlite
    .prepare(
      `SELECT conflict_id, organization_id, entity_type, entity_id, local_version, remote_version,
              local_device_id, remote_device_id, conflict_category, status, detection_timestamp,
              classified_at, pending_resolution_at, resolved_at, rejected_at, resolution_strategy,
              resolution_user_id, resolution_reason, local_state_snapshot, remote_state_snapshot,
              audit_metadata, created_at, updated_at
       FROM sync_conflicts
       WHERE organization_id = ? AND status IN ('DETECTED', 'CLASSIFIED', 'PENDING_RESOLUTION')
       ORDER BY detection_timestamp ASC`,
    )
    .all(organizationId) as Array<{
      conflict_id: string;
      organization_id: string;
      entity_type: string;
      entity_id: string;
      local_version: number | null;
      remote_version: number | null;
      local_device_id: string;
      remote_device_id: string;
      conflict_category: string;
      status: string;
      detection_timestamp: string;
      classified_at: string | null;
      pending_resolution_at: string | null;
      resolved_at: string | null;
      rejected_at: string | null;
      resolution_strategy: string | null;
      resolution_user_id: string | null;
      resolution_reason: string | null;
      local_state_snapshot: string;
      remote_state_snapshot: string;
      audit_metadata: string | null;
      created_at: string;
      updated_at: string;
    }>;

  return rows.map((r) => ({
    conflictId: r.conflict_id,
    organizationId: r.organization_id,
    entityType: r.entity_type as any,
    entityId: r.entity_id,
    localVersion: r.local_version,
    remoteVersion: r.remote_version,
    localDeviceId: r.local_device_id,
    remoteDeviceId: r.remote_device_id,
    conflictCategory: r.conflict_category as any,
    status: r.status as any,
    detectionTimestamp: r.detection_timestamp,
    classifiedAt: r.classified_at,
    pendingResolutionAt: r.pending_resolution_at,
    resolvedAt: r.resolved_at,
    rejectedAt: r.rejected_at,
    resolutionStrategy: r.resolution_strategy as any,
    resolutionUserId: r.resolution_user_id,
    resolutionReason: r.resolution_reason,
    localStateSnapshot: r.local_state_snapshot,
    remoteStateSnapshot: r.remote_state_snapshot,
    auditMetadata: r.audit_metadata,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}