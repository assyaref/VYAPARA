import { randomBytes, randomUUID } from 'node:crypto';
import { quoteSale, settlePayments, type PaymentLine } from 'vyapara-shared';
import type { AppDatabase } from '../db/open';
import { AppError } from '../errors';
import { getSettings } from './settings';
import { recordStockMovement } from './inventory';
import { appendOutboxEvent } from './outbox';

export type TransactionItemRecord = {
  id: string;
  productId: string | null;
  productName: string | null;
  quantity: number;
  price: number;
  subtotal: number;
};

export type TransactionRecord = {
  id: string;
  transactionNumber: string;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  paymentAmount: number;
  changeAmount: number;
  paymentMethod: string;
  payments: PaymentLine[];
  customerId: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  items: TransactionItemRecord[];
};

type TransactionRow = {
  id: string;
  transaction_number: string;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  payment_amount: number;
  change_amount: number;
  payment_method: string;
  payments_json: string | null;
  customer_id: string | null;
  status: string;
  notes: string | null;
  created_at: string;
};

function assertQuantity(quantity: number): void {
  if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 1_000_000) {
    throw new AppError('VALIDATION', 'Jumlah barang tidak valid');
  }
  const scaled = Math.round(quantity * 1000);
  if (Math.abs(quantity * 1000 - scaled) > 1e-6) {
    throw new AppError('VALIDATION', 'Jumlah barang maksimal 3 angka desimal');
  }
}

function readTransaction(db: AppDatabase, id: string): TransactionRecord {
  const row = db.sqlite
    .prepare(
      `SELECT id, transaction_number, subtotal, discount_amount, tax_amount, total_amount,
              payment_amount, change_amount, payment_method, payments_json, customer_id, status, notes, created_at
       FROM transactions WHERE id = ?`,
    )
    .get(id) as TransactionRow | undefined;
  if (!row) {
    throw new AppError('NOT_FOUND', 'Transaksi tidak ditemukan');
  }
  const items = db.sqlite
    .prepare(
      `SELECT id, product_id, product_name, quantity, price, subtotal
       FROM transaction_items WHERE transaction_id = ? ORDER BY rowid`,
    )
    .all(id) as {
    id: string;
    product_id: string | null;
    product_name: string | null;
    quantity: number;
    price: number;
    subtotal: number;
  }[];
  let payments: PaymentLine[] = [];
  if (row.payments_json) {
    payments = JSON.parse(row.payments_json) as PaymentLine[];
  }
  return {
    id: row.id,
    transactionNumber: row.transaction_number,
    subtotal: Math.round(row.subtotal),
    discountAmount: Math.round(row.discount_amount),
    taxAmount: Math.round(row.tax_amount),
    totalAmount: Math.round(row.total_amount),
    paymentAmount: Math.round(row.payment_amount),
    changeAmount: Math.round(row.change_amount),
    paymentMethod: row.payment_method,
    payments,
    customerId: row.customer_id,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
    items: items.map((item) => ({
      id: item.id,
      productId: item.product_id,
      productName: item.product_name,
      quantity: item.quantity,
      price: Math.round(item.price),
      subtotal: Math.round(item.subtotal),
    })),
  };
}

export function listTransactions(db: AppDatabase, limit = 200): TransactionRecord[] {
  const rows = db.sqlite
    .prepare('SELECT id FROM transactions ORDER BY created_at DESC LIMIT ?')
    .all(limit) as { id: string }[];
  return rows.map((row) => readTransaction(db, row.id));
}

export function todaySummary(db: AppDatabase): { count: number; total: number } {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const row = db.sqlite
    .prepare(
      `SELECT COUNT(*) AS count, COALESCE(SUM(total_amount), 0) AS total
       FROM transactions
       WHERE status = 'completed' AND created_at >= ?`,
    )
    .get(start.toISOString()) as { count: number; total: number };
  return { count: row.count, total: Math.round(row.total) };
}

export type TransactionInput = {
  idempotencyKey?: string;
  items: { productId: string; quantity: number }[];
  discountAmount: number;
  payments: PaymentLine[];
  customerId?: string;
  notes?: string;
};

export function createTransaction(
  db: AppDatabase,
  userId: string,
  input: TransactionInput,
): TransactionRecord;
export function createTransaction(
  db: AppDatabase,
  input: TransactionInput & { userId: string },
): TransactionRecord;
export function createTransaction(
  db: AppDatabase,
  userIdOrInput: string | (TransactionInput & { userId: string }),
  maybeInput?: TransactionInput,
): TransactionRecord {
  const userId = typeof userIdOrInput === 'string' ? userIdOrInput : userIdOrInput.userId;
  const input: TransactionInput =
    typeof userIdOrInput === 'string' ? (maybeInput as TransactionInput) : userIdOrInput;
  const idempotencyKey = input.idempotencyKey ?? randomUUID();

  for (const item of input.items) {
    assertQuantity(item.quantity);
  }
  const settings = getSettings(db);
  const now = new Date().toISOString();

  const execute = db.sqlite.transaction(() => {
    const existing = db.sqlite
      .prepare('SELECT id FROM transactions WHERE idempotency_key = ?')
      .get(idempotencyKey) as { id: string } | undefined;
    if (existing) {
      return existing.id;
    }

    const creditAmount = input.payments
      .filter((payment) => payment.method === 'credit')
      .reduce((sum, payment) => sum + Math.round(payment.amount), 0);
    const customer = input.customerId
      ? (db.sqlite
          .prepare('SELECT id, name, balance, status FROM customers WHERE id = ?')
          .get(input.customerId) as
          | { id: string; name: string; balance: number; status: string }
          | undefined)
      : undefined;
    if (creditAmount > 0) {
      if (!customer) {
        throw new AppError('VALIDATION', 'Pelanggan wajib dipilih untuk penjualan kredit');
      }
      if (customer.status !== 'active') {
        throw new AppError('VALIDATION', 'Pelanggan tidak aktif');
      }
    }

const productStmt = db.sqlite.prepare(
      'SELECT id, name, price, cost, is_active FROM products WHERE id = ?',
    );
    const priced: { productId: string; name: string; quantity: number; unitPrice: number; unitCost: number; subtotal: number }[] = [];
    for (const item of input.items) {
      const product = productStmt.get(item.productId) as
        | { id: string; name: string; price: number; cost: number; is_active: number }
        | undefined;
      if (!product || product.is_active !== 1) {
        throw new AppError('VALIDATION', 'Produk tidak tersedia');
      }
      const unitPrice = Math.round(product.price);
      const unitCost = Math.round(product.cost);
      priced.push({
        productId: product.id,
        name: product.name,
        quantity: item.quantity,
        unitPrice,
        unitCost,
        subtotal: Math.round(item.quantity * unitPrice),
      });
    }

    let settlement;
    try {
      const quote = quoteSale({
        lines: priced.map((line) => ({ quantity: line.quantity, unitPrice: line.unitPrice })),
        discountAmount: input.discountAmount,
        taxRateBps: settings.taxRateBps,
      });
      settlement = settlePayments(quote, input.payments);
    } catch (error) {
      throw new AppError('VALIDATION', error instanceof Error ? error.message : 'Perhitungan tidak valid');
    }

    const transactionId = randomUUID();
    const transactionNumber = `INV-${now.slice(0, 10).replace(/-/g, '')}-${randomBytes(3).toString('hex').toUpperCase()}`;
    db.sqlite
      .prepare(
        `INSERT INTO transactions (
          id, transaction_number, user_id, subtotal, discount_amount, tax_amount, total_amount,
          payment_amount, change_amount, payment_method, payments_json, status, notes,
          idempotency_key, customer_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?, ?, ?, ?)`,
      )
      .run(
        transactionId,
        transactionNumber,
        userId,
        settlement.subtotal,
        settlement.discountAmount,
        settlement.taxAmount,
        settlement.total,
        settlement.paidAmount,
        settlement.changeAmount,
        settlement.paymentMethod,
        JSON.stringify(input.payments),
        input.notes ?? null,
        idempotencyKey,
        customer?.id ?? null,
        now,
      );

const insertItem = db.sqlite.prepare(
      `INSERT INTO transaction_items (
        id, transaction_id, product_id, product_name, quantity, price, cost, discount_amount, subtotal
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`,
    );
    for (const line of priced) {
      insertItem.run(randomUUID(), transactionId, line.productId, line.name, line.quantity, line.unitPrice, line.unitCost, line.subtotal);
      recordStockMovement(db, {
        productId: line.productId,
        movementType: 'sale',
        quantityChange: -line.quantity,
        referenceType: 'transaction',
        referenceId: transactionId,
        notes: `Penjualan ${transactionNumber}`,
        userId,
      });
    }

    if (customer && creditAmount > 0) {
      const newBalance = customer.balance + creditAmount;
      db.sqlite
        .prepare('UPDATE customers SET balance = ?, updated_at = ? WHERE id = ?')
        .run(newBalance, Date.now(), customer.id);
      db.sqlite
        .prepare(
          `INSERT INTO customer_transactions (
            id, customer_id, transaction_type, reference_type, reference_id, amount,
            balance_after, description, transaction_date, created_at, created_by
          ) VALUES (?, ?, 'sale', 'transaction', ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          randomUUID(),
          customer.id,
          transactionId,
          creditAmount,
          newBalance,
          `Penjualan kredit ${transactionNumber}`,
          Date.now(),
          Date.now(),
          userId,
        );
    }

    const cashPortion = input.payments
      .filter((payment) => payment.method !== 'credit')
      .reduce((sum, payment) => sum + Math.round(payment.amount), 0);
    if (cashPortion > 0) {
      const drawer = db.sqlite
        .prepare("SELECT id FROM cash_drawers WHERE status = 'open' ORDER BY opened_at DESC LIMIT 1")
        .get() as { id: string } | undefined;
      if (drawer) {
        db.sqlite
          .prepare(
            `INSERT INTO cash_movements (
              id, cash_drawer_id, movement_type, amount, reference_type, reference_id,
              description, created_at, created_by
            ) VALUES (?, ?, 'sale', ?, 'transaction', ?, ?, ?, ?)`,
          )
          .run(
            randomUUID(),
            drawer.id,
            cashPortion,
            transactionId,
            `Penjualan ${transactionNumber}`,
            Date.now(),
            userId,
          );
      }
    }

    appendOutboxEvent(db, {
      eventType: 'sale.created',
      aggregateType: 'transaction',
      aggregateId: transactionId,
      idempotencyKey,
      payload: {
        transactionId,
        transactionNumber,
        userId,
        customerId: customer?.id ?? null,
        subtotal: settlement.subtotal,
        discountAmount: settlement.discountAmount,
        taxAmount: settlement.taxAmount,
        totalAmount: settlement.total,
        paymentAmount: settlement.paidAmount,
        changeAmount: settlement.changeAmount,
        paymentMethod: settlement.paymentMethod,
        payments: input.payments,
        items: priced.map((line) => ({
          productId: line.productId,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          unitCost: line.unitCost,
          subtotal: line.subtotal,
        })),
        createdAt: now,
      },
      createdAt: now,
    });

    return transactionId;
  });

  return readTransaction(db, execute());
}
