import { randomUUID } from 'node:crypto';
import type { AppDatabase } from '../db/open';
import { AppError } from '../errors';
import { appendOutboxEvent } from './outbox';

export type CustomerRecord = {
  id: string;
  code: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  country: string | null;
  taxId: string | null;
  balance: number;
  status: string;
  notes: string | null;
  createdAt: number;
  updatedAt: number;
  createdBy: string | null;
};

export type CustomerTransactionRecord = {
  id: string;
  customerId: string;
  transactionType: string;
  referenceType: string | null;
  referenceId: string | null;
  amount: number;
  balanceAfter: number;
  description: string | null;
  transactionDate: number;
  createdAt: number;
  createdBy: string | null;
  idempotencyKey?: string | null;
};

type CustomerRow = {
  id: string;
  code: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  tax_id: string | null;
  balance: number;
  status: string;
  notes: string | null;
  created_at: number;
  updated_at: number;
  created_by: string | null;
};

type CustomerTxRow = {
  id: string;
  customer_id: string;
  transaction_type: string;
  reference_type: string | null;
  reference_id: string | null;
  amount: number;
  balance_after: number;
  description: string | null;
  transaction_date: number;
  created_at: number;
  created_by: string | null;
  idempotency_key: string | null;
};

function customerCode(db: AppDatabase): string {
  const row = db.sqlite
    .prepare("SELECT code FROM customers ORDER BY code DESC LIMIT 1")
    .get() as { code: string } | undefined;
  const lastCode = row?.code || 'CST0000';
  const num = parseInt(lastCode.replace('CST', ''), 10) + 1;
  return `CST${num.toString().padStart(4, '0')}`;
}

export function createCustomer(
  db: AppDatabase,
  input: {
    name: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
    postalCode?: string;
    country?: string;
    taxId?: string;
    notes?: string;
    userId: string;
  },
): CustomerRecord {
  const now = Date.now();
  const code = customerCode(db);
  const id = randomUUID();

  db.sqlite
    .prepare(
      `INSERT INTO customers (
        id, code, name, contact_person, phone, email, address, city,
        postal_code, country, tax_id, balance, status, notes, created_at, updated_at, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'active', ?, ?, ?, ?)`,
    )
    .run(
      id,
      code,
      input.name,
      input.contactPerson ?? null,
      input.phone ?? null,
      input.email ?? null,
      input.address ?? null,
      input.city ?? null,
      input.postalCode ?? null,
      input.country ?? null,
      input.taxId ?? null,
      input.notes ?? null,
      now,
      now,
      input.userId,
    );

  return getCustomer(db, id)!;
}

export function getCustomer(db: AppDatabase, id: string): CustomerRecord | undefined {
  const row = db.sqlite
    .prepare(
      `SELECT id, code, name, contact_person, phone, email, address, city,
              postal_code, country, tax_id, balance, status, notes,
              created_at, updated_at, created_by
       FROM customers WHERE id = ?`,
    )
    .get(id) as CustomerRow | undefined;
  if (!row) {
    return undefined;
  }
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    contactPerson: row.contact_person,
    phone: row.phone,
    email: row.email,
    address: row.address,
    city: row.city,
    postalCode: row.postal_code,
    country: row.country,
    taxId: row.tax_id,
    balance: row.balance,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
  };
}

export function listCustomers(
  db: AppDatabase,
  filters: { status?: string; search?: string; limit?: number } = {},
): CustomerRecord[] {
  const clauses: string[] = [];
  const params: any[] = [];
  if (filters.status) {
    clauses.push('status = ?');
    params.push(filters.status);
  }
  if (filters.search) {
    clauses.push('name LIKE ?');
    params.push(`%${filters.search}%`);
  }
  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  const limit = filters.limit ? `LIMIT ${filters.limit}` : '';

  const rows = db.sqlite
    .prepare(
      `SELECT id, code, name, contact_person, phone, email, address, city,
              postal_code, country, tax_id, balance, status, notes,
              created_at, updated_at, created_by
       FROM customers ${where} ORDER BY name COLLATE NOCASE ${limit}`,
    )
    .all(...params) as CustomerRow[];

  return rows.map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    contactPerson: row.contact_person,
    phone: row.phone,
    email: row.email,
    address: row.address,
    city: row.city,
    postalCode: row.postal_code,
    country: row.country,
    taxId: row.tax_id,
    balance: row.balance,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
  }));
}

export function updateCustomer(
  db: AppDatabase,
  input: {
    id: string;
    name?: string;
    contactPerson?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    city?: string | null;
    notes?: string | null;
  },
): CustomerRecord {
  const customer = getCustomer(db, input.id);
  if (!customer) {
    throw new AppError('NOT_FOUND', 'Pelanggan tidak ditemukan');
  }

  const now = Date.now();
  const assignments: string[] = [];
  const params: any[] = [];

  const set = (column: string, value: any) => {
    assignments.push(`${column} = ?`);
    params.push(value);
  };

  if (input.name !== undefined) set('name', input.name);
  if (input.contactPerson !== undefined) set('contact_person', input.contactPerson);
  if (input.phone !== undefined) set('phone', input.phone);
  if (input.email !== undefined) set('email', input.email);
  if (input.address !== undefined) set('address', input.address);
  if (input.city !== undefined) set('city', input.city);
  if (input.notes !== undefined) set('notes', input.notes);
  set('updated_at', now);
  params.push(input.id);

  db.sqlite.prepare(`UPDATE customers SET ${assignments.join(', ')} WHERE id = ?`).run(...params);

  return getCustomer(db, input.id)!;
}

export function deactivateCustomer(db: AppDatabase, id: string): void {
  const customer = getCustomer(db, id);
  if (!customer) {
    throw new AppError('NOT_FOUND', 'Pelanggan tidak ditemukan');
  }
  db.sqlite
    .prepare("UPDATE customers SET status = 'inactive', updated_at = ? WHERE id = ?")
    .run(Date.now(), id);
}

export function recordCustomerTransaction(
  db: AppDatabase,
  input: {
    customerId: string;
    transactionType: 'sale' | 'payment' | 'return';
    amount: number;
    referenceType?: string;
    referenceId?: string;
    description?: string;
    userId: string;
    idempotencyKey?: string;
  },
): CustomerTransactionRecord {
  const customer = getCustomer(db, input.customerId);
  if (!customer) {
    throw new AppError('NOT_FOUND', 'Pelanggan tidak ditemukan');
  }

  const tx = db.sqlite.transaction(() => {
    if (input.idempotencyKey) {
      const existing = db.sqlite
        .prepare('SELECT id FROM customer_transactions WHERE idempotency_key = ?')
        .get(input.idempotencyKey) as { id: string } | undefined;
      if (existing) {
        return existing.id;
      }
    }

    // Re-read customer inside transaction for consistent balance
    const current = db.sqlite
      .prepare('SELECT balance FROM customers WHERE id = ?')
      .get(input.customerId) as { balance: number } | undefined;
    if (!current) {
      throw new AppError('NOT_FOUND', 'Pelanggan tidak ditemukan');
    }
    const newBalance = current.balance + input.amount;
    const id = randomUUID();
    const now = Date.now();

    db.sqlite
      .prepare(
        `INSERT INTO customer_transactions (
          id, customer_id, transaction_type, reference_type, reference_id,
          amount, balance_after, description, transaction_date, idempotency_key, created_at, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        input.customerId,
        input.transactionType,
        input.referenceType ?? null,
        input.referenceId ?? null,
        input.amount,
        newBalance,
        input.description ?? null,
        now,
        input.idempotencyKey ?? null,
        now,
        input.userId,
      );

    db.sqlite
      .prepare('UPDATE customers SET balance = ?, updated_at = ? WHERE id = ?')
      .run(newBalance, now, input.customerId);

    if (input.transactionType === 'payment') {
      appendOutboxEvent(db, {
        eventType: 'customer.payment.recorded',
        aggregateType: 'customer_transaction',
        aggregateId: id,
        idempotencyKey: input.idempotencyKey ? `customer_payment:${input.idempotencyKey}` : `customer_payment:${id}`,
        payload: {
          customerTransactionId: id,
          customerId: input.customerId,
          amount: input.amount,
          balanceAfter: newBalance,
          referenceType: input.referenceType ?? null,
          referenceId: input.referenceId ?? null,
          description: input.description ?? null,
          transactionDate: now,
          userId: input.userId,
        },
        createdAt: new Date(now).toISOString(),
      });
    }

    return id;
  });

  const id = tx();
  return getCustomerTransaction(db, id)!;
}

export function getCustomerTransaction(db: AppDatabase, id: string): CustomerTransactionRecord | undefined {
  const row = db.sqlite
    .prepare(
      `SELECT id, customer_id, transaction_type, reference_type, reference_id,
              amount, balance_after, description, transaction_date, created_at, created_by, idempotency_key
       FROM customer_transactions WHERE id = ?`,
    )
    .get(id) as CustomerTxRow | undefined;
  if (!row) {
    return undefined;
  }
  return {
    id: row.id,
    customerId: row.customer_id,
    transactionType: row.transaction_type,
    referenceType: row.reference_type,
    referenceId: row.reference_id,
    amount: row.amount,
    balanceAfter: row.balance_after,
    description: row.description,
    transactionDate: row.transaction_date,
    createdAt: row.created_at,
    createdBy: row.created_by,
    idempotencyKey: row.idempotency_key,
  };
}

export function listCustomerTransactions(
  db: AppDatabase,
  filters: { customerId?: string; transactionType?: string; startDate?: number; endDate?: number; limit?: number } = {},
): CustomerTransactionRecord[] {
  const clauses: string[] = [];
  const params: any[] = [];
  if (filters.customerId) {
    clauses.push('customer_id = ?');
    params.push(filters.customerId);
  }
  if (filters.transactionType) {
    clauses.push('transaction_type = ?');
    params.push(filters.transactionType);
  }
  if (filters.startDate !== undefined) {
    clauses.push('transaction_date >= ?');
    params.push(filters.startDate);
  }
  if (filters.endDate !== undefined) {
    clauses.push('transaction_date <= ?');
    params.push(filters.endDate);
  }
  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  const limit = filters.limit ? `LIMIT ${filters.limit}` : '';

  const rows = db.sqlite
    .prepare(
      `SELECT id, customer_id, transaction_type, reference_type, reference_id,
              amount, balance_after, description, transaction_date, created_at, created_by, idempotency_key
       FROM customer_transactions ${where} ORDER BY transaction_date DESC ${limit}`,
    )
    .all(...params) as CustomerTxRow[];

  return rows.map((row) => ({
    id: row.id,
    customerId: row.customer_id,
    transactionType: row.transaction_type,
    referenceType: row.reference_type,
    referenceId: row.reference_id,
    amount: row.amount,
    balanceAfter: row.balance_after,
    description: row.description,
    transactionDate: row.transaction_date,
    createdAt: row.created_at,
    createdBy: row.created_by,
    idempotencyKey: row.idempotency_key,
  }));
}

export function getCustomerReceivables(db: AppDatabase, customerId: string): { balance: number; overdue: number } {
  const customer = getCustomer(db, customerId);
  if (!customer) {
    throw new AppError('NOT_FOUND', 'Pelanggan tidak ditemukan');
  }
  return { balance: customer.balance, overdue: customer.balance > 0 ? customer.balance : 0 };
}

export function payCustomerCredit(
  db: AppDatabase,
  input: { customerId: string; amount: number; description?: string; userId: string; idempotencyKey?: string },
): CustomerRecord {
  if (input.idempotencyKey) {
    const existing = db.sqlite
      .prepare('SELECT id FROM customer_transactions WHERE idempotency_key = ?')
      .get(input.idempotencyKey) as { id: string } | undefined;
    if (existing) {
      return getCustomer(db, input.customerId)!;
    }
  }

  const customer = getCustomer(db, input.customerId);
  if (!customer) {
    throw new AppError('NOT_FOUND', 'Pelanggan tidak ditemukan');
  }
  if (!Number.isInteger(input.amount) || input.amount <= 0) {
    throw new AppError('VALIDATION', 'Nominal pembayaran tidak valid');
  }
  if (input.amount > customer.balance) {
    throw new AppError('VALIDATION', 'Pembayaran melebihi saldo piutang');
  }

  recordCustomerTransaction(db, {
    customerId: input.customerId,
    transactionType: 'payment',
    amount: -input.amount,
    referenceType: 'manual_payment',
    description: input.description ?? 'Pembayaran piutang',
    userId: input.userId,
    idempotencyKey: input.idempotencyKey,
  });
  return getCustomer(db, input.customerId)!;
}

export function getCustomerStats(
  db: AppDatabase,
  customerId: string,
): { transactionCount: number; totalSpent: number; totalPaid: number; outstanding: number; lastTransactionAt: number | null } {
  const customer = getCustomer(db, customerId);
  if (!customer) {
    throw new AppError('NOT_FOUND', 'Pelanggan tidak ditemukan');
  }
  const sales = db.sqlite
    .prepare(
      `SELECT COUNT(*) AS count, COALESCE(SUM(total_amount), 0) AS total, MAX(created_at) AS last_at
       FROM transactions WHERE customer_id = ? AND status = 'completed'`,
    )
    .get(customerId) as { count: number; total: number; last_at: string | null };
  const paid = db.sqlite
    .prepare(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM customer_transactions
       WHERE customer_id = ? AND transaction_type = 'payment'`,
    )
    .get(customerId) as { total: number };
  const lastAt = sales.last_at ? Date.parse(sales.last_at) : null;
  return {
    transactionCount: sales.count,
    totalSpent: Math.round(sales.total),
    totalPaid: Math.abs(paid.total),
    outstanding: customer.balance,
    lastTransactionAt: Number.isFinite(lastAt) ? lastAt : null,
  };
}
