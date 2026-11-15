-- Phase 4.2: Central sync server core schema
CREATE TABLE IF NOT EXISTS _migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sync_devices (
  device_id TEXT PRIMARY KEY,
  device_name TEXT,
  enrollment_secret_hash TEXT NOT NULL,
  token_hash TEXT,
  token_expires_at TEXT,
  status TEXT NOT NULL CHECK(status IN ('active','revoked','inactive')) DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  revoked_at TEXT,
  revoke_reason TEXT
);

CREATE TABLE IF NOT EXISTS sync_events (
  server_seq INTEGER PRIMARY KEY AUTOINCREMENT,
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
  FOREIGN KEY(device_id) REFERENCES sync_devices(device_id)
);

CREATE INDEX IF NOT EXISTS idx_sync_events_device_seq ON sync_events(device_id, server_seq);
CREATE INDEX IF NOT EXISTS idx_sync_events_seq ON sync_events(server_seq);
CREATE INDEX IF NOT EXISTS idx_sync_events_aggregate ON sync_events(aggregate_type, aggregate_id);

CREATE TABLE IF NOT EXISTS sync_event_ack_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  outcome TEXT NOT NULL,
  server_seq INTEGER,
  code TEXT,
  message TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sync_ack_device_created ON sync_event_ack_log(device_id, created_at);
