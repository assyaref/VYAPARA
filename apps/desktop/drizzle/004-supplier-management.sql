-- Supplier Management Module
-- This migration creates tables for supplier management

CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY NOT NULL,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  contactPerson TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  postalCode TEXT,
  country TEXT,
  taxId TEXT,
  paymentTerms INTEGER DEFAULT 0,
  creditLimit INTEGER DEFAULT 0,
  balance INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' NOT NULL,
  notes TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  created_by TEXT,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_suppliers_code ON suppliers(code);
CREATE INDEX IF NOT EXISTS idx_suppliers_status ON suppliers(status);

CREATE TABLE IF NOT EXISTS supplier_transactions (
  id TEXT PRIMARY KEY NOT NULL,
  supplier_id TEXT NOT NULL,
  transaction_type TEXT NOT NULL,
  reference_type TEXT,
  reference_id TEXT,
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  description TEXT,
  transaction_date INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  created_by TEXT,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_supplier_transactions_supplier ON supplier_transactions(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_transactions_date ON supplier_transactions(transaction_date);

-- Add supplier permissions
INSERT OR IGNORE INTO permissions (name, description) VALUES
('supplier:read', 'View supplier information'),
('supplier:write', 'Create and edit suppliers'),
('supplier:delete', 'Delete suppliers'),
('supplier:transactions', 'Manage supplier transactions');