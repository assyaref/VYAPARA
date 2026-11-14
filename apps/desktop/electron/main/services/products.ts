import { randomUUID } from 'node:crypto';
import type { AppDatabase } from '../db/open';
import { AppError } from '../errors';
import { applyStockMovement } from './inventory';

export type ProductRecord = {
  id: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  categoryName: string | null;
  unitId: string | null;
  unitName: string | null;
  barcode: string | null;
  sku: string | null;
  price: number;
  cost: number | null;
  stock: number;
  isActive: boolean;
};

type ProductRow = {
  id: string;
  name: string;
  description: string | null;
  category_id: string | null;
  category_name: string | null;
  unit_id: string | null;
  unit_name: string | null;
  barcode: string | null;
  sku: string | null;
  price: number;
  cost: number;
  stock: number;
  is_active: number;
};

function mapProduct(row: ProductRow, includeCost: boolean): ProductRecord {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    categoryId: row.category_id,
    categoryName: row.category_name,
    unitId: row.unit_id,
    unitName: row.unit_name,
    barcode: row.barcode,
    sku: row.sku,
    price: Math.round(row.price),
    cost: includeCost ? Math.round(row.cost) : null,
    stock: row.stock,
    isActive: row.is_active === 1,
  };
}

const PRODUCT_SELECT = `
  SELECT p.id, p.name, p.description, p.category_id, c.name AS category_name,
         p.unit_id, u.name AS unit_name, p.barcode, p.sku, p.price, p.cost,
         p.stock, p.is_active
  FROM products p
  LEFT JOIN categories c ON c.id = p.category_id
  LEFT JOIN units u ON u.id = p.unit_id
`;

function assertReference(db: AppDatabase, table: 'categories' | 'units', id: string | null | undefined): void {
  if (!id) {
    return;
  }
  const row = db.sqlite.prepare(`SELECT id FROM ${table} WHERE id = ?`).get(id) as { id: string } | undefined;
  if (!row) {
    throw new AppError('VALIDATION', table === 'categories' ? 'Kategori tidak ditemukan' : 'Satuan tidak ditemukan');
  }
}

function assertUnique(db: AppDatabase, column: 'barcode' | 'sku', value: string | null | undefined, ignoreId?: string): void {
  if (!value) {
    return;
  }
  const row = db.sqlite
    .prepare(`SELECT id FROM products WHERE ${column} = ? AND id <> ?`)
    .get(value, ignoreId ?? '') as { id: string } | undefined;
  if (row) {
    throw new AppError('CONFLICT', column === 'barcode' ? 'Barcode sudah dipakai' : 'SKU sudah dipakai');
  }
}

export function listProducts(
  db: AppDatabase,
  query: { search?: string; categoryId?: string; includeInactive?: boolean },
  includeCost: boolean,
): ProductRecord[] {
  const clauses: string[] = [];
  const params: (string | number)[] = [];
  if (!query.includeInactive) {
    clauses.push('p.is_active = 1');
  }
  if (query.categoryId) {
    clauses.push('p.category_id = ?');
    params.push(query.categoryId);
  }
  if (query.search) {
    clauses.push('(p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ?)');
    const like = `%${query.search.replace(/[\\%_]/g, '')}%`;
    params.push(like, like, like);
  }
  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = db.sqlite.prepare(`${PRODUCT_SELECT} ${where} ORDER BY p.name COLLATE NOCASE`).all(...params) as ProductRow[];
  return rows.map((row) => mapProduct(row, includeCost));
}

export type ProductWrite = {
  name: string;
  description?: string;
  categoryId?: string;
  unitId?: string;
  barcode?: string;
  sku?: string;
  price: number;
  cost: number;
  stock: number;
};

export function createProduct(db: AppDatabase, input: ProductWrite & { userId: string }): ProductRecord {
  assertReference(db, 'categories', input.categoryId);
  assertReference(db, 'units', input.unitId);
  assertUnique(db, 'barcode', input.barcode);
  assertUnique(db, 'sku', input.sku);
  const now = new Date().toISOString();
  const id = randomUUID();
  const initialStock = Number.isFinite(input.stock) ? input.stock : 0;

  const transaction = db.sqlite.transaction(() => {
    db.sqlite
      .prepare(
        `INSERT INTO products (
          id, name, description, category_id, unit_id, barcode, sku, price, cost, stock, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      )
      .run(
        id,
        input.name,
        input.description ?? null,
        input.categoryId ?? null,
        input.unitId ?? null,
        input.barcode ?? null,
        input.sku ?? null,
        input.price,
        input.cost,
        0,
        now,
        now,
      );

    if (initialStock !== 0) {
      applyStockMovement(
        db,
        {
          productId: id,
          movementType: 'stock_in',
          quantityChange: initialStock,
          referenceType: 'product',
          referenceId: id,
          notes: 'Stok awal saat pembuatan produk',
          userId: input.userId,
          idempotencyKey: `product_stock_in:${id}`,
        },
        randomUUID(),
        now,
      );
    }
  });

  transaction();

  const created = listProducts(db, { includeInactive: true }, true).find((product) => product.id === id);
  if (!created) {
    throw new AppError('INTERNAL', 'Produk tidak dapat dibaca setelah disimpan');
  }
  return created;
}

export function updateProduct(
  db: AppDatabase,
  input: {
    id: string;
    name?: string;
    description?: string | null;
    categoryId?: string | null;
    unitId?: string | null;
    barcode?: string | null;
    sku?: string | null;
    price?: number;
    cost?: number;
    stock?: number;
    isActive?: boolean;
    userId: string;
  },
): ProductRecord {
  const existing = db.sqlite
    .prepare('SELECT id, stock FROM products WHERE id = ?')
    .get(input.id) as { id: string; stock: number } | undefined;
  if (!existing) {
    throw new AppError('NOT_FOUND', 'Produk tidak ditemukan');
  }
  assertReference(db, 'categories', input.categoryId);
  assertReference(db, 'units', input.unitId);
  assertUnique(db, 'barcode', input.barcode, input.id);
  assertUnique(db, 'sku', input.sku, input.id);

  const now = new Date().toISOString();
  const stockDelta = input.stock !== undefined ? input.stock - existing.stock : 0;

  const assignments: string[] = [];
  const params: (string | number | null)[] = [];
  const set = (column: string, value: string | number | null) => {
    assignments.push(`${column} = ?`);
    params.push(value);
  };
  if (input.name !== undefined) set('name', input.name);
  if (input.description !== undefined) set('description', input.description);
  if (input.categoryId !== undefined) set('category_id', input.categoryId);
  if (input.unitId !== undefined) set('unit_id', input.unitId);
  if (input.barcode !== undefined) set('barcode', input.barcode);
  if (input.sku !== undefined) set('sku', input.sku);
  if (input.price !== undefined) set('price', input.price);
  if (input.cost !== undefined) set('cost', input.cost);
  if (input.isActive !== undefined) set('is_active', input.isActive ? 1 : 0);
  set('updated_at', new Date().toISOString());
  params.push(input.id);

  const transaction = db.sqlite.transaction(() => {
    db.sqlite.prepare(`UPDATE products SET ${assignments.join(', ')} WHERE id = ?`).run(...params);

    if (stockDelta !== 0) {
      applyStockMovement(
        db,
        {
          productId: input.id,
          movementType: 'adjustment',
          quantityChange: stockDelta,
          referenceType: 'adjustment',
          referenceId: input.id,
          notes: 'Penyesuaian stok via pembaruan produk',
          userId: input.userId,
          idempotencyKey: `product_stock_update:${input.id}`,
        },
        randomUUID(),
        now,
      );
    }
  });

  transaction();
  const updated = listProducts(db, { includeInactive: true }, true).find((product) => product.id === input.id);
  if (!updated) {
    throw new AppError('INTERNAL', 'Produk tidak dapat dibaca setelah diubah');
  }
  return updated;
}

export function deactivateProduct(db: AppDatabase, id: string, userId: string): ProductRecord {
  return updateProduct(db, { id, isActive: false, userId });
}

export function listCategories(db: AppDatabase): { id: string; name: string }[] {
  return db.sqlite.prepare('SELECT id, name FROM categories ORDER BY name COLLATE NOCASE').all() as {
    id: string;
    name: string;
  }[];
}

export function listUnits(db: AppDatabase): { id: string; name: string; symbol: string | null }[] {
  return db.sqlite.prepare('SELECT id, name, symbol FROM units ORDER BY name COLLATE NOCASE').all() as {
    id: string;
    name: string;
    symbol: string | null;
  }[];
}
