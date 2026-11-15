-- Phase 4.2.1: tenant isolation hardening
-- Adds explicit organization ownership and binds devices/events to organizations.

PRAGMA foreign_keys = OFF;
BEGIN;

CREATE TABLE IF NOT EXISTS sync_organizations (
  organization_id TEXT PRIMARY KEY,
  name TEXT,
  created_at TEXT NOT NULL
);

-- Backfill default org for any existing data (dev/migration safety; no existing production tenant model)
INSERT OR IGNORE INTO sync_organizations (organization_id, name, created_at)
VALUES ('00000000-0000-4000-8000-000000000001', 'default-migrated-organization', datetime('now'));

CREATE TABLE IF NOT EXISTS sync_devices_new (
  device_id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  device_name TEXT,
  enrollment_secret_hash TEXT NOT NULL,
  token_hash TEXT,
  token_expires_at TEXT,
  status TEXT NOT NULL CHECK(status IN ('active','revoked','inactive')) DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  revoked_at TEXT,
  revoke_reason TEXT,
  FOREIGN KEY(organization_id) REFERENCES sync_organizations(organization_id)
);

INSERT INTO sync_devices_new (device_id, organization_id, device_name, enrollment_secret_hash, token_hash, token_expires_at, status, created_at, updated_at, revoked_at, revoke_reason)
SELECT device_id, '00000000-0000-4000-8000-000000000001', device_name, enrollment_secret_hash, token_hash, token_expires_at, status, created_at, updated_at, revoked_at, revoke_reason
FROM sync_devices;

DROP TABLE sync_devices;
ALTER TABLE sync_devices_new RENAME TO sync_devices;
CREATE INDEX IF NOT EXISTS idx_sync_devices_org ON sync_devices(organization_id);

CREATE TABLE IF NOT EXISTS sync_events_new (
  server_seq INTEGER PRIMARY KEY AUTOINCREMENT,
  organization_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  event_type TEXT NOT NULL,
  aggregate_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  schema_version INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  received_at TEXT NOT NULL,
  ingest_status TEXT NOT NULL CHECK(ingest_status IN ('accepted','duplicate','conflict')) DEFAULT 'accepted',
  UNIQUE(device_id, event_id),
  UNIQUE(device_id, idempotency_key),
  FOREIGN KEY(device_id) REFERENCES sync_devices(device_id),
  FOREIGN KEY(organization_id) REFERENCES sync_organizations(organization_id)
);

INSERT INTO sync_events_new (server_seq, organization_id, event_id, device_id, idempotency_key, event_type, aggregate_type, aggregate_id, schema_version, created_at, payload_json, received_at, ingest_status)
SELECT server_seq, '00000000-0000-4000-8000-000000000001', event_id, device_id, idempotency_key, event_type, aggregate_type, aggregate_id, schema_version, created_at, payload_json, received_at, ingest_status
FROM sync_events;

DROP TABLE sync_events;
ALTER TABLE sync_events_new RENAME TO sync_events;
CREATE INDEX IF NOT EXISTS idx_sync_events_org_seq ON sync_events(organization_id, server_seq);
CREATE INDEX IF NOT EXISTS idx_sync_events_device_seq ON sync_events(device_id, server_seq);
CREATE INDEX IF NOT EXISTS idx_sync_events_seq ON sync_events(server_seq);
CREATE INDEX IF NOT EXISTS idx_sync_events_aggregate ON sync_events(aggregate_type, aggregate_id);

-- Preserve ack log; add organization_id if missing by rebuild
CREATE TABLE IF NOT EXISTS sync_event_ack_log_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  organization_id TEXT,
  device_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  outcome TEXT NOT NULL,
  server_seq INTEGER,
  code TEXT,
  message TEXT,
  created_at TEXT NOT NULL
);
INSERT INTO sync_event_ack_log_new (id, organization_id, device_id, event_id, idempotency_key, outcome, server_seq, code, message, created_at)
SELECT id, '00000000-0000-4000-8000-000000000001', device_id, event_id, idempotency_key, outcome, server_seq, code, message, created_at
FROM sync_event_ack_log;
DROP TABLE sync_event_ack_log;
ALTER TABLE sync_event_ack_log_new RENAME TO sync_event_ack_log;
CREATE INDEX IF NOT EXISTS idx_sync_ack_device_created ON sync_event_ack_log(device_id, created_at);
CREATE INDEX IF NOT EXISTS idx_sync_ack_org_created ON sync_event_ack_log(organization_id, created_at);

COMMIT;
PRAGMA foreign_keys = ON;
