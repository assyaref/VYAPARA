import { describe, expect, it } from 'vitest';
import { AppDatabase } from '../db/open';
import { AppError } from '../errors';
import {
  createProduct,
  deactivateProduct,
  listCategories,
  listProducts,
  listUnits,
  updateProduct,
} from './products';
import { listOutboxEvents } from './outbox';
import { listStockMovements, recordStockMovement } from './inventory';

const USER_ID = 'user-1';

function createDb(): AppDatabase {
  const db = new AppDatabase(':memory:');
  db.sqlite
    .prepare(
      "INSERT INTO users (id, name, email, password, role_id, must_change_password, created_at, updated_at) VALUES (?, 'Test User', 'test@vyapara.com', 'x', 'role-admin', 0, datetime('now'), datetime('now'))",
    )
    .run(USER_ID);
  return db;
}

function seedProduct(db: AppDatabase, overrides: Partial<Parameters<typeof createProduct>[1]> = {}) {
  return createProduct(db, {
    name: 'Kertas A4 70gsm',
    description: 'Kertas HVS',
    categoryId: 'cat-atk',
    unitId: 'unit-ream',
    barcode: 'BC-' + Math.random().toString(16).slice(2, 10),
    sku: 'SKU-' + Math.random().toString(16).slice(2, 10),
    price: 45_000,
    cost: 30_000,
    stock: 100,
    userId: USER_ID,
    ...overrides,
  });
}

describe('product management', () => {
  it('lists seeded categories and units', () => {
    const db = createDb();
    const categories = listCategories(db);
    const units = listUnits(db);
    expect(categories.map((c) => c.name)).toContain('ATK');
    expect(categories.map((c) => c.name)).toContain('Kertas');
    expect(units.map((u) => u.name).sort()).toEqual(['Pack', 'Pcs', 'Rim']);
  });

  it('creates a product with category and unit', () => {
    const db = createDb();
    const product = seedProduct(db);
    expect(product.name).toBe('Kertas A4 70gsm');
    expect(product.categoryId).toBe('cat-atk');
    expect(product.categoryName).toBe('ATK');
    expect(product.unitId).toBe('unit-ream');
    expect(product.unitName).toBe('Rim');
    expect(product.price).toBe(45_000);
    expect(product.cost).toBe(30_000);
    expect(product.stock).toBe(100);
    expect(product.isActive).toBe(true);
  });

  it('creates a product without category or unit', () => {
    const db = createDb();
    const product = createProduct(db, {
      name: 'Penghapus',
      price: 5_000,
      cost: 3_000,
      stock: 50,
      userId: USER_ID,
    });
    expect(product.categoryId).toBeNull();
    expect(product.unitId).toBeNull();
    expect(product.isActive).toBe(true);
  });

  it('rejects duplicate barcode and SKU', () => {
    const db = createDb();
    const barcode = 'BARCODE-123';
    const sku = 'SKU-123';
    seedProduct(db, { barcode, sku });
    expect(() => seedProduct(db, { barcode, sku: 'SKU-999' })).toThrow(AppError);
    expect(() => seedProduct(db, { barcode: 'BARCODE-999', sku })).toThrow(AppError);
  });

  it('rejects unknown category or unit', () => {
    const db = createDb();
    expect(() => seedProduct(db, { categoryId: 'tidak-ada' })).toThrow(AppError);
    expect(() => seedProduct(db, { unitId: 'tidak-ada' })).toThrow(AppError);
  });

  it('lists only active products by default', () => {
    const db = createDb();
    const p1 = seedProduct(db, { name: 'Produk Aktif' });
    const p2 = seedProduct(db, { name: 'Produk Nonaktif' });
    deactivateProduct(db, p2.id, USER_ID);

    const active = listProducts(db, {}, false);
    expect(active.map((p) => p.id)).toContain(p1.id);
    expect(active.map((p) => p.id)).not.toContain(p2.id);

    const all = listProducts(db, { includeInactive: true }, true);
    expect(all.map((p) => p.id)).toContain(p1.id);
    expect(all.map((p) => p.id)).toContain(p2.id);
  });

  it('searches and filters products', () => {
    const db = createDb();
    seedProduct(db, { name: 'Kertas A4 70gsm', sku: 'KRT-A4', barcode: '111' });
    seedProduct(db, { name: 'Kertas F4 70gsm', sku: 'KRT-F4', barcode: '222' });
    seedProduct(db, { name: 'Pulpen Tulis', categoryId: 'cat-paper', sku: 'PLN-01', barcode: '333' });

    const search = listProducts(db, { search: 'Kertas' }, false);
    expect(search).toHaveLength(2);

    const category = listProducts(db, { categoryId: 'cat-paper' }, false);
    expect(category).toHaveLength(1);
    expect(category[0]!.name).toBe('Pulpen Tulis');
  });

  it('updates a product', () => {
    const db = createDb();
    const product = seedProduct(db);
    const updated = updateProduct(db, { id: product.id, name: 'Kertas A4 80gsm', price: 50_000, stock: 90, userId: USER_ID });
    expect(updated.name).toBe('Kertas A4 80gsm');
    expect(updated.price).toBe(50_000);
    expect(updated.stock).toBe(90);
  });

  it('rejects updating unknown product and duplicate barcode on update', () => {
    const db = createDb();
    const p1 = seedProduct(db, { barcode: 'UNIK-1' });
    const p2 = seedProduct(db, { barcode: 'UNIK-2' });

    expect(() => updateProduct(db, { id: 'tidak-ada', name: 'X', userId: USER_ID })).toThrow(AppError);
    expect(() => updateProduct(db, { id: p1.id, barcode: 'UNIK-2', userId: USER_ID })).toThrow(AppError);
  });

  it('deactivates a product', () => {
    const db = createDb();
    const product = seedProduct(db);
    const deactivated = deactivateProduct(db, product.id, USER_ID);
    expect(deactivated.isActive).toBe(false);
    expect(listProducts(db, {}, false)).toHaveLength(0);
  });
});

describe('product inventory integrity', () => {
  it('creation with initial stock records stock_in movement, ledger entry and outbox event atomically', () => {
    const db = createDb();
    const product = createProduct(db, {
      name: 'Kertas A4',
      price: 45_000,
      cost: 30_000,
      stock: 10,
      userId: USER_ID,
    });

    expect(product.stock).toBe(10);

    const movements = listStockMovements(db, { productId: product.id });
    expect(movements).toHaveLength(1);
    expect(movements[0]!.movementType).toBe('stock_in');
    expect(movements[0]!.quantityChange).toBe(10);
    expect(movements[0]!.quantityBefore).toBe(0);
    expect(movements[0]!.quantityAfter).toBe(10);
    expect(movements[0]!.referenceType).toBe('product');
    expect(movements[0]!.referenceId).toBe(product.id);

    const events = listOutboxEvents(db).filter((e) => e.eventType === 'inventory.movement.recorded');
    expect(events).toHaveLength(1);
    expect(events[0]!.aggregateType).toBe('stock_movement');
    expect(events[0]!.aggregateId).toBe(movements[0]!.id);
    expect(events[0]!.payload.productId).toBe(product.id);
  });

  it('creation without stock records no movement', () => {
    const db = createDb();
    const product = createProduct(db, { name: 'Tanpa Stok', price: 5_000, cost: 3_000, stock: 0, userId: USER_ID });

    expect(product.stock).toBe(0);
    expect(listStockMovements(db, { productId: product.id })).toHaveLength(0);
  });

  it('update product stock records an adjustment movement with the delta', () => {
    const db = createDb();
    const product = createProduct(db, { name: 'Kertas A4', price: 45_000, cost: 30_000, stock: 10, userId: USER_ID });

    const updated = updateProduct(db, { id: product.id, stock: 25, userId: USER_ID });
    expect(updated.stock).toBe(25);

    const movements = listStockMovements(db, { productId: product.id });
    // Includes the initial stock_in plus the adjustment for the delta
    expect(movements).toHaveLength(2);
    const adjustment = movements.find((m) => m.movementType === 'adjustment');
    expect(adjustment).toBeDefined();
    expect(adjustment!.quantityChange).toBe(15);
    expect(adjustment!.quantityBefore).toBe(10);
    expect(adjustment!.quantityAfter).toBe(25);
  });

  it('updating product stock to the same value records no movement', () => {
    const db = createDb();
    const product = createProduct(db, { name: 'Kertas A4', price: 45_000, cost: 30_000, stock: 10, userId: USER_ID });
    expect(listStockMovements(db, { productId: product.id })).toHaveLength(1); // initial stock_in

    updateProduct(db, { id: product.id, stock: 10, userId: USER_ID });
    expect(listStockMovements(db, { productId: product.id })).toHaveLength(1);
  });

  it('rejecting insufficient stock leaves stock unchanged (atomic rollback)', () => {
    const db = createDb();
    const product = createProduct(db, { name: 'Kertas A4', price: 45_000, cost: 30_000, stock: 2, userId: USER_ID });

    expect(() =>
      recordStockMovement(db, {
        productId: product.id,
        movementType: 'stock_out',
        quantityChange: -5,
        userId: USER_ID,
      }),
    ).toThrow(AppError);

    const still = (db.sqlite.prepare('SELECT stock FROM products WHERE id = ?').get(product.id) as { stock: number }).stock;
    expect(still).toBe(2);
    expect(listStockMovements(db, { productId: product.id })).toHaveLength(1); // initial stock_in remains
  });

  it('duplicate idempotency key prevents a second inventory movement', () => {
    const db = createDb();
    const product = createProduct(db, { name: 'Kertas A4', price: 45_000, cost: 30_000, stock: 0, userId: USER_ID });

    const key = 'stock_movement:idem-unique-001';
    recordStockMovement(db, {
      productId: product.id,
      movementType: 'stock_in',
      quantityChange: 5,
      userId: USER_ID,
      idempotencyKey: key,
    });

    expect(() =>
      recordStockMovement(db, {
        productId: product.id,
        movementType: 'stock_in',
        quantityChange: 5,
        userId: USER_ID,
        idempotencyKey: key,
      }),
    ).toThrow(/duplikat/i);

    expect(listStockMovements(db, { productId: product.id })).toHaveLength(1);
    const stock = (db.sqlite.prepare('SELECT stock FROM products WHERE id = ?').get(product.id) as { stock: number }).stock;
    expect(stock).toBe(5);
  });
});
