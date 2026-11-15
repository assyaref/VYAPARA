// This allows CSS imports without type errors
declare module '*.css' {
  const content: string;
  export default content;
}

type VyaparaIpcResult<T = unknown> =
  | { ok: true; success?: boolean; data: T }
  | { ok: false; success?: boolean; error: { code?: string; message: string } };

export type SyncStatusSnapshot = {
  phase: 'idle' | 'connecting' | 'uploading' | 'downloading' | 'applying' | 'retrying' | 'offline' | 'error';
  online: boolean;
  lastSyncAt: string | null;
  pendingCount: number;
  failedCount: number;
  lastError: string | null;
  retryAt: string | null;
  inProgress: boolean;
};

// IPC global API declarations
interface Window {
  vyapara: {
    getAppInfo: () => Promise<{ name: string; version: string; platform: string }>;
    getEnvironmentStatus: () => Promise<{ online: boolean }>;
    syncGetStatus: () => Promise<VyaparaIpcResult<SyncStatusSnapshot>>;
    syncTrigger: () => Promise<VyaparaIpcResult<SyncStatusSnapshot>>;
    authNeedsSetup: () => Promise<any>;
    authSetup: (input: { name: string; email: string; password: string }) => Promise<any>;
    authLogin: (email: string, password: string) => Promise<any>;
    authSession: () => Promise<any>;
    authLogout: () => Promise<any>;
    authChangePassword: (input: { currentPassword: string; nextPassword: string }) => Promise<any>;
    getProducts: (input?: unknown) => Promise<any>;
    createProduct: (product: any) => Promise<any>;
    updateProduct: (product: any) => Promise<any>;
    deactivateProduct: (input: unknown) => Promise<any>;
    getCategories: () => Promise<any>;
    getUnits: () => Promise<any>;
    createTransaction: (transaction: any) => Promise<any>;
    getTransactions: (input?: unknown) => Promise<any>;
    getTransactionSummary: (input: unknown) => Promise<any>;
    backupDatabase: (input: { backupPath: string }) => Promise<any>;
    restoreDatabase: (input: { backupPath: string }) => Promise<any>;
    getSettings: () => Promise<any>;
    updateSettings: (settings: any) => Promise<any>;
    settingsList: () => Promise<any>;
    settingsUpsert: (input: unknown) => Promise<any>;
    getStockMovements: (input?: unknown) => Promise<any>;
    createStockAdjustment: (input: unknown) => Promise<any>;
    approveStockAdjustment: (input: unknown) => Promise<any>;
    getStockAdjustments: (input?: unknown) => Promise<any>;
    createStockOpname: (input: unknown) => Promise<any>;
    addOpnameItem: (input: unknown) => Promise<any>;
    listOpnameItems: (input: unknown) => Promise<any>;
    completeStockOpname: (input: unknown) => Promise<any>;
    getStockOpnames: (input?: unknown) => Promise<any>;
    getLowStockAlerts: () => Promise<any>;
    getInventoryValuation: () => Promise<any>;
    upsertInventorySettings: (input: unknown) => Promise<any>;
    createSupplier: (input: unknown) => Promise<any>;
    getSuppliers: (input?: unknown) => Promise<any>;
    updateSupplier: (input: unknown) => Promise<any>;
    deactivateSupplier: (input: unknown) => Promise<any>;
    getSupplierTransactions: (input?: unknown) => Promise<any>;
    createSupplierInvoice: (input: unknown) => Promise<any>;
    getSupplierInvoices: (input?: unknown) => Promise<any>;
    getSupplierInvoice: (input: unknown) => Promise<any>;
    paySupplierInvoice: (input: unknown) => Promise<any>;
    getPayablesSummary: () => Promise<any>;
    createPurchaseOrder: (input: unknown) => Promise<any>;
    getPurchaseOrders: (input?: unknown) => Promise<any>;
    getPurchaseOrder: (input: unknown) => Promise<any>;
    updatePurchaseOrder: (input: unknown) => Promise<any>;
    cancelPurchaseOrder: (input: unknown) => Promise<any>;
    receiveGoods: (input: unknown) => Promise<any>;
    getReceiving: (input?: unknown) => Promise<any>;
    createPurchaseReturn: (input: unknown) => Promise<any>;
    getPurchaseReturns: (input?: unknown) => Promise<any>;
    openCashDrawer: (input: unknown) => Promise<any>;
    closeCashDrawer: (input: unknown) => Promise<any>;
    getCashDrawers: (input?: unknown) => Promise<any>;
    recordIncome: (input: unknown) => Promise<any>;
    recordExpense: (input: unknown) => Promise<any>;
    getCashMovements: (input?: unknown) => Promise<any>;
    getIncomeExpense: (input?: unknown) => Promise<any>;
    getProfitAndLoss: (input?: unknown) => Promise<any>;
    getCashFlow: (input?: unknown) => Promise<any>;
    createCustomer: (input: unknown) => Promise<any>;
    getCustomers: (input?: unknown) => Promise<any>;
    getCustomer: (input: unknown) => Promise<any>;
    updateCustomer: (input: unknown) => Promise<any>;
    deactivateCustomer: (input: unknown) => Promise<any>;
    getCustomerTransactions: (input?: unknown) => Promise<any>;
    getCustomerReceivables: (input: unknown) => Promise<any>;
    payCustomerCredit: (input: unknown) => Promise<any>;
    getCustomerStats: (input: unknown) => Promise<any>;
    reportSales: (input?: unknown) => Promise<any>;
    reportBestSelling: (input?: unknown) => Promise<any>;
    reportSlowMoving: (input?: unknown) => Promise<any>;
    reportGrossProfit: (input?: unknown) => Promise<any>;
    reportInventoryValuation: (input?: unknown) => Promise<any>;
    reportPurchase: (input?: unknown) => Promise<any>;
    reportExpense: (input?: unknown) => Promise<any>;
    reportCashierPerformance: (input?: unknown) => Promise<any>;
    reportTransaction: (input?: unknown) => Promise<any>;
    usersGetAll: (input?: unknown) => Promise<any>;
    usersCreate: (input: unknown) => Promise<any>;
    usersUpdate: (input: unknown) => Promise<any>;
    usersDeactivate: (input: unknown) => Promise<any>;
    rolesGetAll: (input?: unknown) => Promise<any>;
    rolesCreate: (input: unknown) => Promise<any>;
    rolesUpdate: (input: unknown) => Promise<any>;
    rolesDeactivate: (input: unknown) => Promise<any>;
    rolesGetPermissions: (input: unknown) => Promise<any>;
    rolesSetPermissions: (input: unknown) => Promise<any>;
    permissionsGetAll: () => Promise<any>;
  };
}
