import type { AppDatabase } from '../db/open';
import { AppError } from '../errors';

export interface SupplierRecord {
  id: string;
  code: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  taxId?: string;
  paymentTerms: number;
  creditLimit: number;
  balance: number;
  status: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
  createdBy?: string;
}

export interface SupplierTransactionRecord {
  id: string;
  supplierId: string;
  transactionType: string;
  referenceType?: string;
  referenceId?: string;
  amount: number;
  balanceAfter: number;
  description?: string;
  transactionDate: number;
  createdAt: number;
  createdBy?: string;
}

export function generateSupplierCode(db: AppDatabase): string {
  const row = db.sqlite
    .prepare("SELECT code FROM suppliers ORDER BY code DESC LIMIT 1")
    .get() as { code: string } | undefined;
  const lastCode = row?.code || 'SUP0000';
  const num = parseInt(lastCode.replace('SUP', ''), 10) + 1;
  return `SUP${num.toString().padStart(4, '0')}`;
}

export function createSupplier(
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
    paymentTerms?: number;
    creditLimit?: number;
    notes?: string;
    userId: string;
  },
): SupplierRecord {
  const now = Date.now();
  const code = generateSupplierCode(db);
  const id = crypto.randomUUID();

  db.sqlite
    .prepare(
      `INSERT INTO suppliers (
        id, code, name, contact_person, phone, email, address, city,
        postal_code, country, tax_id, payment_terms, credit_limit,
        balance, status, notes, created_at, updated_at, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      input.paymentTerms ?? 0,
      input.creditLimit ?? 0,
      0,
      'active',
      input.notes ?? null,
      now,
      now,
      input.userId,
    );

  return getSupplier(db, id)!;
}

export function getSupplier(db: AppDatabase, id: string): SupplierRecord | undefined {
  return db.sqlite
    .prepare(
      `SELECT id, code, name, contact_person AS contactPerson, phone, email, address, city,
              postal_code AS postalCode, country, tax_id AS taxId,
              payment_terms AS paymentTerms, credit_limit AS creditLimit,
              balance, status, notes, created_at AS createdAt, updated_at AS updatedAt,
              created_by AS createdBy
       FROM suppliers WHERE id = ?`,
    )
    .get(id) as SupplierRecord | undefined;
}

export function listSuppliers(
  db: AppDatabase,
  filters: { status?: string; search?: string; limit?: number } = {},
): SupplierRecord[] {
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

  return db.sqlite
    .prepare(
      `SELECT id, code, name, contact_person AS contactPerson, phone, email, address, city,
              postal_code AS postalCode, country, tax_id AS taxId,
              payment_terms AS paymentTerms, credit_limit AS creditLimit,
              balance, status, notes, created_at AS createdAt, updated_at AS updatedAt,
              created_by AS createdBy
       FROM suppliers ${where} ORDER BY name COLLATE NOCASE ${limit}`,
    )
    .all(...params) as SupplierRecord[];
}

export function updateSupplier(
  db: AppDatabase,
  input: {
    id: string;
    name?: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
    postalCode?: string;
    country?: string;
    taxId?: string;
    paymentTerms?: number;
    creditLimit?: number;
    notes?: string;
  },
): SupplierRecord {
  const supplier = getSupplier(db, input.id);
  if (!supplier) {
    throw new AppError('NOT_FOUND', 'Pemasok tidak ditemukan');
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
  if (input.postalCode !== undefined) set('postal_code', input.postalCode);
  if (input.country !== undefined) set('country', input.country);
  if (input.taxId !== undefined) set('tax_id', input.taxId);
  if (input.paymentTerms !== undefined) set('payment_terms', input.paymentTerms);
  if (input.creditLimit !== undefined) set('credit_limit', input.creditLimit);
  if (input.notes !== undefined) set('notes', input.notes);
  set('updated_at', now);
  params.push(input.id);

  db.sqlite.prepare(`UPDATE suppliers SET ${assignments.join(', ')} WHERE id = ?`).run(...params);

  return getSupplier(db, input.id)!;
}

export function deactivateSupplier(db: AppDatabase, id: string): void {
  const supplier = getSupplier(db, id);
  if (!supplier) {
    throw new AppError('NOT_FOUND', 'Pemasok tidak ditemukan');
  }

  db.sqlite
    .prepare("UPDATE suppliers SET status = 'inactive', updated_at = ? WHERE id = ?")
    .run(Date.now(), id);
}

export function recordSupplierTransaction(
  db: AppDatabase,
  input: {
    supplierId: string;
    transactionType: string;
    amount: number;
    referenceType?: string;
    referenceId?: string;
    description?: string;
    userId: string;
  },
): SupplierTransactionRecord {
  const supplier = getSupplier(db, input.supplierId);
  if (!supplier) {
    throw new AppError('NOT_FOUND', 'Pemasok tidak ditemukan');
  }

  const transaction = db.sqlite.transaction(() => {
    const newBalance = supplier.balance + input.amount;
    const id = crypto.randomUUID();
    const now = Date.now();

    db.sqlite
      .prepare(
        `INSERT INTO supplier_transactions (
          id, supplier_id, transaction_type, reference_type, reference_id,
          amount, balance_after, description, transaction_date, created_at, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        input.supplierId,
        input.transactionType,
        input.referenceType ?? null,
        input.referenceId ?? null,
        input.amount,
        newBalance,
        input.description ?? null,
        now,
        now,
        input.userId,
      );

    db.sqlite
      .prepare('UPDATE suppliers SET balance = ?, updated_at = ? WHERE id = ?')
      .run(newBalance, now, input.supplierId);

    return getSupplierTransaction(db, id)!;
  });

  return transaction();
}

export function getSupplierTransaction(db: AppDatabase, id: string): SupplierTransactionRecord | undefined {
  return db.sqlite
    .prepare(
      `SELECT id, supplier_id AS supplierId, transaction_type AS transactionType,
              reference_type AS referenceType, reference_id AS referenceId, amount,
              balance_after AS balanceAfter, description, transaction_date AS transactionDate,
              created_at AS createdAt, created_by AS createdBy
       FROM supplier_transactions WHERE id = ?`,
    )
    .get(id) as SupplierTransactionRecord | undefined;
}

export function listSupplierTransactions(
  db: AppDatabase,
  filters: { supplierId?: string; transactionType?: string; startDate?: number; endDate?: number; limit?: number } = {},
): SupplierTransactionRecord[] {
  const clauses: string[] = [];
  const params: any[] = [];

  if (filters.supplierId) {
    clauses.push('supplier_id = ?');
    params.push(filters.supplierId);
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

  return db.sqlite
    .prepare(
      `SELECT id, supplier_id AS supplierId, transaction_type AS transactionType,
              reference_type AS referenceType, reference_id AS referenceId, amount,
              balance_after AS balanceAfter, description, transaction_date AS transactionDate,
              created_at AS createdAt, created_by AS createdBy
       FROM supplier_transactions ${where} ORDER BY transaction_date DESC ${limit}`,
    )
    .all(...params) as SupplierTransactionRecord[];
}

export function getSupplierBalance(db: AppDatabase, supplierId: string): number {
  const supplier = getSupplier(db, supplierId);
  return supplier?.balance ?? 0;
}

export interface SupplierInvoiceItemRecord {
  id: string;
  description: string;
  productId?: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface SupplierInvoiceRecord {
  id: string;
  invoiceNumber: string;
  supplierId: string;
  supplierName?: string;
  purchaseOrderId?: string;
  goodsReceivingId?: string;
  invoiceDate: number;
  dueDate?: number;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  status: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
  items: SupplierInvoiceItemRecord[];
}

type SupplierInvoiceRow = {
  id: string;
  invoice_number: string;
  supplier_id: string;
  supplier_name?: string;
  purchase_order_id: string | null;
  goods_receiving_id: string | null;
  invoice_date: number;
  due_date: number | null;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  paid_amount: number;
  status: string;
  notes: string | null;
  created_at: number;
  updated_at: number;
};

function mapInvoice(row: SupplierInvoiceRow, items: SupplierInvoiceItemRecord[]): SupplierInvoiceRecord {
  return {
    id: row.id,
    invoiceNumber: row.invoice_number,
    supplierId: row.supplier_id,
    supplierName: row.supplier_name,
    purchaseOrderId: row.purchase_order_id ?? undefined,
    goodsReceivingId: row.goods_receiving_id ?? undefined,
    invoiceDate: row.invoice_date,
    dueDate: row.due_date ?? undefined,
    subtotal: row.subtotal,
    taxAmount: row.tax_amount,
    totalAmount: row.total_amount,
    paidAmount: row.paid_amount,
    status: row.status,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    items,
  };
}

export function supplierInvoiceNumber(db: AppDatabase): string {
  const date = new Date();
  const prefix = `SI${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const row = db.sqlite
    .prepare('SELECT COUNT(*) AS c FROM supplier_invoices WHERE invoice_number LIKE ?')
    .get(`${prefix}%`) as { c: number };
  return `${prefix}-${String(row.c + 1).padStart(4, '0')}`;
}

export function createSupplierInvoice(
  db: AppDatabase,
  input: {
    supplierId: string;
    purchaseOrderId?: string;
    goodsReceivingId?: string;
    invoiceDate?: number;
    dueDate?: number;
    taxAmount?: number;
    notes?: string;
    items: { productId?: string; description?: string; quantity: number; unitPrice: number }[];
    userId: string;
  },
): SupplierInvoiceRecord {
  const supplier = getSupplier(db, input.supplierId);
  if (!supplier) {
    throw new AppError('NOT_FOUND', 'Pemasok tidak ditemukan');
  }
  if (input.items.length === 0) {
    throw new AppError('VALIDATION', 'Minimal satu item invoice wajib diisi');
  }

  let subtotal = 0;
  for (const item of input.items) {
    if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
      throw new AppError('VALIDATION', 'Kuantitas invoice tidak valid');
    }
    if (!Number.isInteger(item.unitPrice) || item.unitPrice < 0) {
      throw new AppError('VALIDATION', 'Harga invoice tidak valid');
    }
    subtotal += Math.round(item.quantity * item.unitPrice);
  }
  const taxAmount = input.taxAmount ?? 0;
  const totalAmount = subtotal + taxAmount;
  const now = Date.now();
  const invoiceDate = input.invoiceDate ?? now;
  const id = crypto.randomUUID();
  const number = supplierInvoiceNumber(db);

  const write = db.sqlite.transaction(() => {
    db.sqlite
      .prepare(
        `INSERT INTO supplier_invoices (
          id, invoice_number, supplier_id, purchase_order_id, goods_receiving_id,
          invoice_date, due_date, subtotal, tax_amount, total_amount, paid_amount,
          status, notes, created_at, updated_at, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'unpaid', ?, ?, ?, ?)`,
      )
      .run(
        id,
        number,
        input.supplierId,
        input.purchaseOrderId ?? null,
        input.goodsReceivingId ?? null,
        invoiceDate,
        input.dueDate ?? null,
        subtotal,
        taxAmount,
        totalAmount,
        input.notes ?? null,
        now,
        now,
        input.userId,
      );

    const insertItem = db.sqlite.prepare(
      `INSERT INTO supplier_invoice_items (
        id, supplier_invoice_id, product_id, description, quantity, unit_price, subtotal
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const item of input.items) {
      insertItem.run(
        crypto.randomUUID(),
        id,
        item.productId ?? null,
        item.description ?? 'Item pembelian',
        item.quantity,
        item.unitPrice,
        Math.round(item.quantity * item.unitPrice),
      );
    }
  });
  write();

  return getSupplierInvoice(db, id)!;
}

export function getSupplierInvoice(db: AppDatabase, id: string): SupplierInvoiceRecord | undefined {
  const row = db.sqlite
    .prepare(
      `SELECT si.*, s.name AS supplier_name
       FROM supplier_invoices si
       JOIN suppliers s ON s.id = si.supplier_id
       WHERE si.id = ?`,
    )
    .get(id) as SupplierInvoiceRow | undefined;
  if (!row) {
    return undefined;
  }
  const items = db.sqlite
    .prepare(
      `SELECT id, product_id, description, quantity, unit_price, subtotal
       FROM supplier_invoice_items WHERE supplier_invoice_id = ? ORDER BY rowid`,
    )
    .all(id) as {
    id: string;
    product_id: string | null;
    description: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
  }[];
  return mapInvoice(
    row,
    items.map((item) => ({
      id: item.id,
      productId: item.product_id ?? undefined,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      subtotal: item.subtotal,
    })),
  );
}

export function listSupplierInvoices(
  db: AppDatabase,
  filters: { supplierId?: string; status?: string; startDate?: number; endDate?: number; limit?: number } = {},
): SupplierInvoiceRecord[] {
  const clauses: string[] = [];
  const params: any[] = [];
  if (filters.supplierId) {
    clauses.push('si.supplier_id = ?');
    params.push(filters.supplierId);
  }
  if (filters.status) {
    clauses.push('si.status = ?');
    params.push(filters.status);
  }
  if (filters.startDate !== undefined) {
    clauses.push('si.invoice_date >= ?');
    params.push(filters.startDate);
  }
  if (filters.endDate !== undefined) {
    clauses.push('si.invoice_date <= ?');
    params.push(filters.endDate);
  }
  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  const limit = filters.limit ? `LIMIT ${filters.limit}` : '';
  const rows = db.sqlite
    .prepare(
      `SELECT si.*, s.name AS supplier_name
       FROM supplier_invoices si
       JOIN suppliers s ON s.id = si.supplier_id
       ${where}
       ORDER BY si.invoice_date DESC
       ${limit}`,
    )
    .all(...params) as SupplierInvoiceRow[];
  return rows.map((row) => mapInvoice(row, []));
}

export function paySupplierInvoice(
  db: AppDatabase,
  input: { invoiceId: string; amount: number; description?: string; userId: string },
): SupplierInvoiceRecord {
  const invoice = getSupplierInvoice(db, input.invoiceId);
  if (!invoice) {
    throw new AppError('NOT_FOUND', 'Invoice pemasok tidak ditemukan');
  }
  if (!Number.isInteger(input.amount) || input.amount <= 0) {
    throw new AppError('VALIDATION', 'Nominal pembayaran tidak valid');
  }
  const outstanding = invoice.totalAmount - invoice.paidAmount;
  if (input.amount > outstanding) {
    throw new AppError('VALIDATION', 'Pembayaran melebihi sisa tagihan');
  }

  const now = Date.now();
  const write = db.sqlite.transaction(() => {
    const paidAmount = invoice.paidAmount + input.amount;
    const status = paidAmount >= invoice.totalAmount ? 'paid' : 'partial';
    db.sqlite
      .prepare('UPDATE supplier_invoices SET paid_amount = ?, status = ?, updated_at = ? WHERE id = ?')
      .run(paidAmount, status, now, invoice.id);

    recordSupplierTransaction(db, {
      supplierId: invoice.supplierId,
      transactionType: 'payment',
      amount: -input.amount,
      referenceType: 'supplier_invoice',
      referenceId: invoice.id,
      description: input.description ?? `Pembayaran ${invoice.invoiceNumber}`,
      userId: input.userId,
    });
  });
  write();

  return getSupplierInvoice(db, invoice.id)!;
}

export function getPayablesSummary(db: AppDatabase): { total: number; unpaid: number; overdue: number } {
  const row = db.sqlite
    .prepare(
      `SELECT COALESCE(SUM(total_amount - paid_amount), 0) AS total,
              COALESCE(SUM(CASE WHEN status IN ('unpaid','partial') THEN total_amount - paid_amount ELSE 0 END), 0) AS unpaid
       FROM supplier_invoices`,
    )
    .get() as { total: number; unpaid: number };
  const overdueRow = db.sqlite
    .prepare(
      `SELECT COALESCE(SUM(total_amount - paid_amount), 0) AS overdue
       FROM supplier_invoices
       WHERE status IN ('unpaid','partial') AND due_date IS NOT NULL AND due_date < ?`,
    )
    .get(Date.now()) as { overdue: number };
  return { total: row.total, unpaid: row.unpaid, overdue: overdueRow.overdue };
}
