-- Phase 4.4: Conflict Resolution Engine
-- Tracks detected conflicts, classification, resolution workflow, and audit history

CREATE TABLE IF NOT EXISTS sync_conflicts (
  conflict_id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  local_version INTEGER,
  remote_version INTEGER,
  local_device_id TEXT NOT NULL,
  remote_device_id TEXT NOT NULL,
  conflict_category TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DETECTED',
  detection_timestamp TEXT NOT NULL,
  classified_at TEXT,
  pending_resolution_at TEXT,
  resolved_at TEXT,
  rejected_at TEXT,
  resolution_strategy TEXT,
  resolution_user_id TEXT,
  resolution_reason TEXT,
  local_state_snapshot TEXT NOT NULL,
  remote_state_snapshot TEXT NOT NULL,
  audit_metadata TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sync_conflicts_org ON sync_conflicts(organization_id);
CREATE INDEX IF NOT EXISTS idx_sync_conflicts_entity ON sync_conflicts(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_sync_conflicts_status ON sync_conflicts(status);
CREATE INDEX IF NOT EXISTS idx_sync_conflicts_category ON sync_conflicts(conflict_category);
CREATE INDEX IF NOT EXISTS idx_sync_conflicts_detection ON sync_conflicts(detection_timestamp);

CREATE TABLE IF NOT EXISTS sync_conflict_resolution_history (
  history_id TEXT PRIMARY KEY,
  conflict_id TEXT NOT NULL REFERENCES sync_conflicts(conflict_id) ON DELETE CASCADE,
  previous_status TEXT NOT NULL,
  new_status TEXT NOT NULL,
  action_taken TEXT NOT NULL,
  user_id TEXT,
  device_id TEXT,
  timestamp TEXT NOT NULL,
  metadata TEXT,
  FOREIGN KEY(conflict_id) REFERENCES sync_conflicts(conflict_id)
);

CREATE INDEX IF NOT EXISTS idx_sync_conflict_history_conflict ON sync_conflict_resolution_history(conflict_id);
CREATE INDEX IF NOT EXISTS idx_sync_conflict_history_timestamp ON sync_conflict_resolution_history(timestamp);

CREATE TABLE IF NOT EXISTS sync_entity_versions (
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  current_version INTEGER NOT NULL DEFAULT 1,
  last_modified_at TEXT NOT NULL,
  last_modified_device_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY(entity_type, entity_id, organization_id)
);

CREATE INDEX IF NOT EXISTS idx_sync_entity_versions_org ON sync_entity_versions(organization_id);

ALTER TABLE sync_quarantine ADD COLUMN conflict_id TEXT;
ALTER TABLE sync_quarantine ADD COLUMN resolution_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE sync_quarantine ADD COLUMN next_reprocess_at TEXT;
ALTER TABLE sync_quarantine ADD COLUMN remote_version INTEGER;