import Database from 'better-sqlite3';

const dbPath = process.env.NODE_ENV === 'production' 
  ? 'data/vyapara.db' 
  : 'vyapara.db';

const db = new Database(dbPath);

// Enable WAL mode for better concurrent access
db.pragma('journal_mode = WAL');

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create all tables from the Phase 2 initial migration
db.exec(`
  -- Users table
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Roles table
  CREATE TABLE IF NOT EXISTS roles (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Permissions table
  CREATE TABLE IF NOT EXISTS permissions (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name TEXT NOT NULL UNIQUE,
    description TEXT
  );

  -- Role permissions junction table
  CREATE TABLE IF NOT EXISTS role_permissions (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    role_id TEXT NOT NULL,
    permission_id TEXT NOT NULL,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
  );

  -- Categories table (self-referencing for hierarchical categories)
  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name TEXT NOT NULL,
    description TEXT,
    parent_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
  );

  -- Units table
  CREATE TABLE IF NOT EXISTS units (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name TEXT NOT NULL,
    symbol TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Products table
  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name TEXT NOT NULL,
    description TEXT,
    category_id TEXT,
    unit_id TEXT,
    barcode TEXT,
    sku TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE SET NULL
  );

  -- Indexes for Performance
  CREATE INDEX IF NOT EXISTS idx_users_email ON(users.email);
  CREATE INDEX IF NOT EXISTS idx_users_role_id ON(users.role_id);
  CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON(categories.parent_id);
  CREATE INDEX IF NOT EXISTS idx_products_category_id ON(products.category_id);
  CREATE INDEX IF NOT EXISTS idx_products_unit_id ON(products.unit_id);
  CREATE INDEX IF NOT EXISTS idx_products_sku ON(products.sku);
  CREATE INDEX IF NOT EXISTS idx_products_barcode ON(products.barcode);
  CREATE INDEX IF NOT EXISTS idx_roles_name ON(roles.name);
  CREATE INDEX IF NOT EXISTS idx_permissions_name ON(permissions.name);

  -- Migration tracking table
  CREATE TABLE IF NOT EXISTS _migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Insert initial migration record
  INSERT OR IGNORE INTO _migrations (name) VALUES ('2026-11-12-phase2-initial-schema');

  -- View: Active Products
  CREATE VIEW IF NOT EXISTS active_products AS
  SELECT p.id, p.name, p.sku, p.barcode, c.name AS category_name, u.name AS unit_name
  FROM products p
  LEFT JOIN categories c ON p.category_id = c.id
  LEFT JOIN units u ON p.unit_id = u.id
  WHERE p.is_active = 1;
`);

export default db;