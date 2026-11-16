import { randomUUID } from 'node:crypto';
import type { AppDatabase } from '../db/open';
import { AppError } from '../errors';

export type CatalogCategory = {
  id: string;
  name: string;
  description: string | null;
  productCount: number;
};

export type CatalogUnit = {
  id: string;
  name: string;
  symbol: string | null;
  productCount: number;
};

function normName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length < 1 || trimmed.length > 60) {
    throw new AppError('VALIDATION', 'Nama harus 1–60 karakter');
  }
  return trimmed;
}
function normSymbol(symbol: string | null | undefined): string | null {
  if (symbol == null) return null;
  const s = String(symbol).trim();
  return s.length === 0 ? null : s.slice(0, 20);
}
function normDescription(description: string | null | undefined): string | null {
  if (description == null) return null;
  const s = String(description).trim();
  return s.length === 0 ? null : s.slice(0, 200);
}

export function listCategories(db: AppDatabase): CatalogCategory[] {
  const rows = db.sqlite
    .prepare(
      `SELECT c.id, c.name, c.description,
              (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) AS product_count
       FROM categories c
       ORDER BY c.name COLLATE NOCASE`,
    )
    .all() as any[];
  return rows.map((r) => ({ id: r.id, name: r.name, description: r.description ?? null, productCount: r.product_count }));
}

export function listUnits(db: AppDatabase): CatalogUnit[] {
  const rows = db.sqlite
    .prepare(
      `SELECT u.id, u.name, u.symbol,
              (SELECT COUNT(*) FROM products p WHERE p.unit_id = u.id) AS product_count
       FROM units u
       ORDER BY u.name COLLATE NOCASE`,
    )
    .all() as any[];
  return rows.map((r) => ({ id: r.id, name: r.name, symbol: r.symbol ?? null, productCount: r.product_count }));
}

export function createCategory(db: AppDatabase, input: { name: string; description?: string | null }) {
  const name = normName(input.name);
  const desc = normDescription(input.description);
  const existing = db.sqlite
    .prepare('SELECT id FROM categories WHERE lower(name) = lower(?)')
    .get(name) as { id: string } | undefined;
  if (existing) throw new AppError('CONFLICT', `Kategori "${name}" sudah ada`);
  const id = randomUUID();
  db.sqlite
    .prepare('INSERT INTO categories (id, name, description) VALUES (?, ?, ?)')
    .run(id, name, desc);
  return { id, name, description: desc };
}

export function renameCategory(db: AppDatabase, input: { id: string; name?: string; description?: string | null }) {
  const current = db.sqlite.prepare('SELECT id FROM categories WHERE id = ?').get(input.id) as { id: string } | undefined;
  if (!current) throw new AppError('NOT_FOUND', 'Kategori tidak ditemukan');

  let nextName: string | undefined;
  if (input.name !== undefined) {
    nextName = normName(input.name);
    const dup = db.sqlite
      .prepare('SELECT id FROM categories WHERE lower(name) = lower(?) AND id <> ?')
      .get(nextName, input.id) as { id: string } | undefined;
    if (dup) throw new AppError('CONFLICT', `Kategori "${nextName}" sudah ada`);
  }
  const nextDesc = input.description !== undefined ? normDescription(input.description) : undefined;
  const updates: string[] = [];
  const params: unknown[] = [];
  if (nextName !== undefined) { updates.push('name = ?'); params.push(nextName); }
  if (nextDesc !== undefined) { updates.push('description = ?'); params.push(nextDesc); }
  if (updates.length) {
    params.push(input.id);
    db.sqlite.prepare(`UPDATE categories SET ${updates.join(', ')} WHERE id = ?`).run(...params as any);
  }
  return { ok: true };
}

export function deleteCategory(db: AppDatabase, id: string) {
  const current = db.sqlite.prepare('SELECT id FROM categories WHERE id = ?').get(id) as { id: string } | undefined;
  if (!current) throw new AppError('NOT_FOUND', 'Kategori tidak ditemukan');
  const inUse = db.sqlite
    .prepare('SELECT COUNT(*) AS c FROM products WHERE category_id = ?')
    .get(id) as { c: number };
  if (inUse.c > 0) {
    throw new AppError('CONFLICT', `Kategori masih dipakai oleh ${inUse.c} produk. Nonaktifkan produk atau pindahkan ke kategori lain terlebih dahulu.`);
  }
  db.sqlite.prepare('DELETE FROM categories WHERE id = ?').run(id);
  return { ok: true };
}

export function createUnit(db: AppDatabase, input: { name: string; symbol?: string | null }) {
  const name = normName(input.name);
  const symbol = normSymbol(input.symbol);
  const existing = db.sqlite
    .prepare('SELECT id FROM units WHERE lower(name) = lower(?)')
    .get(name) as { id: string } | undefined;
  if (existing) throw new AppError('CONFLICT', `Satuan "${name}" sudah ada`);
  const id = randomUUID();
  db.sqlite
    .prepare('INSERT INTO units (id, name, symbol) VALUES (?, ?, ?)')
    .run(id, name, symbol);
  return { id, name, symbol };
}

export function renameUnit(db: AppDatabase, input: { id: string; name?: string; symbol?: string | null }) {
  const current = db.sqlite.prepare('SELECT id FROM units WHERE id = ?').get(input.id) as { id: string } | undefined;
  if (!current) throw new AppError('NOT_FOUND', 'Satuan tidak ditemukan');

  let nextName: string | undefined;
  if (input.name !== undefined) {
    nextName = normName(input.name);
    const dup = db.sqlite
      .prepare('SELECT id FROM units WHERE lower(name) = lower(?) AND id <> ?')
      .get(nextName, input.id) as { id: string } | undefined;
    if (dup) throw new AppError('CONFLICT', `Satuan "${nextName}" sudah ada`);
  }
  const nextSymbol = input.symbol !== undefined ? normSymbol(input.symbol) : undefined;
  const updates: string[] = [];
  const params: unknown[] = [];
  if (nextName !== undefined) { updates.push('name = ?'); params.push(nextName); }
  if (nextSymbol !== undefined) { updates.push('symbol = ?'); params.push(nextSymbol); }
  if (updates.length) {
    params.push(input.id);
    db.sqlite.prepare(`UPDATE units SET ${updates.join(', ')} WHERE id = ?`).run(...params as any);
  }
  return { ok: true };
}

export function deleteUnit(db: AppDatabase, id: string) {
  const current = db.sqlite.prepare('SELECT id FROM units WHERE id = ?').get(id) as { id: string } | undefined;
  if (!current) throw new AppError('NOT_FOUND', 'Satuan tidak ditemukan');
  const inUse = db.sqlite
    .prepare('SELECT COUNT(*) AS c FROM products WHERE unit_id = ?')
    .get(id) as { c: number };
  if (inUse.c > 0) {
    throw new AppError('CONFLICT', `Satuan masih dipakai oleh ${inUse.c} produk. Pindahkan produk ke satuan lain terlebih dahulu.`);
  }
  db.sqlite.prepare('DELETE FROM units WHERE id = ?').run(id);
  return { ok: true };
}
