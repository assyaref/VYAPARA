import { randomUUID } from 'node:crypto';
import type { AppDatabase } from '../db/open';
import { AppError } from '../errors';
import { recordSupplierTransaction } from './supplier';
import { recordStockMovement } from './inventory';

export type PurchaseOrderRecord = {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  userId: string;
  userName: string;
  status: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  notes: string | null;
  createdAt: number;
  updatedAt: number;
  items: PurchaseOrderItemRecord[];
};

export type PurchaseOrderItemRecord = {
  id: string;
  purchaseOrderId: string;
  productId: string;
  productName: string;
  quantityOrdered: number;
  quantityReceived: number;
  unitPrice: number;
  subtotal: number;
  notes: string | null;
};

export type GoodsReceivingRecord = {
  id: string;
  receivingNumber: string;
  purchaseOrderId: string;
  poNumber: string;
  userId: string;
  userName: string;
  receivedAt: number;
  notes: string | null;
  items: GoodsReceivingItemRecord[];
};

export type GoodsReceivingItemRecord = {
  id: string;
  goodsReceivingId: string;
  purchaseOrderItemId: string | null;
  productId: string;
  productName: string;
  quantityReceived: number;
};

export type PurchaseReturnRecord = {
  id: string;
  returnNumber: string;
  purchaseOrderId: string | null;
  goodsReceivingId: string | null;
  userId: string;
  userName: string;
  returnDate: number;
  notes: string | null;
  items: PurchaseReturnItemRecord[];
};

export type PurchaseReturnItemRecord = {
  id: string;
  purchaseReturnId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
};

type PoRow = {
  id: string;
  po_number: string;
  supplier_id: string;
  user_id: string;
  status: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  notes: string | null;
  created_at: number;
  updated_at: number;
  supplier_name: string;
  user_name: string;
};

type PoItemRow = {
  id: string;
  purchase_order_id: string;
  product_id: string;
  product_name: string;
  quantity_ordered: number;
  quantity_received: number;
  unit_price: number;
  subtotal: number;
  notes: string | null;
};

type GrRow = {
  id: string;
  receiving_number: string;
  purchase_order_id: string;
  user_id: string;
  received_at: number;
  notes: string | null;
  po_number: string;
  user_name: string;
};

type GrItemRow = {
  id: string;
  goods_receiving_id: string;
  purchase_order_item_id: string | null;
  product_id: string;
  quantity_received: number;
  product_name: string;
};

type PrRow = {
  id: string;
  return_number: string;
  purchase_order_id: string | null;
  goods_receiving_id: string | null;
  user_id: string;
  return_date: number;
  notes: string | null;
  user_name: string;
};

type PrItemRow = {
  id: string;
  purchase_return_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  product_name: string;
};

function poNumber(db: AppDatabase): string {
  const date = new Date();
  const prefix = `PO${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const row = db.sqlite.prepare("SELECT COUNT(*) AS c FROM purchase_orders WHERE po_number LIKE ?").get(`${prefix}%`) as { c: number };
  return `${prefix}-${String(row.c + 1).padStart(4, '0')}`;
}

function receivingNumber(db: AppDatabase): string {
  const date = new Date();
  const prefix = `GR${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const row = db.sqlite.prepare("SELECT COUNT(*) AS c FROM goods_receiving WHERE receiving_number LIKE ?").get(`${prefix}%`) as { c: number };
  return `${prefix}-${String(row.c + 1).padStart(4, '0')}`;
}

function returnNumber(db: AppDatabase): string {
  const date = new Date();
  const prefix = `PR${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const row = db.sqlite.prepare("SELECT COUNT(*) AS c FROM purchase_returns WHERE return_number LIKE ?").get(`${prefix}%`) as { c: number };
  return `${prefix}-${String(row.c + 1).padStart(4, '0')}`;
}

export function createPurchaseOrder(
  db: AppDatabase,
  input: {
    supplierId: string;
    items: { productId: string; quantity: number; unitPrice: number }[];
    notes?: string;
    userId: string;
  },
): PurchaseOrderRecord {
  const supplier = db.sqlite.prepare('SELECT id, name FROM suppliers WHERE id = ?').get(input.supplierId) as { id: string; name: string } | undefined;
  if (!supplier) {
    throw new AppError('NOT_FOUND', 'Pemasok tidak ditemukan');
  }
  if (input.items.length === 0) {
    throw new AppError('VALIDATION', 'Minimal satu item purchase order wajib diisi');
  }
  for (const item of input.items) {
    if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
      throw new AppError('VALIDATION', 'Kuantitas purchase order tidak valid');
    }
    if (!Number.isInteger(item.unitPrice) || item.unitPrice < 0) {
      throw new AppError('VALIDATION', 'Harga purchase order tidak valid');
    }
  }

  const now = Date.now();
  const id = randomUUID();
  const number = poNumber(db);

  let subtotal = 0;
  for (const item of input.items) {
    const product = db.sqlite.prepare('SELECT id, name FROM products WHERE id = ?').get(item.productId) as { id: string; name: string } | undefined;
    if (!product) {
      throw new AppError('NOT_FOUND', `Produk ${item.productId} tidak ditemukan`);
    }
    subtotal += Math.round(item.quantity * item.unitPrice);
  }

  const taxAmount = 0;
  const totalAmount = subtotal + taxAmount;

  const write = db.sqlite.transaction(() => {
    db.sqlite
      .prepare(
        `INSERT INTO purchase_orders (
          id, po_number, supplier_id, user_id, status, subtotal, tax_amount,
          total_amount, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        number,
        input.supplierId,
        input.userId,
        subtotal,
        taxAmount,
        totalAmount,
        input.notes ?? null,
        now,
        now,
      );

    const insertItem = db.sqlite.prepare(
      `INSERT INTO purchase_order_items (
        id, purchase_order_id, product_id, product_name, quantity_ordered,
        quantity_received, unit_price, subtotal, notes
      ) VALUES (?, ?, ?, ?, ?, 0, ?, 0, ?)`,
    );
    for (const item of input.items) {
      const product = db.sqlite.prepare('SELECT name FROM products WHERE id = ?').get(item.productId) as { name: string } | undefined;
      const itemSubtotal = Math.round(item.quantity * item.unitPrice);
      insertItem.run(
        randomUUID(),
        id,
        item.productId,
        product!.name,
        item.quantity,
        item.unitPrice,
        null,
      );
    }
  });
  write();

  return getPurchaseOrder(db, id)!;
}

export function getPurchaseOrder(db: AppDatabase, id: string): PurchaseOrderRecord | undefined {
  const row = db.sqlite
    .prepare(
      `SELECT po.*, s.name AS supplier_name, u.name AS user_name
       FROM purchase_orders po
       JOIN suppliers s ON s.id = po.supplier_id
       JOIN users u ON u.id = po.user_id
       WHERE po.id = ?`,
    )
    .get(id) as PoRow | undefined;
  if (!row) {
    return undefined;
  }
  const items = db.sqlite
    .prepare(
      `SELECT id, purchase_order_id, product_id, product_name, quantity_ordered,
              quantity_received, unit_price, subtotal, notes
       FROM purchase_order_items WHERE purchase_order_id = ? ORDER BY rowid`,
    )
    .all(id) as PoItemRow[];
  return {
    id: row.id,
    poNumber: row.po_number,
    supplierId: row.supplier_id,
    supplierName: row.supplier_name,
    userId: row.user_id,
    userName: row.user_name,
    status: row.status,
    subtotal: row.subtotal,
    taxAmount: row.tax_amount,
    totalAmount: row.total_amount,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    items: items.map((it) => ({
      id: it.id,
      purchaseOrderId: it.purchase_order_id,
      productId: it.product_id,
      productName: it.product_name,
      quantityOrdered: it.quantity_ordered,
      quantityReceived: it.quantity_received,
      unitPrice: it.unit_price,
      subtotal: it.subtotal,
      notes: it.notes,
    })),
  };
}

export function listPurchaseOrders(
  db: AppDatabase,
  filters: { status?: string; supplierId?: string; startDate?: number; endDate?: number; limit?: number } = {},
): PurchaseOrderRecord[] {
  const clauses: string[] = [];
  const params: any[] = [];
  if (filters.status) {
    clauses.push('po.status = ?');
    params.push(filters.status);
  }
  if (filters.supplierId) {
    clauses.push('po.supplier_id = ?');
    params.push(filters.supplierId);
  }
  if (filters.startDate !== undefined) {
    clauses.push('po.created_at >= ?');
    params.push(filters.startDate);
  }
  if (filters.endDate !== undefined) {
    clauses.push('po.created_at <= ?');
    params.push(filters.endDate);
  }
  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  const limit = filters.limit ? `LIMIT ${filters.limit}` : '';

  const rows = db.sqlite
    .prepare(
      `SELECT po.*, s.name AS supplier_name, u.name AS user_name
       FROM purchase_orders po
       JOIN suppliers s ON s.id = po.supplier_id
       JOIN users u ON u.id = po.user_id
       ${where}
       ORDER BY po.created_at DESC
       ${limit}`,
    )
    .all(...params) as PoRow[];

  return rows.map((row) => ({
    id: row.id,
    poNumber: row.po_number,
    supplierId: row.supplier_id,
    supplierName: row.supplier_name,
    userId: row.user_id,
    userName: row.user_name,
    status: row.status,
    subtotal: row.subtotal,
    taxAmount: row.tax_amount,
    totalAmount: row.total_amount,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    items: [],
  }));
}

export function updatePurchaseOrderStatus(
  db: AppDatabase,
  id: string,
  status: string,
): PurchaseOrderRecord | undefined {
  const existing = getPurchaseOrder(db, id);
  if (!existing) {
    return undefined;
  }
  if (existing.status === 'cancelled') {
    throw new AppError('VALIDATION', 'Purchase order sudah dibatalkan');
  }
  const now = Date.now();
  db.sqlite
    .prepare('UPDATE purchase_orders SET status = ?, updated_at = ? WHERE id = ?')
    .run(status, now, id);
  return getPurchaseOrder(db, id);
}

export function cancelPurchaseOrder(db: AppDatabase, id: string): PurchaseOrderRecord | undefined {
  return updatePurchaseOrderStatus(db, id, 'cancelled');
}

export function receiveGoods(
  db: AppDatabase,
  input: {
    purchaseOrderId: string;
    items: { purchaseOrderItemId?: string; productId: string; quantity: number }[];
    notes?: string;
    idempotencyKey?: string;
    userId: string;
  },
): GoodsReceivingRecord {
  const po = getPurchaseOrder(db, input.purchaseOrderId);
  if (!po) {
    throw new AppError('NOT_FOUND', 'Purchase order tidak ditemukan');
  }
  if (po.status === 'cancelled') {
    throw new AppError('VALIDATION', 'Purchase order sudah dibatalkan');
  }
  if (po.status === 'received') {
    throw new AppError('VALIDATION', 'Purchase order sudah diterima seluruhnya');
  }
  if (input.items.length === 0) {
    throw new AppError('VALIDATION', 'Minimal satu item penerimaan wajib diisi');
  }
  for (const item of input.items) {
    if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
      throw new AppError('VALIDATION', 'Kuantitas penerimaan tidak valid');
    }
  }

  if (input.idempotencyKey) {
    const existing = db.sqlite
      .prepare('SELECT id FROM goods_receiving WHERE idempotency_key = ?')
      .get(input.idempotencyKey) as { id: string } | undefined;
    if (existing) {
      return getGoodsReceiving(db, existing.id)!;
    }
  }

  const now = Date.now();
  const grId = randomUUID();
  const number = receivingNumber(db);

  const write = db.sqlite.transaction(() => {
    db.sqlite
      .prepare(
        `INSERT INTO goods_receiving (
          id, receiving_number, purchase_order_id, user_id, received_at, notes, idempotency_key
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        grId,
        number,
        input.purchaseOrderId,
        input.userId,
        now,
        input.notes ?? null,
        input.idempotencyKey ?? null,
      );

    let poSubtotalIncrease = 0;
    for (const item of input.items) {
      const poItem = item.purchaseOrderItemId
        ? (db.sqlite
            .prepare(
              `SELECT id, product_id, product_name, quantity_ordered, quantity_received, unit_price
               FROM purchase_order_items WHERE id = ? AND purchase_order_id = ?`,
            )
            .get(item.purchaseOrderItemId, input.purchaseOrderId) as
            | { id: string; product_id: string; product_name: string; quantity_ordered: number; quantity_received: number; unit_price: number }
            | undefined)
        : (db.sqlite
            .prepare(
              `SELECT id, product_id, product_name, quantity_ordered, quantity_received, unit_price
               FROM purchase_order_items
               WHERE purchase_order_id = ? AND product_id = ? AND quantity_received < quantity_ordered
               ORDER BY rowid LIMIT 1`,
            )
            .get(input.purchaseOrderId, item.productId) as
            | { id: string; product_id: string; product_name: string; quantity_ordered: number; quantity_received: number; unit_price: number }
            | undefined);

      if (!poItem) {
        throw new AppError('NOT_FOUND', 'Item purchase order tidak ditemukan');
      }
      if (poItem.product_id !== item.productId) {
        throw new AppError('VALIDATION', 'Produk penerimaan tidak sesuai dengan purchase order');
      }

      const newReceived = poItem.quantity_received + item.quantity;
      if (newReceived > poItem.quantity_ordered) {
        throw new AppError('VALIDATION', `Terima melebihi kuantitas pesanan untuk ${poItem.product_name}`);
      }

      const grItemId = randomUUID();
      db.sqlite
        .prepare(
          `INSERT INTO goods_receiving_items (
            id, goods_receiving_id, purchase_order_item_id, product_id, quantity_received
          ) VALUES (?, ?, ?, ?, ?)`,
        )
        .run(grItemId, grId, poItem.id, poItem.product_id, item.quantity);

      db.sqlite
        .prepare(`UPDATE purchase_order_items SET quantity_received = ? WHERE id = ?`)
        .run(newReceived, poItem.id);

      poSubtotalIncrease += item.quantity * poItem.unit_price;

      recordStockMovement(db, {
        productId: poItem.product_id,
        movementType: 'purchase',
        quantityChange: item.quantity,
        referenceType: 'goods_receiving',
        referenceId: grId,
        notes: `Penerimaan barang ${number}`,
        userId: input.userId,
      });
    }

    const receivedCount = db.sqlite
      .prepare(
        `SELECT COUNT(*) AS c FROM purchase_order_items WHERE purchase_order_id = ? AND quantity_received < quantity_ordered`,
      )
      .get(input.purchaseOrderId) as { c: number };
    const newStatus = receivedCount.c === 0 ? 'received' : 'partially_received';
    db.sqlite
      .prepare('UPDATE purchase_orders SET status = ?, updated_at = ? WHERE id = ?')
      .run(newStatus, now, input.purchaseOrderId);

    const payableIncrease = Math.round(poSubtotalIncrease);
    recordSupplierTransaction(db, {
      supplierId: po.supplierId,
      transactionType: 'purchase',
      amount: payableIncrease,
      referenceType: 'goods_receiving',
      referenceId: grId,
      description: `Pembelian ${number}`,
      userId: input.userId,
    });
  });
  write();

  return getGoodsReceiving(db, grId)!;
}

export function getGoodsReceiving(db: AppDatabase, id: string): GoodsReceivingRecord | undefined {
  const row = db.sqlite
    .prepare(
      `SELECT gr.*, po.po_number, u.name AS user_name
       FROM goods_receiving gr
       JOIN purchase_orders po ON po.id = gr.purchase_order_id
       JOIN users u ON u.id = gr.user_id
       WHERE gr.id = ?`,
    )
    .get(id) as GrRow | undefined;
  if (!row) {
    return undefined;
  }
  const items = db.sqlite
    .prepare(
      `SELECT gri.*, p.name AS product_name
       FROM goods_receiving_items gri
       JOIN products p ON p.id = gri.product_id
       WHERE gri.goods_receiving_id = ? ORDER BY rowid`,
    )
    .all(id) as GrItemRow[];
  return {
    id: row.id,
    receivingNumber: row.receiving_number,
    purchaseOrderId: row.purchase_order_id,
    poNumber: row.po_number,
    userId: row.user_id,
    userName: row.user_name,
    receivedAt: row.received_at,
    notes: row.notes,
    items: items.map((it) => ({
      id: it.id,
      goodsReceivingId: it.goods_receiving_id,
      purchaseOrderItemId: it.purchase_order_item_id,
      productId: it.product_id,
      productName: it.product_name,
      quantityReceived: it.quantity_received,
    })),
  };
}

export function listGoodsReceiving(
  db: AppDatabase,
  filters: { purchaseOrderId?: string; limit?: number } = {},
): GoodsReceivingRecord[] {
  const clauses: string[] = [];
  const params: any[] = [];
  if (filters.purchaseOrderId) {
    clauses.push('gr.purchase_order_id = ?');
    params.push(filters.purchaseOrderId);
  }
  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  const limit = filters.limit ? `LIMIT ${filters.limit}` : '';

  const rows = db.sqlite
    .prepare(
      `SELECT gr.*, po.po_number, u.name AS user_name
       FROM goods_receiving gr
       JOIN purchase_orders po ON po.id = gr.purchase_order_id
       JOIN users u ON u.id = gr.user_id
       ${where}
       ORDER BY gr.received_at DESC
       ${limit}`,
    )
    .all(...params) as GrRow[];

  return rows.map((row) => ({
    id: row.id,
    receivingNumber: row.receiving_number,
    purchaseOrderId: row.purchase_order_id,
    poNumber: row.po_number,
    userId: row.user_id,
    userName: row.user_name,
    receivedAt: row.received_at,
    notes: row.notes,
    items: [],
  }));
}

export function createPurchaseReturn(
  db: AppDatabase,
  input: {
    purchaseOrderId?: string;
    goodsReceivingId?: string;
    items: { productId: string; quantity: number; unitPrice: number }[];
    notes?: string;
    userId: string;
  },
): PurchaseReturnRecord {
  if (input.goodsReceivingId) {
    const gr = getGoodsReceiving(db, input.goodsReceivingId);
    if (!gr) {
      throw new AppError('NOT_FOUND', 'Penerimaan barang tidak ditemukan');
    }
    input.purchaseOrderId = gr.purchaseOrderId;
  } else if (input.purchaseOrderId) {
    const po = getPurchaseOrder(db, input.purchaseOrderId);
    if (!po) {
      throw new AppError('NOT_FOUND', 'Purchase order tidak ditemukan');
    }
  } else {
    throw new AppError('VALIDATION', 'Purchase order atau penerimaan barang wajib diisi');
  }

  if (input.items.length === 0) {
    throw new AppError('VALIDATION', 'Minimal satu item retur wajib diisi');
  }

  if (input.purchaseOrderId) {
    const alreadyReturned = new Map<string, number>();
    const returnedRows = db.sqlite
      .prepare(
        `SELECT pri.product_id AS product_id, COALESCE(SUM(pri.quantity), 0) AS quantity
         FROM purchase_return_items pri
         JOIN purchase_returns pr ON pr.id = pri.purchase_return_id
         WHERE pr.purchase_order_id = ?
         GROUP BY pri.product_id`,
      )
      .all(input.purchaseOrderId) as { product_id: string; quantity: number }[];
    for (const row of returnedRows) {
      alreadyReturned.set(row.product_id, row.quantity);
    }

    const receivedRows = db.sqlite
      .prepare(
        `SELECT product_id, COALESCE(SUM(quantity_received), 0) AS quantity
         FROM purchase_order_items
         WHERE purchase_order_id = ?
         GROUP BY product_id`,
      )
      .all(input.purchaseOrderId) as { product_id: string; quantity: number }[];
    const receivedByProduct = new Map(receivedRows.map((row) => [row.product_id, row.quantity]));

    for (const item of input.items) {
      if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
        throw new AppError('VALIDATION', 'Kuantitas retur tidak valid');
      }
      if (!Number.isInteger(item.unitPrice) || item.unitPrice < 0) {
        throw new AppError('VALIDATION', 'Harga retur tidak valid');
      }
      const available =
        (receivedByProduct.get(item.productId) ?? 0) - (alreadyReturned.get(item.productId) ?? 0);
      if (item.quantity > available) {
        throw new AppError('VALIDATION', 'Kuantitas retur melebihi jumlah yang diterima');
      }
    }
  }

  const now = Date.now();
  const prId = randomUUID();
  const number = returnNumber(db);

  const write = db.sqlite.transaction(() => {
    db.sqlite
      .prepare(
        `INSERT INTO purchase_returns (
          id, return_number, purchase_order_id, goods_receiving_id, user_id, return_date, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(prId, number, input.purchaseOrderId, input.goodsReceivingId ?? null, input.userId, now, input.notes ?? null);

    let returnSubtotal = 0;
    for (const item of input.items) {
      const product = db.sqlite.prepare('SELECT name FROM products WHERE id = ?').get(item.productId) as { name: string } | undefined;
      if (!product) {
        throw new AppError('NOT_FOUND', `Produk ${item.productId} tidak ditemukan`);
      }
      const subtotal = Math.round(item.quantity * item.unitPrice);
      returnSubtotal += subtotal;

      db.sqlite
        .prepare(
          `INSERT INTO purchase_return_items (
            id, purchase_return_id, product_id, quantity, unit_price, subtotal
          ) VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .run(randomUUID(), prId, item.productId, item.quantity, item.unitPrice, subtotal);

      recordStockMovement(db, {
        productId: item.productId,
        movementType: 'return_in',
        quantityChange: -item.quantity,
        referenceType: 'purchase_return',
        referenceId: prId,
        notes: `Retur pembelian ${number}`,
        userId: input.userId,
      });
    }

    const po = input.purchaseOrderId ? getPurchaseOrder(db, input.purchaseOrderId) : undefined;
    if (po) {
      const payableDecrease = -Math.round(returnSubtotal);
      recordSupplierTransaction(db, {
        supplierId: po.supplierId,
        transactionType: 'return',
        amount: payableDecrease,
        referenceType: 'purchase_return',
        referenceId: prId,
        description: `Retur pembelian ${number}`,
        userId: input.userId,
      });
    }
  });
  write();

  return getPurchaseReturn(db, prId)!;
}

export function getPurchaseReturn(db: AppDatabase, id: string): PurchaseReturnRecord | undefined {
  const row = db.sqlite
    .prepare(
      `SELECT pr.*, u.name AS user_name
       FROM purchase_returns pr
       JOIN users u ON u.id = pr.user_id
       WHERE pr.id = ?`,
    )
    .get(id) as PrRow | undefined;
  if (!row) {
    return undefined;
  }
  const items = db.sqlite
    .prepare(
      `SELECT pri.*, p.name AS product_name
       FROM purchase_return_items pri
       JOIN products p ON p.id = pri.product_id
       WHERE pri.purchase_return_id = ? ORDER BY rowid`,
    )
    .all(id) as PrItemRow[];
  return {
    id: row.id,
    returnNumber: row.return_number,
    purchaseOrderId: row.purchase_order_id,
    goodsReceivingId: row.goods_receiving_id,
    userId: row.user_id,
    userName: row.user_name,
    returnDate: row.return_date,
    notes: row.notes,
    items: items.map((it) => ({
      id: it.id,
      purchaseReturnId: it.purchase_return_id,
      productId: it.product_id,
      productName: it.product_name,
      quantity: it.quantity,
      unitPrice: it.unit_price,
      subtotal: it.subtotal,
    })),
  };
}

export function listPurchaseReturns(
  db: AppDatabase,
  filters: { purchaseOrderId?: string; limit?: number } = {},
): PurchaseReturnRecord[] {
  const clauses: string[] = [];
  const params: any[] = [];
  if (filters.purchaseOrderId) {
    clauses.push('pr.purchase_order_id = ?');
    params.push(filters.purchaseOrderId);
  }
  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  const limit = filters.limit ? `LIMIT ${filters.limit}` : '';

  const rows = db.sqlite
    .prepare(
      `SELECT pr.*, u.name AS user_name
       FROM purchase_returns pr
       JOIN users u ON u.id = pr.user_id
       ${where}
       ORDER BY pr.return_date DESC
       ${limit}`,
    )
    .all(...params) as PrRow[];

  return rows.map((row) => ({
    id: row.id,
    returnNumber: row.return_number,
    purchaseOrderId: row.purchase_order_id,
    goodsReceivingId: row.goods_receiving_id,
    userId: row.user_id,
    userName: row.user_name,
    returnDate: row.return_date,
    notes: row.notes,
    items: [],
  }));
}

export function getPurchaseHistory(db: AppDatabase, limit = 200): PurchaseOrderRecord[] {
  return listPurchaseOrders(db, { limit });
}
