import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';

class VyaparaDatabase {
  private db: Database.Database;

  constructor(dbPath?: string) {
    const finalPath = dbPath || (process.env.NODE_ENV === 'production' 
      ? 'vyapara.db' 
      : 'vyapara.db');

    const dbDir = path.dirname(finalPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    this.db = new Database(finalPath);

    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');

    this.initializeTables();
  }

  private initializeTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS roles (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS permissions (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        name TEXT NOT NULL UNIQUE,
        description TEXT
      );

      CREATE TABLE IF NOT EXISTS role_permissions (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        role_id TEXT NOT NULL,
        permission_id TEXT NOT NULL,
        FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
        FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        name TEXT NOT NULL,
        description TEXT,
        parent_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS units (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        name TEXT NOT NULL,
        symbol TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        name TEXT NOT NULL,
        description TEXT,
        category_id TEXT,
        unit_id TEXT,
        barcode TEXT,
        sku TEXT,
        price REAL DEFAULT 0,
        cost REAL DEFAULT 0,
        stock REAL DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
        FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        transaction_number TEXT UNIQUE NOT NULL,
        user_id TEXT NOT NULL,
        total_amount REAL DEFAULT 0,
        payment_amount REAL DEFAULT 0,
        change_amount REAL DEFAULT 0,
        payment_method TEXT NOT NULL,
        status TEXT DEFAULT 'completed',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS transaction_items (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        transaction_id TEXT NOT NULL,
        product_id TEXT,
        service_type TEXT,
        quantity REAL DEFAULT 1,
        price REAL DEFAULT 0,
        subtotal REAL DEFAULT 0,
        notes TEXT,
        FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id)
      );

      CREATE INDEX IF NOT EXISTS idx_users_email ON(users.email);
      CREATE INDEX IF NOT EXISTS idx_users_role_id ON(users.role_id);
      CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON(categories.parent_id);
      CREATE INDEX IF NOT EXISTS idx_products_category_id ON(products.category_id);
      CREATE INDEX IF NOT EXISTS idx_products_unit_id ON(products.unit_id);
      CREATE INDEX IF NOT EXISTS idx_products_sku ON(products.sku);
      CREATE INDEX IF NOT EXISTS idx_products_barcode ON(products.barcode);
      CREATE INDEX IF NOT EXISTS idx_roles_name ON(roles.name);
      CREATE INDEX IF NOT EXISTS idx_permissions_name ON(permissions.name);
      CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON(transactions.created_at);
      CREATE INDEX IF NOT EXISTS idx_transaction_items_transaction_id ON(transaction_items.transaction_id);
      CREATE INDEX IF NOT EXISTS idx_transaction_items_product_id ON(transaction_items.product_id);

      CREATE TABLE IF NOT EXISTS _migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE VIEW IF NOT EXISTS active_products AS
      SELECT p.id, p.name, p.sku, p.barcode, p.price, p.stock, c.name AS category_name, u.name AS unit_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN units u ON p.unit_id = u.id
      WHERE p.is_active = 1;
    `);

    this.seedInitialData();
  }

  private seedInitialData() {
    const adminExists = this.db.prepare('SELECT id FROM users WHERE email = ?').get('admin@vyapara.com');
    
    if (!adminExists) {
      const insertRole = this.db.prepare('INSERT OR IGNORE INTO roles (id, name, description) VALUES (?, ?, ?)');
      insertRole.run('role-admin', 'admin', 'Administrator dengan akses penuh');
      insertRole.run('role-cashier', 'cashier', 'Kasir dengan akses POS');
      insertRole.run('role-viewer', 'viewer', 'Viewer hanya baca');

      const bcrypt = require('bcryptjs');
      const passwordHash = bcrypt.hashSync('admin123', 10);

      const insertUser = this.db.prepare('INSERT OR IGNORE INTO users (id, name, email, password, role_id) VALUES (?, ?, ?, ?, ?)');
      insertUser.run('user-admin', 'Administrator', 'admin@vyapara.com', passwordHash, 'role-admin');

      const insertUnit = this.db.prepare('INSERT OR IGNORE INTO units (id, name, symbol) VALUES (?, ?, ?)');
      insertUnit.run('unit-pcs', 'Pcs', 'Pcs');
      insertUnit.run('unit-ream', 'Rim', 'Rim');
      insertUnit.run('unit-pack', 'Pack', 'Pack');

      const insertCategory = this.db.prepare('INSERT OR IGNORE INTO categories (id, name, description) VALUES (?, ?, ?)');
      insertCategory.run('cat-atk', 'ATK', 'Alat Tulis Kantor');
      insertCategory.run('cat-paper', 'Kertas', 'Kertas dan alat tulis');
    }

    this.db.prepare('INSERT OR IGNORE INTO _migrations (name) VALUES (?)').run('2026-11-12-phase2-initial-schema');
  }

  getDatabase() {
    return this.db;
  }

  close() {
    this.db.close();
  }
}

export default VyaparaDatabase;