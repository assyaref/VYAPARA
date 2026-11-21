import { describe, expect, it } from 'vitest';
import { AppDatabase } from '../db/open';
import { ensureSuperadmin } from './superadmin';
import { createRow, deleteRows, describeTable, listCrudTables, listRows, updateRow } from './superadmin-crud';
import { verifyPassword } from './passwords';

function setup() {
  const db = new AppDatabase(':memory:');
  ensureSuperadmin(db);
  const su = db.sqlite.prepare("SELECT id FROM users WHERE role_id = 'role-superadmin'").get() as { id: string };
  return { db, actorId: su.id };
}

describe('superadmin-crud', () => {
  it('lists only whitelisted, existing tables (no sessions / sync / migrations)', () => {
    const { db } = setup();
    const names = listCrudTables(db).map((t) => t.name);
    expect(names).toContain('settings');
    expect(names).toContain('products');
    expect(names).not.toContain('sessions');
    expect(names).not.toContain('sync_outbox');
    expect(names).not.toContain('_migrations');
  });

  it('rejects unknown tables', () => {
    const { db } = setup();
    expect(() => listRows(db, { table: 'sessions' })).toThrow(/Tabel tidak dikenal/);
    expect(() => listRows(db, { table: 'settings"; DROP TABLE users; --' })).toThrow(/Tabel tidak dikenal/);
  });

  it('full CRUD on settings', () => {
    const { db, actorId } = setup();
    const created = createRow(db, { table: 'settings', values: { key: 'x_test', value: 'a' } });
    expect(created.value).toBe('a');
    const updated = updateRow(db, { table: 'settings', rowid: Number(created.__rowid), values: { value: 'b' } }, actorId);
    expect(updated.value).toBe('b');
    expect(listRows(db, { table: 'settings', search: 'x_test' }).total).toBe(1);
    expect(deleteRows(db, { table: 'settings', rowids: [Number(created.__rowid)] }, actorId)).toBe(1);
    expect(listRows(db, { table: 'settings', search: 'x_test' }).total).toBe(0);
  });

  it('auto-generates id/timestamps and coerces numbers on products', () => {
    const { db, actorId } = setup();
    const row = createRow(db, { table: 'categories', values: { name: 'Uji' } });
    expect(typeof row.id).toBe('string');
    const p = createRow(db, { table: 'products', values: { name: 'Teh', price: '5000', stock: '3', category_id: row.id } });
    expect(p.price).toBe(5000);
    expect(() => updateRow(db, { table: 'products', rowid: Number(p.__rowid), values: { stock: 'abc' } }, actorId)).toThrow(/bilangan bulat|angka/);
  });

  it('never returns password, hashes it on write', () => {
    const { db } = setup();
    expect(describeTable(db, 'users').find((c) => c.name === 'password')?.writeOnly).toBe(true);
    const u = createRow(db, { table: 'users', values: { name: 'Kasir', email: 'K@X.COM', password: 'rahasia123', role_id: 'role-cashier' } });
    expect(u.password).toBeUndefined();
    expect(u.email).toBe('k@x.com');
    const { rows } = listRows(db, { table: 'users' });
    expect(rows.every((r) => !('password' in r))).toBe(true);
    const stored = db.sqlite.prepare('SELECT password FROM users WHERE id = ?').get(u.id) as { password: string };
    expect(verifyPassword('rahasia123', stored.password)).toBe(true);
  });

  it('protects the last superadmin and the superadmin role', () => {
    const { db, actorId } = setup();
    const su = db.sqlite.prepare('SELECT rowid AS r FROM users WHERE id = ?').get(actorId) as { r: number };
    expect(() => deleteRows(db, { table: 'users', rowids: [su.r] }, actorId)).toThrow(/superadmin terakhir|akun Anda sendiri/);
    expect(() => updateRow(db, { table: 'users', rowid: su.r, values: { is_active: 0 } }, actorId)).toThrow(/superadmin terakhir/);
    const role = db.sqlite.prepare("SELECT rowid AS r FROM roles WHERE id = 'role-superadmin'").get() as { r: number };
    expect(() => deleteRows(db, { table: 'roles', rowids: [role.r] }, actorId)).toThrow(/Peran superadmin/);
    expect(() => updateRow(db, { table: 'roles', rowid: role.r, values: { name: 'boss' } }, actorId)).toThrow(/Peran superadmin/);
  });
});
