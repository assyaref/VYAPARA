import { randomUUID } from 'node:crypto';
import type { AppDatabase } from '../db/open';
import { AppError } from '../errors';
import { appendOutboxEvent } from './outbox';

export type StockMovementRecord = {
  id: string;
  productId: string;
  productName: string;
  movementType: string;
  quantityBefore: number;
  quantityChange: number;
  quantityAfter: number;
  referenceType: string | null;
  referenceId: string | null;
  notes: string | null;
  userId: string;
  userName: string;
  createdAt: string;
};

export type StockAdjustmentRecord = {
  id: string;
  productId: string;
  productName: string;
  adjustmentType: string;
  quantity: number;
  reason: string | null;
  referenceNumber: string | null;
  userId: string;
  userName: string;
  approvedById: string | null;
  approvedByName: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type StockOpnameRecord = {
  id: string;
  opnameNumber: string;
  opnameDate: string;
  location: string | null;
  status: string;
  totalItemsCounted: number;
  totalItemsDifference: number;
  userId: string;
  userName: string;
  approvedById: string | null;
  approvedByName: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type StockOpnameItemRecord = {
  id: string;
  opnameId: string;
  productId: string;
  productName: string;
  systemStock: number;
  physicalStock: number;
  difference: number;
  unitId: string | null;
  unitName: string | null;
  notes: string | null;
};

export type ProductInventorySettingsRecord = {
  productId: string;
  productName: string;
  minimumStock: number;
  maximumStock: number | null;
  reorderPoint: number | null;
  isLowStockAlertEnabled: boolean;
  lastRestockDate: string | null;
};

export type LowStockAlert = {
  productId: string;
  productName: string;
  currentStock: number;
  minimumStock: number;
  unitName: string | null;
};

const MOVEMENT_TYPES = ['stock_in', 'stock_out', 'adjustment', 'opname', 'purchase', 'sale', 'return_in', 'return_out'];

export type StockMovementInput = {
  productId: string;
  movementType: string;
  quantityChange: number;
  referenceType?: string;
  referenceId?: string;
  notes?: string;
  userId: string;
  idempotencyKey?: string;
};

export function getCurrentStock(db: AppDatabase, productId: string): number {
  const row = db.sqlite.prepare('SELECT stock FROM products WHERE id = ?').get(productId) as { stock: number } | undefined;
  if (!row) {
    throw new AppError('NOT_FOUND', 'Produk tidak ditemukan');
  }
  return row.stock;
}

/**
 * Transactional core for a single stock movement. Callers that already own a DB transaction
 * (approveStockAdjustment, completeStockOpname, createProduct, updateProduct) invoke this
 * directly so ledger write, stock update and outbox event stay atomic without nesting
 * transactions. Standalone callers use recordStockMovement, which wraps this in a transaction.
 */
export function applyStockMovement(
  db: AppDatabase,
  input: StockMovementInput,
  movementId: string,
  now: string,
): { movementId: string; quantityBefore: number; quantityAfter: number } {
  if (!MOVEMENT_TYPES.includes(input.movementType)) {
    throw new AppError('VALIDATION', 'Tipe pergerakan stok tidak valid');
  }

  const currentStock = getCurrentStock(db, input.productId);
  const quantityAfter = currentStock + input.quantityChange;

  if (quantityAfter < 0 && input.movementType !== 'adjustment') {
    throw new AppError('INSUFFICIENT_STOCK', 'Stok tidak mencukupi');
  }

  db.sqlite
    .prepare(
      `INSERT INTO stock_movements (
        id, product_id, movement_type, quantity_before, quantity_change, quantity_after,
        reference_type, reference_id, notes, user_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      movementId,
      input.productId,
      input.movementType,
      currentStock,
      input.quantityChange,
      quantityAfter,
      input.referenceType ?? null,
      input.referenceId ?? null,
      input.notes ?? null,
      input.userId,
      now,
    );

  db.sqlite
    .prepare('UPDATE products SET stock = ?, updated_at = ? WHERE id = ?')
    .run(quantityAfter, now, input.productId);

  appendOutboxEvent(db, {
    eventType: 'inventory.movement.recorded',
    aggregateType: 'stock_movement',
    aggregateId: movementId,
    idempotencyKey: input.idempotencyKey ?? `stock_movement:${movementId}`,
    payload: {
      movementId,
      productId: input.productId,
      movementType: input.movementType,
      quantityBefore: currentStock,
      quantityChange: input.quantityChange,
      quantityAfter,
      referenceType: input.referenceType ?? null,
      referenceId: input.referenceId ?? null,
      userId: input.userId,
      createdAt: now,
    },
    createdAt: now,
  });

  return { movementId, quantityBefore: currentStock, quantityAfter };
}

export function recordStockMovement(
  db: AppDatabase,
  input: StockMovementInput,
): StockMovementRecord {
  const movementId = randomUUID();
  const now = new Date().toISOString();

  const transaction = db.sqlite.transaction(() => {
    applyStockMovement(db, input, movementId, now);
  });

  transaction();

  const movement = db.sqlite
    .prepare(
      `SELECT sm.*, p.name AS product_name, u.name AS user_name
       FROM stock_movements sm
       JOIN products p ON p.id = sm.product_id
       JOIN users u ON u.id = sm.user_id
       WHERE sm.id = ?`,
    )
    .get(movementId) as any;

  return {
    id: movement.id,
    productId: movement.product_id,
    productName: movement.product_name,
    movementType: movement.movement_type,
    quantityBefore: movement.quantity_before,
    quantityChange: movement.quantity_change,
    quantityAfter: movement.quantity_after,
    referenceType: movement.reference_type,
    referenceId: movement.reference_id,
    notes: movement.notes,
    userId: movement.user_id,
    userName: movement.user_name,
    createdAt: movement.created_at,
  };
}

export function listStockMovements(
  db: AppDatabase,
  query?: { productId?: string; movementType?: string; startDate?: string; endDate?: string; limit?: number },
): StockMovementRecord[] {
  const clauses: string[] = [];
  const params: any[] = [];

  if (query?.productId) {
    clauses.push('sm.product_id = ?');
    params.push(query.productId);
  }
  if (query?.movementType) {
    clauses.push('sm.movement_type = ?');
    params.push(query.movementType);
  }
  if (query?.startDate) {
    clauses.push('sm.created_at >= ?');
    params.push(query.startDate);
  }
  if (query?.endDate) {
    clauses.push('sm.created_at <= ?');
    params.push(query.endDate);
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  const limit = query?.limit ? `LIMIT ${query.limit}` : '';

  const rows = db.sqlite
    .prepare(
      `SELECT sm.*, p.name AS product_name, u.name AS user_name
       FROM stock_movements sm
       JOIN products p ON p.id = sm.product_id
       JOIN users u ON u.id = sm.user_id
       ${where}
       ORDER BY sm.created_at DESC
       ${limit}`,
    )
    .all(...params) as any[];

  return rows.map((row) => ({
    id: row.id,
    productId: row.product_id,
    productName: row.product_name,
    movementType: row.movement_type,
    quantityBefore: row.quantity_before,
    quantityChange: row.quantity_change,
    quantityAfter: row.quantity_after,
    referenceType: row.reference_type,
    referenceId: row.reference_id,
    notes: row.notes,
    userId: row.user_id,
    userName: row.user_name,
    createdAt: row.created_at,
  }));
}

export function createStockAdjustment(
  db: AppDatabase,
  input: {
    productId: string;
    adjustmentType: 'increase' | 'decrease';
    quantity: number;
    reason?: string;
    referenceNumber?: string;
    notes?: string;
    userId: string;
  },
): StockAdjustmentRecord {
  if (input.quantity <= 0) {
    throw new AppError('VALIDATION', 'Jumlah penyesuaian harus lebih dari 0');
  }

  const product = db.sqlite.prepare('SELECT id, name FROM products WHERE id = ?').get(input.productId) as { id: string; name: string } | undefined;
  if (!product) {
    throw new AppError('NOT_FOUND', 'Produk tidak ditemukan');
  }

  const now = new Date().toISOString();
  const adjustmentId = randomUUID();

  db.sqlite
    .prepare(
      `INSERT INTO stock_adjustments (
        id, product_id, adjustment_type, quantity, reason, reference_number,
        user_id, status, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)`,
    )
    .run(
      adjustmentId,
      input.productId,
      input.adjustmentType,
      input.quantity,
      input.reason ?? null,
      input.referenceNumber ?? null,
      input.userId,
      input.notes ?? null,
      now,
      now,
    );

  return getStockAdjustment(db, adjustmentId);
}

export function getStockAdjustment(db: AppDatabase, id: string): StockAdjustmentRecord {
  const row = db.sqlite
    .prepare(
      `SELECT sa.*, p.name AS product_name, u.name AS user_name, ua.name AS approved_by_name
       FROM stock_adjustments sa
       JOIN products p ON p.id = sa.product_id
       JOIN users u ON u.id = sa.user_id
       LEFT JOIN users ua ON ua.id = sa.approved_by_id
       WHERE sa.id = ?`,
    )
    .get(id) as any;

  if (!row) {
    throw new AppError('NOT_FOUND', 'Penyesuaian stok tidak ditemukan');
  }

  return {
    id: row.id,
    productId: row.product_id,
    productName: row.product_name,
    adjustmentType: row.adjustment_type,
    quantity: row.quantity,
    reason: row.reason,
    referenceNumber: row.reference_number,
    userId: row.user_id,
    userName: row.user_name,
    approvedById: row.approved_by_id,
    approvedByName: row.approved_by_name,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function approveStockAdjustment(
  db: AppDatabase,
  input: { adjustmentId: string; approved: boolean; approverId: string; notes?: string },
): StockAdjustmentRecord {
  const adjustment = getStockAdjustment(db, input.adjustmentId);

  if (adjustment.status !== 'pending') {
    throw new AppError('VALIDATION', 'Penyesuaian stok sudah diproses');
  }

  const now = new Date().toISOString();
  const newStatus = input.approved ? 'approved' : 'rejected';

  const movementId = randomUUID();
  const transaction = db.sqlite.transaction(() => {
    db.sqlite
      .prepare(
        `UPDATE stock_adjustments
         SET status = ?, approved_by_id = ?, notes = COALESCE(notes || ' ' || ?, notes, ?), updated_at = ?
         WHERE id = ?`,
      )
      .run(newStatus, input.approverId, input.notes ?? '', input.notes ?? null, now, input.adjustmentId);

    if (input.approved) {
      const quantityChange = adjustment.adjustmentType === 'increase' ? adjustment.quantity : -adjustment.quantity;
      applyStockMovement(db, {
        productId: adjustment.productId,
        movementType: 'adjustment',
        quantityChange,
        referenceType: 'adjustment',
        referenceId: adjustment.id,
        notes: adjustment.reason || undefined,
        userId: input.approverId,
        idempotencyKey: `stock_adjustment:${adjustment.id}`,
      }, movementId, now);
    }
  });

  transaction();

  return getStockAdjustment(db, input.adjustmentId);
}

export function listStockAdjustments(
  db: AppDatabase,
  query?: { status?: string; productId?: string; limit?: number },
): StockAdjustmentRecord[] {
  const clauses: string[] = [];
  const params: any[] = [];

  if (query?.status) {
    clauses.push('sa.status = ?');
    params.push(query.status);
  }
  if (query?.productId) {
    clauses.push('sa.product_id = ?');
    params.push(query.productId);
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  const limit = query?.limit ? `LIMIT ${query.limit}` : '';

  const rows = db.sqlite
    .prepare(
      `SELECT sa.*, p.name AS product_name, u.name AS user_name, ua.name AS approved_by_name
       FROM stock_adjustments sa
       JOIN products p ON p.id = sa.product_id
       JOIN users u ON u.id = sa.user_id
       LEFT JOIN users ua ON ua.id = sa.approved_by_id
       ${where}
       ORDER BY sa.created_at DESC
       ${limit}`,
    )
    .all(...params) as any[];

  return rows.map((row) => ({
    id: row.id,
    productId: row.product_id,
    productName: row.product_name,
    adjustmentType: row.adjustment_type,
    quantity: row.quantity,
    reason: row.reason,
    referenceNumber: row.reference_number,
    userId: row.user_id,
    userName: row.user_name,
    approvedById: row.approved_by_id,
    approvedByName: row.approved_by_name,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export function generateOpnameNumber(db: AppDatabase): string {
  const date = new Date();
  const prefix = `OP${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const row = db.sqlite.prepare("SELECT COUNT(*) AS c FROM stock_opname WHERE opname_number LIKE ?").get(`${prefix}%`) as { c: number };
  return `${prefix}-${String(row.c + 1).padStart(4, '0')}`;
}

export function createStockOpname(
  db: AppDatabase,
  input: { location?: string; notes?: string; userId: string },
): StockOpnameRecord {
  const opnameNumber = generateOpnameNumber(db);
  const opnameDate = new Date().toISOString().split('T')[0];
  const now = new Date().toISOString();
  const opnameId = randomUUID();

  db.sqlite
    .prepare(
      `INSERT INTO stock_opname (
        id, opname_number, opname_date, location, status, user_id, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'draft', ?, ?, ?, ?)`,
    )
    .run(opnameId, opnameNumber, opnameDate, input.location ?? null, input.userId, input.notes ?? null, now, now);

  return getStockOpname(db, opnameId);
}

export function getStockOpname(db: AppDatabase, id: string): StockOpnameRecord {
  const row = db.sqlite
    .prepare(
      `SELECT so.*, u.name AS user_name, ua.name AS approved_by_name
       FROM stock_opname so
       JOIN users u ON u.id = so.user_id
       LEFT JOIN users ua ON ua.id = so.approved_by_id
       WHERE so.id = ?`,
    )
    .get(id) as any;

  if (!row) {
    throw new AppError('NOT_FOUND', 'Stock opname tidak ditemukan');
  }

  return {
    id: row.id,
    opnameNumber: row.opname_number,
    opnameDate: row.opname_date,
    location: row.location,
    status: row.status,
    totalItemsCounted: row.total_items_counted,
    totalItemsDifference: row.total_items_difference,
    userId: row.user_id,
    userName: row.user_name,
    approvedById: row.approved_by_id,
    approvedByName: row.approved_by_name,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function addOpnameItem(
  db: AppDatabase,
  input: { opnameId: string; productId: string; physicalStock: number; notes?: string },
): StockOpnameItemRecord {
  const opname = getStockOpname(db, input.opnameId);
  if (opname.status !== 'draft' && opname.status !== 'in_progress') {
    throw new AppError('VALIDATION', 'Stock opname tidak dapat diubah lagi');
  }

  const product = db.sqlite
    .prepare('SELECT id, name, unit_id FROM products WHERE id = ?')
    .get(input.productId) as { id: string; name: string; unit_id: string | null } | undefined;
  if (!product) {
    throw new AppError('NOT_FOUND', 'Produk tidak ditemukan');
  }

  const existing = db.sqlite
    .prepare('SELECT id FROM stock_opname_items WHERE opname_id = ? AND product_id = ?')
    .get(input.opnameId, input.productId) as { id: string } | undefined;

  const systemStock = getCurrentStock(db, input.productId);
  const itemId = existing?.id || randomUUID();

  if (existing) {
    db.sqlite
      .prepare(
        'UPDATE stock_opname_items SET physical_stock = ?, notes = ? WHERE id = ?',
      )
      .run(input.physicalStock, input.notes ?? null, existing.id);
  } else {
    db.sqlite
      .prepare(
        `INSERT INTO stock_opname_items (id, opname_id, product_id, system_stock, physical_stock, unit_id, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(itemId, input.opnameId, input.productId, systemStock, input.physicalStock, product.unit_id, input.notes ?? null);
  }

  recalculateOpnameStats(db, input.opnameId);

  return getOpnameItem(db, itemId);
}

function getOpnameItem(db: AppDatabase, itemId: string): StockOpnameItemRecord {
  const row = db.sqlite
    .prepare(
      `SELECT soi.*, p.name AS product_name, u.name AS unit_name
       FROM stock_opname_items soi
       JOIN products p ON p.id = soi.product_id
       LEFT JOIN units u ON u.id = soi.unit_id
       WHERE soi.id = ?`,
    )
    .get(itemId) as any;

  return {
    id: row.id,
    opnameId: row.opname_id,
    productId: row.product_id,
    productName: row.product_name,
    systemStock: row.system_stock,
    physicalStock: row.physical_stock,
    difference: row.physical_stock - row.system_stock,
    unitId: row.unit_id,
    unitName: row.unit_name,
    notes: row.notes,
  };
}

function recalculateOpnameStats(db: AppDatabase, opnameId: string): void {
  const stats = db.sqlite
    .prepare(
      `SELECT COUNT(*) AS counted, SUM(ABS(physical_stock - system_stock)) AS diff
       FROM stock_opname_items WHERE opname_id = ?`,
    )
    .get(opnameId) as { counted: number; diff: number | null };

  db.sqlite
    .prepare(
      'UPDATE stock_opname SET total_items_counted = ?, total_items_difference = ?, updated_at = ? WHERE id = ?',
    )
    .run(stats.counted, stats.diff || 0, new Date().toISOString(), opnameId);
}

export function listOpnameItems(db: AppDatabase, opnameId: string): StockOpnameItemRecord[] {
  const rows = db.sqlite
    .prepare(
      `SELECT soi.*, p.name AS product_name, u.name AS unit_name
       FROM stock_opname_items soi
       JOIN products p ON p.id = soi.product_id
       LEFT JOIN units u ON u.id = soi.unit_id
       WHERE soi.opname_id = ?
       ORDER BY p.name COLLATE NOCASE`,
    )
    .all(opnameId) as any[];

  return rows.map((row) => ({
    id: row.id,
    opnameId: row.opname_id,
    productId: row.product_id,
    productName: row.product_name,
    systemStock: row.system_stock,
    physicalStock: row.physical_stock,
    difference: row.physical_stock - row.system_stock,
    unitId: row.unit_id,
    unitName: row.unit_name,
    notes: row.notes,
  }));
}

export function completeStockOpname(db: AppDatabase, input: { opnameId: string; userId: string }): StockOpnameRecord {
  const opname = getStockOpname(db, input.opnameId);
  if (opname.status !== 'draft' && opname.status !== 'in_progress') {
    throw new AppError('VALIDATION', 'Stock opname tidak dapat diselesaikan');
  }

  const items = listOpnameItems(db, input.opnameId);
  const now = new Date().toISOString();
  const movementId = randomUUID();

  const transaction = db.sqlite.transaction(() => {
    db.sqlite
      .prepare('UPDATE stock_opname SET status = ?, updated_at = ? WHERE id = ?')
      .run('completed', now, input.opnameId);

    for (const item of items) {
      const difference = item.physicalStock - item.systemStock;
      if (difference !== 0) {
        applyStockMovement(db, {
          productId: item.productId,
          movementType: 'opname',
          quantityChange: difference,
          referenceType: 'opname',
          referenceId: opname.id,
          notes: `Opname: ${opname.opnameNumber}`,
          userId: input.userId,
          idempotencyKey: `stock_opname:${opname.id}:${item.productId}`,
        }, movementId, now);
      }
    }
  });

  transaction();

  return getStockOpname(db, input.opnameId);
}

export function listStockOpnames(db: AppDatabase, query?: { status?: string; limit?: number }): StockOpnameRecord[] {
  const clauses: string[] = [];
  const params: any[] = [];

  if (query?.status) {
    clauses.push('so.status = ?');
    params.push(query.status);
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  const limit = query?.limit ? `LIMIT ${query.limit}` : '';

  const rows = db.sqlite
    .prepare(
      `SELECT so.*, u.name AS user_name, ua.name AS approved_by_name
       FROM stock_opname so
       JOIN users u ON u.id = so.user_id
       LEFT JOIN users ua ON ua.id = so.approved_by_id
       ${where}
       ORDER BY so.opname_date DESC, so.created_at DESC
       ${limit}`,
    )
    .all(...params) as any[];

  return rows.map((row) => ({
    id: row.id,
    opnameNumber: row.opname_number,
    opnameDate: row.opname_date,
    location: row.location,
    status: row.status,
    totalItemsCounted: row.total_items_counted,
    totalItemsDifference: row.total_items_difference,
    userId: row.user_id,
    userName: row.user_name,
    approvedById: row.approved_by_id,
    approvedByName: row.approved_by_name,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export function upsertProductInventorySettings(
  db: AppDatabase,
  input: { productId: string; minimumStock?: number; maximumStock?: number; reorderPoint?: number; isLowStockAlertEnabled?: boolean },
): ProductInventorySettingsRecord {
  const now = new Date().toISOString();

  const existing = db.sqlite
    .prepare('SELECT product_id FROM product_inventory_settings WHERE product_id = ?')
    .get(input.productId) as { product_id: string } | undefined;

  if (existing) {
    const assignments: string[] = [];
    const params: any[] = [];

    if (input.minimumStock !== undefined) { assignments.push('minimum_stock = ?'); params.push(input.minimumStock); }
    if (input.maximumStock !== undefined) { assignments.push('maximum_stock = ?'); params.push(input.maximumStock); }
    if (input.reorderPoint !== undefined) { assignments.push('reorder_point = ?'); params.push(input.reorderPoint); }
    if (input.isLowStockAlertEnabled !== undefined) { assignments.push('is_low_stock_alert_enabled = ?'); params.push(input.isLowStockAlertEnabled ? 1 : 0); }
    assignments.push('updated_at = ?'); params.push(now);
    params.push(input.productId);

    db.sqlite
      .prepare(`UPDATE product_inventory_settings SET ${assignments.join(', ')} WHERE product_id = ?`)
      .run(...params);
  } else {
    db.sqlite
      .prepare(
        `INSERT INTO product_inventory_settings (product_id, minimum_stock, maximum_stock, reorder_point, is_low_stock_alert_enabled, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        input.productId,
        input.minimumStock ?? 0,
        input.maximumStock ?? null,
        input.reorderPoint ?? null,
        input.isLowStockAlertEnabled !== false ? 1 : 0,
        now,
        now,
      );
  }

  return getProductInventorySettings(db, input.productId);
}

export function getProductInventorySettings(db: AppDatabase, productId: string): ProductInventorySettingsRecord {
  const row = db.sqlite
    .prepare(
      `SELECT pis.*, p.name AS product_name
       FROM product_inventory_settings pis
       JOIN products p ON p.id = pis.product_id
       WHERE pis.product_id = ?`,
    )
    .get(productId) as any;

  if (!row) {
    return {
      productId,
      productName: '',
      minimumStock: 0,
      maximumStock: null,
      reorderPoint: null,
      isLowStockAlertEnabled: true,
      lastRestockDate: null,
    };
  }

  return {
    productId: row.product_id,
    productName: row.product_name,
    minimumStock: row.minimum_stock,
    maximumStock: row.maximum_stock,
    reorderPoint: row.reorder_point,
    isLowStockAlertEnabled: row.is_low_stock_alert_enabled === 1,
    lastRestockDate: row.last_restock_date,
  };
}

export function getLowStockAlerts(db: AppDatabase): LowStockAlert[] {
  const rows = db.sqlite
    .prepare(
      `SELECT p.id AS product_id, p.name AS product_name, p.stock AS current_stock,
              COALESCE(pis.minimum_stock, 0) AS minimum_stock, u.name AS unit_name
       FROM products p
       LEFT JOIN product_inventory_settings pis ON pis.product_id = p.id
       LEFT JOIN units u ON u.id = p.unit_id
       WHERE p.is_active = 1
         AND (pis.is_low_stock_alert_enabled = 1 OR pis.is_low_stock_alert_enabled IS NULL)
         AND p.stock <= COALESCE(pis.minimum_stock, 0)
       ORDER BY p.stock ASC, p.name COLLATE NOCASE`,
    )
    .all() as any[];

  return rows.map((row) => ({
    productId: row.product_id,
    productName: row.product_name,
    currentStock: row.current_stock,
    minimumStock: row.minimum_stock,
    unitName: row.unit_name,
  }));
}

export function getInventoryValuation(db: AppDatabase): { totalItems: number; totalCostValue: number; totalRetailValue: number } {
  const row = db.sqlite
    .prepare(
      `SELECT COUNT(*) AS total_items, SUM(p.stock) AS total_quantity, SUM(p.stock * p.cost) AS total_cost_value, SUM(p.stock * p.price) AS total_retail_value
       FROM products p WHERE p.is_active = 1`,
    )
    .get() as any;

  return {
    totalItems: row.total_items || 0,
    totalCostValue: row.total_cost_value || 0,
    totalRetailValue: row.total_retail_value || 0,
  };
}