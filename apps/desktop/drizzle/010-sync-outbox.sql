-- Phase 4.1: Offline-first sync foundation (outbox + device identity)

CREATE TABLE IF NOT EXISTS device_identity (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  device_id TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sync_outbox (
  id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  aggregate_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  payload TEXT NOT NULL,
  schema_version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  server_ack_at TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  FOREIGN KEY (device_id) REFERENCES device_identity(device_id)
);

CREATE INDEX IF NOT EXISTS idx_sync_outbox_status_created ON sync_outbox(sync_status, created_at);
CREATE INDEX IF NOT EXISTS idx_sync_outbox_aggregate ON sync_outbox(aggregate_type, aggregate_id);
CREATE INDEX IF NOT EXISTS idx_sync_outbox_device ON sync_outbox(device_id);
