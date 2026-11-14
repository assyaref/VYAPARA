-- Sales returns support for historical COGS reversal.

CREATE TABLE IF NOT EXISTS sales_returns (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  return_number TEXT UNIQUE NOT NULL,
  transaction_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  return_date TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TEXT NOT NULL,
  FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS sales_return_items (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  sales_return_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 0,
  unit_cost REAL NOT NULL DEFAULT 0,
  subtotal REAL NOT NULL DEFAULT 0,
  FOREIGN KEY (sales_return_id) REFERENCES sales_returns(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE INDEX IF NOT EXISTS idx_sales_returns_transaction ON sales_returns(transaction_id);
CREATE INDEX IF NOT EXISTS idx_sales_return_items_return ON sales_return_items(sales_return_id);