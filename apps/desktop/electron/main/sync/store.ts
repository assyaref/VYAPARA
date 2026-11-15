import type { AppDatabase } from '../db/open';
import { SyncOutboxStatus, type SyncOutboxStatusValue } from '../services/outbox';
import { nowIso } from './types';

export function getSyncState(db: AppDatabase, key: string): string | null {
  const row = db.sqlite.prepare('SELECT value FROM sync_state WHERE key = ?').get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

export function setSyncState(db: AppDatabase, key: string, value: string): void {
  const now = nowIso();
  db.sqlite
    .prepare(
      `INSERT INTO sync_state (key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    )
    .run(key, value, now);
}

export function getDownloadCursor(db: AppDatabase, organizationId: string): string | null {
  return getSyncState(db, `download_cursor:${organizationId}`);
}

export function setDownloadCursor(db: AppDatabase, organizationId: string, cursor: string | null): void {
  const key = `download_cursor:${organizationId}`;
  if (cursor == null) {
    db.sqlite.prepare('DELETE FROM sync_state WHERE key = ?').run(key);
  } else {
    setSyncState(db, key, cursor);
  }
}

export function recoverStaleSyncingOutbox(db: AppDatabase): number {
  const info = db.sqlite
    .prepare(
      `UPDATE sync_outbox
       SET sync_status = ?, last_error = COALESCE(last_error, ?)
       WHERE sync_status = ?`,
    )
    .run(SyncOutboxStatus.pending, 'Recovered after restart', SyncOutboxStatus.syncing);
  return info.changes;
}

export function countOutbox(db: AppDatabase): { pending: number; failed: number } {
  const row = db.sqlite
    .prepare(
      `SELECT
        SUM(CASE WHEN sync_status IN ('pending','failed','syncing') THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN sync_status IN ('failed','conflict','dead') THEN 1 ELSE 0 END) AS failed
       FROM sync_outbox`,
    )
    .get() as { pending: number | null; failed: number | null };
  return { pending: row.pending ?? 0, failed: row.failed ?? 0 };
}

export type UploadCandidate = {
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
  idempotencyKey: string;
  nextRetryAt: string | null;
  attemptCount: number;
};

export function listUploadCandidates(db: AppDatabase, limit: number): UploadCandidate[] {
  const now = nowIso();
  const rows = db.sqlite
    .prepare(
      `SELECT id, device_id, event_type, aggregate_type, aggregate_id, payload, schema_version,
              created_at, sync_status, retry_count, last_error, idempotency_key,
              next_retry_at, COALESCE(attempt_count,0) as attempt_count
       FROM sync_outbox
       WHERE sync_status IN ('pending','failed')
         AND (next_retry_at IS NULL OR next_retry_at <= ?)
       ORDER BY created_at ASC
       LIMIT ?`,
    )
    .all(now, limit) as any[];
  return rows.map((r) => ({
    id: r.id,
    deviceId: r.device_id,
    eventType: r.event_type,
    aggregateType: r.aggregate_type,
    aggregateId: r.aggregate_id,
    payload: JSON.parse(r.payload) as Record<string, unknown>,
    schemaVersion: r.schema_version,
    createdAt: r.created_at,
    syncStatus: r.sync_status,
    retryCount: r.retry_count,
    lastError: r.last_error,
    idempotencyKey: r.idempotency_key,
    nextRetryAt: r.next_retry_at ?? null,
    attemptCount: r.attempt_count ?? 0,
  }));
}

export function markOutboxSyncingBatch(db: AppDatabase, ids: string[]): void {
  if (ids.length === 0) return;
  const now = nowIso();
  const stmt = db.sqlite.prepare(
    `UPDATE sync_outbox SET sync_status = 'syncing', last_attempt_at = ?, attempt_count = COALESCE(attempt_count,0) + 1 WHERE id = ?`,
  );
  const tx = db.sqlite.transaction((batch: string[]) => {
    for (const id of batch) stmt.run(now, id);
  });
  tx(ids);
}

export function markOutboxAck(db: AppDatabase, id: string, ackAt: string): void {
  db.sqlite
    .prepare(
      `UPDATE sync_outbox
       SET sync_status = 'acknowledged', server_ack_at = ?, last_error = NULL, next_retry_at = NULL
       WHERE id = ?`,
    )
    .run(ackAt, id);
}

export function markOutboxRetryable(db: AppDatabase, id: string, errorMessage: string, nextRetryAt: string): void {
  db.sqlite
    .prepare(
      `UPDATE sync_outbox
       SET sync_status = 'failed', retry_count = retry_count + 1, last_error = ?, next_retry_at = ?
       WHERE id = ?`,
    )
    .run(errorMessage.slice(0, 500), nextRetryAt, id);
}

export function markOutboxTerminal(db: AppDatabase, id: string, errorMessage: string, status: 'dead' | 'conflict' = 'dead'): void {
  db.sqlite
    .prepare(
      `UPDATE sync_outbox
       SET sync_status = ?, retry_count = retry_count + 1, last_error = ?, next_retry_at = NULL
       WHERE id = ?`,
    )
    .run(status, errorMessage.slice(0, 500), id);
}

export function revertSyncingToPending(db: AppDatabase, ids: string[]): void {
  if (ids.length === 0) return;
  const stmt = db.sqlite.prepare(`UPDATE sync_outbox SET sync_status = 'pending' WHERE id = ? AND sync_status = 'syncing'`);
  const tx = db.sqlite.transaction((batch: string[]) => { for (const id of batch) stmt.run(id); });
  tx(ids);
}

export function hasAppliedEvent(db: AppDatabase, eventId: string): boolean {
  return !!db.sqlite.prepare('SELECT 1 FROM sync_applied_events WHERE event_id = ?').get(eventId);
}

export function getLastAppliedServerSeq(db: AppDatabase, organizationId?: string): number {
  const where = organizationId ? `AND organization_id = ?` : '';
  const row = db.sqlite
    .prepare(
      `SELECT MAX(server_seq) AS m FROM sync_applied_events WHERE server_seq IS NOT NULL AND status IN ('applied','quarantined','ignored') ${where}`,
    )
    .get(organizationId ?? []) as { m: number | null };
  return row.m ?? 0;
}