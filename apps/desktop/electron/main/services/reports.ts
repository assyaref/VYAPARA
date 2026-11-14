import type { AppDatabase } from '../db/open';
import { AppError } from '../errors';

export type SalesReportRow = {
  date: string;
  count: number;
  total: number;
};

export type BestSellingRow = {
  productId: string;
  productName: string;
  quantity: number;
  revenue: number;
};

export type SlowMovingRow = {
  productId: string;
  productName: string;
  stock: number;
  lastSold: string | null;
};

export type GrossProfitRow = {
  period: string;
  revenue: number;
  cogs: number;
  grossProfit: number;
};

export type InventoryValuationRow = {
  productId: string;
  productName: string;
  quantity: number;
  unitCost: number;
  costValue: number;
  unitRetail: number;
  retailValue: number;
};

export type PurchaseReportRow = {
  date: string;
  poNumber: string;
  supplierName: string;
  totalAmount: number;
};

export type ExpenseReportRow = {
  date: string;
  category: string;
  amount: number;
};

export type CashierPerformanceRow = {
  userId: string;
  userName: string;
  count: number;
  total: number;
};

export type TransactionReportRow = {
  id: string;
  transactionNumber: string;
  userName: string;
  totalAmount: number;
  paymentMethod: string;
  createdAt: string;
};

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

function toMillis(value: string, endOfDay = false): number {
  const dateOnly = DATE_ONLY.test(value);
  const d = new Date(dateOnly ? `${value}T00:00:00.000Z` : value);
  if (Number.isNaN(d.getTime())) {
    throw new AppError('VALIDATION', 'Tanggal tidak valid');
  }
  const ms = d.getTime();
  return dateOnly && endOfDay ? ms + DAY_MS - 1 : ms;
}

function parseStart(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }
  return toMillis(value);
}

function parseEnd(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }
  return toMillis(value, true);
}

function msExpression(column: string): string {
  return `(CASE WHEN typeof(${column}) IN ('integer','real') THEN ${column} ELSE CAST(strftime('%s', ${column}) AS INTEGER) * 1000 END)`;
}

function dateExpression(column: string, format = '%Y-%m-%d'): string {
  return `strftime('${format}', ${msExpression(column)} / 1000, 'unixepoch')`;
}

export function getSalesReport(
  db: AppDatabase,
  startDate?: string,
  endDate?: string,
  groupBy: 'day' | 'week' | 'month' | 'year' = 'day',
): SalesReportRow[] {
  const start = parseStart(startDate);
  const end = parseEnd(endDate);

  let dateExpr: string;
  switch (groupBy) {
    case 'week':
      dateExpr = dateExpression('created_at', '%Y-%W');
      break;
    case 'month':
      dateExpr = dateExpression('created_at', '%Y-%m');
      break;
    case 'year':
      dateExpr = dateExpression('created_at', '%Y');
      break;
    default:
      dateExpr = dateExpression('created_at');
  }

  const clauses: string[] = ["status = 'completed'"];
  const params: (string | number)[] = [];
  if (start !== undefined) {
    clauses.push(`${msExpression('created_at')} >= ?`);
    params.push(start);
  }
  if (end !== undefined) {
    clauses.push(`${msExpression('created_at')} <= ?`);
    params.push(end);
  }
  const where = clauses.join(' AND ');

  const rows = db.sqlite
    .prepare(
      `SELECT ${dateExpr} AS date, COUNT(*) AS count, COALESCE(SUM(total_amount), 0) AS total
       FROM transactions
       WHERE ${where}
       GROUP BY date
       ORDER BY date ASC`,
    )
    .all(...params) as { date: string; count: number; total: number }[];

  return rows.map((row) => ({ date: row.date, count: row.count, total: Math.round(row.total) }));
}

export function getBestSellingProducts(
  db: AppDatabase,
  startDate?: string,
  endDate?: string,
  limit = 20,
): BestSellingRow[] {
  const start = parseStart(startDate);
  const end = parseEnd(endDate);

  const clauses: string[] = ["t.status = 'completed'"];
  const params: (string | number)[] = [];
  if (start !== undefined) {
    clauses.push(`${msExpression('t.created_at')} >= ?`);
    params.push(start);
  }
  if (end !== undefined) {
    clauses.push(`${msExpression('t.created_at')} <= ?`);
    params.push(end);
  }
  const where = clauses.join(' AND ');

  const rows = db.sqlite
    .prepare(
      `SELECT ti.product_id AS productId, p.name AS productName,
              COALESCE(SUM(ti.quantity), 0) AS quantity,
              COALESCE(SUM(ti.subtotal), 0) AS revenue
       FROM transaction_items ti
       JOIN transactions t ON t.id = ti.transaction_id
       LEFT JOIN products p ON p.id = ti.product_id
       WHERE ${where} AND ti.product_id IS NOT NULL
       GROUP BY ti.product_id
       ORDER BY quantity DESC
       LIMIT ?`,
    )
    .all(...params, limit) as {
      productId: string;
      productName: string | null;
      quantity: number;
      revenue: number;
    }[];

  return rows.map((row) => ({
    productId: row.productId,
    productName: row.productName ?? 'Produk tidak diketahui',
    quantity: Math.round(row.quantity),
    revenue: Math.round(row.revenue),
  }));
}

export function getSlowMovingProducts(
  db: AppDatabase,
  days = 90,
): SlowMovingRow[] {
  const cutoff = Date.now() - days * DAY_MS;

  const rows = db.sqlite
    .prepare(
      `SELECT p.id AS productId, p.name AS productName, p.stock AS stock,
              MAX(${msExpression('t.created_at')}) AS lastSoldMillis
       FROM products p
       LEFT JOIN transaction_items ti ON ti.product_id = p.id
       LEFT JOIN transactions t ON t.id = ti.transaction_id AND t.status = 'completed'
       WHERE p.is_active = 1
       GROUP BY p.id
       HAVING lastSoldMillis IS NULL OR lastSoldMillis < ?
       ORDER BY p.stock DESC`,
    )
    .all(cutoff) as {
      productId: string;
      productName: string;
      stock: number;
      lastSoldMillis: number | null;
    }[];

  return rows.map((row) => ({
    productId: row.productId,
    productName: row.productName,
    stock: row.stock,
    lastSold:
      row.lastSoldMillis === null ? null : new Date(row.lastSoldMillis).toISOString(),
  }));
}

export function getGrossProfit(
  db: AppDatabase,
  startDate?: string,
  endDate?: string,
): GrossProfitRow[] {
  const start = parseStart(startDate);
  const end = parseEnd(endDate);

  const clauses: string[] = ["t.status = 'completed'"];
  const params: (string | number)[] = [];
  if (start !== undefined) {
    clauses.push(`${msExpression('t.created_at')} >= ?`);
    params.push(start);
  }
  if (end !== undefined) {
    clauses.push(`${msExpression('t.created_at')} <= ?`);
    params.push(end);
  }
  const where = clauses.join(' AND ');

const rows = db.sqlite
    .prepare(
      `WITH sold AS (
          SELECT ti.transaction_id AS transaction_id,
                 SUM(ti.quantity * COALESCE(ti.cost, 0)) AS cogs
          FROM transaction_items ti
          GROUP BY ti.transaction_id
        )
        SELECT ${dateExpression('t.created_at')} AS period,
               COALESCE(SUM(t.total_amount), 0) AS revenue,
               COALESCE(SUM(COALESCE(sold.cogs, 0)), 0) AS cogs,
               COALESCE(SUM(t.total_amount), 0) - COALESCE(SUM(COALESCE(sold.cogs, 0)), 0) AS gross_profit
        FROM transactions t
        LEFT JOIN sold ON sold.transaction_id = t.id
        WHERE ${where}
        GROUP BY period
        ORDER BY period ASC`,
    )
    .all(...params) as {
      period: string;
      revenue: number;
      cogs: number;
      gross_profit: number;
    }[];

  return rows.map((row) => ({
    period: row.period,
    revenue: Math.round(row.revenue),
    cogs: Math.round(row.cogs),
    grossProfit: Math.round(row.gross_profit),
  }));
}

export function getInventoryValuation(db: AppDatabase): InventoryValuationRow[] {
  const rows = db.sqlite
    .prepare(
      `SELECT p.id AS productId, p.name AS productName, p.stock AS quantity,
              p.cost AS unitCost, p.stock * p.cost AS costValue,
              p.price AS unitRetail, p.stock * p.price AS retailValue
       FROM products p
       WHERE p.is_active = 1
       ORDER BY p.name COLLATE NOCASE`,
    )
    .all() as {
      productId: string;
      productName: string;
      quantity: number;
      unitCost: number;
      costValue: number;
      unitRetail: number;
      retailValue: number;
    }[];

  return rows.map((row) => ({
    productId: row.productId,
    productName: row.productName,
    quantity: Math.round(row.quantity),
    unitCost: Math.round(row.unitCost),
    costValue: Math.round(row.costValue),
    unitRetail: Math.round(row.unitRetail),
    retailValue: Math.round(row.retailValue),
  }));
}

export function getPurchaseReport(
  db: AppDatabase,
  startDate?: string,
  endDate?: string,
): PurchaseReportRow[] {
  const start = parseStart(startDate);
  const end = parseEnd(endDate);

  const clauses: string[] = [];
  const params: (string | number)[] = [];
  if (start !== undefined) {
    clauses.push(`${msExpression('po.created_at')} >= ?`);
    params.push(start);
  }
  if (end !== undefined) {
    clauses.push(`${msExpression('po.created_at')} <= ?`);
    params.push(end);
  }
  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';

  const rows = db.sqlite
    .prepare(
      `SELECT ${dateExpression('po.created_at')} AS date, po.po_number AS poNumber,
              s.name AS supplierName, po.total_amount AS totalAmount
       FROM purchase_orders po
       JOIN suppliers s ON s.id = po.supplier_id
       ${where}
       ORDER BY ${msExpression('po.created_at')} DESC`,
    )
    .all(...params) as {
      date: string;
      poNumber: string;
      supplierName: string;
      totalAmount: number;
    }[];

  return rows;
}

export function getExpenseReport(
  db: AppDatabase,
  startDate?: string,
  endDate?: string,
): ExpenseReportRow[] {
  const start = parseStart(startDate);
  const end = parseEnd(endDate);

  const clauses: string[] = [];
  const params: (string | number)[] = [];
  if (start !== undefined) {
    clauses.push(`${msExpression('created_at')} >= ?`);
    params.push(start);
  }
  if (end !== undefined) {
    clauses.push(`${msExpression('created_at')} <= ?`);
    params.push(end);
  }
  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';

  const rows = db.sqlite
    .prepare(
      `SELECT ${dateExpression('created_at')} AS date, category, COALESCE(SUM(amount), 0) AS amount
       FROM expense_records
       ${where}
       GROUP BY date, category
       ORDER BY date DESC`,
    )
    .all(...params) as {
      date: string;
      category: string;
      amount: number;
    }[];

  return rows;
}

export function getCashierPerformance(
  db: AppDatabase,
  startDate?: string,
  endDate?: string,
): CashierPerformanceRow[] {
  const start = parseStart(startDate);
  const end = parseEnd(endDate);

  const clauses: string[] = ["t.status = 'completed'"];
  const params: (string | number)[] = [];
  if (start !== undefined) {
    clauses.push(`${msExpression('t.created_at')} >= ?`);
    params.push(start);
  }
  if (end !== undefined) {
    clauses.push(`${msExpression('t.created_at')} <= ?`);
    params.push(end);
  }
  const where = clauses.join(' AND ');

  const rows = db.sqlite
    .prepare(
      `SELECT t.user_id AS userId, u.name AS userName, COUNT(*) AS count,
              COALESCE(SUM(t.total_amount), 0) AS total
       FROM transactions t
       JOIN users u ON u.id = t.user_id
       WHERE ${where}
       GROUP BY t.user_id
       ORDER BY total DESC`,
    )
    .all(...params) as {
      userId: string;
      userName: string;
      count: number;
      total: number;
    }[];

  return rows.map((row) => ({
    userId: row.userId,
    userName: row.userName,
    count: row.count,
    total: Math.round(row.total),
  }));
}

export function getTransactionReport(
  db: AppDatabase,
  startDate?: string,
  endDate?: string,
  limit = 200,
): TransactionReportRow[] {
  const start = parseStart(startDate);
  const end = parseEnd(endDate);

  const clauses: string[] = ["t.status = 'completed'"];
  const params: (string | number)[] = [];
  if (start !== undefined) {
    clauses.push(`${msExpression('t.created_at')} >= ?`);
    params.push(start);
  }
  if (end !== undefined) {
    clauses.push(`${msExpression('t.created_at')} <= ?`);
    params.push(end);
  }
  const where = clauses.join(' AND ');

  const rows = db.sqlite
    .prepare(
      `SELECT t.id, t.transaction_number AS transactionNumber, u.name AS userName,
              t.total_amount AS totalAmount, t.payment_method AS paymentMethod,
              t.created_at AS createdAt
       FROM transactions t
       JOIN users u ON u.id = t.user_id
       WHERE ${where}
       ORDER BY t.created_at DESC
       LIMIT ?`,
    )
    .all(...params, limit) as {
      id: string;
      transactionNumber: string;
      userName: string;
      totalAmount: number;
      paymentMethod: string;
      createdAt: string;
    }[];

  return rows;
}
