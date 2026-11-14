import { describe, expect, it } from 'vitest';
import { AppDatabase } from '../db/open';
import { createProduct, listProducts } from './products';
import { createTransaction } from './transactions';
import type { PaymentLine } from 'vyapara-shared';

function createDb(): AppDatabase {
  return new AppDatabase(':memory:');
}

function seedProductWithStock(db: AppDatabase, stock = 10, userId = 'user-kasir-1') {
  return createProduct(db, {
    name: 'Barang',
    barcode: 'BRG-' + Math.random().toString(16).slice(2),
    sku: 'SKU-' + Math.random().toString(16).slice(2),
    price: 10_000,
    cost: 7_000,
    stock,
    userId,
  });
}

const cashPayment: PaymentLine[] = [{ method: 'cash', amount: 20_000 }];

describe('sales transactions', () => {
  it('creates a transaction and deducts stock atomically', () => {
    const db = createDb();
    db.sqlite
      .prepare('INSERT INTO users (id, name, email, password, role_id) VALUES (?, ?, ?, ?, ?)')
      .run('user-kasir-1', 'Kasir', 'kasir@vyapara.com', 'x', 'role-cashier');
    const product = seedProductWithStock(db, 10, 'user-kasir-1');

    const result = createTransaction(db, {
      userId: 'user-kasir-1',
      items: [{ productId: product.id, quantity: 2 }],
      discountAmount: 0,
      payments: cashPayment,
    });

    expect(result.transactionNumber).toMatch(/^INV-\d{8}-[0-9A-F]{6}$/);
    expect(result.subtotal).toBe(20_000);
    expect(result.totalAmount).toBe(20_000);
    expect(result.paymentAmount).toBe(20_000);
    expect(result.changeAmount).toBe(0);
    expect(result.paymentMethod).toBe('cash');
    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.productId).toBe(product.id);
    expect(result.items[0]!.quantity).toBe(2);

    const updated = listProducts(db, { includeInactive: true }, true).find((p) => p.id === product.id);
    expect(updated?.stock).toBe(8);
  });
});
