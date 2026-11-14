import { describe, expect, it } from 'vitest';
import { AppDatabase } from '../db/open';
import { setupAdmin } from './auth';
import { createProduct } from './products';
import { recordExpense } from './finance';
import { createTransaction } from './transactions';
import { recordStockMovement } from './inventory';
import {
  getBestSellingProducts,
  getCashierPerformance,
  getExpenseReport,
  getGrossProfit,
  getInventoryValuation,
  getPurchaseReport,
  getSalesReport,
  getSlowMovingProducts,
  getTransactionReport,
} from './reports';
import type { PaymentLine } from 'vyapara-shared';

function createDb(): AppDatabase {
  return new AppDatabase(':memory:');
}

function seedContext(db: AppDatabase) {
  const { user } = setupAdmin(db, {
    name: 'Administrator',
    email: 'admin@vyapara.com',
    password: 'rahasia123456',
  });
  const p1 = createProduct(db, { name: 'Pen 0.7', barcode: 'BC-PEN', sku: 'SKU-PEN', price: 5_000, cost: 3_000, stock: 100, userId: user.id });
  const p2 = createProduct(db, { name: 'Pulpen', barcode: 'BC-PUL', sku: 'SKU-PUL', price: 4_000, cost: 2_500, stock: 0, userId: user.id });
  const p3 = createProduct(db, { name: 'Tidak Terjual', barcode: 'BC-NONE', sku: 'SKU-NONE', price: 10_000, cost: 6_000, stock: 50, userId: user.id });
  const payments: PaymentLine[] = [{ method: 'cash', amount: 0 }];
  return { userId: user.id, p1, p2, p3, payments };
}

function transact(db: AppDatabase, userId: string, productId: string, quantity: number, amount: number) {
  return createTransaction(db, {
    userId,
    items: [{ productId, quantity }],
    discountAmount: 0,
    payments: [{ method: 'cash', amount }],
  });
}

describe('reports', () => {
  it('generates a sales report grouped by day and month', () => {
    const db = createDb();
    const { userId, p1, payments } = seedContext(db);

    transact(db, userId, p1.id, 2, 10_000);
    transact(db, userId, p1.id, 1, 5_000);

    const daily = getSalesReport(db);
    expect(daily).toHaveLength(1);
    expect(daily[0]!.count).toBe(2);
    expect(daily[0]!.total).toBe(15_000);

    const monthly = getSalesReport(db, undefined, undefined, 'month');
    expect(monthly).toHaveLength(1);
    expect(monthly[0]!.date).toMatch(/^\d{4}-\d{2}$/);
  });

  it('filters sales report by date range', () => {
    const db = createDb();
    const { userId, p1, payments } = seedContext(db);

    transact(db, userId, p1.id, 1, 5_000);
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().split('T')[0];

    expect(getSalesReport(db, yesterday, yesterday)).toHaveLength(0);
    expect(getSalesReport(db, today, today)).toHaveLength(1);
  });

  it('ranks best selling products', () => {
    const db = createDb();
    const { userId, p1, p2 } = seedContext(db);
    // Increase p2 stock from 0 to 100 via transactional inventory service
    recordStockMovement(db, { productId: p2.id, movementType: 'stock_in', quantityChange: 100, userId: userId, notes: 'initial stock' });

    transact(db, userId, p1.id, 10, 50_000);
    transact(db, userId, p2.id, 3, 12_000);

    const best = getBestSellingProducts(db);
    expect(best[0]!.productId).toBe(p1.id);
    expect(best[0]!.quantity).toBe(10);
    expect(best[0]!.revenue).toBe(50_000);
    expect(best[1]!.productId).toBe(p2.id);
  });

  it('finds slow moving products', () => {
    const db = createDb();
    const { userId, p1, p3 } = seedContext(db);

    transact(db, userId, p1.id, 1, 5_000);

    const slow = getSlowMovingProducts(db);
    const ids = slow.map((row) => row.productId);
    expect(ids).toContain(p3.id); // never sold
    expect(ids).not.toContain(p1.id); // sold recently
  });

  it('computes gross profit', () => {
    const db = createDb();
    const { userId, p1 } = seedContext(db);

    transact(db, userId, p1.id, 4, 20_000); // revenue 20_000, cogs 4 * 3_000 = 12_000

    const gp = getGrossProfit(db);
    expect(gp).toHaveLength(1);
    expect(gp[0]!.revenue).toBe(20_000);
    expect(gp[0]!.cogs).toBe(12_000);
    expect(gp[0]!.grossProfit).toBe(8_000);
  });

  it('values inventory', () => {
    const db = createDb();
    const { p1, p2 } = seedContext(db);

    const rows = getInventoryValuation(db);
    const byId = Object.fromEntries(rows.map((r) => [r.productId, r]));
    expect(byId[p1.id]!.quantity).toBe(100);
    expect(byId[p1.id]!.costValue).toBe(300_000);
    expect(byId[p1.id]!.retailValue).toBe(500_000);
    expect(byId[p2.id]!.quantity).toBe(0);
  });

  it('reports purchases, expenses, cashier performance and transactions', () => {
    const db = createDb();
    const { userId, p1 } = seedContext(db);

    db.sqlite
      .prepare(
        `INSERT INTO suppliers (id, code, name, status, balance, created_at, updated_at)
         VALUES (?, ?, ?, 'active', 0, ?, ?)`,
      )
      .run('supplier-1', 'SUP-0001', 'CV. Mitra', new Date().toISOString(), new Date().toISOString());
    db.sqlite
      .prepare(
        `INSERT INTO purchase_orders (id, po_number, supplier_id, user_id, status, subtotal, tax_amount, total_amount, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'received', 200_000, 0, 200_000, NULL, ?, ?)`,
      )
      .run('po-1', 'PO-20260101-0001', 'supplier-1', userId, new Date().toISOString(), new Date().toISOString());

    transact(db, userId, p1.id, 1, 5_000);

    const purchases = getPurchaseReport(db);
    expect(purchases).toHaveLength(1);
    expect(purchases[0]!.supplierName).toBe('CV. Mitra');

    recordExpense(db, { category: 'listrik', amount: 40_000, createdBy: userId });
    const expenses = getExpenseReport(db);
    expect(expenses[0]!.category).toBe('listrik');
    expect(expenses[0]!.amount).toBe(40_000);

    const performance = getCashierPerformance(db);
    expect(performance[0]!.userId).toBe(userId);
    expect(performance[0]!.count).toBe(1);
    expect(performance[0]!.total).toBe(5_000);

    const txReport = getTransactionReport(db);
    expect(txReport).toHaveLength(1);
    expect(txReport[0]!.totalAmount).toBe(5_000);
  });
});
