// This allows CSS imports without type errors
declare module '*.css' {
  const content: string;
  export default content;
}

// IPC global API declarations
interface Window {
  vyapara: {
    getAppInfo: () => Promise<{ name: string; version: string; platform: string }>;
    getEnvironmentStatus: () => Promise<{ online: boolean }>;
    authLogin: (email: string, password: string) => Promise<{ success: boolean; user?: any; error?: string }>;
    getProducts: (input: { token: string; search?: string; categoryId?: string; includeInactive?: boolean }) => Promise<any[]>;
    createProduct: (product: any) => Promise<any>;
    updateProduct: (product: any) => Promise<any>;
    deactivateProduct: (input: { token: string; id: string }) => Promise<any>;
    getCategories: () => Promise<any[]>;
    getUnits: () => Promise<any[]>;
    createTransaction: (transaction: any) => Promise<any>;
    getTransactions: (input: { token: string; limit?: number }) => Promise<any[]>;
    backupDatabase: (input: { backupPath: string }) => Promise<{ success: boolean; path?: string; error?: string }>;
    restoreDatabase: (input: { backupPath: string }) => Promise<{ success: boolean; error?: string }>;
    authSession: () => Promise<{ success: boolean; user?: any }>;
    authLogout: (token: string) => Promise<{ success: boolean }>;
    getSettings: (input: { token: string }) => Promise<any>;
    updateSettings: (settings: any) => Promise<any>;
    getStockMovements: (input: { token: string; productId?: string; movementType?: string; startDate?: string; endDate?: string; limit?: number }) => Promise<any[]>;
    createStockAdjustment: (input: { token: string; productId: string; adjustmentType: 'increase' | 'decrease'; quantity: number; reason?: string; referenceNumber?: string; notes?: string }) => Promise<any>;
    approveStockAdjustment: (input: { token: string; adjustmentId: string; approved: boolean; notes?: string }) => Promise<any>;
    getStockAdjustments: (input: { token: string; status?: string; productId?: string; limit?: number }) => Promise<any[]>;
    createStockOpname: (input: { token: string; location?: string; notes?: string }) => Promise<any>;
    addOpnameItem: (input: { token: string; opnameId: string; productId: string; physicalStock: number; notes?: string }) => Promise<any>;
    listOpnameItems: (input: { token: string; opnameId: string }) => Promise<any[]>;
    completeStockOpname: (input: { token: string; opnameId: string }) => Promise<any>;
    getStockOpnames: (input: { token: string; status?: string; limit?: number }) => Promise<any[]>;
    getLowStockAlerts: (input: { token: string }) => Promise<any[]>;
    getInventoryValuation: (input: { token: string }) => Promise<any>;
    upsertInventorySettings: (input: { token: string; productId: string; minimumStock?: number; maximumStock?: number; reorderPoint?: number; isLowStockAlertEnabled?: boolean }) => Promise<any>;
    createSupplier: (input: { token: string; name: string; contactPerson?: string; phone?: string; email?: string; address?: string; city?: string; postalCode?: string; country?: string; taxId?: string; paymentTerms?: number; creditLimit?: number; notes?: string }) => Promise<any>;
    getSuppliers: (input: { token: string; status?: string; search?: string; limit?: number }) => Promise<any[]>;
    updateSupplier: (input: { token: string; id: string; name?: string; contactPerson?: string; phone?: string; email?: string; address?: string; city?: string; postalCode?: string; country?: string; taxId?: string; paymentTerms?: number; creditLimit?: number; notes?: string }) => Promise<any>;
    deactivateSupplier: (input: { token: string; id: string }) => Promise<any>;
    getSupplierTransactions: (input: { token: string; supplierId?: string; transactionType?: string; startDate?: number; endDate?: number; limit?: number }) => Promise<any[]>;
  };
}
