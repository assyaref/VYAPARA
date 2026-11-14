import { z } from 'zod';
import { PAYMENT_METHODS } from './pos';

export const PERMISSIONS = [
  'product:read',
  'product:write',
  'transaction:read',
  'transaction:write',
  'database:backup',
  'database:restore',
  'settings:read',
  'settings:write',
  'inventory:read',
  'inventory:write',
  'inventory:adjust',
  'inventory:opname',
  'inventory:approve',
  'supplier:read',
  'supplier:write',
  'supplier:delete',
  'supplier:transactions',
  'procurement:read',
  'procurement:write',
  'finance:read',
  'finance:write',
  'customer:read',
  'customer:write',
  'reports:read',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const ROLE_PERMISSIONS: Record<'admin' | 'cashier' | 'viewer', readonly Permission[]> = {
  admin: PERMISSIONS,
  cashier: ['product:read', 'transaction:read', 'transaction:write', 'settings:read', 'inventory:read', 'supplier:read', 'procurement:read', 'customer:read', 'finance:read', 'reports:read'],
  viewer: ['product:read', 'transaction:read', 'settings:read', 'inventory:read', 'supplier:read', 'procurement:read', 'customer:read', 'finance:read', 'reports:read'],
};

export const IpcChannel = {
  authNeedsSetup: 'auth:needsSetup',
  authSetup: 'auth:setup',
  authLogin: 'auth:login',
  authLogout: 'auth:logout',
  authSession: 'auth:session',
  authChangePassword: 'auth:changePassword',
  productGetAll: 'product:getAll',
  productCreate: 'product:create',
  productUpdate: 'product:update',
  productDeactivate: 'product:deactivate',
  categoryGetAll: 'category:getAll',
  unitGetAll: 'unit:getAll',
  transactionCreate: 'transaction:create',
  transactionGetAll: 'transaction:getAll',
  transactionSummary: 'transaction:summary',
  databaseBackup: 'database:backup',
  databaseRestore: 'database:restore',
  settingsGet: 'settings:get',
  settingsUpdate: 'settings:update',
  appGetInfo: 'app:getInfo',
  appGetEnvironmentStatus: 'app:getEnvironmentStatus',
  inventoryGetMovements: 'inventory:getMovements',
  inventoryCreateAdjustment: 'inventory:createAdjustment',
  inventoryApproveAdjustment: 'inventory:approveAdjustment',
  inventoryGetAdjustments: 'inventory:getAdjustments',
  inventoryCreateOpname: 'inventory:createOpname',
  inventoryAddOpnameItem: 'inventory:addOpnameItem',
  inventoryListOpnameItems: 'inventory:listOpnameItems',
  inventoryCompleteOpname: 'inventory:completeOpname',
  inventoryGetOpnames: 'inventory:getOpnames',
  inventoryGetSettings: 'inventory:getSettings',
  inventoryUpsertSettings: 'inventory:upsertSettings',
  inventoryGetLowStockAlerts: 'inventory:getLowStockAlerts',
  inventoryGetValuation: 'inventory:getValuation',
  supplierCreate: 'supplier:create',
  supplierGetAll: 'supplier:getAll',
  supplierUpdate: 'supplier:update',
  supplierDeactivate: 'supplier:deactivate',
  supplierGetTransactions: 'supplier:getTransactions',
  supplierInvoiceCreate: 'supplier:invoiceCreate',
  supplierInvoiceGetAll: 'supplier:invoiceGetAll',
  supplierInvoiceGet: 'supplier:invoiceGet',
  supplierInvoicePay: 'supplier:invoicePay',
  supplierGetPayables: 'supplier:getPayables',
  procurementCreatePurchaseOrder: 'procurement:createPurchaseOrder',
  procurementGetPurchaseOrders: 'procurement:getPurchaseOrders',
  procurementGetPurchaseOrder: 'procurement:getPurchaseOrder',
  procurementUpdatePurchaseOrder: 'procurement:updatePurchaseOrder',
  procurementCancelPurchaseOrder: 'procurement:cancelPurchaseOrder',
  procurementReceiveGoods: 'procurement:receiveGoods',
  procurementGetReceiving: 'procurement:getReceiving',
  procurementCreatePurchaseReturn: 'procurement:createPurchaseReturn',
  procurementGetPurchaseReturns: 'procurement:getPurchaseReturns',
  financeOpenCashDrawer: 'finance:openCashDrawer',
  financeCloseCashDrawer: 'finance:closeCashDrawer',
  financeGetCashDrawers: 'finance:getCashDrawers',
  financeRecordIncome: 'finance:recordIncome',
  financeRecordExpense: 'finance:recordExpense',
  financeGetCashMovements: 'finance:getCashMovements',
  financeGetIncomeExpense: 'finance:getIncomeExpense',
  financeGetProfitAndLoss: 'finance:getProfitAndLoss',
  financeGetCashFlow: 'finance:getCashFlow',
  customerCreate: 'customer:create',
  customerGetAll: 'customer:getAll',
  customerGetCustomer: 'customer:getCustomer',
  customerUpdate: 'customer:update',
  customerDeactivate: 'customer:deactivate',
  customerGetTransactions: 'customer:getTransactions',
  customerGetReceivables: 'customer:getReceivables',
  customerPayCredit: 'customer:payCredit',
  customerGetStats: 'customer:getStats',
  reportSales: 'report:sales',
  reportBestSelling: 'report:bestSelling',
  reportSlowMoving: 'report:slowMoving',
  reportGrossProfit: 'report:grossProfit',
  reportInventoryValuation: 'report:inventoryValuation',
  reportPurchase: 'report:purchase',
  reportExpense: 'report:expense',
  reportCashierPerformance: 'report:cashierPerformance',
  reportTransaction: 'report:transaction',
  settingsList: 'settings:list',
  settingsUpsert: 'settings:upsert',
  usersGetAll: 'users:getAll',
  usersCreate: 'users:create',
  usersUpdate: 'users:update',
  usersDeactivate: 'users:deactivate',
  rolesGetAll: 'roles:getAll',
  rolesCreate: 'roles:create',
  rolesUpdate: 'roles:update',
  rolesDeactivate: 'roles:deactivate',
  rolesGetPermissions: 'roles:getPermissions',
  rolesSetPermissions: 'roles:setPermissions',
  permissionsGetAll: 'permissions:getAll',
} as const;

export type IpcChannelName = (typeof IpcChannel)[keyof typeof IpcChannel];

const tokenSchema = z.string().min(32).max(200);
const moneySchema = z.number().int().nonnegative().max(1_000_000_000_000);
const emailSchema = z.string().trim().email().max(200);
const passwordSchema = z.string().min(10).max(200);
const idSchema = z.string().trim().min(1).max(80);

export const PublicUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: z.string(),
  permissions: z.array(z.string()),
  mustChangePassword: z.boolean(),
});

export type PublicUser = z.infer<typeof PublicUserSchema>;

export const AuthSetupSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: emailSchema,
  password: passwordSchema,
});

export const AuthLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(200),
});

export const AuthTokenSchema = z.object({
  token: tokenSchema,
});

export const AuthChangePasswordSchema = z.object({
  token: tokenSchema,
  currentPassword: z.string().min(1).max(200),
  nextPassword: passwordSchema,
});

export const ProductQuerySchema = z.object({
  token: tokenSchema,
  search: z.string().trim().max(100).optional(),
  categoryId: idSchema.optional(),
  includeInactive: z.boolean().optional(),
});

export const ProductCreateSchema = z.object({
  token: tokenSchema,
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(500).optional(),
  categoryId: idSchema.optional(),
  unitId: idSchema.optional(),
  barcode: z.string().trim().max(80).optional(),
  sku: z.string().trim().max(80).optional(),
  price: moneySchema,
  cost: moneySchema,
  stock: z.number().nonnegative().max(1_000_000),
});

export const ProductUpdateSchema = z.object({
  token: tokenSchema,
  id: idSchema,
  name: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  categoryId: idSchema.nullable().optional(),
  unitId: idSchema.nullable().optional(),
  barcode: z.string().trim().max(80).nullable().optional(),
  sku: z.string().trim().max(80).nullable().optional(),
  price: moneySchema.optional().refine((val) => val === undefined || val >= 0, {
    message: 'Price must be non-negative',
    path: ['price'],
  }),
  cost: moneySchema.optional().refine((val) => val === undefined || val >= 0, {
    message: 'Cost must be non-negative',
    path: ['cost'],
  }),
  stock: z.number().nonnegative().max(1_000_000).optional(),
  isActive: z.boolean().optional(),
});

export const ProductIdSchema = z.object({
  token: tokenSchema,
  id: idSchema,
});

export const PaymentLineSchema = z.object({
  method: z.enum(PAYMENT_METHODS),
  amount: moneySchema,
});

export const TransactionCreateSchema = z.object({
  token: tokenSchema,
  idempotencyKey: z.string().uuid(),
  items: z
    .array(
      z.object({
        productId: idSchema,
        quantity: z.number().positive().max(1_000_000),
      }),
    )
    .min(1)
    .max(200),
  discountAmount: moneySchema,
  payments: z.array(PaymentLineSchema).min(1).max(8),
  notes: z.string().trim().max(300).optional(),
});

export const SettingsUpdateSchema = z.object({
  token: tokenSchema,
  taxRateBps: z.number().int().min(0).max(10_000),
  storeName: z.string().trim().min(1).max(120),
  receiptFooter: z.string().trim().max(200),
});

export const StockMovementsQuerySchema = z.object({
  token: tokenSchema,
  productId: idSchema.optional(),
  movementType: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.number().int().positive().max(1000).optional(),
});

export const StockAdjustmentCreateSchema = z.object({
  token: tokenSchema,
  productId: idSchema,
  adjustmentType: z.enum(['increase', 'decrease']),
  quantity: z.number().positive().max(1_000_000),
  reason: z.string().trim().max(200).optional(),
  referenceNumber: z.string().trim().max(80).optional(),
  notes: z.string().trim().max(300).optional(),
});

export const StockAdjustmentApproveSchema = z.object({
  token: tokenSchema,
  adjustmentId: idSchema,
  approved: z.boolean(),
  notes: z.string().trim().max(300).optional(),
});

export const StockAdjustmentsQuerySchema = z.object({
  token: tokenSchema,
  status: z.string().optional(),
  productId: idSchema.optional(),
  limit: z.number().int().positive().max(1000).optional(),
});

export const StockOpnameCreateSchema = z.object({
  token: tokenSchema,
  location: z.string().trim().max(100).optional(),
  notes: z.string().trim().max(300).optional(),
});

export const OpnameItemAddSchema = z.object({
  token: tokenSchema,
  opnameId: idSchema,
  productId: idSchema,
  physicalStock: z.number().nonnegative().max(1_000_000),
  notes: z.string().trim().max(200).optional(),
});

export const OpnameItemListSchema = z.object({
  token: tokenSchema,
  opnameId: idSchema,
});

export const StockOpnameCompleteSchema = z.object({
  token: tokenSchema,
  opnameId: idSchema,
});

export const StockOpnamesQuerySchema = z.object({
  token: tokenSchema,
  status: z.string().optional(),
  limit: z.number().int().positive().max(1000).optional(),
});

export const ProductInventorySettingsUpsertSchema = z.object({
  token: tokenSchema,
  productId: idSchema,
  minimumStock: z.number().nonnegative().max(1_000_000).optional(),
  maximumStock: z.number().positive().max(1_000_000).optional(),
  reorderPoint: z.number().positive().max(1_000_000).optional(),
  isLowStockAlertEnabled: z.boolean().optional(),
});

export const InventoryGetSettingsSchema = z.object({
  token: tokenSchema,
  productId: idSchema,
});

export const SupplierCreateSchema = z.object({
  token: tokenSchema,
  name: z.string().trim().min(1).max(200),
  contactPerson: z.string().trim().max(100).optional(),
  phone: z.string().trim().max(50).optional(),
  email: emailSchema.optional(),
  address: z.string().trim().max(300).optional(),
  city: z.string().trim().max(100).optional(),
  postalCode: z.string().trim().max(20).optional(),
  country: z.string().trim().max(100).optional(),
  taxId: z.string().trim().max(50).optional(),
  paymentTerms: z.number().int().min(0).max(365).optional(),
  creditLimit: moneySchema.optional(),
  notes: z.string().trim().max(500).optional(),
});

export const SupplierQuerySchema = z.object({
  token: tokenSchema,
  status: z.string().optional(),
  search: z.string().trim().max(100).optional(),
  limit: z.number().int().positive().max(1000).optional(),
});

export const SupplierUpdateSchema = z.object({
  token: tokenSchema,
  id: idSchema,
  name: z.string().trim().min(1).max(200).optional(),
  contactPerson: z.string().trim().max(100).nullable().optional(),
  phone: z.string().trim().max(50).nullable().optional(),
  email: emailSchema.nullable().optional(),
  address: z.string().trim().max(300).nullable().optional(),
  city: z.string().trim().max(100).nullable().optional(),
  postalCode: z.string().trim().max(20).nullable().optional(),
  country: z.string().trim().max(100).nullable().optional(),
  taxId: z.string().trim().max(50).nullable().optional(),
  paymentTerms: z.number().int().min(0).max(365).optional(),
  creditLimit: moneySchema.optional(),
  notes: z.string().trim().max(500).nullable().optional(),
});

export const SupplierIdSchema = z.object({
  token: tokenSchema,
  id: idSchema,
});

export const SupplierTransactionsQuerySchema = z.object({
  token: tokenSchema,
  supplierId: idSchema.optional(),
  transactionType: z.string().optional(),
  startDate: z.number().int().optional(),
  endDate: z.number().int().optional(),
  limit: z.number().int().positive().max(1000).optional(),
});

// ===== Procurement schemas =====

export const PurchaseOrderCreateSchema = z.object({
  token: tokenSchema,
  supplierId: idSchema,
  items: z
    .array(
      z.object({
        productId: idSchema,
        quantity: z.number().positive().max(1_000_000),
        unitPrice: moneySchema,
      }),
    )
    .min(1)
    .max(500),
  notes: z.string().trim().max(300).optional(),
});

export const PurchaseOrderQuerySchema = z.object({
  token: tokenSchema,
  status: z.string().optional(),
  supplierId: idSchema.optional(),
  startDate: z.number().int().optional(),
  endDate: z.number().int().optional(),
  limit: z.number().int().positive().max(1000).optional(),
});

export const PurchaseOrderIdSchema = z.object({
  token: tokenSchema,
  id: idSchema,
});

export const ReceiveGoodsSchema = z.object({
  token: tokenSchema,
  purchaseOrderId: idSchema,
  items: z
    .array(
      z.object({
        purchaseOrderItemId: idSchema.optional(),
        productId: idSchema,
        quantity: z.number().positive().max(1_000_000),
      }),
    )
    .min(1)
    .max(500),
  notes: z.string().trim().max(300).optional(),
});

export const PurchaseReturnCreateSchema = z.object({
  token: tokenSchema,
  purchaseOrderId: idSchema.optional(),
  goodsReceivingId: idSchema.optional(),
  items: z
    .array(
      z.object({
        productId: idSchema,
        quantity: z.number().positive().max(1_000_000),
        unitPrice: moneySchema,
      }),
    )
    .min(1)
    .max(500),
  notes: z.string().trim().max(300).optional(),
});

export const PurchaseReturnQuerySchema = z.object({
  token: tokenSchema,
  purchaseOrderId: idSchema.optional(),
  limit: z.number().int().positive().max(1000).optional(),
});

// ===== Finance schemas =====

export const CashDrawerOpenSchema = z.object({
  token: tokenSchema,
  openingBalance: moneySchema,
  notes: z.string().trim().max(300).optional(),
});

export const CashDrawerCloseSchema = z.object({
  token: tokenSchema,
  cashDrawerId: idSchema,
  closingBalance: moneySchema,
  notes: z.string().trim().max(300).optional(),
});

export const CashDrawerQuerySchema = z.object({
  token: tokenSchema,
  status: z.string().optional(),
  userId: idSchema.optional(),
  startDate: z.number().int().optional(),
  endDate: z.number().int().optional(),
  limit: z.number().int().positive().max(1000).optional(),
});

export const IncomeCreateSchema = z.object({
  token: tokenSchema,
  incomeType: z.string().trim().min(1).max(100),
  amount: moneySchema,
  referenceType: z.string().trim().max(50).optional(),
  referenceId: idSchema.optional(),
  description: z.string().trim().max(300).optional(),
});

export const ExpenseCreateSchema = z.object({
  token: tokenSchema,
  category: z.string().trim().min(1).max(100),
  amount: moneySchema,
  description: z.string().trim().max(300).optional(),
});

export const CashMovementsQuerySchema = z.object({
  token: tokenSchema,
  cashDrawerId: idSchema.optional(),
  movementType: z.string().optional(),
  startDate: z.number().int().optional(),
  endDate: z.number().int().optional(),
  limit: z.number().int().positive().max(1000).optional(),
});

export const IncomeExpenseQuerySchema = z.object({
  token: tokenSchema,
  startDate: z.number().int().optional(),
  endDate: z.number().int().optional(),
});

// ===== Customer schemas =====

export const CustomerCreateSchema = z.object({
  token: tokenSchema,
  name: z.string().trim().min(1).max(200),
  contactPerson: z.string().trim().max(100).optional(),
  phone: z.string().trim().max(50).optional(),
  email: emailSchema.optional(),
  address: z.string().trim().max(300).optional(),
  city: z.string().trim().max(100).optional(),
  notes: z.string().trim().max(500).optional(),
});

export const CustomerQuerySchema = z.object({
  token: tokenSchema,
  status: z.string().optional(),
  search: z.string().trim().max(100).optional(),
  limit: z.number().int().positive().max(1000).optional(),
});

export const CustomerIdSchema = z.object({
  token: tokenSchema,
  id: idSchema,
});

export const CustomerUpdateSchema = z.object({
  token: tokenSchema,
  id: idSchema,
  name: z.string().trim().min(1).max(200).optional(),
  contactPerson: z.string().trim().max(100).nullable().optional(),
  phone: z.string().trim().max(50).nullable().optional(),
  email: emailSchema.nullable().optional(),
  address: z.string().trim().max(300).nullable().optional(),
  city: z.string().trim().max(100).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
});

export const CustomerTransactionsQuerySchema = z.object({
  token: tokenSchema,
  customerId: idSchema.optional(),
  transactionType: z.string().optional(),
  startDate: z.number().int().optional(),
  endDate: z.number().int().optional(),
  limit: z.number().int().positive().max(1000).optional(),
});

// ===== Report schemas =====

export const ReportQuerySchema = z.object({
  token: tokenSchema,
  startDate: z.number().int().optional(),
  endDate: z.number().int().optional(),
  limit: z.number().int().positive().max(1000).optional(),
});

export const BestSellingQuerySchema = z.object({
  token: tokenSchema,
  startDate: z.number().int().optional(),
  endDate: z.number().int().optional(),
  limit: z.number().int().positive().max(100).optional(),
});

export const CashierPerformanceQuerySchema = z.object({
  token: tokenSchema,
  startDate: z.number().int().optional(),
  endDate: z.number().int().optional(),
});

// ===== Settings & Administration schemas =====

export const SettingsListSchema = z.object({
  token: tokenSchema,
});

export const SettingsUpsertSchema = z.object({
  token: tokenSchema,
  key: z.string().trim().min(1).max(100),
  value: z.string().trim().max(1000),
});

export const UserCreateSchema = z.object({
  token: tokenSchema,
  name: z.string().trim().min(1).max(120),
  email: emailSchema,
  password: passwordSchema,
  roleId: idSchema,
});

export const UserQuerySchema = z.object({
  token: tokenSchema,
  roleId: idSchema.optional(),
  search: z.string().trim().max(100).optional(),
  limit: z.number().int().positive().max(1000).optional(),
});

export const UserIdSchema = z.object({
  token: tokenSchema,
  id: idSchema,
});

export const UserUpdateSchema = z.object({
  token: tokenSchema,
  id: idSchema,
  name: z.string().trim().min(1).max(120).optional(),
  email: emailSchema.optional(),
  roleId: idSchema.optional(),
  isActive: z.boolean().optional(),
});

export const RoleCreateSchema = z.object({
  token: tokenSchema,
  name: z.string().trim().min(1).max(50),
  description: z.string().trim().max(200).optional(),
});

export const RoleQuerySchema = z.object({
  token: tokenSchema,
  limit: z.number().int().positive().max(1000).optional(),
});

export const RoleIdSchema = z.object({
  token: tokenSchema,
  id: idSchema,
});

export const RoleUpdateSchema = z.object({
  token: tokenSchema,
  id: idSchema,
  name: z.string().trim().min(1).max(50).optional(),
  description: z.string().trim().max(200).nullable().optional(),
});

export const PermissionsGetAllSchema = z.object({
  token: tokenSchema,
});

export const SupplierInvoiceCreateSchema = z.object({
  token: tokenSchema,
  supplierId: idSchema,
  purchaseOrderId: idSchema.optional(),
  goodsReceivingId: idSchema.optional(),
  invoiceDate: z.number().int().nonnegative().optional(),
  dueDate: z.number().int().nonnegative().optional(),
  taxAmount: moneySchema.optional(),
  notes: z.string().trim().max(500).optional(),
  items: z
    .array(
      z.object({
        productId: idSchema.optional(),
        description: z.string().trim().max(200).optional(),
        quantity: z.number().positive().max(1_000_000),
        unitPrice: moneySchema,
      }),
    )
    .min(1),
});

export const SupplierInvoiceQuerySchema = z.object({
  token: tokenSchema,
  supplierId: idSchema.optional(),
  status: z.enum(['unpaid', 'partial', 'paid', 'overdue']).optional(),
  startDate: z.number().int().nonnegative().optional(),
  endDate: z.number().int().nonnegative().optional(),
  limit: z.number().int().positive().max(1000).optional(),
});

export const SupplierInvoiceIdSchema = z.object({
  token: tokenSchema,
  id: idSchema,
});

export const SupplierInvoicePaySchema = z.object({
  token: tokenSchema,
  invoiceId: idSchema,
  amount: z.number().int().positive().max(1_000_000_000_000),
  description: z.string().trim().max(300).optional(),
});

export const CustomerPaymentSchema = z.object({
  token: tokenSchema,
  customerId: idSchema,
  amount: z.number().int().positive().max(1_000_000_000_000),
  description: z.string().trim().max(300).optional(),
  idempotencyKey: z.string().trim().min(8).max(128).optional(),
});

export const RolePermissionsSchema = z.object({
  token: tokenSchema,
  roleId: idSchema,
  permissions: z.array(z.string().trim().min(1).max(80)).max(200),
});

export type IpcSuccess<T> = { ok: true; data: T };
export type IpcFailure = { ok: false; error: { code: string; message: string } };
export type IpcResult<T> = IpcSuccess<T> | IpcFailure;

export function ipcOk<T>(data: T): IpcSuccess<T> {
  return { ok: true, data };
}

export function ipcFail(code: string, message: string): IpcFailure {
  return { ok: false, error: { code, message } };
}