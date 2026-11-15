import type { AppDatabase } from '../db/open.js';
import type {
  DetectedConflict,
  EntityType,
  ConflictCategory,
  EntityVersionRecord,
} from './conflict-types.js';
import {
  INVENTORY_ENTITY_TYPES,
  FINANCIAL_ENTITY_TYPES,
  MASTER_DATA_ENTITY_TYPES,
} from './conflict-types.js';
import { randomUUID } from 'node:crypto';

export function getEntityVersion(
  db: AppDatabase,
  entityType: EntityType,
  entityId: string,
  organizationId: string,
): EntityVersionRecord | undefined {
  const row = db.sqlite
    .prepare(
      `SELECT entity_type, entity_id, organization_id, current_version, last_modified_at, last_modified_device_id, created_at
       FROM sync_entity_versions
       WHERE entity_type = ? AND entity_id = ? AND organization_id = ?`,
    )
    .get(entityType, entityId, organizationId) as
    | {
        entity_type: string;
        entity_id: string;
        organization_id: string;
        current_version: number;
        last_modified_at: string;
        last_modified_device_id: string;
        created_at: string;
      }
    | undefined;

  if (!row) return undefined;

  return {
    entityType: row.entity_type as EntityType,
    entityId: row.entity_id,
    organizationId: row.organization_id,
    currentVersion: row.current_version,
    lastModifiedAt: row.last_modified_at,
    lastModifiedDeviceId: row.last_modified_device_id,
    createdAt: row.created_at,
  };
}

export function upsertEntityVersion(
  db: AppDatabase,
  entityType: EntityType,
  entityId: string,
  organizationId: string,
  deviceId: string,
  remoteVersion?: number,
): number {
  const now = new Date().toISOString();
  const existing = getEntityVersion(db, entityType, entityId, organizationId);

  if (existing) {
    const incremented = existing.currentVersion + 1;
    // Never silently downgrade: if a remote version is supplied, the local
    // version must advance to at least remoteVersion + 1.
    const newVersion = remoteVersion !== undefined ? Math.max(incremented, remoteVersion + 1) : incremented;
    db.sqlite
      .prepare(
        `UPDATE sync_entity_versions
         SET current_version = ?, last_modified_at = ?, last_modified_device_id = ?
         WHERE entity_type = ? AND entity_id = ? AND organization_id = ?`,
      )
      .run(newVersion, now, deviceId, entityType, entityId, organizationId);
    return newVersion;
  }

  const newVersion = remoteVersion !== undefined ? Math.max(1, remoteVersion + 1) : 1;
  db.sqlite
    .prepare(
      `INSERT INTO sync_entity_versions
       (entity_type, entity_id, organization_id, current_version, last_modified_at, last_modified_device_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(entityType, entityId, organizationId, newVersion, now, deviceId, now);
  return newVersion;
}

export function detectConcurrentUpdate(
  localVersion: EntityVersionRecord | undefined,
  remoteVersion: number | undefined,
): boolean {
  if (!localVersion) return false;
  if (remoteVersion === undefined) return false;
  return localVersion.currentVersion >= remoteVersion;
}

export function detectStaleVersion(
  localVersion: EntityVersionRecord | undefined,
  remoteVersion: number | undefined,
): boolean {
  if (!localVersion) return false;
  if (remoteVersion === undefined) return false;
  return remoteVersion < localVersion.currentVersion;
}

export function detectDuplicateEvent(
  db: AppDatabase,
  eventId: string,
  organizationId: string,
): boolean {
  const count = db.sqlite
    .prepare(
      `SELECT COUNT(*) as count FROM sync_applied_events
       WHERE organization_id = ? AND event_id = ?`,
    )
    .get(organizationId, eventId) as { count: number };
  return count.count > 0;
}

export function detectOutOfOrderEvent(
  db: AppDatabase,
  entityType: EntityType,
  entityId: string,
  organizationId: string,
  requiredSequence: number,
): boolean {
  const localVersion = getEntityVersion(db, entityType, entityId, organizationId);
  if (!localVersion) return false;
  return requiredSequence !== localVersion.currentVersion + 1;
}

export function classifyConflictCategory(
  entityType: EntityType,
  hasDeleteConflict: boolean,
  isConcurrent: boolean,
  isStale: boolean,
  isDuplicate: boolean,
  isOutOfOrder: boolean,
): ConflictCategory {
  if (isDuplicate) return 'DUPLICATE_EVENT';
  if (isOutOfOrder) return 'OUT_OF_ORDER_EVENT';
  if (hasDeleteConflict) return 'DELETE_VS_UPDATE';
  if (INVENTORY_ENTITY_TYPES.includes(entityType)) return 'INVENTORY_CONFLICT';
  if (FINANCIAL_ENTITY_TYPES.includes(entityType)) return 'FINANCIAL_CONFLICT';
  if (MASTER_DATA_ENTITY_TYPES.includes(entityType)) return 'MASTER_DATA_CONFLICT';
  if (isConcurrent) return 'CONCURRENT_UPDATE';
  if (isStale) return 'STALE_VERSION';
  return 'CONCURRENT_UPDATE';
}

export function buildConflictRecord(
  entityType: EntityType,
  entityId: string,
  localDeviceId: string,
  remoteDeviceId: string,
  conflictCategory: ConflictCategory,
  localState: unknown,
  remoteState: unknown,
  localVersion: number | null,
  remoteVersion: number | null,
): DetectedConflict {
  return {
    entityType,
    entityId,
    localDeviceId,
    remoteDeviceId,
    conflictCategory,
    localState,
    remoteState,
    localVersion,
    remoteVersion,
  };
}

export function detectConflictForEvent(
  db: AppDatabase,
  entityType: EntityType,
  entityId: string,
  organizationId: string,
  remoteDeviceId: string,
  remoteVersion: number | undefined,
  remoteEventId: string,
  remoteState: unknown,
  localDeviceId: string,
): DetectedConflict | null {
  if (detectDuplicateEvent(db, remoteEventId, organizationId)) {
    return buildConflictRecord(
      entityType,
      entityId,
      localDeviceId,
      remoteDeviceId,
      'DUPLICATE_EVENT',
      null,
      remoteState,
      null,
      remoteVersion ?? null,
    );
  }

  const localVersionRecord = getEntityVersion(db, entityType, entityId, organizationId);

  if (detectConcurrentUpdate(localVersionRecord, remoteVersion)) {
    return buildConflictRecord(
      entityType,
      entityId,
      localDeviceId,
      remoteDeviceId,
      'CONCURRENT_UPDATE',
      localVersionRecord ? { version: localVersionRecord.currentVersion } : null,
      remoteState,
      localVersionRecord?.currentVersion ?? null,
      remoteVersion ?? null,
    );
  }

  if (detectStaleVersion(localVersionRecord, remoteVersion)) {
    return buildConflictRecord(
      entityType,
      entityId,
      localDeviceId,
      remoteDeviceId,
      'STALE_VERSION',
      localVersionRecord ? { version: localVersionRecord.currentVersion } : null,
      remoteState,
      localVersionRecord?.currentVersion ?? null,
      remoteVersion ?? null,
    );
  }

  return null;
}