-- Phase 4.3: desktop sync engine local state (cursor, dedupe receipts, quarantine, outbox retry metadata)

-- Durable per-org download cursor and sync metadata
CREATE TABLE IF NOT EXISTS sync_state (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Receipt/deduplication for inbound applied events (prevents duplicate application on restart/re-download)
CREATE TABLE IF NOT EXISTS sync_applied_events (
  event_id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL,
  organization_id TEXT,
  idempotency_key TEXT NOT NULL,
  event_type TEXT NOT NULL,
  aggregate_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  schema_version INTEGER NOT NULL,
  server_seq INTEGER,
  payload_hash TEXT,
  status TEXT NOT NULL, -- applied | quarantined | ignored
  reason TEXT,
  applied_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sync_applied_events_idem ON sync_applied_events(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_sync_applied_events_seq ON sync_applied_events(server_seq);
CREATE INDEX IF NOT EXISTS idx_sync_applied_events_status ON sync_applied_events(status);

-- Quarantine details for unsupported/incompatible/unappliable inbound events (no cursor advancement past them unless explicitly durable policy)
CREATE TABLE IF NOT EXISTS sync_quarantine (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL UNIQUE,
  device_id TEXT NOT NULL,
  organization_id TEXT,
  idempotency_key TEXT NOT NULL,
  event_type TEXT NOT NULL,
  aggregate_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  schema_version INTEGER NOT NULL,
  server_seq INTEGER,
  payload TEXT NOT NULL,
  reason_code TEXT NOT NULL,
  reason_message TEXT,
  quarantined_at TEXT NOT NULL,
  resolved_at TEXT,
  FOREIGN KEY(event_id) REFERENCES sync_applied_events(event_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_sync_quarantine_seq ON sync_quarantine(server_seq);

-- Outbox retry scheduling/attempt metadata (forward-safe additions)
ALTER TABLE sync_outbox ADD COLUMN next_retry_at TEXT;
ALTER TABLE sync_outbox ADD COLUMN last_attempt_at TEXT;
ALTER TABLE sync_outbox ADD COLUMN attempt_count INTEGER NOT NULL DEFAULT 0;
