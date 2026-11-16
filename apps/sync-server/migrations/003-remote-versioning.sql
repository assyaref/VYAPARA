-- Phase 4.6: per-aggregate remote_version tracking for causal conflict detection.
-- Adds a monotonic, never-reused version number per (organization_id, aggregate_type,
-- aggregate_id), assigned at ingest time. Desktop conflict detection consumes this
-- value as the remote version of the aggregate at the time the event was emitted.

PRAGMA foreign_keys = OFF;
BEGIN;

ALTER TABLE sync_events ADD COLUMN remote_version INTEGER NOT NULL DEFAULT 0;

-- Backfill existing rows: sequential version per aggregate, ordered by server_seq
UPDATE sync_events
SET remote_version = (
  SELECT COUNT(*)
  FROM sync_events s2
  WHERE s2.organization_id = sync_events.organization_id
    AND s2.aggregate_type = sync_events.aggregate_type
    AND s2.aggregate_id = sync_events.aggregate_id
    AND s2.server_seq <= sync_events.server_seq
);

CREATE INDEX IF NOT EXISTS idx_sync_events_org_aggregate ON sync_events(organization_id, aggregate_type, aggregate_id, server_seq);

COMMIT;
PRAGMA foreign_keys = ON;
