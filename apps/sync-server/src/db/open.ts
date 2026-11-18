import { createRequire } from 'node:module';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
let DatabaseCtor: any;
try {
  DatabaseCtor = require('better-sqlite3');
} catch {
  DatabaseCtor = require(path.resolve(process.cwd(), 'apps/desktop/node_modules/better-sqlite3'));
}
const Database = DatabaseCtor;

export type SyncServerDb = {
  sqlite: any;
  path: string;
  close: () => void;
};

const here = path.dirname(fileURLToPath(import.meta.url));
function migrationSql(file: string): string {
  const candidates = [
    path.resolve(here, 'migrations', file), // bundled single-file runtime (Docker image)
    path.resolve(here, '../../migrations', file), // source tree: src/db/../../migrations
    path.resolve(process.cwd(), 'apps/sync-server/migrations', file), // running from repo root
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8');
  }
  throw new Error(`Migration file not found: ${file}`);
}

const MIGRATIONS: { name: string; sql: string }[] = [
  {
    name: '001-sync-server-core',
    sql: migrationSql('001-sync-server-core.sql'),
  },
  {
    name: '002-tenant-isolation',
    sql: migrationSql('002-tenant-isolation.sql'),
  },
  {
    name: '003-remote-versioning',
    sql: migrationSql('003-remote-versioning.sql'),
  },
  {
    name: '004-licensing',
    sql: migrationSql('004-licensing.sql'),
  },
];

function applyMigrations(db: any): void {
  db.exec(`CREATE TABLE IF NOT EXISTS _migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);
  const seen = new Set(
    (db.prepare('SELECT name FROM _migrations').all() as { name: string }[]).map((r) => r.name),
  );
  const insert = db.prepare('INSERT INTO _migrations (name) VALUES (?)');
  for (const m of MIGRATIONS) {
    if (seen.has(m.name)) continue;
    // migrations may include explicit transaction control for table rebuilds
    db.exec(m.sql);
    insert.run(m.name);
  }
}

export function openSyncServerDb(dbPath: string): SyncServerDb {
  if (dbPath !== ':memory:') {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }
  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  sqlite.pragma('busy_timeout = 5000');
  applyMigrations(sqlite);
  return {
    sqlite,
    path: dbPath,
    close: () => {
      if (sqlite.open) sqlite.close();
    },
  };
}
