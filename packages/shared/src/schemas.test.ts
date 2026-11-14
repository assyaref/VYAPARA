import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  AuthLoginSchema,
  AuthSetupSchema,
  PaymentLineSchema,
  PERMISSIONS,
  ProductCreateSchema,
  ProductUpdateSchema,
  ROLE_PERMISSIONS,
  TransactionCreateSchema,
  UserCreateSchema,
  ipcFail,
  ipcOk,
} from './schemas';

describe('AuthLoginSchema', () => {
  it('accepts valid credentials', () => {
    const result = AuthLoginSchema.safeParse({ email: 'kasir@vyapara.com', password: 'rahasia123' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe('kasir@vyapara.com');
  });

  it('requires a valid email', () => {
    const result = AuthLoginSchema.safeParse({ email: 'not-an-email', password: 'rahasia123' });
    expect(result.success).toBe(false);
  });

  it('requires password', () => {
    const result = AuthLoginSchema.safeParse({ email: 'kasir@vyapara.com', password: '' });
    expect(result.success).toBe(false);
  });
});

describe('AuthSetupSchema', () => {
  it('accepts a compliant setup payload', () => {
    const result = AuthSetupSchema.safeParse({
      name: 'Administrator',
      email: 'admin@vyapara.com',
      password: 'rahasia123',
    });
    expect(result.success).toBe(true);
  });

  it('rejects password shorter than 10 characters', () => {
    const result = AuthSetupSchema.safeParse({
      name: 'Administrator',
      email: 'admin@vyapara.com',
      password: 'pendek',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((e) => e.path.join('.') === 'password')).toBe(true);
    }
  });

  it('rejects invalid email', () => {
    const result = AuthSetupSchema.safeParse({ name: 'A', email: 'bukan-email', password: 'rahasia12345' });
    expect(result.success).toBe(false);
  });
});

describe('ProductCreateSchema', () => {
  it('accepts a valid product', () => {
    const result = ProductCreateSchema.safeParse({
      token: 'ab'.repeat(24),
      name: 'Kertas A4 70gsm',
      price: 45_000,
      cost: 30_000,
      stock: 100,
    });
    expect(result.success).toBe(true);
  });

  it('rejects negative price and stock', () => {
    const badPrice = ProductCreateSchema.safeParse({
      token: 'ab'.repeat(24),
      name: 'X',
      price: -1,
      stock: 0,
    });
    expect(badPrice.success).toBe(false);

    const badStock = ProductCreateSchema.safeParse({
      token: 'ab'.repeat(24),
      name: 'X',
      price: 1000,
      stock: -5,
    });
    expect(badStock.success).toBe(false);
  });

  it('requires token', () => {
    const result = ProductCreateSchema.safeParse({ name: 'X', price: 1000, stock: 0 });
    expect(result.success).toBe(false);
  });
});


describe('ProductUpdateSchema', () => {
  it('allows partial updates', () => {
    const result = ProductUpdateSchema.safeParse({
      token: 'ab'.repeat(24),
      id: 'prod-123',
      price: 50_000,
    });
    expect(result.success).toBe(true);
  });

  it('rejects negative price on update', () => {
    const result = ProductUpdateSchema.safeParse({
      token: 'ab'.repeat(24),
      id: 'prod-123',
      price: -5_000,
    });
    expect(result.success).toBe(false);
  });
});

describe('TransactionCreateSchema', () => {
  const base = {
    token: 'ab'.repeat(24),
    idempotencyKey: 'a1111111-1111-4111-8111-111111111111',
    items: [{ productId: 'prod-1', quantity: 2 }],
    discountAmount: 0,
    payments: [{ method: 'cash' as const, amount: 50_000 }],
  };

  it('accepts a valid transaction', () => {
    const result = TransactionCreateSchema.safeParse(base);
    expect(result.success).toBe(true);
  });

  it('rejects non-UUID idempotency key', () => {
    const result = TransactionCreateSchema.safeParse({ ...base, idempotencyKey: 'bukan-uuid' });
    expect(result.success).toBe(false);
  });

  it('rejects empty item list', () => {
    const result = TransactionCreateSchema.safeParse({ ...base, items: [] });
    expect(result.success).toBe(false);
  });

  it('rejects unknown payment method', () => {
    const result = TransactionCreateSchema.safeParse({
      ...base,
      payments: [{ method: 'cod' as any, amount: 50_000 }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty payment list', () => {
    const result = TransactionCreateSchema.safeParse({ ...base, payments: [] });
    expect(result.success).toBe(false);
  });
});

describe('UserCreateSchema', () => {
  it('accepts a valid user creation payload', () => {
    const result = UserCreateSchema.safeParse({
      token: 'ab'.repeat(24),
      name: 'Kasir Satu',
      email: 'kasir1@vyapara.com',
      password: 'rahasia12345',
      roleId: 'role-cashier',
    });
    expect(result.success).toBe(true);
  });

  it('rejects short password', () => {
    const result = UserCreateSchema.safeParse({
      token: 'ab'.repeat(24),
      name: 'Kasir Satu',
      email: 'kasir1@vyapara.com',
      password: 'pendek',
      roleId: 'role-cashier',
    });
    expect(result.success).toBe(false);
  });
});

describe('PERMISSIONS and ROLE_PERMISSIONS', () => {
  it('lists expected permissions', () => {
    expect(PERMISSIONS).toContain('product:write');
    expect(PERMISSIONS).toContain('transaction:write');
    expect(PERMISSIONS).toContain('database:backup');
    expect(PERMISSIONS).toContain('reports:read');
  });

  it('grants all permissions to admin', () => {
    expect(ROLE_PERMISSIONS.admin.length).toBe(PERMISSIONS.length);
    PERMISSIONS.forEach((permission) => {
      expect(ROLE_PERMISSIONS.admin).toContain(permission);
    });
  });

  it('grants a limited subset to cashier and viewer', () => {
    expect(ROLE_PERMISSIONS.cashier).not.toContain('database:backup');
    expect(ROLE_PERMISSIONS.cashier).toContain('transaction:write');
    expect(ROLE_PERMISSIONS.viewer).not.toContain('transaction:write');
    expect(ROLE_PERMISSIONS.viewer).toContain('product:read');
  });
});

describe('PaymentLineSchema', () => {
  it('accepts all payment methods', () => {
    for (const method of ['cash', 'transfer', 'qris', 'debit', 'credit']) {
      const result = PaymentLineSchema.safeParse({ method, amount: 10_000 });
      expect(result.success).toBe(true);
    }
  });

  it('rejects negative amount', () => {
    const result = PaymentLineSchema.safeParse({ method: 'cash', amount: -1 });
    expect(result.success).toBe(false);
  });
});

describe('ipc helpers', () => {
  it('ipcOk wraps a success payload', () => {
    expect(ipcOk({ ok: true })).toEqual({ ok: true, data: { ok: true } });
  });

  it('ipcFail wraps an error payload', () => {
    expect(ipcFail('VALIDATION', 'pesan kesalahan')).toEqual({
      ok: false,
      error: { code: 'VALIDATION', message: 'pesan kesalahan' },
    });
  });
});
