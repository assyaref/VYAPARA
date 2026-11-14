import { index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

/** Typed mirror of drizzle/001-initial.sql and drizzle/002-auth-pos.sql. SQL files are applied; this module is not a second migrator. */

export const users = sqliteTable(
  'users',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    password: text('password').notNull(),
    roleId: text('role_id'),
    mustChangePassword: integer('must_change_password').notNull().default(0),
    createdAt: text('created_at'),
    updatedAt: text('updated_at'),
  },
  (table) => [index('idx_users_email').on(table.email), index('idx_users_role_id').on(table.roleId)],
);

export const roles = sqliteTable('roles', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
  createdAt: text('created_at'),
});

export const permissions = sqliteTable('permissions', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
});

export const rolePermissions = sqliteTable('role_permissions', {
  id: text('id').primaryKey(),
  roleId: text('role_id').notNull(),
  permissionId: text('permission_id').notNull(),
});

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  parentId: text('parent_id'),
  createdAt: text('created_at'),
});

export const units = sqliteTable('units', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  symbol: text('symbol'),
  createdAt: text('created_at'),
});

export const products = sqliteTable('products', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  categoryId: text('category_id'),
  unitId: text('unit_id'),
  barcode: text('barcode'),
  sku: text('sku'),
  price: real('price').notNull().default(0),
  cost: real('cost').notNull().default(0),
  stock: real('stock').notNull().default(0),
  isActive: integer('is_active').notNull().default(1),
  createdAt: text('created_at'),
  updatedAt: text('updated_at'),
});

export const transactions = sqliteTable(
  'transactions',
  {
    id: text('id').primaryKey(),
    transactionNumber: text('transaction_number').notNull().unique(),
    userId: text('user_id').notNull(),
    subtotal: real('subtotal').notNull().default(0),
    discountAmount: real('discount_amount').notNull().default(0),
    taxAmount: real('tax_amount').notNull().default(0),
    totalAmount: real('total_amount').notNull().default(0),
    paymentAmount: real('payment_amount').notNull().default(0),
    changeAmount: real('change_amount').notNull().default(0),
    paymentMethod: text('payment_method').notNull(),
    paymentsJson: text('payments_json'),
    status: text('status').notNull().default('completed'),
    notes: text('notes'),
    idempotencyKey: text('idempotency_key'),
    createdAt: text('created_at'),
  },
  (table) => [uniqueIndex('idx_transactions_idempotency').on(table.idempotencyKey)],
);

export const transactionItems = sqliteTable('transaction_items', {
  id: text('id').primaryKey(),
  transactionId: text('transaction_id').notNull(),
  productId: text('product_id'),
  productName: text('product_name'),
  serviceType: text('service_type'),
  quantity: real('quantity').notNull().default(1),
  price: real('price').notNull().default(0),
  cost: real('cost').notNull().default(0),
  discountAmount: real('discount_amount').notNull().default(0),
  subtotal: real('subtotal').notNull().default(0),
  notes: text('notes'),
});

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at'),
  revokedAt: text('revoked_at'),
});

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: text('updated_at'),
});

export const migrations = sqliteTable('_migrations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  appliedAt: text('applied_at'),
});

export const stockMovements = sqliteTable('stock_movements', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull(),
  movementType: text('movement_type').notNull(),
  quantityBefore: real('quantity_before').notNull().default(0),
  quantityChange: real('quantity_change').notNull(),
  quantityAfter: real('quantity_after').notNull().default(0),
  referenceType: text('reference_type'),
  referenceId: text('reference_id'),
  notes: text('notes'),
  userId: text('user_id').notNull(),
  createdAt: text('created_at'),
});

export const stockAdjustments = sqliteTable('stock_adjustments', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull(),
  adjustmentType: text('adjustment_type').notNull(),
  quantity: real('quantity').notNull(),
  reason: text('reason'),
  referenceNumber: text('reference_number'),
  userId: text('user_id').notNull(),
  approvedById: text('approved_by_id'),
  status: text('status').default('pending'),
  notes: text('notes'),
  createdAt: text('created_at'),
  updatedAt: text('updated_at'),
});

export const stockOpname = sqliteTable('stock_opname', {
  id: text('id').primaryKey(),
  opnameNumber: text('opname_number').notNull().unique(),
  opnameDate: text('opname_date').notNull(),
  location: text('location'),
  status: text('status').default('draft'),
  totalItemsCounted: integer('total_items_counted').default(0),
  totalItemsDifference: integer('total_items_difference').default(0),
  userId: text('user_id').notNull(),
  approvedById: text('approved_by_id'),
  notes: text('notes'),
  createdAt: text('created_at'),
  updatedAt: text('updated_at'),
});

export const stockOpnameItems = sqliteTable('stock_opname_items', {
  id: text('id').primaryKey(),
  opnameId: text('opname_id').notNull(),
  productId: text('product_id').notNull(),
  systemStock: real('system_stock').notNull().default(0),
  physicalStock: real('physical_stock').notNull().default(0),
  unitId: text('unit_id'),
  notes: text('notes'),
  createdAt: text('created_at'),
});

export const productInventorySettings = sqliteTable('product_inventory_settings', {
  productId: text('product_id').primaryKey(),
  minimumStock: real('minimum_stock').notNull().default(0),
  maximumStock: real('maximum_stock'),
  reorderPoint: real('reorder_point'),
  isLowStockAlertEnabled: integer('is_low_stock_alert_enabled').default(1),
  lastRestockDate: text('last_restock_date'),
  createdAt: text('created_at'),
  updatedAt: text('updated_at'),
});

export const inventoryValuation = sqliteTable('inventory_valuation', {
  id: text('id').primaryKey(),
  valuationDate: text('valuation_date').notNull(),
  totalItems: integer('total_items').notNull().default(0),
  totalCostValue: real('total_cost_value').notNull().default(0),
  totalRetailValue: real('total_retail_value').notNull().default(0),
  method: text('method').default('fifo'),
  userId: text('user_id').notNull(),
  notes: text('notes'),
  createdAt: text('created_at'),
});

export const inventoryValuationItems = sqliteTable('inventory_valuation_items', {
  id: text('id').primaryKey(),
  valuationId: text('valuation_id').notNull(),
  productId: text('product_id').notNull(),
  quantity: real('quantity').notNull().default(0),
  unitCost: real('unit_cost').notNull().default(0),
  unitRetail: real('unit_retail').notNull().default(0),
  createdAt: text('created_at'),
});

export const suppliers = sqliteTable('suppliers', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  contactPerson: text('contact_person'),
  phone: text('phone'),
  email: text('email'),
  address: text('address'),
  city: text('city'),
  postalCode: text('postal_code'),
  country: text('country'),
  taxId: text('tax_id'),
  paymentTerms: integer('payment_terms').default(0),
  creditLimit: integer('credit_limit').default(0),
  balance: integer('balance').default(0),
  status: text('status').default('active'),
  notes: text('notes'),
  createdAt: text('created_at'),
  updatedAt: text('updated_at'),
  createdBy: text('created_by'),
});

export const supplierTransactions = sqliteTable('supplier_transactions', {
  id: text('id').primaryKey(),
  supplierId: text('supplier_id').notNull(),
  transactionType: text('transaction_type').notNull(),
  referenceType: text('reference_type'),
  referenceId: text('reference_id'),
  amount: integer('amount').notNull(),
  balanceAfter: integer('balance_after').notNull(),
  description: text('description'),
  transactionDate: text('transaction_date').notNull(),
  createdAt: text('created_at'),
  createdBy: text('created_by'),
});

export const customers = sqliteTable('customers', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  contactPerson: text('contact_person'),
  phone: text('phone'),
  email: text('email'),
  address: text('address'),
  city: text('city'),
  postalCode: text('postal_code'),
  country: text('country'),
  taxId: text('tax_id'),
  balance: integer('balance').notNull().default(0),
  status: text('status').notNull().default('active'),
  notes: text('notes'),
  createdAt: text('created_at'),
  updatedAt: text('updated_at'),
  createdBy: text('created_by'),
});

export const customerTransactions = sqliteTable(
  'customer_transactions',
  {
    id: text('id').primaryKey(),
    customerId: text('customer_id').notNull(),
    transactionType: text('transaction_type').notNull(),
    referenceType: text('reference_type'),
    referenceId: text('reference_id'),
    amount: integer('amount').notNull(),
    balanceAfter: integer('balance_after').notNull(),
    description: text('description'),
    transactionDate: text('transaction_date').notNull(),
    idempotencyKey: text('idempotency_key'),
    createdAt: text('created_at'),
    createdBy: text('created_by'),
  },
  (table) => [uniqueIndex('idx_customer_transactions_idempotency').on(table.idempotencyKey)],
);

export const purchaseOrders = sqliteTable('purchase_orders', {
  id: text('id').primaryKey(),
  poNumber: text('po_number').notNull().unique(),
  supplierId: text('supplier_id').notNull(),
  userId: text('user_id').notNull(),
  status: text('status').notNull().default('draft'),
  subtotal: integer('subtotal').notNull().default(0),
  taxAmount: integer('tax_amount').notNull().default(0),
  totalAmount: integer('total_amount').notNull().default(0),
  notes: text('notes'),
  createdAt: text('created_at'),
  updatedAt: text('updated_at'),
});

export const purchaseOrderItems = sqliteTable('purchase_order_items', {
  id: text('id').primaryKey(),
  purchaseOrderId: text('purchase_order_id').notNull(),
  productId: text('product_id').notNull(),
  productName: text('product_name').notNull(),
  quantityOrdered: real('quantity_ordered').notNull().default(0),
  quantityReceived: real('quantity_received').notNull().default(0),
  unitPrice: integer('unit_price').notNull().default(0),
  subtotal: integer('subtotal').notNull().default(0),
  notes: text('notes'),
});

export const goodsReceiving = sqliteTable('goods_receiving', {
  id: text('id').primaryKey(),
  receivingNumber: text('receiving_number').notNull().unique(),
  purchaseOrderId: text('purchase_order_id').notNull(),
  userId: text('user_id').notNull(),
  receivedAt: text('received_at').notNull(),
  notes: text('notes'),
});

export const goodsReceivingItems = sqliteTable('goods_receiving_items', {
  id: text('id').primaryKey(),
  goodsReceivingId: text('goods_receiving_id').notNull(),
  purchaseOrderItemId: text('purchase_order_item_id'),
  productId: text('product_id').notNull(),
  quantityReceived: real('quantity_received').notNull().default(0),
});

export const purchaseReturns = sqliteTable('purchase_returns', {
  id: text('id').primaryKey(),
  returnNumber: text('return_number').notNull().unique(),
  purchaseOrderId: text('purchase_order_id'),
  goodsReceivingId: text('goods_receiving_id'),
  userId: text('user_id').notNull(),
  returnDate: text('return_date').notNull(),
  notes: text('notes'),
});

export const purchaseReturnItems = sqliteTable('purchase_return_items', {
  id: text('id').primaryKey(),
  purchaseReturnId: text('purchase_return_id').notNull(),
  productId: text('product_id').notNull(),
  quantity: real('quantity').notNull().default(0),
  unitPrice: integer('unit_price').notNull().default(0),
  subtotal: integer('subtotal').notNull().default(0),
});

export const salesReturns = sqliteTable('sales_returns', {
  id: text('id').primaryKey(),
  returnNumber: text('return_number').notNull().unique(),
  transactionId: text('transaction_id').notNull(),
  userId: text('user_id').notNull(),
  returnDate: text('return_date').notNull(),
  notes: text('notes'),
  status: text('status').default('completed'),
  createdAt: text('created_at'),
});

export const salesReturnItems = sqliteTable('sales_return_items', {
  id: text('id').primaryKey(),
  salesReturnId: text('sales_return_id').notNull(),
  productId: text('product_id').notNull(),
  productName: text('product_name').notNull(),
  quantity: real('quantity').notNull().default(0),
  unitCost: real('unit_cost').notNull().default(0),
  subtotal: real('subtotal').notNull().default(0),
});

export const cashDrawers = sqliteTable('cash_drawers', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  openingBalance: integer('opening_balance').notNull().default(0),
  closingBalance: integer('closing_balance').notNull().default(0),
  openedAt: text('opened_at').notNull(),
  closedAt: text('closed_at'),
  status: text('status').notNull().default('open'),
  notes: text('notes'),
});

export const cashMovements = sqliteTable('cash_movements', {
  id: text('id').primaryKey(),
  cashDrawerId: text('cash_drawer_id').notNull(),
  movementType: text('movement_type').notNull(),
  amount: integer('amount').notNull(),
  referenceType: text('reference_type'),
  referenceId: text('reference_id'),
  description: text('description'),
  createdAt: text('created_at').notNull(),
  createdBy: text('created_by'),
});

export const incomeRecords = sqliteTable('income_records', {
  id: text('id').primaryKey(),
  cashDrawerId: text('cash_drawer_id'),
  incomeType: text('income_type').notNull(),
  amount: integer('amount').notNull(),
  referenceType: text('reference_type'),
  referenceId: text('reference_id'),
  description: text('description'),
  createdAt: text('created_at').notNull(),
  createdBy: text('created_by'),
});

export const expenseRecords = sqliteTable('expense_records', {
  id: text('id').primaryKey(),
  cashDrawerId: text('cash_drawer_id'),
  category: text('category').notNull(),
  amount: integer('amount').notNull(),
  description: text('description'),
  createdAt: text('created_at').notNull(),
  createdBy: text('created_by'),
});

export const deviceIdentity = sqliteTable('device_identity', {
  id: integer('id').primaryKey(),
  deviceId: text('device_id').notNull().unique(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const syncOutbox = sqliteTable(
  'sync_outbox',
  {
    id: text('id').primaryKey(),
    deviceId: text('device_id').notNull(),
    eventType: text('event_type').notNull(),
    aggregateType: text('aggregate_type').notNull(),
    aggregateId: text('aggregate_id').notNull(),
    payload: text('payload').notNull(),
    schemaVersion: integer('schema_version').notNull().default(1),
    createdAt: text('created_at').notNull(),
    syncStatus: text('sync_status').notNull().default('pending'),
    retryCount: integer('retry_count').notNull().default(0),
    lastError: text('last_error'),
    serverAckAt: text('server_ack_at'),
    idempotencyKey: text('idempotency_key').notNull().unique(),
  },
  (table) => [
    index('idx_sync_outbox_status_created').on(table.syncStatus, table.createdAt),
    index('idx_sync_outbox_aggregate').on(table.aggregateType, table.aggregateId),
    index('idx_sync_outbox_device').on(table.deviceId),
  ],
);