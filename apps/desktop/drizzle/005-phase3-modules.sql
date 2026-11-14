-- Phase 3: Procurement, Finance, Customer modules
-- Idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  country TEXT,
  tax_id TEXT,
  balance INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  created_by TEXT,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_customers_code ON customers(code);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);

CREATE TABLE IF NOT EXISTS customer_transactions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  customer_id TEXT NOT NULL,
  transaction_type TEXT NOT NULL,
  reference_type TEXT,
  reference_id TEXT,
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  description TEXT,
  transaction_date INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  created_by TEXT,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_customer_transactions_customer ON customer_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_transactions_date ON customer_transactions(transaction_date);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  po_number TEXT UNIQUE NOT NULL,
  supplier_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  subtotal INTEGER NOT NULL DEFAULT 0,
  tax_amount INTEGER NOT NULL DEFAULT 0,
  total_amount INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_created_at ON purchase_orders(created_at);

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  purchase_order_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  quantity_ordered REAL NOT NULL DEFAULT 0,
  quantity_received REAL NOT NULL DEFAULT 0,
  unit_price INTEGER NOT NULL DEFAULT 0,
  subtotal INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE INDEX IF NOT EXISTS idx_purchase_order_items_po ON purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_product ON purchase_order_items(product_id);

CREATE TABLE IF NOT EXISTS goods_receiving (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  receiving_number TEXT UNIQUE NOT NULL,
  purchase_order_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  received_at INTEGER NOT NULL,
  notes TEXT,
  FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_goods_receiving_po ON goods_receiving(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_goods_receiving_received_at ON goods_receiving(received_at);

CREATE TABLE IF NOT EXISTS goods_receiving_items (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  goods_receiving_id TEXT NOT NULL,
  purchase_order_item_id TEXT,
  product_id TEXT NOT NULL,
  quantity_received REAL NOT NULL DEFAULT 0,
  FOREIGN KEY (goods_receiving_id) REFERENCES goods_receiving(id) ON DELETE CASCADE,
  FOREIGN KEY (purchase_order_item_id) REFERENCES purchase_order_items(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE INDEX IF NOT EXISTS idx_goods_receiving_items_gr ON goods_receiving_items(goods_receiving_id);

CREATE TABLE IF NOT EXISTS purchase_returns (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  return_number TEXT UNIQUE NOT NULL,
  purchase_order_id TEXT,
  goods_receiving_id TEXT,
  user_id TEXT NOT NULL,
  return_date INTEGER NOT NULL,
  notes TEXT,
  FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id),
  FOREIGN KEY (goods_receiving_id) REFERENCES goods_receiving(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_purchase_returns_po ON purchase_returns(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_returns_gr ON purchase_returns(goods_receiving_id);

CREATE TABLE IF NOT EXISTS purchase_return_items (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  purchase_return_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 0,
  unit_price INTEGER NOT NULL DEFAULT 0,
  subtotal INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (purchase_return_id) REFERENCES purchase_returns(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE INDEX IF NOT EXISTS idx_purchase_return_items_return ON purchase_return_items(purchase_return_id);

CREATE TABLE IF NOT EXISTS cash_drawers (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL,
  opening_balance INTEGER NOT NULL DEFAULT 0,
  closing_balance INTEGER NOT NULL DEFAULT 0,
  opened_at INTEGER NOT NULL,
  closed_at INTEGER,
  status TEXT NOT NULL DEFAULT 'open',
  notes TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_cash_drawers_user ON cash_drawers(user_id);
CREATE INDEX IF NOT EXISTS idx_cash_drawers_status ON cash_drawers(status);

CREATE TABLE IF NOT EXISTS cash_movements (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  cash_drawer_id TEXT NOT NULL,
  movement_type TEXT NOT NULL,
  amount INTEGER NOT NULL,
  reference_type TEXT,
  reference_id TEXT,
  description TEXT,
  created_at INTEGER NOT NULL,
  created_by TEXT,
  FOREIGN KEY (cash_drawer_id) REFERENCES cash_drawers(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_cash_movements_drawer ON cash_movements(cash_drawer_id);
CREATE INDEX IF NOT EXISTS idx_cash_movements_created_at ON cash_movements(created_at);

CREATE TABLE IF NOT EXISTS income_records (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  cash_drawer_id TEXT,
  income_type TEXT NOT NULL,
  amount INTEGER NOT NULL,
  reference_type TEXT,
  reference_id TEXT,
  description TEXT,
  created_at INTEGER NOT NULL,
  created_by TEXT,
  FOREIGN KEY (cash_drawer_id) REFERENCES cash_drawers(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_income_records_drawer ON income_records(cash_drawer_id);
CREATE INDEX IF NOT EXISTS idx_income_records_created_at ON income_records(created_at);

CREATE TABLE IF NOT EXISTS expense_records (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  cash_drawer_id TEXT,
  category TEXT NOT NULL,
  amount INTEGER NOT NULL,
  description TEXT,
  created_at INTEGER NOT NULL,
  created_by TEXT,
  FOREIGN KEY (cash_drawer_id) REFERENCES cash_drawers(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_expense_records_drawer ON expense_records(cash_drawer_id);
CREATE INDEX IF NOT EXISTS idx_expense_records_created_at ON expense_records(created_at);

-- New permissions
INSERT OR IGNORE INTO permissions (name, description) VALUES
  ('procurement:read', 'View purchase orders and receiving'),
  ('procurement:write', 'Create and manage purchase orders'),
  ('finance:read', 'View financial records and reports'),
  ('finance:write', 'Manage cash drawer, income, and expenses'),
  ('customer:read', 'View customer information'),
  ('customer:write', 'Create and manage customers'),
  ('reports:read', 'View reports and analytics');
