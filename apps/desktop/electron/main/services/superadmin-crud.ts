/* services/superadmin-crud.ts — generic full CRUD over whitelisted tables, superadmin only.
   Identifiers (table/column names) never come from the caller verbatim: tables come from
   CRUD_TABLES and columns from PRAGMA table_info, so every SQL identifier is trusted. */
import { randomUUID } from 'node:crypto';
import type { AppDatabase } from '../db/open';
import { AppError } from '../errors';
import { hashPassword } from './passwords';

export type CrudTableDef = {
  name: string;
  label: string;
  group: string;
  /** Columns hidden from reads (still writable when listed in writeOnly). */
  hidden?: string[];
  /** Columns accepted on write but never returned (e.g. password, hashed on write). */
  writeOnly?: string[];
  readOnly?: boolean;
};

export const CRUD_TABLES: CrudTableDef[] = [
  { name: 'settings', label: 'Pengaturan (key-value)', group: 'Pengaturan' },
  { name: 'users', label: 'Pengguna', group: 'Pengaturan', hidden: ['password'], writeOnly: ['password'] },
  { name: 'roles', label: 'Peran', group: 'Pengaturan' },
  { name: 'permissions', label: 'Izin', group: 'Pengaturan' },
  { name: 'role_permissions', label: 'Izin per Peran', group: 'Pengaturan' },
  { name: 'audit_log', label: 'Audit Log', group: 'Pengaturan' },

  { name: 'products', label: 'Produk', group: 'Katalog & Stok' },
  { name: 'categories', label: 'Kategori', group: 'Katalog & Stok' },
  { name: 'units', label: 'Satuan', group: 'Katalog & Stok' },
  { name: 'product_inventory_settings', label: 'Setelan Stok Produk', group: 'Katalog & Stok' },
  { name: 'stock_movements', label: 'Mutasi Stok', group: 'Katalog & Stok' },
  { name: 'stock_adjustments', label: 'Penyesuaian Stok', group: 'Katalog & Stok' },
  { name: 'stock_opname', label: 'Stok Opname', group: 'Katalog & Stok' },
  { name: 'stock_opname_items', label: 'Item Stok Opname', group: 'Katalog & Stok' },
  { name: 'inventory_valuation', label: 'Valuasi Persediaan', group: 'Katalog & Stok' },
  { name: 'inventory_valuation_items', label: 'Item Valuasi', group: 'Katalog & Stok' },

  { name: 'transactions', label: 'Transaksi Penjualan', group: 'Penjualan' },
  { name: 'transaction_items', label: 'Item Transaksi', group: 'Penjualan' },
  { name: 'sales_returns', label: 'Retur Penjualan', group: 'Penjualan' },
  { name: 'sales_return_items', label: 'Item Retur Penjualan', group: 'Penjualan' },
  { name: 'customers', label: 'Pelanggan', group: 'Penjualan' },
  { name: 'customer_transactions', label: 'Mutasi Pelanggan', group: 'Penjualan' },

  { name: 'suppliers', label: 'Pemasok', group: 'Pembelian' },
  { name: 'supplier_transactions', label: 'Mutasi Pemasok', group: 'Pembelian' },
  { name: 'supplier_invoices', label: 'Faktur Pemasok', group: 'Pembelian' },
  { name: 'supplier_invoice_items', label: 'Item Faktur Pemasok', group: 'Pembelian' },
  { name: 'purchase_orders', label: 'Purchase Order', group: 'Pembelian' },
  { name: 'purchase_order_items', label: 'Item PO', group: 'Pembelian' },
  { name: 'goods_receiving', label: 'Penerimaan Barang', group: 'Pembelian' },
  { name: 'goods_receiving_items', label: 'Item Penerimaan', group: 'Pembelian' },
  { name: 'purchase_returns', label: 'Retur Pembelian', group: 'Pembelian' },
  { name: 'purchase_return_items', label: 'Item Retur Pembelian', group: 'Pembelian' },

  { name: 'cash_drawers', label: 'Laci Kas / Shift', group: 'Keuangan' },
  { name: 'cash_movements', label: 'Mutasi Kas', group: 'Keuangan' },
  { name: 'income_records', label: 'Pemasukan', group: 'Keuangan' },
  { name: 'expense_records', label: 'Pengeluaran', group: 'Keuangan' },
];

const SUPERADMIN_ROLE_ID = 'role-superadmin';

export type CrudColumn = {
  name: string;
  type: string;
  notNull: boolean;
  defaultValue: string | null;
  primaryKey: boolean;
  writeOnly: boolean;
};

export type CrudTableInfo = { name: string; label: string; group: string; readOnly: boolean; rowCount: number };

function tableDef(db: AppDatabase, name: string): CrudTableDef {
  const def = CRUD_TABLES.find((t) => t.name === name);
  if (!def || !tableExists(db, name)) {
    throw new AppError('NOT_FOUND', `Tabel tidak dikenal: ${name}`);
  }
  return def;
}

function tableExists(db: AppDatabase, name: string): boolean {
  return !!db.sqlite.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(name);
}

function rawColumns(db: AppDatabase, table: string) {
  return db.sqlite.prepare(`PRAGMA table_info("${table}")`).all() as {
    name: string; type: string; notnull: number; dflt_value: string | null; pk: number;
  }[];
}

export function listCrudTables(db: AppDatabase): CrudTableInfo[] {
  return CRUD_TABLES.filter((t) => tableExists(db, t.name)).map((t) => {
    const { c } = db.sqlite.prepare(`SELECT COUNT(*) AS c FROM "${t.name}"`).get() as { c: number };
    return { name: t.name, label: t.label, group: t.group, readOnly: !!t.readOnly, rowCount: c };
  });
}

export function describeTable(db: AppDatabase, table: string): CrudColumn[] {
  const def = tableDef(db, table);
  const hidden = new Set(def.hidden ?? []);
  const writeOnly = new Set(def.writeOnly ?? []);
  return rawColumns(db, table)
    .filter((c) => !hidden.has(c.name) || writeOnly.has(c.name))
    .map((c) => ({
      name: c.name,
      type: (c.type || 'TEXT').toUpperCase(),
      notNull: c.notnull === 1,
      defaultValue: c.dflt_value,
      primaryKey: c.pk > 0,
      writeOnly: writeOnly.has(c.name),
    }));
}

export function listRows(
  db: AppDatabase,
  input: { table: string; search?: string; limit?: number; offset?: number; orderBy?: string; orderDir?: 'asc' | 'desc' },
): { columns: CrudColumn[]; rows: Record<string, unknown>[]; total: number } {
  const def = tableDef(db, input.table);
  const columns = describeTable(db, input.table);
  const readable = columns.filter((c) => !c.writeOnly);
  const limit = Math.min(Math.max(Math.trunc(input.limit ?? 50), 1), 500);
  const offset = Math.max(Math.trunc(input.offset ?? 0), 0);

  const params: unknown[] = [];
  let where = '';
  const term = input.search?.trim();
  if (term) {
    where = `WHERE ${readable.map((c) => `CAST("${c.name}" AS TEXT) LIKE ?`).join(' OR ')}`;
    for (let i = 0; i < readable.length; i += 1) params.push(`%${term}%`);
  }
  const orderCol = readable.find((c) => c.name === input.orderBy)?.name;
  const order = orderCol ? `ORDER BY "${orderCol}" ${input.orderDir === 'desc' ? 'DESC' : 'ASC'}` : 'ORDER BY rowid DESC';
  const select = readable.map((c) => `"${c.name}"`).join(', ');

  const { c: total } = db.sqlite.prepare(`SELECT COUNT(*) AS c FROM "${def.name}" ${where}`).get(...params) as { c: number };
  const rows = db.sqlite
    .prepare(`SELECT rowid AS __rowid, ${select} FROM "${def.name}" ${where} ${order} LIMIT ? OFFSET ?`)
    .all(...params, limit, offset) as Record<string, unknown>[];
  return { columns, rows, total };
}

function coerce(col: CrudColumn, raw: unknown): unknown {
  if (raw === undefined) return undefined;
  if (raw === null || raw === '') {
    if (col.notNull && col.defaultValue === null && raw === null) {
      throw new AppError('VALIDATION', `Kolom ${col.name} wajib diisi`);
    }
    return raw === '' && (col.type.includes('INT') || col.type.includes('REAL') || col.type.includes('NUM')) ? null : raw;
  }
  if (typeof raw === 'boolean') return raw ? 1 : 0;
  if (col.type.includes('INT')) {
    const n = Number(raw);
    if (!Number.isFinite(n) || !Number.isInteger(n)) throw new AppError('VALIDATION', `Kolom ${col.name} harus bilangan bulat`);
    return n;
  }
  if (col.type.includes('REAL') || col.type.includes('NUM') || col.type.includes('FLOA') || col.type.includes('DOUB')) {
    const n = Number(raw);
    if (!Number.isFinite(n)) throw new AppError('VALIDATION', `Kolom ${col.name} harus angka`);
    return n;
  }
  return typeof raw === 'string' ? raw : JSON.stringify(raw);
}

function prepareValues(
  db: AppDatabase,
  table: string,
  values: Record<string, unknown>,
  mode: 'create' | 'update',
): Record<string, unknown> {
  const columns = describeTable(db, table);
  const out: Record<string, unknown> = {};
  for (const col of columns) {
    if (!(col.name in values)) continue;
    let v = coerce(col, values[col.name]);
    if (v === undefined) continue;
    if (col.writeOnly) {
      // Blank write-only field on update = keep current value.
      if (v === null || v === '') continue;
      if (table === 'users' && col.name === 'password') {
        if (String(v).length < 8) throw new AppError('VALIDATION', 'Kata sandi minimal 8 karakter');
        v = hashPassword(String(v));
      }
    }
    out[col.name] = v;
  }
  const names = new Set(columns.map((c) => c.name));
  const now = new Date().toISOString();
  if (mode === 'create') {
    const idCol = columns.find((c) => c.name === 'id' && c.primaryKey);
    if (idCol && !idCol.type.includes('INT') && (out.id === undefined || out.id === null || out.id === '')) {
      out.id = randomUUID();
    }
    if (names.has('created_at') && out.created_at == null) out.created_at = now;
    if (table === 'users' && out.password == null) throw new AppError('VALIDATION', 'Kata sandi wajib diisi untuk pengguna baru');
    if (table === 'users' && typeof out.email === 'string') out.email = out.email.trim().toLowerCase();
  }
  if (names.has('updated_at') && (mode === 'update' || out.updated_at == null)) out.updated_at = now;
  if (table === 'users' && typeof out.email === 'string') out.email = out.email.trim().toLowerCase();
  return out;
}

function getRow(db: AppDatabase, table: string, rowid: number): Record<string, unknown> {
  const row = db.sqlite.prepare(`SELECT rowid AS __rowid, * FROM "${table}" WHERE rowid = ?`).get(rowid) as Record<string, unknown> | undefined;
  if (!row) throw new AppError('NOT_FOUND', 'Baris tidak ditemukan');
  return row;
}

function publicRow(db: AppDatabase, table: string, row: Record<string, unknown>): Record<string, unknown> {
  const def = tableDef(db, table);
  const copy = { ...row };
  for (const h of def.hidden ?? []) delete copy[h];
  return copy;
}

function superadminCount(db: AppDatabase, excludeUserId?: string): number {
  const r = db.sqlite
    .prepare(`SELECT COUNT(*) AS c FROM users WHERE role_id = ? AND COALESCE(is_active, 1) = 1 AND id <> ?`)
    .get(SUPERADMIN_ROLE_ID, excludeUserId ?? '') as { c: number };
  return r.c;
}

/** Guards that keep the installation recoverable: there must always be an active superadmin. */
function guardWrite(
  db: AppDatabase,
  table: string,
  action: 'update' | 'delete',
  before: Record<string, unknown>,
  after: Record<string, unknown> | null,
  actorId: string,
): void {
  if (table === 'users' && before.role_id === SUPERADMIN_ROLE_ID) {
    const stillSuper = after && after.role_id === SUPERADMIN_ROLE_ID && Number(after.is_active ?? 1) === 1;
    if (!stillSuper && superadminCount(db, String(before.id)) === 0) {
      throw new AppError('FORBIDDEN', 'Tidak boleh menghapus/menonaktifkan superadmin terakhir');
    }
    if (action === 'delete' && before.id === actorId) {
      throw new AppError('FORBIDDEN', 'Tidak dapat menghapus akun Anda sendiri');
    }
  }
  if (table === 'roles' && before.id === SUPERADMIN_ROLE_ID) {
    if (action === 'delete' || (after && (after.id !== SUPERADMIN_ROLE_ID || after.name !== 'superadmin'))) {
      throw new AppError('FORBIDDEN', 'Peran superadmin tidak dapat dihapus atau diganti nama/ID');
    }
  }
  if (table === 'role_permissions' && before.role_id === SUPERADMIN_ROLE_ID) {
    throw new AppError('FORBIDDEN', 'Izin peran superadmin dikelola otomatis');
  }
}

function friendly(error: any): never {
  const msg = String(error?.message ?? '');
  if (error instanceof AppError) throw error;
  if (msg.includes('FOREIGN KEY')) throw new AppError('CONFLICT', 'Data masih dipakai oleh tabel lain (relasi). Hapus/ubah data terkait terlebih dahulu.');
  if (msg.includes('UNIQUE')) throw new AppError('CONFLICT', `Nilai duplikat: ${msg.replace(/^.*UNIQUE constraint failed: /, '')}`);
  if (msg.includes('NOT NULL')) throw new AppError('VALIDATION', `Kolom wajib kosong: ${msg.replace(/^.*NOT NULL constraint failed: /, '')}`);
  if (msg.includes('CHECK')) throw new AppError('VALIDATION', `Nilai tidak valid: ${msg}`);
  throw new AppError('INTERNAL', msg || 'Terjadi kesalahan');
}

function assertWritable(def: CrudTableDef) {
  if (def.readOnly) throw new AppError('FORBIDDEN', `Tabel ${def.label} hanya baca`);
}

export function createRow(db: AppDatabase, input: { table: string; values: Record<string, unknown> }): Record<string, unknown> {
  const def = tableDef(db, input.table);
  assertWritable(def);
  const values = prepareValues(db, def.name, input.values ?? {}, 'create');
  if (def.name === 'role_permissions' && values.role_id === SUPERADMIN_ROLE_ID) {
    throw new AppError('FORBIDDEN', 'Izin peran superadmin dikelola otomatis');
  }
  const cols = Object.keys(values);
  if (cols.length === 0) throw new AppError('VALIDATION', 'Tidak ada nilai untuk disimpan');
  try {
    const r = db.sqlite
      .prepare(`INSERT INTO "${def.name}" (${cols.map((c) => `"${c}"`).join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`)
      .run(...cols.map((c) => values[c]));
    return publicRow(db, def.name, getRow(db, def.name, Number(r.lastInsertRowid)));
  } catch (error) {
    friendly(error);
  }
}

export function updateRow(
  db: AppDatabase,
  input: { table: string; rowid: number; values: Record<string, unknown> },
  actorId: string,
): Record<string, unknown> {
  const def = tableDef(db, input.table);
  assertWritable(def);
  const before = getRow(db, def.name, input.rowid);
  const values = prepareValues(db, def.name, input.values ?? {}, 'update');
  const cols = Object.keys(values);
  if (cols.length === 0) return publicRow(db, def.name, before);
  guardWrite(db, def.name, 'update', before, { ...before, ...values }, actorId);
  try {
    db.sqlite
      .prepare(`UPDATE "${def.name}" SET ${cols.map((c) => `"${c}" = ?`).join(', ')} WHERE rowid = ?`)
      .run(...cols.map((c) => values[c]), input.rowid);
  } catch (error) {
    friendly(error);
  }
  if (def.name === 'users' && (values.password !== undefined || values.is_active === 0 || values.role_id !== undefined)) {
    // Credentials/role changed: force re-login of that user.
    db.sqlite.prepare('DELETE FROM sessions WHERE user_id = ? AND user_id <> ?').run(before.id, actorId);
  }
  return publicRow(db, def.name, getRow(db, def.name, input.rowid));
}

export function deleteRows(
  db: AppDatabase,
  input: { table: string; rowids: number[] },
  actorId: string,
): number {
  const def = tableDef(db, input.table);
  assertWritable(def);
  const ids = [...new Set(input.rowids.map((n) => Math.trunc(Number(n))).filter((n) => Number.isFinite(n)))];
  if (ids.length === 0) return 0;
  let deleted = 0;
  const tx = db.sqlite.transaction(() => {
    for (const rowid of ids) {
      const before = getRow(db, def.name, rowid);
      guardWrite(db, def.name, 'delete', before, null, actorId);
      if (def.name === 'users') db.sqlite.prepare('DELETE FROM sessions WHERE user_id = ?').run(before.id);
      deleted += Number(db.sqlite.prepare(`DELETE FROM "${def.name}" WHERE rowid = ?`).run(rowid).changes);
    }
  });
  try {
    tx();
  } catch (error) {
    friendly(error);
  }
  return deleted;
}
