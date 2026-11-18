/**
 * CSV import services for products and customers.
 *
 * Format (comma-separated, UTF-8, first line = header):
 *   Products:  name,sku,barcode,category,unit,price,cost,stock
 *   Customers: name,email,phone,address,city
 *
 * Missing categories/units are auto-created. Rows with duplicate SKU/barcode
 * are skipped and reported. Nothing is imported unless validation passes for
 * the row — the whole import runs inside one SQLite transaction.
 */
import { randomUUID } from 'node:crypto';
import type { AppDatabase } from '../db/open';
import { AppError } from '../errors';

export type ImportRowError = { line: number; message: string };
export type ImportReport = {
  imported: number;
  skipped: number;
  errors: ImportRowError[];
};

/** Minimal RFC-4180-ish CSV parser: quoted fields, escaped quotes, CR/LF. */
function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, '');
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') { inQuotes = true; continue; }
    if (ch === ',') { cur.push(field); field = ''; continue; }
    if (ch === '\n') { cur.push(field); field = ''; rows.push(cur); cur = []; continue; }
    if (ch === '\r') continue;
    field += ch;
  }
  if (field.length > 0 || cur.length > 0) {
    cur.push(field);
    if (cur.some((c) => c.trim() !== '')) rows.push(cur);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

const toNum = (v: string): number | null => {
  const n = Number(String(v).replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : null;
};

function headerIndex(header: string[]): Map<string, number> {
  const map = new Map<string, number>();
  header.forEach((h, idx) => map.set(h.trim().toLowerCase().replace(/\s+/g, '_'), idx));
  return map;
}

export function importProductsCsv(db: AppDatabase, csvText: string, userId: string): ImportReport {
  const report: ImportReport = { imported: 0, skipped: 0, errors: [] };
  const rawRows = parseCsv(csvText);
  const rows = rawRows.filter((r) => {
    const first = String(r[0] ?? '').trim();
    return !first.startsWith('#');
  });
  if (rows.length < 2) throw new AppError('VALIDATION', 'CSV kosong atau hanya berisi header/komentar');
  const header = headerIndex(rows[0] ?? []);
  const idx = (name: string) => header.get(name) ?? -1;
  const col = {
    name: idx('name'), sku: idx('sku'), barcode: idx('barcode'),
    category: idx('category'), unit: idx('unit'), price: idx('price'), cost: idx('cost'), stock: idx('stock'),
  };
  if (col.name < 0 || col.price < 0 || col.cost < 0) {
    throw new AppError('VALIDATION', 'Header wajib: name, price, cost (opsional: sku, barcode, category, unit, stock)');
  }

  const now = new Date().toISOString();
  const findOrCreate = (table: 'categories' | 'units', name: string): string => {
    const trimmed = name.trim();
    if (!trimmed) return '';
    const existing = db.sqlite.prepare(`SELECT id FROM ${table} WHERE lower(name) = lower(?)`).get(trimmed) as { id: string } | undefined;
    if (existing) return existing.id;
    const id = randomUUID();
    db.sqlite.prepare(`INSERT INTO ${table} (id, name${table === 'units' ? ', symbol' : ''}) VALUES (?, ?${table === 'units' ? ', ?' : ''})`)
      .run(...(table === 'units' ? [id, trimmed, trimmed] : [id, trimmed]) as any[]);
    return id;
  };

  const insert = db.sqlite.prepare(
    `INSERT INTO products (id, name, category_id, unit_id, barcode, sku, price, cost, stock, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
  );
  const skuTaken = db.sqlite.prepare('SELECT id FROM products WHERE lower(sku) = lower(?)');
  const barcodeTaken = db.sqlite.prepare('SELECT id FROM products WHERE barcode = ?');

  const tx = db.sqlite.transaction(() => {
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i] ?? [];
      const line = i + 1;
      try {
        const name = (row[col.name] ?? '').trim();
        if (!name) { report.errors.push({ line, message: 'Nama kosong' }); continue; }
        const price = toNum(row[col.price] ?? '');
        const cost = toNum(row[col.cost] ?? '');
        if (price === null || price < 0) { report.errors.push({ line, message: 'Harga tidak valid' }); continue; }
        if (cost === null || cost < 0) { report.errors.push({ line, message: 'HPP tidak valid' }); continue; }
        const stock = col.stock >= 0 ? toNum(row[col.stock] ?? '0') ?? 0 : 0;
        const sku = col.sku >= 0 ? (row[col.sku] ?? '').trim() : '';
        const barcode = col.barcode >= 0 ? (row[col.barcode] ?? '').trim() : '';
        if (sku && skuTaken.get(sku)) { report.skipped++; continue; }
        if (barcode && barcodeTaken.get(barcode)) { report.skipped++; continue; }
        const categoryId = col.category >= 0 ? findOrCreate('categories', row[col.category] ?? '') : null;
        const unitId = col.unit >= 0 ? findOrCreate('units', row[col.unit] ?? '') : null;
        insert.run(randomUUID(), name, categoryId || null, unitId || null, barcode || null, sku || null, Math.round(price), Math.round(cost), Math.round(stock), now, now);
        report.imported++;
      } catch (err: any) {
        report.errors.push({ line, message: err?.message ?? 'Gagal' });
      }
    }
  });
  tx();
  return report;
}

export function importCustomersCsv(db: AppDatabase, csvText: string, userId: string): ImportReport {
  const report: ImportReport = { imported: 0, skipped: 0, errors: [] };
  const rawRows = parseCsv(csvText);
  const rows = rawRows.filter((r) => {
    const first = String(r[0] ?? '').trim();
    return !first.startsWith('#');
  });
  if (rows.length < 2) throw new AppError('VALIDATION', 'CSV kosong atau hanya berisi header/komentar');
  const header = headerIndex(rows[0] ?? []);
  const idx = (name: string) => header.get(name) ?? -1;
  const col = { name: idx('name'), email: idx('email'), phone: idx('phone'), address: idx('address'), city: idx('city') };
  if (col.name < 0) {
    throw new AppError('VALIDATION', 'Header wajib: name (opsional: email, phone, address, city)');
  }

  const now = Date.now();
  const nextCode = (): string => {
    const row = db.sqlite.prepare(
      `SELECT COALESCE(MAX(CAST(REPLACE(code, 'CST', '') AS INTEGER)), 0) + 1 AS n FROM customers`,
    ).get() as { n: number };
    return `CST${String(row.n).padStart(4, '0')}`;
  };
  const insert = db.sqlite.prepare(
    `INSERT INTO customers (id, code, name, phone, email, address, city, balance, created_at, updated_at, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
  );
  const emailTaken = db.sqlite.prepare('SELECT id FROM customers WHERE lower(email) = lower(?)');

  const tx = db.sqlite.transaction(() => {
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i] ?? [];
      const line = i + 1;
      try {
        const name = (row[col.name] ?? '').trim();
        if (!name) { report.errors.push({ line, message: 'Nama kosong' }); continue; }
        const email = col.email >= 0 ? (row[col.email] ?? '').trim() : '';
        if (email && emailTaken.get(email)) { report.skipped++; continue; }
        insert.run(
          randomUUID(), nextCode(), name,
          col.phone >= 0 ? (row[col.phone] ?? '').trim() || null : null,
          email || null,
          col.address >= 0 ? (row[col.address] ?? '').trim() || null : null,
          col.city >= 0 ? (row[col.city] ?? '').trim() || null : null,
          now, now, userId,
        );
        report.imported++;
      } catch (err: any) {
        report.errors.push({ line, message: err?.message ?? 'Gagal' });
      }
    }
  });
  tx();
  return report;
}
