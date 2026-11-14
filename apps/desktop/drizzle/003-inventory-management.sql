-- Inventory Management Module
-- Stock movements, stock adjustments, opname, minimum stock alerts

CREATE TABLE IF NOT EXISTS stock_movements (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  product_id TEXT NOT NULL,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('stock_in', 'stock_out', 'adjustment', 'opname', 'purchase', 'sale', 'return_in', 'return_out')),
  quantity_before REAL NOT NULL DEFAULT 0,
  quantity_change REAL NOT NULL,
  quantity_after REAL NOT NULL DEFAULT 0,
  reference_type TEXT,
  reference_id TEXT,
  notes TEXT,
  user_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS stock_adjustments (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  product_id TEXT NOT NULL,
  adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('increase', 'decrease')),
  quantity REAL NOT NULL,
  reason TEXT,
  reference_number TEXT,
  user_id TEXT NOT NULL,
  approved_by_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (approved_by_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS stock_opname (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  opname_number TEXT UNIQUE NOT NULL,
  opname_date DATE NOT NULL,
  location TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'completed', 'cancelled')),
  total_items_counted INTEGER DEFAULT 0,
  total_items_difference INTEGER DEFAULT 0,
  user_id TEXT NOT NULL,
  approved_by_id TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (approved_by_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS stock_opname_items (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  opname_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  system_stock REAL NOT NULL DEFAULT 0,
  physical_stock REAL NOT NULL DEFAULT 0,
  difference REAL GENERATED ALWAYS AS (physical_stock - system_stock) STORED,
  unit_id TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (opname_id) REFERENCES stock_opname(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (unit_id) REFERENCES units(id)
);

CREATE TABLE IF NOT EXISTS product_inventory_settings (
  product_id TEXT PRIMARY KEY,
  minimum_stock REAL NOT NULL DEFAULT 0,
  maximum_stock REAL,
  reorder_point REAL,
  is_low_stock_alert_enabled INTEGER DEFAULT 1,
  last_restock_date DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS inventory_valuation (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  valuation_date DATE NOT NULL,
  total_items INTEGER NOT NULL DEFAULT 0,
  total_cost_value REAL NOT NULL DEFAULT 0,
  total_retail_value REAL NOT NULL DEFAULT 0,
  method TEXT DEFAULT 'fifo' CHECK (method IN ('fifo', 'weighted_average', 'standard')),
  user_id TEXT NOT NULL,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS inventory_valuation_items (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  valuation_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 0,
  unit_cost REAL NOT NULL DEFAULT 0,
  total_cost REAL GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  unit_retail REAL NOT NULL DEFAULT 0,
  total_retail REAL GENERATED ALWAYS AS (quantity * unit_retail) STORED,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (valuation_id) REFERENCES inventory_valuation(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON stock_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_stock_movements_movement_type ON stock_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_reference ON stock_movements(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_stock_adjustments_product_id ON stock_adjustments(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_adjustments_status ON stock_adjustments(status);
CREATE INDEX IF NOT EXISTS idx_stock_opname_opname_date ON stock_opname(opname_date);
CREATE INDEX IF NOT EXISTS idx_stock_opname_status ON stock_opname(status);
CREATE INDEX IF NOT EXISTS idx_stock_opname_items_opname_id ON stock_opname_items(opname_id);
CREATE INDEX IF NOT EXISTS idx_product_inventory_settings_minimum_stock ON product_inventory_settings(minimum_stock);
CREATE INDEX IF NOT EXISTS idx_inventory_valuation_valuation_date ON inventory_valuation(valuation_date);

INSERT OR IGNORE INTO permissions (id, name, description) VALUES
  ('perm-inventory-read', 'inventory:read', 'Melihat inventaris'),
  ('perm-inventory-write', 'inventory:write', 'Mengubah inventaris'),
  ('perm-stock-adjust', 'stock:adjust', 'Penyesuaian stok'),
  ('perm-stock-opname', 'stock:opname', 'Stock opname'),
  ('perm-inventory-approve', 'inventory:approve', 'Menyetujui perubahan inventaris');