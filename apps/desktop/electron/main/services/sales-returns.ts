import { randomUUID } from 'node:crypto';
import type { AppDatabase } from '../db/open';
import { AppError } from '../errors';
import { recordStockMovement } from './inventory';
import { appendOutboxEvent } from './outbox';

export type SalesReturnRecord = {
  id: string;
  returnNumber: string;
  transactionId: string;
  userId: string;
  returnDate: number;
  notes: string | null;
  status: string;
  createdAt: number;
  items: SalesReturnItemRecord[];
};

export type SalesReturnItemRecord = {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitCost: number;
  subtotal: number;
};

type TrRow = {
  id: string;
  transaction_number: string;
  created_at: string;
  user_id: string;
};

type TiRow = {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  price: number;
  cost: number;
  subtotal: number;
};

export function createSalesReturn(
  db: AppDatabase,
  input: {
    transactionId: string;
    notes?: string;
    userId: string;
  },
): SalesReturnRecord {
  const transaction = db.sqlite
    .prepare('SELECT id, transaction_number, user_id, created_at FROM transactions WHERE id = ?')
    .get(input.transactionId) as TrRow | undefined;
  if (!transaction) {
    throw new AppError('NOT_FOUND', 'Transaksi tidak ditemukan');
  }

  const itemsRows = db.sqlite
    .prepare(
      `SELECT id, product_id, product_name, quantity, price, cost, subtotal
       FROM transaction_items
       WHERE transaction_id = ?`,
    )
    .all(input.transactionId) as TiRow[];

  if (itemsRows.length === 0) {
    throw new AppError('VALIDATION', 'Transaksi ini tidak memiliki item untuk dikembalikan');
  }

  const now = Date.now();
  const returnNumber = `RET-${new Date()
    .getFullYear()
    .toString()
    .slice(2)}-${String(Math.floor(Math.random() * 9000) + 1000)}`;

  const write = db.sqlite.transaction(() => {
    const returnId = randomUUID();
    db.sqlite
      .prepare(
        `INSERT INTO sales_returns (
          id, return_number, transaction_id, user_id, return_date, notes, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'completed', ?)`,
      )
      .run(returnId, returnNumber, input.transactionId, input.userId, now, input.notes ?? null, now);

    let revenueReversal = 0;
    let cogsReversal = 0;
    const returnItems: SalesReturnItemRecord[] = [];

    for (const item of itemsRows) {
      const unitCost = item.cost;
      const subtotal = Math.round(item.quantity * unitCost);
      revenueReversal += subtotal;
      cogsReversal += subtotal;

      const returnItemId = randomUUID();
      db.sqlite
        .prepare(
          `INSERT INTO sales_return_items (
            id, sales_return_id, product_id, product_name, quantity, unit_cost, subtotal
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          returnItemId,
          returnId,
          item.product_id,
          item.product_name,
          item.quantity,
          unitCost,
          subtotal,
        );

      recordStockMovement(db, {
        productId: item.product_id,
        movementType: 'return_in',
        quantityChange: item.quantity,
        referenceType: 'sales_return',
        referenceId: returnId,
        notes: `Kembali ${transaction.transaction_number}`,
        userId: input.userId,
      });

      returnItems.push({
        id: returnItemId,
        productId: item.product_id,
        productName: item.product_name,
        quantity: item.quantity,
        unitCost,
        subtotal,
      });
    }

    // Record financial reversal - cash movement reversal for returned items
    const drawer = db.sqlite
      .prepare("SELECT id FROM cash_drawers WHERE status = 'open' ORDER BY opened_at DESC LIMIT 1")
      .get() as { id: string } | undefined;

    if (drawer) {
      db.sqlite
        .prepare(
          `INSERT INTO cash_movements (
            id, cash_drawer_id, movement_type, amount, reference_type, reference_id,
            description, created_at, created_by
          ) VALUES (?, ?, 'return', ?, 'sales_return', ?, ?, ?, ?)`,
        )
        .run(
          randomUUID(),
          drawer.id,
          -revenueReversal,
          returnId,
          `Pengembalian ${returnNumber}`,
          now,
          input.userId,
        );
    }

    appendOutboxEvent(db, {
      eventType: 'sales_return.created',
      aggregateType: 'sales_return',
      aggregateId: returnId,
      idempotencyKey: `sales_return:${returnId}`,
      payload: {
        returnId,
        returnNumber,
        transactionId: input.transactionId,
        userId: input.userId,
        returnDate: now,
        notes: input.notes ?? null,
        status: 'completed',
        items: returnItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitCost: item.unitCost,
          subtotal: item.subtotal,
        })),
        createdAt: new Date(now).toISOString(),
      },
      createdAt: new Date(now).toISOString(),
    });

    return {
      id: returnId,
      returnNumber,
      transactionId: input.transactionId,
      userId: input.userId,
      returnDate: now,
      notes: input.notes ?? null,
      status: 'completed',
      createdAt: now,
      items: returnItems,
    };
  });

  return write();
}