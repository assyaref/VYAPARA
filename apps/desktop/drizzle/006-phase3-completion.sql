-- Phase 3 completion: supplier invoices, customer credit sales, user status.
-- Idempotent: safe to re-run.

ALTER TABLE users ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1;
ALTER TABLE transactions ADD COLUMN customer_id TEXT;
ALTER TABLE goods_receiving ADD COLUMN idempotency_key TEXT;

CREATE INDEX IF NOT EXISTS idx_transactions_customer ON transactions(customer_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_goods_receiving_idempotency ON goods_receiving(idempotency_key);

CREATE TABLE IF NOT EXISTS supplier_invoices (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  invoice_number TEXT UNIQUE NOT NULL,
  supplier_id TEXT NOT NULL,
  purchase_order_id TEXT,
  goods_receiving_id TEXT,
  invoice_date INTEGER NOT NULL,
  due_date INTEGER,
  subtotal INTEGER NOT NULL DEFAULT 0,
  tax_amount INTEGER NOT NULL DEFAULT 0,
  total_amount INTEGER NOT NULL DEFAULT 0,
  paid_amount INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'unpaid',
  notes TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  created_by TEXT,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id),
  FOREIGN KEY (goods_receiving_id) REFERENCES goods_receiving(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_supplier_invoices_supplier ON supplier_invoices(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_invoices_status ON supplier_invoices(status);
CREATE INDEX IF NOT EXISTS idx_supplier_invoices_date ON supplier_invoices(invoice_date);

CREATE TABLE IF NOT EXISTS supplier_invoice_items (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  supplier_invoice_id TEXT NOT NULL,
  product_id TEXT,
  description TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 0,
  unit_price INTEGER NOT NULL DEFAULT 0,
  subtotal INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (supplier_invoice_id) REFERENCES supplier_invoices(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE INDEX IF NOT EXISTS idx_supplier_invoice_items_invoice ON supplier_invoice_items(supplier_invoice_id);

INSERT OR IGNORE INTO settings (key, value) VALUES ('currency', 'IDR');
INSERT OR IGNORE INTO settings (key, value) VALUES ('store_address', '');
INSERT OR IGNORE INTO settings (key, value) VALUES ('store_phone', '');
INSERT OR IGNORE INTO settings (key, value) VALUES ('store_email', '');
INSERT OR IGNORE INTO settings (key, value) VALUES ('store_logo', '');
INSERT OR IGNORE INTO settings (key, value) VALUES ('receipt_printer', '');
INSERT OR IGNORE INTO settings (key, value) VALUES ('receipt_show_logo', '1');
INSERT OR IGNORE INTO settings (key, value) VALUES ('low_stock_threshold', '10');
INSERT OR IGNORE INTO settings (key, value) VALUES ('date_format', 'DD/MM/YYYY');

INSERT OR IGNORE INTO permissions (name, description) VALUES
  ('supplier:read', 'View supplier information'),
  ('supplier:write', 'Create and edit suppliers'),
  ('supplier:delete', 'Delete suppliers'),
  ('supplier:transactions', 'Manage supplier transactions');
