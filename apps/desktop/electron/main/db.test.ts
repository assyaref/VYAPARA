import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import Database from 'better-sqlite3';
import { AppDatabase, openAppDatabase } from './db/open';
import { backupDatabase, restoreDatabase } from './services/backup';
import { needsSetup, requireUser, setupAdmin } from './services/auth';

function tempDbPath(): string {
  return path.join(os.tmpdir(), `vyapara-test-${crypto.randomUUID()}.db`);
}

function removeDb(filePath: string): void {
  for (const suffix of ['', '-wal', '-shm']) {
    try {
      fs.rmSync(`${filePath}${suffix}`, { force: true });
    } catch {
      // best effort cleanup
    }
  }
}

function integrityOk(filePath: string): boolean {
  const probe = new Database(filePath, { readonly: true, fileMustExist: true });
  try {
    return probe.pragma('integrity_check', { simple: true }) === 'ok';
  } finally {
    probe.close();
  }
}

describe('database', () => {
  it('applies all migrations and seeds catalog on a fresh in-memory database', () => {
    const db = new AppDatabase(':memory:');

    const tables = db.sqlite
      .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name`)
      .all() as { name: string }[];
    const names = tables.map((t) => t.name);
    expect(names).toContain('users');
    expect(names).toContain('roles');
    expect(names).toContain('permissions');
    expect(names).toContain('products');
    expect(names).toContain('transactions');
    expect(names).toContain('sessions');
    expect(names).toContain('purchase_orders');
    expect(names).toContain('stock_movements');

    const roles = db.sqlite
      .prepare(`SELECT name FROM roles ORDER BY name`)
      .all() as { name: string }[];
    expect(roles.map((r) => r.name)).toEqual(['admin', 'cashier', 'viewer']);

    const units = db.sqlite
      .prepare(`SELECT name FROM units ORDER BY name`)
      .all() as { name: string }[];
    expect(units.map((u) => u.name)).toEqual(['Pack', 'Pcs', 'Rim']);

    const permissions = db.sqlite
      .prepare(`SELECT COUNT(*) AS c FROM permissions`)
      .get() as { c: number };
    expect(permissions.c).toBeGreaterThan(0);

    expect(needsSetup(db)).toBe(true);
    db.close();
  });

  it('keeps data after reopen', () => {
    const filePath = tempDbPath();
    try {
      const db = openAppDatabase(filePath);
      const admin = setupAdmin(db, {
        name: 'Administrator',
        email: 'admin@vyapara.com',
        password: 'rahasia123456',
      });
      expect(needsSetup(db)).toBe(false);

      db.reopen();
      const users = db.sqlite.prepare(`SELECT COUNT(*) AS c FROM users`).get() as { c: number };
      expect(users.c).toBe(1);
      db.close();

      const db2 = openAppDatabase(filePath);
      expect(needsSetup(db2)).toBe(false);
      const session = requireUser(db2, admin.token);
      expect(session.email).toBe('admin@vyapara.com');
      db2.close();
    } finally {
      removeDb(filePath);
    }
  });

  it('backup and restore preserve data integrity', async () => {
    const filePath = tempDbPath();
    const backupPath = path.join(os.tmpdir(), `vyapara-backup-${crypto.randomUUID()}.db`);
    try {
      const db = openAppDatabase(filePath);
      setupAdmin(db, {
        name: 'Administrator',
        email: 'admin@vyapara.com',
        password: 'rahasia123456',
      });
      db.sqlite
        .prepare(`INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)`)
        .run('store_name', 'Toko Utama', new Date().toISOString());

      const backedUp = await backupDatabase(db, backupPath);
      expect(backedUp).toBe(backupPath);
      expect(fs.existsSync(backupPath)).toBe(true);
      expect(integrityOk(backupPath)).toBe(true);

      // change state after backup
      db.sqlite
        .prepare(`UPDATE settings SET value = ? WHERE key = ?`)
        .run('Toko Diubah', 'store_name');

      await restoreDatabase(db, backupPath);
      const row = db.sqlite
        .prepare(`SELECT value FROM settings WHERE key = ?`)
        .get('store_name') as { value: string };
      expect(row.value).toBe('Toko Utama');
      expect(integrityOk(filePath)).toBe(true);
      db.close();
    } finally {
      removeDb(filePath);
      removeDb(backupPath);
    }
  });
});
