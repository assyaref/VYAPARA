-- Additive auth, session, settings, and POS columns.
-- Safe to re-run: duplicate column errors are ignored by the migration runner.

ALTER TABLE users ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 0;

ALTER TABLE transactions ADD COLUMN subtotal REAL NOT NULL DEFAULT 0;
ALTER TABLE transactions ADD COLUMN discount_amount REAL NOT NULL DEFAULT 0;
ALTER TABLE transactions ADD COLUMN tax_amount REAL NOT NULL DEFAULT 0;
ALTER TABLE transactions ADD COLUMN idempotency_key TEXT;
ALTER TABLE transactions ADD COLUMN notes TEXT;
ALTER TABLE transactions ADD COLUMN payments_json TEXT;

ALTER TABLE transaction_items ADD COLUMN discount_amount REAL NOT NULL DEFAULT 0;
ALTER TABLE transaction_items ADD COLUMN product_name TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_idempotency ON transactions(idempotency_key);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  revoked_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO settings (key, value) VALUES ('tax_rate_bps', '0');
INSERT OR IGNORE INTO settings (key, value) VALUES ('store_name', 'VYAPARA');
INSERT OR IGNORE INTO settings (key, value) VALUES ('receipt_footer', 'Terima kasih');

INSERT OR IGNORE INTO roles (id, name, description) VALUES
  ('role-admin', 'admin', 'Administrator dengan akses penuh'),
  ('role-cashier', 'cashier', 'Kasir dengan akses POS'),
  ('role-viewer', 'viewer', 'Hanya baca');

INSERT OR IGNORE INTO permissions (id, name, description) VALUES
  ('perm-product-read', 'product:read', 'Melihat produk'),
  ('perm-product-write', 'product:write', 'Mengubah produk'),
  ('perm-transaction-read', 'transaction:read', 'Melihat transaksi'),
  ('perm-transaction-write', 'transaction:write', 'Membuat transaksi'),
  ('perm-database-backup', 'database:backup', 'Cadangan basis data'),
  ('perm-database-restore', 'database:restore', 'Pulihkan basis data'),
  ('perm-settings-read', 'settings:read', 'Melihat pengaturan'),
  ('perm-settings-write', 'settings:write', 'Mengubah pengaturan');
