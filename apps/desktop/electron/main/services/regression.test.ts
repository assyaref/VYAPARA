import { describe, expect, it } from 'vitest';
import { AppDatabase } from '../db/open';
import { setupAdmin } from './auth';
import { createProduct } from './products';
import { createTransaction } from './transactions';
import { getGrossProfit } from './reports';

function createDb(): AppDatabase {
  return new AppDatabase(':memory:');
}

function seedContext(db: AppDatabase) {
  const { user } = setupAdmin(db, {
    name: 'Administrator',
    email: 'admin@vyapara.com',
    password: 'rahasia123456',
  });
  return { userId: user.id };
}

describe('historical profit regression', () => {
  it('maintains stable gross profit when product cost is updated retrospectively', () => {
    const db = createDb();
    const { userId } = seedContext(db);

    // Create a product with initial cost
    const product = createProduct(db, {
      name: 'Test Product',
      barcode: 'BC-TEST',
      sku: 'SKU-TEST',
      price: 10_000,
      cost: 7_000,
      stock: 50,
      userId,
    });

    // Record a sale of 3 items at price 10_000 each
    // Revenue: 30_000, COGS: 3 * 7_000 = 21_000, Gross Profit: 9_000
    createTransaction(db, {
      userId,
      items: [{ productId: product.id, quantity: 3 }],
      discountAmount: 0,
      payments: [{ method: 'cash', amount: 30_000 }],
    });

    // Get initial gross profit
    const initialProfit = getGrossProfit(db);
    expect(initialProfit).toHaveLength(1);
    expect(initialProfit[0]!.revenue).toBe(30_000);
    expect(initialProfit[0]!.cogs).toBe(21_000);
    expect(initialProfit[0]!.grossProfit).toBe(9_000);

    // Record another sale of 2 items
    // Revenue: 20_000, COGS: 2 * 7_000 = 14_000, Gross Profit: 6_000
    createTransaction(db, {
      userId,
      items: [{ productId: product.id, quantity: 2 }],
      discountAmount: 0,
      payments: [{ method: 'cash', amount: 20_000 }],
    });

    // Get updated gross profit - should include both transactions
    const updatedProfit = getGrossProfit(db);
    expect(updatedProfit).toHaveLength(1);
    // Total revenue: 30_000 + 20_000 = 50_000
    // Total COGS: 21_000 + 14_000 = 35_000
    // Total Gross Profit: 50_000 - 35_000 = 15_000
    expect(updatedProfit[0]!.revenue).toBe(50_000);
    expect(updatedProfit[0]!.cogs).toBe(35_000);
    expect(updatedProfit[0]!.grossProfit).toBe(15_000);
  });
});
