import { randomUUID } from 'node:crypto';
import type { AppDatabase } from '../db/open';
import { AppError } from '../errors';

export type CashDrawerRecord = {
  id: string;
  userId: string;
  userName: string;
  openingBalance: number;
  closingBalance: number;
  openedAt: number;
  closedAt: number | null;
  status: string;
  notes: string | null;
};

export type CashMovementRecord = {
  id: string;
  cashDrawerId: string;
  movementType: string;
  amount: number;
  referenceType: string | null;
  referenceId: string | null;
  description: string | null;
  createdAt: number;
  createdBy: string | null;
};

export type IncomeRecord = {
  id: string;
  cashDrawerId: string | null;
  incomeType: string;
  amount: number;
  referenceType: string | null;
  referenceId: string | null;
  description: string | null;
  createdAt: number;
  createdBy: string | null;
};

export type ExpenseRecord = {
  id: string;
  cashDrawerId: string | null;
  category: string;
  amount: number;
  description: string | null;
  createdAt: number;
  createdBy: string | null;
};

export type ProfitAndLoss = {
  totalIncome: number;
  totalExpense: number;
  grossProfit: number;
  salesRevenue: number;
  cogs: number;
  netProfit: number;
  byCategory: { category: string; amount: number }[];
};

export type CashFlow = {
  openingBalance: number;
  totalIncome: number;
  totalExpense: number;
  closingBalance: number;
  movements: CashMovementRecord[];
};

type DrawerRow = {
  id: string;
  user_id: string;
  user_name: string;
  opening_balance: number;
  closing_balance: number;
  opened_at: number;
  closed_at: number | null;
  status: string;
  notes: string | null;
};

type MovementRow = {
  id: string;
  cash_drawer_id: string;
  movement_type: string;
  amount: number;
  reference_type: string | null;
  reference_id: string | null;
  description: string | null;
  created_at: number;
  created_by: string | null;
};

type IncomeRow = {
  id: string;
  cash_drawer_id: string | null;
  income_type: string;
  amount: number;
  reference_type: string | null;
  reference_id: string | null;
  description: string | null;
  created_at: number;
  created_by: string | null;
};

type ExpenseRow = {
  id: string;
  cash_drawer_id: string | null;
  category: string;
  amount: number;
  description: string | null;
  created_at: number;
  created_by: string | null;
};

function drawerNumber(db: AppDatabase): string {
  const date = new Date();
  const prefix = `CD${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const row = db.sqlite.prepare("SELECT COUNT(*) AS c FROM cash_drawers WHERE id LIKE ?").get(`${prefix}%`) as { c: number };
  return `${prefix}-${String(row.c + 1).padStart(4, '0')}`;
}

export function openCashDrawer(
  db: AppDatabase,
  input: { userId: string; openingBalance: number; notes?: string },
): CashDrawerRecord {
  const user = db.sqlite.prepare('SELECT id, name FROM users WHERE id = ?').get(input.userId) as { id: string; name: string } | undefined;
  if (!user) {
    throw new AppError('NOT_FOUND', 'Pengguna tidak ditemukan');
  }

  const openDrawer = db.sqlite
    .prepare("SELECT id FROM cash_drawers WHERE user_id = ? AND status = 'open'")
    .get(input.userId) as { id: string } | undefined;
  if (openDrawer) {
    throw new AppError('VALIDATION', 'Dompet kas untuk pengguna ini masih terbuka');
  }

  const id = randomUUID();
  const now = Date.now();
  const number = drawerNumber(db);

  db.sqlite
    .prepare(
      `INSERT INTO cash_drawers (
        id, user_id, opening_balance, closing_balance, opened_at, closed_at, status, notes
      ) VALUES (?, ?, ?, ?, ?, NULL, 'open', ?)`,
    )
    .run(id, input.userId, input.openingBalance, input.openingBalance, now, input.notes ?? null);

  return getCashDrawer(db, id)!;
}

export function closeCashDrawer(
  db: AppDatabase,
  input: { cashDrawerId: string; closingBalance: number; notes?: string; userId: string },
): CashDrawerRecord {
  const drawer = getCashDrawer(db, input.cashDrawerId);
  if (!drawer) {
    throw new AppError('NOT_FOUND', 'Dompet kas tidak ditemukan');
  }
  if (drawer.status !== 'open') {
    throw new AppError('VALIDATION', 'Dompet kas sudah ditutup');
  }
  if (drawer.userId !== input.userId) {
    throw new AppError('FORBIDDEN', 'Bukan pemilik dompet kas ini');
  }
  if (input.closingBalance < drawer.openingBalance) {
    throw new AppError('VALIDATION', 'Saldo penutup tidak boleh kurang dari saldo pembuka');
  }

  const now = Date.now();
  db.sqlite
    .prepare(
      `UPDATE cash_drawers SET closing_balance = ?, closed_at = ?, status = 'closed', notes = COALESCE(notes || ' ' || ?, ?, ?) WHERE id = ?`,
    )
    .run(input.closingBalance, now, input.notes ?? null, input.notes ?? null, now, input.cashDrawerId);

  return getCashDrawer(db, input.cashDrawerId)!;
}

export function getCashDrawer(db: AppDatabase, id: string): CashDrawerRecord | undefined {
  const row = db.sqlite
    .prepare(
      `SELECT cd.*, u.name AS user_name
       FROM cash_drawers cd
       JOIN users u ON u.id = cd.user_id
       WHERE cd.id = ?`,
    )
    .get(id) as DrawerRow | undefined;
  if (!row) {
    return undefined;
  }
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    openingBalance: row.opening_balance,
    closingBalance: row.closing_balance,
    openedAt: row.opened_at,
    closedAt: row.closed_at,
    status: row.status,
    notes: row.notes,
  };
}

export function listCashDrawers(
  db: AppDatabase,
  filters: { status?: string; userId?: string; startDate?: number; endDate?: number; limit?: number } = {},
): CashDrawerRecord[] {
  const clauses: string[] = [];
  const params: any[] = [];
  if (filters.status) {
    clauses.push('cd.status = ?');
    params.push(filters.status);
  }
  if (filters.userId) {
    clauses.push('cd.user_id = ?');
    params.push(filters.userId);
  }
  if (filters.startDate !== undefined) {
    clauses.push('cd.opened_at >= ?');
    params.push(filters.startDate);
  }
  if (filters.endDate !== undefined) {
    clauses.push('cd.opened_at <= ?');
    params.push(filters.endDate);
  }
  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  const limit = filters.limit ? `LIMIT ${filters.limit}` : '';

  const rows = db.sqlite
    .prepare(
      `SELECT cd.*, u.name AS user_name
       FROM cash_drawers cd
       JOIN users u ON u.id = cd.user_id
       ${where}
       ORDER BY cd.opened_at DESC
       ${limit}`,
    )
    .all(...params) as DrawerRow[];

  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    openingBalance: row.opening_balance,
    closingBalance: row.closing_balance,
    openedAt: row.opened_at,
    closedAt: row.closed_at,
    status: row.status,
    notes: row.notes,
  }));
}

export function recordCashMovement(
  db: AppDatabase,
  input: {
    cashDrawerId: string;
    movementType: 'income' | 'expense';
    amount: number;
    referenceType?: string;
    referenceId?: string;
    description?: string;
    createdBy: string;
  },
): CashMovementRecord {
  const drawer = getCashDrawer(db, input.cashDrawerId);
  if (!drawer) {
    throw new AppError('NOT_FOUND', 'Dompet kas tidak ditemukan');
  }
  if (drawer.status !== 'open') {
    throw new AppError('VALIDATION', 'Dompet kas sudah ditutup');
  }

  const id = randomUUID();
  const now = Date.now();

  db.sqlite
    .prepare(
      `INSERT INTO cash_movements (
        id, cash_drawer_id, movement_type, amount, reference_type, reference_id, description, created_at, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.cashDrawerId,
      input.movementType,
      input.amount,
      input.referenceType ?? null,
      input.referenceId ?? null,
      input.description ?? null,
      now,
      input.createdBy,
    );

  return {
    id,
    cashDrawerId: input.cashDrawerId,
    movementType: input.movementType,
    amount: input.amount,
    referenceType: input.referenceType ?? null,
    referenceId: input.referenceId ?? null,
    description: input.description ?? null,
    createdAt: now,
    createdBy: input.createdBy,
  };
}

export function listCashMovements(
  db: AppDatabase,
  filters: { cashDrawerId?: string; movementType?: string; startDate?: number; endDate?: number; limit?: number } = {},
): CashMovementRecord[] {
  const clauses: string[] = [];
  const params: any[] = [];
  if (filters.cashDrawerId) {
    clauses.push('cm.cash_drawer_id = ?');
    params.push(filters.cashDrawerId);
  }
  if (filters.movementType) {
    clauses.push('cm.movement_type = ?');
    params.push(filters.movementType);
  }
  if (filters.startDate !== undefined) {
    clauses.push('cm.created_at >= ?');
    params.push(filters.startDate);
  }
  if (filters.endDate !== undefined) {
    clauses.push('cm.created_at <= ?');
    params.push(filters.endDate);
  }
  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  const limit = filters.limit ? `LIMIT ${filters.limit}` : '';

  const rows = db.sqlite
    .prepare(
      `SELECT cm.* FROM cash_movements cm ${where} ORDER BY cm.created_at DESC ${limit}`,
    )
    .all(...params) as MovementRow[];

  return rows.map((row) => ({
    id: row.id,
    cashDrawerId: row.cash_drawer_id,
    movementType: row.movement_type,
    amount: row.amount,
    referenceType: row.reference_type,
    referenceId: row.reference_id,
    description: row.description,
    createdAt: row.created_at,
    createdBy: row.created_by,
  }));
}

export function recordIncome(
  db: AppDatabase,
  input: {
    cashDrawerId?: string;
    incomeType: string;
    amount: number;
    referenceType?: string;
    referenceId?: string;
    description?: string;
    createdBy: string;
  },
): IncomeRecord {
  const id = randomUUID();
  const now = Date.now();

  db.sqlite
    .prepare(
      `INSERT INTO income_records (
        id, cash_drawer_id, income_type, amount, reference_type, reference_id, description, created_at, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.cashDrawerId ?? null,
      input.incomeType,
      input.amount,
      input.referenceType ?? null,
      input.referenceId ?? null,
      input.description ?? null,
      now,
      input.createdBy,
    );

  if (input.cashDrawerId) {
    recordCashMovement(db, {
      cashDrawerId: input.cashDrawerId,
      movementType: 'income',
      amount: input.amount,
      referenceType: input.referenceType ?? 'income',
      referenceId: input.referenceId,
      description: input.description,
      createdBy: input.createdBy,
    });
  }

  return {
    id,
    cashDrawerId: input.cashDrawerId ?? null,
    incomeType: input.incomeType,
    amount: input.amount,
    referenceType: input.referenceType ?? null,
    referenceId: input.referenceId ?? null,
    description: input.description ?? null,
    createdAt: now,
    createdBy: input.createdBy,
  };
}

export function recordExpense(
  db: AppDatabase,
  input: {
    cashDrawerId?: string;
    category: string;
    amount: number;
    description?: string;
    createdBy: string;
  },
): ExpenseRecord {
  const id = randomUUID();
  const now = Date.now();

  db.sqlite
    .prepare(
      `INSERT INTO expense_records (
        id, cash_drawer_id, category, amount, description, created_at, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.cashDrawerId ?? null,
      input.category,
      input.amount,
      input.description ?? null,
      now,
      input.createdBy,
    );

  if (input.cashDrawerId) {
    recordCashMovement(db, {
      cashDrawerId: input.cashDrawerId,
      movementType: 'expense',
      amount: input.amount,
      referenceType: 'expense',
      referenceId: id,
      description: input.description,
      createdBy: input.createdBy,
    });
  }

  return {
    id,
    cashDrawerId: input.cashDrawerId ?? null,
    category: input.category,
    amount: input.amount,
    description: input.description ?? null,
    createdAt: now,
    createdBy: input.createdBy,
  };
}

export function listIncomeRecords(
  db: AppDatabase,
  filters: { cashDrawerId?: string; startDate?: number; endDate?: number; limit?: number } = {},
): IncomeRecord[] {
  const clauses: string[] = [];
  const params: any[] = [];
  if (filters.cashDrawerId) {
    clauses.push('ir.cash_drawer_id = ?');
    params.push(filters.cashDrawerId);
  }
  if (filters.startDate !== undefined) {
    clauses.push('ir.created_at >= ?');
    params.push(filters.startDate);
  }
  if (filters.endDate !== undefined) {
    clauses.push('ir.created_at <= ?');
    params.push(filters.endDate);
  }
  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  const limit = filters.limit ? `LIMIT ${filters.limit}` : '';

  const rows = db.sqlite
    .prepare(
      `SELECT ir.* FROM income_records ir ${where} ORDER BY ir.created_at DESC ${limit}`,
    )
    .all(...params) as IncomeRow[];

  return rows.map((row) => ({
    id: row.id,
    cashDrawerId: row.cash_drawer_id,
    incomeType: row.income_type,
    amount: row.amount,
    referenceType: row.reference_type,
    referenceId: row.reference_id,
    description: row.description,
    createdAt: row.created_at,
    createdBy: row.created_by,
  }));
}

export function listExpenseRecords(
  db: AppDatabase,
  filters: { cashDrawerId?: string; category?: string; startDate?: number; endDate?: number; limit?: number } = {},
): ExpenseRecord[] {
  const clauses: string[] = [];
  const params: any[] = [];
  if (filters.cashDrawerId) {
    clauses.push('er.cash_drawer_id = ?');
    params.push(filters.cashDrawerId);
  }
  if (filters.category) {
    clauses.push('er.category = ?');
    params.push(filters.category);
  }
  if (filters.startDate !== undefined) {
    clauses.push('er.created_at >= ?');
    params.push(filters.startDate);
  }
  if (filters.endDate !== undefined) {
    clauses.push('er.created_at <= ?');
    params.push(filters.endDate);
  }
  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  const limit = filters.limit ? `LIMIT ${filters.limit}` : '';

  const rows = db.sqlite
    .prepare(
      `SELECT er.* FROM expense_records er ${where} ORDER BY er.created_at DESC ${limit}`,
    )
    .all(...params) as ExpenseRow[];

  return rows.map((row) => ({
    id: row.id,
    cashDrawerId: row.cash_drawer_id,
    category: row.category,
    amount: row.amount,
    description: row.description,
    createdAt: row.created_at,
    createdBy: row.created_by,
  }));
}

export function getProfitAndLoss(
  db: AppDatabase,
  filters: { startDate?: number; endDate?: number },
): ProfitAndLoss {
  const clauses: string[] = [];
  const params: any[] = [];
  if (filters.startDate !== undefined) {
    clauses.push('created_at >= ?');
    params.push(filters.startDate);
  }
  if (filters.endDate !== undefined) {
    clauses.push('created_at <= ?');
    params.push(filters.endDate);
  }
  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';

  const incomeRow = db.sqlite
    .prepare(`SELECT COALESCE(SUM(amount), 0) AS total FROM income_records ${where}`)
    .get(...params) as { total: number };
  const expenseRow = db.sqlite
    .prepare(`SELECT COALESCE(SUM(amount), 0) AS total FROM expense_records ${where}`)
    .get(...params) as { total: number };

  const totalIncome = incomeRow.total;
  const totalExpense = expenseRow.total;
  const grossProfit = totalIncome - totalExpense;

  const txClauses: string[] = ["status = 'completed'"];
  const txParams: any[] = [];
  const cogsClauses: string[] = ["t.status = 'completed'"];
  const cogsParams: any[] = [];
  const txDate = (column: string) =>
    `COALESCE(CASE WHEN typeof(${column}) IN ('integer','real') THEN ${column} ELSE CAST(strftime('%s', ${column}) AS INTEGER) * 1000 END, 0)`;
  if (filters.startDate !== undefined) {
    txClauses.push(`${txDate('created_at')} >= ?`);
    txParams.push(filters.startDate);
    cogsClauses.push(`${txDate('t.created_at')} >= ?`);
    cogsParams.push(filters.startDate);
  }
  if (filters.endDate !== undefined) {
    txClauses.push(`${txDate('created_at')} <= ?`);
    txParams.push(filters.endDate);
    cogsClauses.push(`${txDate('t.created_at')} <= ?`);
    cogsParams.push(filters.endDate);
  }
  const txWhere = `WHERE ${txClauses.join(' AND ')}`;

  const salesRow = db.sqlite
    .prepare(`SELECT COALESCE(SUM(total_amount), 0) AS total FROM transactions ${txWhere}`)
    .get(...txParams) as { total: number };
  const cogsRow = db.sqlite
    .prepare(
      `SELECT COALESCE(SUM(ti.quantity * COALESCE(ti.cost, 0)), 0) AS total
       FROM transaction_items ti
       JOIN transactions t ON t.id = ti.transaction_id
       WHERE ${cogsClauses.join(' AND ')}`,
    )
    .get(...cogsParams) as { total: number };

  const salesRevenue = salesRow.total;
  const cogs = Math.round(cogsRow.total);
  const netProfit = totalIncome + salesRevenue - totalExpense - cogs;

  const categoryRows = db.sqlite
    .prepare(
      `SELECT category AS category, COALESCE(SUM(amount), 0) AS amount FROM expense_records ${where} GROUP BY category ORDER BY amount DESC`,
    )
    .all(...params) as { category: string; amount: number }[];

  return {
    totalIncome,
    totalExpense,
    grossProfit,
    salesRevenue,
    cogs,
    netProfit,
    byCategory: categoryRows,
  };
}

export function getCashFlow(
  db: AppDatabase,
  filters: { startDate?: number; endDate?: number },
): CashFlow {
  const clauses: string[] = [];
  const params: any[] = [];
  const drawerClauses: string[] = [];
  const drawerParams: any[] = [];
  if (filters.startDate !== undefined) {
    clauses.push('created_at >= ?');
    params.push(filters.startDate);
    drawerClauses.push('opened_at >= ?');
    drawerParams.push(filters.startDate);
  }
  if (filters.endDate !== undefined) {
    clauses.push('created_at <= ?');
    params.push(filters.endDate);
    drawerClauses.push('opened_at <= ?');
    drawerParams.push(filters.endDate);
  }
  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  const drawerWhere = drawerClauses.length > 0 ? `WHERE ${drawerClauses.join(' AND ')}` : '';

  const openingRow = db.sqlite
    .prepare(
      `SELECT COALESCE(SUM(opening_balance), 0) AS total FROM cash_drawers ${drawerWhere}`,
    )
    .get(...drawerParams) as { total: number };
  const incomeRow = db.sqlite
    .prepare(`SELECT COALESCE(SUM(amount), 0) AS total FROM income_records ${where}`)
    .get(...params) as { total: number };
  const expenseRow = db.sqlite
    .prepare(`SELECT COALESCE(SUM(amount), 0) AS total FROM expense_records ${where}`)
    .get(...params) as { total: number };
  const saleRow = db.sqlite
    .prepare(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM cash_movements
       ${where ? `${where} AND` : 'WHERE'} movement_type = 'sale'`,
    )
    .get(...params) as { total: number };

  const movements = listCashMovements(db, {
    startDate: filters.startDate,
    endDate: filters.endDate,
    limit: 1000,
  });

  return {
    openingBalance: openingRow.total,
    totalIncome: incomeRow.total + saleRow.total,
    totalExpense: expenseRow.total,
    closingBalance: openingRow.total + incomeRow.total + saleRow.total - expenseRow.total,
    movements,
  };
}
