import { contextBridge, ipcRenderer } from 'electron';

let sessionToken = '';

function withToken<T>(input: T): T {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return input;
  }
  return { ...(input as Record<string, unknown>), token: sessionToken } as T;
}

async function send(channel: string, input?: unknown): Promise<any> {
  const result = await ipcRenderer.invoke(channel, withToken(input));
  if (result && result.ok && result.data && typeof result.data.token === 'string') {
    sessionToken = result.data.token;
  }
  return result;
}

const api = {
  getAppInfo: () => ipcRenderer.invoke('app:getInfo'),
  getEnvironmentStatus: () => ipcRenderer.invoke('app:getEnvironmentStatus'),
  syncGetStatus: () => send('sync:getStatus', {}),
  syncTrigger: () => send('sync:trigger', {}),
  syncGetConnection: () => send('sync:getConnection', {}),
  syncEnroll: (input: { apiBaseUrl: string; enrollmentSecret: string; deviceName?: string }) => send('sync:enroll', input),
  updateCheck: () => send('update:check', {}),
  updateDownload: () => send('update:download', {}),
  updateInstall: () => send('update:install', {}),
  updateGetStatus: () => send('update:getStatus', {}),
  getBranding: () => send('branding:get', {}),
  getLicenseStatus: () => send('license:status', {}),
  enforceLicense: () => send('license:enforce', {}),
  activateLicense: (input: unknown) => send('license:activate', input),
  verifyLicense: () => send('license:verify', {}),
  importProductsCsv: (input: unknown) => send('import:productsCsv', input),
  importCustomersCsv: (input: unknown) => send('import:customersCsv', input),
  saveCsv: (input: unknown) => send('file:saveCsv', input),
  getPrinterConfig: (input: unknown) => send('printer:getConfig', input),
  setPrinterConfig: (input: unknown) => send('printer:setConfig', input),
  listPrinters: (input: unknown) => send('printer:list', input),
  printReceipt: (input: unknown) => send('printer:printReceipt', input),
  printInvoice: (input: unknown) => send('printer:printInvoice', input),
  printDeliveryOrder: (input: unknown) => send('printer:printDeliveryOrder', input),
  getTransactionInvoicePayload: (input: unknown) => send('transaction:getInvoicePayload', input),
  setBranding: (input: unknown) => send('branding:set', input),
  pickLogo: (input: unknown) => send('branding:pickLogo', input),
  pickIcon: (input: unknown) => send('branding:pickIcon', input),
  resetIcon: (input: unknown) => send('branding:resetIcon', input),
  resetLogo: (input: unknown) => send('branding:resetLogo', input),
  dangerWipeSessions: (input: unknown) => send('danger:wipeSessions', input),
  dangerWipeAdminUsers: (input: unknown) => send('danger:wipeAdminUsers', input),
  dangerFactoryReset: (input: unknown) => send('danger:factoryReset', input),
  superadminCrud: (input: unknown) => send('superadmin:crud', input),

  auditList: (input: unknown) => send('audit:list', input),
  onUpdateStatus: (callback: (status: unknown) => void) => {
    const listener = (_event: unknown, status: unknown) => callback(status);
    ipcRenderer.on('update:status', listener);
    return () => ipcRenderer.removeListener('update:status', listener);
  },

  authNeedsSetup: () => ipcRenderer.invoke('auth:needsSetup'),
  authSetup: async (input: { name: string; email: string; password: string }) => {
    const result = await ipcRenderer.invoke('auth:setup', input);
    if (result?.ok && result.data?.token) sessionToken = result.data.token;
    return result;
  },
  authLogin: async (email: string, password: string) => {
    const result = await ipcRenderer.invoke('auth:login', { email, password });
    if (result?.ok && result.data?.token) sessionToken = result.data.token;
    return result;
  },
  authSession: async () => {
    const result = await ipcRenderer.invoke('auth:session');
    if (result?.ok && result.data?.token) sessionToken = result.data.token;
    return result;
  },
  authLogout: async () => {
    const result = await ipcRenderer.invoke('auth:logout', { token: sessionToken });
    sessionToken = '';
    return result;
  },
  authChangePassword: (input: { currentPassword: string; nextPassword: string }) =>
    send('auth:changePassword', input),

  getProducts: (input?: unknown) => send('product:getAll', input ?? {}),
  createProduct: (input: unknown) => send('product:create', input),
  updateProduct: (input: unknown) => send('product:update', input),
  deactivateProduct: (input: unknown) => send('product:deactivate', input),
  getCategories: () => send('category:getAll', {}),
  getUnits: () => send('unit:getAll', {}),

  createTransaction: (input: unknown) => send('transaction:create', input),
  getTransactions: (input?: unknown) => send('transaction:getAll', input ?? {}),
  getTransactionSummary: (input: unknown) => send('transaction:summary', input),

  backupDatabase: (input: unknown) => send('database:backup', input),
  restoreDatabase: (input: unknown) => send('database:restore', input),

  getSettings: () => send('settings:get', {}),
  updateSettings: (input: unknown) => send('settings:update', input),
  settingsList: () => send('settings:list', {}),
  settingsUpsert: (input: unknown) => send('settings:upsert', input),

  getStockMovements: (input?: unknown) => send('inventory:getMovements', input ?? {}),
  createStockAdjustment: (input: unknown) => send('inventory:createAdjustment', input),
  approveStockAdjustment: (input: unknown) => send('inventory:approveAdjustment', input),
  getStockAdjustments: (input?: unknown) => send('inventory:getAdjustments', input ?? {}),
  createStockOpname: (input: unknown) => send('inventory:createOpname', input),
  addOpnameItem: (input: unknown) => send('inventory:addOpnameItem', input),
  listOpnameItems: (input: unknown) => send('inventory:listOpnameItems', input),
  completeStockOpname: (input: unknown) => send('inventory:completeOpname', input),
  getStockOpnames: (input?: unknown) => send('inventory:getOpnames', input ?? {}),
  getLowStockAlerts: () => send('inventory:getLowStockAlerts', {}),
  getInventoryValuation: () => send('inventory:getValuation', {}),
  upsertInventorySettings: (input: unknown) => send('inventory:upsertSettings', input),

  createSupplier: (input: unknown) => send('supplier:create', input),
  getSuppliers: (input?: unknown) => send('supplier:getAll', input ?? {}),
  updateSupplier: (input: unknown) => send('supplier:update', input),
  deactivateSupplier: (input: unknown) => send('supplier:deactivate', input),
  getSupplierTransactions: (input?: unknown) => send('supplier:getTransactions', input ?? {}),
  createSupplierInvoice: (input: unknown) => send('supplier:invoiceCreate', input),
  getSupplierInvoices: (input?: unknown) => send('supplier:invoiceGetAll', input ?? {}),
  getSupplierInvoice: (input: unknown) => send('supplier:invoiceGet', input),
  paySupplierInvoice: (input: unknown) => send('supplier:invoicePay', input),
  getPayablesSummary: () => send('supplier:getPayables', {}),

  createPurchaseOrder: (input: unknown) => send('procurement:createPurchaseOrder', input),
  getPurchaseOrders: (input?: unknown) => send('procurement:getPurchaseOrders', input ?? {}),
  getPurchaseOrder: (input: unknown) => send('procurement:getPurchaseOrder', input),
  updatePurchaseOrder: (input: unknown) => send('procurement:updatePurchaseOrder', input),
  cancelPurchaseOrder: (input: unknown) => send('procurement:cancelPurchaseOrder', input),
  receiveGoods: (input: unknown) => send('procurement:receiveGoods', input),
  getReceiving: (input?: unknown) => send('procurement:getReceiving', input ?? {}),
  createPurchaseReturn: (input: unknown) => send('procurement:createPurchaseReturn', input),
  getPurchaseReturns: (input?: unknown) => send('procurement:getPurchaseReturns', input ?? {}),

  openCashDrawer: (input: unknown) => send('finance:openCashDrawer', input),
  closeCashDrawer: (input: unknown) => send('finance:closeCashDrawer', input),
  getCashDrawers: (input?: unknown) => send('finance:getCashDrawers', input ?? {}),
  recordIncome: (input: unknown) => send('finance:recordIncome', input),
  recordExpense: (input: unknown) => send('finance:recordExpense', input),
  getCashMovements: (input?: unknown) => send('finance:getCashMovements', input ?? {}),
  getIncomeExpense: (input?: unknown) => send('finance:getIncomeExpense', input ?? {}),
  getProfitAndLoss: (input?: unknown) => send('finance:getProfitAndLoss', input ?? {}),
  getCashFlow: (input?: unknown) => send('finance:getCashFlow', input ?? {}),

  createCustomer: (input: unknown) => send('customer:create', input),
  getCustomers: (input?: unknown) => send('customer:getAll', input ?? {}),
  getCustomer: (input: unknown) => send('customer:getCustomer', input),
  updateCustomer: (input: unknown) => send('customer:update', input),
  deactivateCustomer: (input: unknown) => send('customer:deactivate', input),
  getCustomerTransactions: (input?: unknown) => send('customer:getTransactions', input ?? {}),
  getCustomerReceivables: (input: unknown) => send('customer:getReceivables', input),
  payCustomerCredit: (input: unknown) => send('customer:payCredit', input),
  getCustomerStats: (input: unknown) => send('customer:getStats', input),

  reportSales: (input?: unknown) => send('report:sales', input ?? {}),
  reportShiftRecap: (input?: unknown) => send('report:shiftRecap', input ?? {}),
  reportReceivables: (input?: unknown) => send('report:receivables', input ?? {}),
  reportBestSelling: (input?: unknown) => send('report:bestSelling', input ?? {}),
  reportSlowMoving: (input?: unknown) => send('report:slowMoving', input ?? {}),
  reportGrossProfit: (input?: unknown) => send('report:grossProfit', input ?? {}),
  reportInventoryValuation: (input?: unknown) => send('report:inventoryValuation', input ?? {}),
  reportPurchase: (input?: unknown) => send('report:purchase', input ?? {}),
  reportExpense: (input?: unknown) => send('report:expense', input ?? {}),
  reportCashierPerformance: (input?: unknown) => send('report:cashierPerformance', input ?? {}),
  reportTransaction: (input?: unknown) => send('report:transaction', input ?? {}),

  usersGetAll: (input?: unknown) => send('users:getAll', input ?? {}),
  usersCreate: (input: unknown) => send('users:create', input),
  usersUpdate: (input: unknown) => send('users:update', input),
  usersDeactivate: (input: unknown) => send('users:deactivate', input),
  rolesGetAll: (input?: unknown) => send('roles:getAll', input ?? {}),
  rolesCreate: (input: unknown) => send('roles:create', input),
  rolesUpdate: (input: unknown) => send('roles:update', input),
  rolesDeactivate: (input: unknown) => send('roles:deactivate', input),
  rolesGetPermissions: (input: unknown) => send('roles:getPermissions', input),
  rolesSetPermissions: (input: unknown) => send('roles:setPermissions', input),
  permissionsGetAll: (input?: unknown) => send('permissions:getAll', input ?? {}),

  getDeliveryOrder: (input: unknown) => send('deliveryOrder:get', input),
  pickBackupSavePath: (input?: unknown) => send('dialog:pickSavePath', input ?? {}),
  pickRestoreFile: (input?: unknown) => send('dialog:pickRestoreFile', input ?? {}),
  createCategory: (input: unknown) => send('category:create', input),
  updateCategory: (input: unknown) => send('category:update', input),
  deleteCategory: (input: unknown) => send('category:delete', input),
  createUnit: (input: unknown) => send('unit:create', input),
  updateUnit: (input: unknown) => send('unit:update', input),
  deleteUnit: (input: unknown) => send('unit:delete', input),
  createSalesReturn: (input: unknown) => send('salesReturn:create', input),
  listSalesReturns: (input?: unknown) => send('salesReturn:list', input ?? {}),
};

contextBridge.exposeInMainWorld('vyapara', api);
