import { describe, expect, it } from 'vitest';
import { AppDatabase } from '../db/open';
import { setupAdmin, login } from './auth';
import { createSupplier, createSupplierInvoice, getPayablesSummary, paySupplierInvoice } from './supplier';
import { payCustomerCredit } from './customer';

function createDb(): AppDatabase {
  return new AppDatabase(':memory:');
}

function seedAdminIfNeeded(db: AppDatabase) {
  const existing = db.sqlite.prepare('SELECT id FROM users WHERE role_id = ? ORDER BY id LIMIT 1').get('role-admin') as { id: string } | undefined;
  if (!existing) {
    setupAdmin(db, {
      name: 'Administrator',
      email: 'admin@vyapara.com',
      password: 'rahasia123456',
    });
  }
}

function createAndLoginAdmin(db: AppDatabase) {
  seedAdminIfNeeded(db);
  const authenticated = login(db, { email: 'admin@vyapara.com', password: 'rahasia123456' });
  return authenticated.user.id;
}

function createSupplierRecord(db: AppDatabase, name: string, userId: string) {
  return createSupplier(db, { name, userId });
}

describe('supplier payments basic', () => {
  it('creates a supplier', () => {
    const db = createDb();
    const userId = createAndLoginAdmin(db);
    const supplier = createSupplierRecord(db, 'Test Supplier', userId);
    expect(supplier.name).toBe('Test Supplier');
    expect(supplier.balance).toBe(0);
  });

  it('supplier payment overpayment rejection', () => {
    const db = createDb();
    const userId = createAndLoginAdmin(db);
    const supplier = createSupplierRecord(db, 'Test Supplier', userId);
    // Create a real supplier invoice so the overpayment rule has a valid outstanding balance to check
    const invoice = createSupplierInvoice(db, {
      supplierId: supplier.id,
      items: [{ description: 'Barang', quantity: 1, unitPrice: 10_000 }],
      userId,
    });
    expect(invoice.totalAmount).toBe(10_000);
    expect(invoice.paidAmount).toBe(0);

    // Test that overpayment throws the intended business rule
    expect(() => paySupplierInvoice(db, {
      invoiceId: invoice.id,
      amount: 999_999,
      description: 'Overpayment',
      userId,
    })).toThrow('Pembayaran melebihi sisa tagihan');
  });

  it('customer non-existent rejection', () => {
    const db = createDb();
    const userId = createAndLoginAdmin(db);
    expect(() => payCustomerCredit(db, {
      customerId: 'non-existent-id',
      amount: 10_000,
      description: 'Invalid customer',
      userId,
    })).toThrow('Pelanggan tidak ditemukan');
  });
});
