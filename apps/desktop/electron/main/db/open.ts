import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as schema from '../../../drizzle/schema';
import initialSql from '../../../drizzle/001-initial.sql?raw';
import authPosSql from '../../../drizzle/002-auth-pos.sql?raw';
import inventorySql from '../../../drizzle/003-inventory-management.sql?raw';
import supplierSql from '../../../drizzle/004-supplier-management.sql?raw';
import phase3Sql from '../../../drizzle/005-phase3-modules.sql?raw';
import phase3CompletionSql from '../../../drizzle/006-phase3-completion.sql?raw';
import backfillHistoricalCogsSql from '../../../drizzle/007b-backfill-historical-cogs.sql?raw';
import salesReturnsSql from '../../../drizzle/008-sales-returns.sql?raw';
import contactPersonFixSql from '../../../drizzle/009-add-contact-person.sql?raw';
import syncOutboxSql from '../../../drizzle/010-sync-outbox.sql?raw';
import customerPaymentIdempotencySql from '../../../drizzle/011-customer-payment-idempotency.sql?raw';
import syncEngineSql from '../../../drizzle/012-sync-engine.sql?raw';
import conflictResolutionSql from '../../../drizzle/013-conflict-resolution-engine.sql?raw';
import { ROLE_PERMISSIONS } from 'vyapara-shared';
import { remediateKnownPassword } from '../services/passwords';

export type AppOrm = BetterSQLite3Database<typeof schema>;

const MIGRATIONS: { name: string; sql: string }[] = [
  { name: '001-initial-schema', sql: initialSql },
  { name: '002-auth-pos', sql: authPosSql },
  { name: '003-inventory-management', sql: inventorySql },
  { name: '004-supplier-management', sql: supplierSql },
  { name: '005-phase3-modules', sql: phase3Sql },
  { name: '006-phase3-completion', sql: phase3CompletionSql },
  { name: '007-historical-cogs', sql: `ALTER TABLE transaction_items ADD COLUMN cost REAL NOT NULL DEFAULT 0;` },
  { name: '007b-backfill-historical-cogs', sql: backfillHistoricalCogsSql },
  { name: '008-sales-returns', sql: salesReturnsSql },
  { name: '009-contact-person', sql: contactPersonFixSql },
  { name: '010-sync-outbox', sql: syncOutboxSql },
  { name: '011-customer-payment-idempotency', sql: customerPaymentIdempotencySql },
  { name: '012-sync-engine', sql: syncEngineSql },
  { name: '013-conflict-resolution-engine', sql: conflictResolutionSql },
];

export function splitSql(source: string): string[] {
  return source
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
}

function applySql(sqlite: Database.Database, source: string): void {
  for (const statement of splitSql(source)) {
    try {
      sqlite.exec(statement);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('duplicate column name')) {
        continue;
      }
      throw error;
    }
  }
}

function countOf(sqlite: Database.Database, table: string): number {
  const row = sqlite.prepare(`SELECT COUNT(*) AS c FROM ${table}`).get() as { c: number };
  return row.c;
}

function seedCatalog(sqlite: Database.Database): void {
  if (countOf(sqlite, 'roles') === 0) {
    const insertRole = sqlite.prepare('INSERT INTO roles (id, name, description) VALUES (?, ?, ?)');
    insertRole.run('role-admin', 'admin', 'Administrator dengan akses penuh');
    insertRole.run('role-cashier', 'cashier', 'Kasir dengan akses POS');
    insertRole.run('role-viewer', 'viewer', 'Hanya baca');
  }

  if (countOf(sqlite, 'units') === 0) {
    const insertUnit = sqlite.prepare('INSERT INTO units (id, name, symbol) VALUES (?, ?, ?)');
    insertUnit.run('unit-pcs', 'Pcs', 'Pcs');
    insertUnit.run('unit-ream', 'Rim', 'Rim');
    insertUnit.run('unit-pack', 'Pack', 'Pack');
  }

  if (countOf(sqlite, 'categories') === 0) {
    const insertCategory = sqlite.prepare('INSERT INTO categories (id, name, description) VALUES (?, ?, ?)');
    insertCategory.run('cat-atk', 'ATK', 'Alat Tulis Kantor');
    insertCategory.run('cat-paper', 'Kertas', 'Kertas dan alat tulis');
  }

  const insertPermission = sqlite.prepare(
    'INSERT OR IGNORE INTO permissions (id, name, description) VALUES (?, ?, ?)',
  );
  for (const name of ROLE_PERMISSIONS.admin) {
    insertPermission.run(`perm-${name.replace(':', '-')}`, name, name);
  }

  const findRole = sqlite.prepare('SELECT id FROM roles WHERE name = ?');
  const findPermission = sqlite.prepare('SELECT id FROM permissions WHERE name = ?');
  const findGrant = sqlite.prepare(
    'SELECT id FROM role_permissions WHERE role_id = ? AND permission_id = ?',
  );
  const insertGrant = sqlite.prepare(
    'INSERT INTO role_permissions (id, role_id, permission_id) VALUES (?, ?, ?)',
  );

  for (const [roleName, permissionNames] of Object.entries(ROLE_PERMISSIONS)) {
    const role = findRole.get(roleName) as { id: string } | undefined;
    if (!role) {
      continue;
    }
    for (const permissionName of permissionNames) {
      const permission = findPermission.get(permissionName) as { id: string } | undefined;
      if (!permission || findGrant.get(role.id, permission.id)) {
        continue;
      }
      insertGrant.run(crypto.randomUUID(), role.id, permission.id);
    }
  }
}

function tableColumns(sqlite: Database.Database, table: string): Set<string> {
  const exists = sqlite
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(table) as { name: string } | undefined;
  if (!exists) {
    return new Set();
  }
  const rows = sqlite.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  return new Set(rows.map((row) => row.name));
}

function renameColumnIfNeeded(
  sqlite: Database.Database,
  table: string,
  from: string,
  to: string,
): void {
  const columns = tableColumns(sqlite, table);
  if (columns.has(from) && !columns.has(to)) {
    sqlite.exec(`ALTER TABLE ${table} RENAME COLUMN ${from} TO ${to}`);
  }
}

function normalizeLegacySchema(sqlite: Database.Database): void {
  renameColumnIfNeeded(sqlite, 'suppliers', 'contactPerson', 'contact_person');
  renameColumnIfNeeded(sqlite, 'suppliers', 'postalCode', 'postal_code');
  renameColumnIfNeeded(sqlite, 'suppliers', 'taxId', 'tax_id');
  renameColumnIfNeeded(sqlite, 'suppliers', 'paymentTerms', 'payment_terms');
  renameColumnIfNeeded(sqlite, 'suppliers', 'creditLimit', 'credit_limit');
}

export function applyMigrations(sqlite: Database.Database): void {
  sqlite.exec(`CREATE TABLE IF NOT EXISTS _migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  const applied = sqlite.prepare('SELECT name FROM _migrations');
  const record = sqlite.prepare('INSERT INTO _migrations (name) VALUES (?)');
  const seen = new Set((applied.all() as { name: string }[]).map((row) => row.name));
  for (const migration of MIGRATIONS) {
    if (seen.has(migration.name)) {
      continue;
    }
    const run = sqlite.transaction(() => {
      applySql(sqlite, migration.sql);
      record.run(migration.name);
    });
    run();
  }
  normalizeLegacySchema(sqlite);
  seedCatalog(sqlite);
}

function connect(dbPath: string): Database.Database {
  const directory = path.dirname(dbPath);
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  sqlite.pragma('busy_timeout = 5000');
  return sqlite;
}

export class AppDatabase {
  sqlite: Database.Database;
  orm: AppOrm;

  constructor(public readonly path: string) {
    this.sqlite = connect(path);
    applyMigrations(this.sqlite);
    remediateKnownPassword(this.sqlite);
    this.orm = drizzle(this.sqlite, { schema });
  }

  reopen(): void {
    if (this.sqlite.open) {
      this.sqlite.close();
    }
    this.sqlite = connect(this.path);
    applyMigrations(this.sqlite);
    remediateKnownPassword(this.sqlite);
    this.orm = drizzle(this.sqlite, { schema });
  }

  close(): void {
    if (this.sqlite.open) {
      this.sqlite.close();
    }
  }
}

export function openAppDatabase(dbPath: string): AppDatabase {
  return new AppDatabase(dbPath);
}