import { describe, expect, it } from 'vitest';
import { AppDatabase } from '../db/open';
import { AppError } from '../errors';
import { setupAdmin } from './auth';
import {
  createSupplier,
  deactivateSupplier,
  generateSupplierCode,
  getSupplier,
  getSupplierBalance,
  listSupplierTransactions,
  listSuppliers,
  recordSupplierTransaction,
  updateSupplier,
} from './supplier';

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

describe('suppliers', () => {
  it('generates sequential supplier codes', () => {
    const db = createDb();
    expect(generateSupplierCode(db)).toBe('SUP0001');
    createSupplier(db, { name: 'Toko Abadi', userId: seedContext(db).userId });
    expect(generateSupplierCode(db)).toBe('SUP0002');
  });

  it('creates a supplier with generated code', () => {
    const db = createDb();
    const { userId } = seedContext(db);

    const supplier = createSupplier(db, {
      name: 'CV. Abadi Jaya',
      contactPerson: 'Budi',
      phone: '0812345678',
      email: 'abadi@example.com',
      address: 'Jl. Mawar 1',
      city: 'Jakarta',
      taxId: 'NPWP-123',
      paymentTerms: 30,
      creditLimit: 10_000_000,
      notes: 'Pemasok kertas',
      userId,
    });

    expect(supplier.code).toBe('SUP0001');
    expect(supplier.name).toBe('CV. Abadi Jaya');
    expect(supplier.status).toBe('active');
    expect(supplier.balance).toBe(0);
    expect(supplier.createdBy).toBe(userId);
    expect(getSupplier(db, supplier.id)).toEqual(supplier);
    expect(getSupplier(db, 'tidak-ada')).toBeUndefined();
  });

  it('lists and filters suppliers', () => {
    const db = createDb();
    const { userId } = seedContext(db);

    createSupplier(db, { name: 'CV. Abadi Jaya', userId });
    createSupplier(db, { name: 'Toko Sejahtera', userId });

    const all = listSuppliers(db);
    expect(all).toHaveLength(2);

    const found = listSuppliers(db, { search: 'Sejahtera' });
    expect(found).toHaveLength(1);
    expect(found[0]!.name).toBe('Toko Sejahtera');
  });

  it('updates a supplier', () => {
    const db = createDb();
    const { userId } = seedContext(db);

    const supplier = createSupplier(db, { name: 'CV. Abadi Jaya', userId });
    const updated = updateSupplier(db, { id: supplier.id, name: 'CV. Abadi Raya', creditLimit: 20_000_000 });
    expect(updated.name).toBe('CV. Abadi Raya');
    expect(updated.creditLimit).toBe(20_000_000);
    expect(() => updateSupplier(db, { id: 'tidak-ada', name: 'X' })).toThrow(AppError);
  });

  it('deactivates a supplier', () => {
    const db = createDb();
    const { userId } = seedContext(db);

    const supplier = createSupplier(db, { name: 'CV. Abadi Jaya', userId });
    expect(() => deactivateSupplier(db, supplier.id)).not.toThrow();
    expect(getSupplier(db, supplier.id)!.status).toBe('inactive');
    expect(() => deactivateSupplier(db, 'tidak-ada')).toThrow(AppError);
  });

  it('records supplier transactions and computes balance', () => {
    const db = createDb();
    const { userId } = seedContext(db);

    const supplier = createSupplier(db, { name: 'CV. Abadi Jaya', userId });

    const purchase = recordSupplierTransaction(db, {
      supplierId: supplier.id,
      transactionType: 'purchase',
      amount: 5_000_000,
      referenceType: 'goods_receiving',
      description: 'Pembelian kertas',
      userId,
    });
    expect(purchase.balanceAfter).toBe(5_000_000);
    expect(getSupplierBalance(db, supplier.id)).toBe(5_000_000);

    const payment = recordSupplierTransaction(db, {
      supplierId: supplier.id,
      transactionType: 'payment',
      amount: -2_000_000,
      description: 'Pelunasan',
      userId,
    });
    expect(payment.balanceAfter).toBe(3_000_000);
    expect(getSupplierBalance(db, supplier.id)).toBe(3_000_000);

    const txs = listSupplierTransactions(db, { supplierId: supplier.id });
    expect(txs).toHaveLength(2);
    const purchases = listSupplierTransactions(db, { supplierId: supplier.id, transactionType: 'purchase' });
    expect(purchases).toHaveLength(1);
  });

  it('rejects transactions for unknown supplier', () => {
    const db = createDb();
    const { userId } = seedContext(db);
    expect(() =>
      recordSupplierTransaction(db, {
        supplierId: 'tidak-ada',
        transactionType: 'purchase',
        amount: 100,
        userId,
      }),
    ).toThrow(AppError);
  });
});
