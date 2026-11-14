import { describe, expect, it } from 'vitest';
import { AppDatabase } from '../db/open';
import { setupAdmin } from './auth';
import { createProduct } from './products';
import { createTransaction } from './transactions';
import { payCustomerCredit, createCustomer } from './customer';
import { createSalesReturn } from './sales-returns';
import { recordStockMovement } from './inventory';
import { appendOutboxEvent, listOutboxEvents, markOutboxFailed, markOutboxAcknowledged, markOutboxConflict, SYNC_SCHEMA_VERSION } from './outbox';
import { getOrCreateDeviceIdentity } from './device-identity';
import type { PaymentLine } from 'vyapara-shared';

function createDb(): AppDatabase {
  const db = new AppDatabase(':memory:');
  setupAdmin(db, { name: 'Admin', email: 'admin@vyapara.com', password: 'rahasia123456' });
  return db;
}

function adminId(db: AppDatabase): string {
  return (db.sqlite.prepare("SELECT id FROM users WHERE email = 'admin@vyapara.com'").get() as { id: string }).id;
}

describe('sync outbox foundation', () => {
  it('creates sync_outbox and device_identity tables on fresh db', () => {
    const db = createDb();
    const tables = db.sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('sync_outbox','device_identity') ORDER BY name").all() as { name: string }[];
    expect(tables.map(t => t.name)).toEqual(['device_identity', 'sync_outbox']);
  });

  function validMovementPayload(overrides: Record<string, unknown> = {}) {
    return {
      movementId: 'mv-1',
      productId: 'p-1',
      movementType: 'stock_in',
      quantityBefore: 0,
      quantityChange: 1,
      quantityAfter: 1,
      referenceType: null,
      referenceId: null,
      userId: 'u-1',
      createdAt: '2026-01-01T00:00:00.000Z',
      ...overrides,
    };
  }

  it('appends outbox event with stable device id and unique event id', () => {
    const db = createDb();
    const dev = getOrCreateDeviceIdentity(db);
    const e1 = appendOutboxEvent(db, { eventType: 'inventory.movement.recorded', aggregateType: 'stock_movement', aggregateId: 'mv-1', payload: validMovementPayload() });
    expect(e1.id).toMatch(/[0-9a-f-]{36}/i);
    expect(e1.deviceId).toBe(dev.deviceId);
    expect(e1.syncStatus).toBe('pending');
    expect(e1.schemaVersion).toBe(1);
    const listed = listOutboxEvents(db);
    expect(listed).toHaveLength(1);
    expect(listed[0]!.eventType).toBe('inventory.movement.recorded');
  });

  it('prevents duplicate outbox event by idempotency key', () => {
    const db = createDb();
    appendOutboxEvent(db, { eventType: 'inventory.movement.recorded', aggregateType: 'stock_movement', aggregateId: 'mv-1', payload: validMovementPayload(), idempotencyKey: 'same-key' });
    expect(() => appendOutboxEvent(db, { eventType: 'inventory.movement.recorded', aggregateType: 'stock_movement', aggregateId: 'mv-1', payload: validMovementPayload(), idempotencyKey: 'same-key' })).toThrow(/duplikat/i);
    expect(listOutboxEvents(db)).toHaveLength(1);
  });

  it('rejects invalid payload', () => {
    const db = createDb();
    expect(() => appendOutboxEvent(db, { eventType: 'inventory.movement.recorded', aggregateType: 'stock_movement', aggregateId: 'mv-1', payload: { bad: true } as any })).toThrow(/tidak valid/i);
  });

  it('tracks retry/failure/conflict/ack states', () => {
    const db = createDb();
    const e = appendOutboxEvent(db, { eventType: 'inventory.movement.recorded', aggregateType: 'stock_movement', aggregateId: 'mv-1', payload: validMovementPayload() });
    markOutboxFailed(db, e.id, 'network');
    let row = listOutboxEvents(db)[0]!;
    expect(row.syncStatus).toBe('failed');
    expect(row.retryCount).toBe(1);
    expect(row.lastError).toBe('network');
    markOutboxConflict(db, e.id, 'conflict');
    row = listOutboxEvents(db)[0]!;
    expect(row.syncStatus).toBe('conflict');
    expect(row.retryCount).toBe(2);
    markOutboxAcknowledged(db, e.id, '2026-01-01T00:00:00.000Z');
    row = listOutboxEvents(db, { status: 'acknowledged' })[0]!;
    expect(row.syncStatus).toBe('acknowledged');
    expect(row.serverAckAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('sale transaction and outbox event are atomic on outbox failure', () => {
    const db = createDb();
    const uid = adminId(db);
    const product = createProduct(db, { name: 'Barang', barcode: 'B1', sku: 'S1', price: 10000, cost: 5000, stock: 5, userId: uid });
    const cash: PaymentLine[] = [{ method: 'cash', amount: 10000 }];
    // force duplicate by pre-inserting same idempotency key as sale will use
    const key = '00000000-0000-4000-8000-000000000001';
    appendOutboxEvent(db, {
      eventType: 'sale.created',
      aggregateType: 'transaction',
      aggregateId: 'x',
      payload: {
        transactionId: 'x', transactionNumber: 'INV-1', userId: uid, customerId: null,
        subtotal: 10000, discountAmount: 0, taxAmount: 0, totalAmount: 10000,
        paymentAmount: 10000, changeAmount: 0, paymentMethod: 'cash',
        payments: [{ method: 'cash', amount: 10000 }],
        items: [{ productId: product.id, quantity: 1, unitPrice: 10000, unitCost: 5000, subtotal: 10000 }],
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      idempotencyKey: key,
    });
    const beforeTx = (db.sqlite.prepare('SELECT COUNT(*) as c FROM transactions').get() as { c: number }).c;
    const beforeStock = (db.sqlite.prepare('SELECT stock FROM products WHERE id = ?').get(product.id) as { stock: number }).stock;
    expect(() => createTransaction(db, { userId: uid, idempotencyKey: key, items: [{ productId: product.id, quantity: 1 }], discountAmount: 0, payments: cash })).toThrow();
    const afterTx = (db.sqlite.prepare('SELECT COUNT(*) as c FROM transactions').get() as { c: number }).c;
    const afterStock = (db.sqlite.prepare('SELECT stock FROM products WHERE id = ?').get(product.id) as { stock: number }).stock;
    expect(afterTx).toBe(beforeTx);
    expect(afterStock).toBe(beforeStock);
  });

  it('records sale.created outbox event for successful sale', () => {
    const db = createDb();
    const uid = adminId(db);
    const product = createProduct(db, { name: 'Barang', barcode: 'B2', sku: 'S2', price: 10000, cost: 5000, stock: 5, userId: uid });
    const cash: PaymentLine[] = [{ method: 'cash', amount: 20000 }];
    const tx = createTransaction(db, { userId: uid, items: [{ productId: product.id, quantity: 2 }], discountAmount: 0, payments: cash });
    const events = listOutboxEvents(db).filter(e => e.aggregateType === 'transaction');
    expect(events.some(e => e.eventType === 'sale.created' && e.aggregateId === tx.id)).toBe(true);
  });

  it('records customer.payment.recorded outbox event atomically', () => {
    const db = createDb();
    const uid = adminId(db);
    const customer = createCustomer(db, { name: 'Pelanggan', userId: uid });
    // create credit balance via direct insert in transaction to have receivable
    const run = db.sqlite.transaction(() => {
      const newBalance = 50000;
      const now = Date.now();
      db.sqlite.prepare('UPDATE customers SET balance = ?, updated_at = ? WHERE id = ?').run(newBalance, now, customer.id);
      db.sqlite.prepare(`INSERT INTO customer_transactions (id, customer_id, transaction_type, reference_type, reference_id, amount, balance_after, description, transaction_date, created_at, created_by) VALUES (?, ?, 'sale', NULL, NULL, ?, ?, 'test debt', ?, ?, ?)`).run(crypto.randomUUID(), customer.id, 50000, newBalance, now, now, uid);
    });
    run();
    payCustomerCredit(db, { customerId: customer.id, amount: 20000, description: 'Bayar', userId: uid });
    const events = listOutboxEvents(db).filter(e => e.eventType === 'customer.payment.recorded');
    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events[0]!.aggregateType).toBe('customer_transaction');
  });

  it('records sales_return.created and inventory movement outbox events', () => {
    const db = createDb();
    const uid = adminId(db);
    const product = createProduct(db, { name: 'Barang', barcode: 'B3', sku: 'S3', price: 10000, cost: 5000, stock: 5, userId: uid });
    const cash: PaymentLine[] = [{ method: 'cash', amount: 10000 }];
    const tx = createTransaction(db, { userId: uid, items: [{ productId: product.id, quantity: 1 }], discountAmount: 0, payments: cash });
    const ret = createSalesReturn(db, { transactionId: tx.id, userId: uid, notes: 'retur' });
    const events = listOutboxEvents(db);
    expect(events.some(e => e.eventType === 'sales_return.created' && e.aggregateId === ret.id)).toBe(true);
    expect(events.some(e => e.eventType === 'inventory.movement.recorded' && e.aggregateType === 'stock_movement')).toBe(true);
  });

  it('records inventory.movement.recorded for direct stock movement', () => {
    const db = createDb();
    const uid = adminId(db);
    const product = createProduct(db, { name: 'Barang', barcode: 'B4', sku: 'S4', price: 10000, cost: 5000, stock: 5, userId: uid });
    const mv = recordStockMovement(db, { productId: product.id, movementType: 'stock_in', quantityChange: 3, userId: uid, notes: 'in' });
    const events = listOutboxEvents(db).filter(e => e.aggregateType === 'stock_movement' && e.aggregateId === mv.id);
    expect(events).toHaveLength(1);
    expect(events[0]!.eventType).toBe('inventory.movement.recorded');
  });
});

describe('sync outbox atomicity', () => {
  it('sale transaction and outbox event rollback on outbox conflict', () => {
    const db = createDb();
    const uid = adminId(db);
    const product = createProduct(db, { name: 'Barang', barcode: 'B5', sku: 'S5', price: 10000, cost: 5000, stock: 5, userId: uid });
    const cash: PaymentLine[] = [{ method: 'cash', amount: 10000 }];
    const key = '00000000-0000-4000-8000-000000000001';
    appendOutboxEvent(db, {
      eventType: 'sale.created',
      aggregateType: 'transaction',
      aggregateId: 'x',
      payload: {
        transactionId: 'x', transactionNumber: 'INV-1', userId: uid, customerId: null,
        subtotal: 10000, discountAmount: 0, taxAmount: 0, totalAmount: 10000,
        paymentAmount: 10000, changeAmount: 0, paymentMethod: 'cash',
        payments: [{ method: 'cash', amount: 10000 }],
        items: [{ productId: product.id, quantity: 1, unitPrice: 10000, unitCost: 5000, subtotal: 10000 }],
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      idempotencyKey: key,
    });
    const beforeTx = (db.sqlite.prepare('SELECT COUNT(*) as c FROM transactions').get() as { c: number }).c;
    const beforeStock = (db.sqlite.prepare('SELECT stock FROM products WHERE id = ?').get(product.id) as { stock: number }).stock;
    expect(() => createTransaction(db, { userId: uid, idempotencyKey: key, items: [{ productId: product.id, quantity: 1 }], discountAmount: 0, payments: cash })).toThrow();
    const afterTx = (db.sqlite.prepare('SELECT COUNT(*) as c FROM transactions').get() as { c: number }).c;
    const afterStock = (db.sqlite.prepare('SELECT stock FROM products WHERE id = ?').get(product.id) as { stock: number }).stock;
    expect(afterTx).toBe(beforeTx);
    expect(afterStock).toBe(beforeStock);
  });

  it('sale transaction and outbox event succeed on successful sale', () => {
    const db = createDb();
    const uid = adminId(db);
    const product = createProduct(db, { name: 'Barang', barcode: 'B6', sku: 'S6', price: 10000, cost: 5000, stock: 5, userId: uid });
    const cash: PaymentLine[] = [{ method: 'cash', amount: 20000 }];
    const tx = createTransaction(db, { userId: uid, items: [{ productId: product.id, quantity: 2 }], discountAmount: 0, payments: cash });
    const events = listOutboxEvents(db).filter(e => e.aggregateType === 'transaction');
    expect(events.some(e => e.eventType === 'sale.created' && e.aggregateId === tx.id)).toBe(true);
    const stock = (db.sqlite.prepare('SELECT stock FROM products WHERE id = ?').get(product.id) as { stock: number }).stock;
    expect(stock).toBe(3);
  });

  it('customer payment atomicity - no partial records when customer does not exist', () => {
    const db = createDb();
    const uid = adminId(db);
    // payCustomerCredit with non-existent customer should throw and not leave partial records
    expect(() => payCustomerCredit(db, {
      customerId: 'non-existent-id',
      amount: 10_000,
      description: 'Invalid customer',
      userId: uid,
    })).toThrow('Pelanggan tidak ditemukan');
    // Verify no customer_transactions were created
    const txCount = (db.sqlite.prepare('SELECT COUNT(*) as c FROM customer_transactions').get() as { c: number }).c;
    expect(txCount).toBe(0);
  });

  it('sales return and inventory movement atomically preserve balances', () => {
    const db = createDb();
    const uid = adminId(db);
    const product = createProduct(db, { name: 'Barang', barcode: 'B7', sku: 'S7', price: 10000, cost: 5000, stock: 5, userId: uid });
    const cash: PaymentLine[] = [{ method: 'cash', amount: 10000 }];
    const tx = createTransaction(db, { userId: uid, items: [{ productId: product.id, quantity: 1 }], discountAmount: 0, payments: cash });
    const ret = createSalesReturn(db, { transactionId: tx.id, userId: uid, notes: 'retur' });
    // Stock should return to original value after sale + return
    const stock = (db.sqlite.prepare('SELECT stock FROM products WHERE id = ?').get(product.id) as { stock: number }).stock;
    // After sale (stock 5->4) and return (stock 4->5), stock should be 5
    expect(stock).toBe(5);
    // Verify sales return event was recorded
    const events = listOutboxEvents(db);
    expect(events.some(e => e.eventType === 'sales_return.created' && e.aggregateId === ret.id)).toBe(true);
  });

  it('inventory movement preserves stock balance', () => {
    const db = createDb();
    const uid = adminId(db);
    const product = createProduct(db, { name: 'Barang', barcode: 'S0', sku: 'S0', price: 10000, cost: 5000, stock: 5, userId: uid });
    const mv = recordStockMovement(db, { productId: product.id, movementType: 'stock_in', quantityChange: 3, userId: uid, notes: 'in' });
    const stock = (db.sqlite.prepare('SELECT stock FROM products WHERE id = ?').get(product.id) as { stock: number }).stock;
    expect(stock).toBe(8);
  });
});

describe('outbox event schema hardening', () => {
  it('validates sale.created payload positively', () => {
    const db = createDb();
    const uid = adminId(db);
    const event = appendOutboxEvent(db, {
      eventType: 'sale.created',
      aggregateType: 'transaction',
      aggregateId: 'tx-1',
      payload: {
        transactionId: 'tx-1', transactionNumber: 'INV-1', userId: uid, customerId: null,
        subtotal: 10000, discountAmount: 0, taxAmount: 0, totalAmount: 10000,
        paymentAmount: 10000, changeAmount: 0, paymentMethod: 'cash',
        payments: [{ method: 'cash', amount: 10000 }],
        items: [{ productId: 'p1', quantity: 1, unitPrice: 10000, unitCost: 5000, subtotal: 10000 }],
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    });
    expect(event.eventType).toBe('sale.created');
  });

  it('rejects unknown event types', () => {
    const db = createDb();
    expect(() => appendOutboxEvent(db, { eventType: 'unknown.event', aggregateType: 'x', aggregateId: '1', payload: { x: 1 } as any })).toThrow(/tidak dikenal|VALIDATION/i);
  });

  it('rejects unsupported schema versions', () => {
    const db = createDb();
    expect(() => appendOutboxEvent(db, {
      eventType: 'inventory.movement.recorded',
      aggregateType: 'stock_movement',
      aggregateId: 'mv-1',
      schemaVersion: 999,
      payload: {
        movementId: 'mv-1', productId: 'p-1', movementType: 'stock_in',
        quantityBefore: 0, quantityChange: 1, quantityAfter: 1,
        referenceType: null, referenceId: null, userId: 'u-1',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    })).toThrow(/Versi schema event tidak didukung/i);
  });

  it('rejects malformed customer.payment.recorded payload', () => {
    const db = createDb();
    expect(() => appendOutboxEvent(db, {
      eventType: 'customer.payment.recorded',
      aggregateType: 'customer_transaction',
      aggregateId: 'ct-1',
      payload: { customerId: 'c1' } as any,
    })).toThrow(/tidak valid/i);
  });

  it('rejects malformed sales_return.created payload', () => {
    const db = createDb();
    expect(() => appendOutboxEvent(db, {
      eventType: 'sales_return.created',
      aggregateType: 'sales_return',
      aggregateId: 'r-1',
      payload: { returnId: 'r-1', items: [] } as any,
    })).toThrow(/tidak valid/i);
  });

  it('rejects malformed sale.created payload (missing items)', () => {
    const db = createDb();
    expect(() => appendOutboxEvent(db, {
      eventType: 'sale.created',
      aggregateType: 'transaction',
      aggregateId: 'tx-1',
      payload: { transactionId: 'tx-1', userId: 'u' } as any,
    })).toThrow(/tidak valid/i);
  });

  it('rejects malformed inventory.movement.recorded payload', () => {
    const db = createDb();
    expect(() => appendOutboxEvent(db, {
      eventType: 'inventory.movement.recorded',
      aggregateType: 'stock_movement',
      aggregateId: 'mv-1',
      payload: { movementId: 'mv-1' } as any,
    })).toThrow(/tidak valid/i);
  });
});
