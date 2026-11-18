import { app, BrowserWindow, ipcMain, Menu, shell, session, dialog, nativeImage } from 'electron';
import * as path from 'path';
import * as os from 'os';
import { z } from 'zod';
import * as fs from 'fs';
import { openAppDatabase } from './db/open';
import { getSyncCoordinator, initSyncCoordinator } from './sync';
import { checkForUpdates, downloadUpdate, installUpdate, getUpdateStatus, onUpdateStatus } from './services/updater';
import { ensureSuperadmin, getBranding, setBranding, copyLogo, copyIcon, resetIcon, brandLogoDataUrl, wipeSessions, wipeNonSuperadminUsers, factoryReset } from './services/superadmin';
import { logAudit, listAuditLogs } from './services/audit';
import { getLicenseStatus, activateLicense, verifyLicense } from './services/license';
import { getPrinterConfig, setPrinterConfig, listPrinters, printReceipt, printInvoice, printDeliveryOrder, type ReceiptPayload, type DeliveryOrderPayload } from './services/printer';
import { importProductsCsv, importCustomersCsv } from './services/import-export';
import {
  CustomerCreateSchema,
  CustomerIdSchema,
  CustomerQuerySchema,
  CustomerPaymentSchema,
  CustomerTransactionsQuerySchema,
  CustomerUpdateSchema,
  ExpenseCreateSchema,
  IncomeCreateSchema,
  IncomeExpenseQuerySchema,
  PermissionsGetAllSchema,
  PurchaseOrderCreateSchema,
  PurchaseOrderIdSchema,
  PurchaseOrderQuerySchema,
  PurchaseReturnCreateSchema,
  PurchaseReturnQuerySchema,
  ReceiveGoodsSchema,
  ReportQuerySchema,
  BestSellingQuerySchema,
  CashDrawerCloseSchema,
  CashDrawerOpenSchema,
  CashDrawerQuerySchema,
  CashMovementsQuerySchema,
  CashierPerformanceQuerySchema,
  ShiftRecapQuerySchema,
  RoleCreateSchema,
  RoleIdSchema,
  RoleQuerySchema,
  RolePermissionsSchema,
  RoleUpdateSchema,
  SettingsListSchema,
  SettingsUpsertSchema,
  SupplierCreateSchema,
  SupplierIdSchema,
  SupplierInvoiceCreateSchema,
  SupplierInvoiceIdSchema,
  SupplierInvoicePaySchema,
  SupplierInvoiceQuerySchema,
  SupplierQuerySchema,
  SupplierTransactionsQuerySchema,
  SupplierUpdateSchema,
  UserCreateSchema,
  UserIdSchema,
  UserQuerySchema,
  UserUpdateSchema,
} from 'vyapara-shared';

const AppInfoSchema = z.object({
  name: z.string(),
  version: z.string(),
  platform: z.string(),
});

const EnvironmentStatusSchema = z.object({
  online: z.boolean(),
});

type AppInfo = z.infer<typeof AppInfoSchema>;
type EnvironmentStatus = z.infer<typeof EnvironmentStatusSchema>;

const APP_ID = 'id.vyapara.desktop';
const APP_NAME = 'VYAPARA';
const VERSION = app.getVersion() || '1.0.0';

let appDb: ReturnType<typeof openAppDatabase> | null = null;
let activeToken: string | null = null;
let tokenLoaded = false;

function getSettingsRow(appDb: ReturnType<typeof openAppDatabase>, key: string, fallback: string): string {
  try {
    const row = appDb.sqlite.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
    return row?.value ?? fallback;
  } catch {
    return fallback;
  }
}

function getDb(): ReturnType<typeof openAppDatabase> {
  if (!appDb) {
    const dir = path.join(app.getPath('userData'), 'database');
    fs.mkdirSync(dir, { recursive: true });
    appDb = openAppDatabase(path.join(dir, 'vyapara.db'));
  }
  return appDb;
}

function tokenFile(): string {
  return path.join(app.getPath('userData'), 'session.token');
}

function loadToken(): string | null {
  if (!tokenLoaded) {
    tokenLoaded = true;
    try {
      activeToken = fs.readFileSync(tokenFile(), 'utf8').trim() || null;
    } catch {
      activeToken = null;
    }
  }
  return activeToken;
}

function setActiveToken(token: string | null): void {
  tokenLoaded = true;
  activeToken = token;
  try {
    if (token) {
      fs.writeFileSync(tokenFile(), token, { mode: 0o600 });
    } else {
      fs.rmSync(tokenFile(), { force: true });
    }
  } catch (error) {
    console.error('Failed to persist session token', error);
  }
}

function publicUser(user: {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: string[];
  mustChangePassword: boolean;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    permissions: user.permissions,
    mustChangePassword: user.mustChangePassword,
  };
}

let mainWindow: BrowserWindow | null;

let gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

const isOnline = () => {
  return Object.keys(os.networkInterfaces()).length > 0;
};

function createWindow() {
  // electron-vite sets ELECTRON_RENDERER_URL only in dev; packaged apps never have it
  const isDev = !!process.env.ELECTRON_RENDERER_URL;

  const preloadPath = path.join(__dirname, '..', 'preload', 'preload.mjs');

  let windowTitle = APP_NAME;
  let windowIcon: string | null = null;
  try {
    const b = getBranding(getDb());
    windowTitle = b.appName || APP_NAME;
    windowIcon = b.iconPath ?? null;
  } catch { /* branding optional at startup */ }
  const defaultIcon = path.join(__dirname, '..', '..', 'assets', 'brand', 'vyapara-icon.png');
  const iconNative = (() => {
    try {
      if (windowIcon && fs.existsSync(windowIcon)) {
        return nativeImage.createFromPath(windowIcon);
      }
    } catch { /* fall back */ }
    return nativeImage.createFromPath(defaultIcon);
  })();
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1366,
    minHeight: 768,
    title: windowTitle,
    icon: iconNative,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true,
      preload: preloadPath,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:1420').catch((err) => {
      console.error('Failed to load dev server:', err);
    });
  } else {
    const possiblePaths = [
      path.join(__dirname, '..', 'dist', 'index.html'),
      path.join(__dirname, '..', '..', 'dist', 'index.html'),
      path.join(__dirname, '..', '..', '..', 'dist', 'index.html'),
      path.join(app.getAppPath(), 'dist', 'index.html'),
      path.join(app.getAppPath(), '..', 'dist', 'index.html'),
    ];

    let indexPath = '';
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        indexPath = p;
        break;
      }
    }

    if (indexPath) {
      mainWindow.loadFile(indexPath).catch((err) => {
        console.error('Failed to load app:', err);
      });
    } else {
      console.error('Could not find index.html in any of the expected paths');
      console.error('Checked paths:', possiblePaths);
    }
  }

  Menu.setApplicationMenu(null);

  ipcMain.handle('app:getInfo', async (): Promise<AppInfo> => {
    return {
      name: APP_NAME,
      version: VERSION,
      platform: process.platform,
    };
  });

  ipcMain.handle('app:getEnvironmentStatus', async (): Promise<EnvironmentStatus> => {
    return {
      online: isOnline(),
    };
  });

  ipcMain.handle('auth:needsSetup', async () => {
    try {
      const { needsSetup } = await import('./services/auth');
      return { ok: true, success: true, data: { needsSetup: needsSetup(getDb()) } };
    } catch (error: any) {
      return { ok: false, success: false, error: { code: error.code || 'INTERNAL', message: error.message } };
    }
  });

  ipcMain.handle('auth:setup', async (_event: any, input: { name: string; email: string; password: string }) => {
    try {
      const { setupAdmin } = await import('./services/auth');
      const result = setupAdmin(getDb(), input);
      setActiveToken(result.token);
      return { ok: true, success: true, data: { token: result.token, user: publicUser(result.user) } };
    } catch (error: any) {
      return { ok: false, success: false, error: { code: error.code || 'INTERNAL', message: error.message } };
    }
  });

  ipcMain.handle('auth:login', async (_event: any, input: { email: string; password: string }) => {
    try {
      const { login } = await import('./services/auth');
      const result = login(getDb(), input);
      setActiveToken(result.token);
      return { ok: true, success: true, data: { token: result.token, user: publicUser(result.user) } };
    } catch (error: any) {
      const code = error.code || 'INTERNAL';
      const message = error.message || 'Terjadi kesalahan';
      return { ok: false, success: false, error: { code, message } };
    }
  });

  ipcMain.handle('auth:session', async () => {
    try {
      const { readSession } = await import('./services/auth');
      const token = loadToken();
      if (!token) {
        return { ok: false, success: false, error: { code: 'UNAUTHENTICATED', message: 'Sesi tidak ditemukan' } };
      }
      const user = readSession(getDb(), token);
      if (!user) {
        setActiveToken(null);
        return { ok: false, success: false, error: { code: 'UNAUTHENTICATED', message: 'Sesi tidak berlaku' } };
      }
      return { ok: true, success: true, data: { token, user: publicUser(user) } };
    } catch (error: any) {
      return { ok: false, success: false, error: { code: error.code || 'INTERNAL', message: error.message } };
    }
  });

  ipcMain.handle('auth:logout', async (_event: any, input: { token?: string } | undefined) => {
    try {
      const { logout } = await import('./services/auth');
      const token = input?.token || loadToken();
      if (token) {
        logout(getDb(), token);
      }
      setActiveToken(null);
      return { ok: true, success: true };
    } catch (error: any) {
      setActiveToken(null);
      return { ok: false, success: false, error: { code: error.code || 'INTERNAL', message: error.message } };
    }
  });

  ipcMain.handle('auth:changePassword', async (_event: any, input: { token: string; currentPassword: string; nextPassword: string }) => {
    try {
      const { changePassword } = await import('./services/auth');
      const result = changePassword(getDb(), input.token, input.currentPassword, input.nextPassword);
      setActiveToken(result.token);
      return { ok: true, success: true, data: { token: result.token, user: publicUser(result.user) } };
    } catch (error: any) {
      return { ok: false, success: false, error: { code: error.code || 'INTERNAL', message: error.message } };
    }
  });

  ipcMain.handle('product:getAll', async (event: any, input: { token: string; search?: string; categoryId?: string; includeInactive?: boolean }) => {
    try {
      const { listProducts } = await import('./services/products');
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, input.token);
      assertPermission(user, 'product:read');
      const result = listProducts(appDb, input, true);
      return { ok: true, success: true, data: result };
    } catch (error: any) {
      return { ok: false, success: false, error: { code: error.code || 'INTERNAL', message: error.message } };
    }
  });

  ipcMain.handle('product:create', async (event: any, input: { token: string; name: string; description?: string; categoryId?: string; unitId?: string; barcode?: string; sku?: string; price: number; cost?: number; stock: number }) => {
    try {
      const { createProduct } = await import('./services/products');
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, input.token);
      assertPermission(user, 'product:write');
      const result = createProduct(appDb, { ...input, cost: input.cost ?? 0, userId: user.id });
      return { ok: true, success: true, data: result };
    } catch (error: any) {
      return { ok: false, success: false, error: { code: error.code || 'INTERNAL', message: error.message } };
    }
  });

  ipcMain.handle('product:update', async (event: any, input: { token: string; id: string; name?: string; description?: string; categoryId?: string; unitId?: string; barcode?: string; sku?: string; price?: number; cost?: number; stock?: number; isActive?: boolean }) => {
    try {
      const { updateProduct } = await import('./services/products');
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, input.token);
      assertPermission(user, 'product:write');
      const result = updateProduct(appDb, { ...input, userId: user.id });
      return { ok: true, success: true, data: result };
    } catch (error: any) {
      return { ok: false, success: false, error: { code: error.code || 'INTERNAL', message: error.message } };
    }
  });

  ipcMain.handle('product:deactivate', async (event: any, input: { token: string; id: string }) => {
    try {
      const { deactivateProduct } = await import('./services/products');
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, input.token);
      assertPermission(user, 'product:write');
      const result = deactivateProduct(appDb, input.id, user.id);
      return { ok: true, success: true, data: result };
    } catch (error: any) {
      return { ok: false, success: false, error: { code: error.code || 'INTERNAL', message: error.message } };
    }
  });

  ipcMain.handle('category:getAll', async (event: any, input: { token: string }) => {
    try {
      const { listCategories } = await import('./services/products');
      const { requireUser } = await import('./services/auth');
      const appDb = getDb();
      requireUser(appDb, input?.token);
      const result = listCategories(appDb);
      return { ok: true, success: true, data: result };
    } catch (error: any) {
      return { ok: false, success: false, error: { code: error.code || 'INTERNAL', message: error.message } };
    }
  });

  ipcMain.handle('unit:getAll', async (event: any, input: { token: string }) => {
    try {
      const { listUnits } = await import('./services/products');
      const { requireUser } = await import('./services/auth');
      const appDb = getDb();
      requireUser(appDb, input?.token);
      const result = listUnits(appDb);
      return { ok: true, success: true, data: result };
    } catch (error: any) {
      return { ok: false, success: false, error: { code: error.code || 'INTERNAL', message: error.message } };
    }
  });

  ipcMain.handle('transaction:create', async (_event: any, input: { token: string; items: any; discountAmount: number; payments: any; customerId?: string; notes?: string; idempotencyKey?: string }) => {
    try {
      const { createTransaction } = await import('./services/transactions');
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, input.token);
      assertPermission(user, 'transaction:write');
      const result = createTransaction(appDb, user.id, { ...input, idempotencyKey: input.idempotencyKey ?? crypto.randomUUID() });
      return { ok: true, success: true, data: result };
    } catch (error: any) {
      return { ok: false, success: false, error: { code: error.code || 'INTERNAL', message: error.message } };
    }
  });

  ipcMain.handle('transaction:getAll', async (event: any, input: { token: string; limit?: number }) => {
    try {
      const { listTransactions } = await import('./services/transactions');
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, input.token);
      assertPermission(user, 'transaction:read');
      const limit = Math.min(Math.max(Number(input?.limit) || 200, 1), 1000);
      const result = listTransactions(appDb, limit);
      return { ok: true, success: true, data: result };
    } catch (error: any) {
      return { ok: false, success: false, error: { code: error.code || 'INTERNAL', message: error.message } };
    }
  });

  ipcMain.handle('transaction:summary', async (event: any, input: { token: string; items: any; discountAmount: number; taxRateBps: number; payments: any }) => {
    try {
      const { todaySummary } = await import('./services/transactions');
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, input.token);
      assertPermission(user, 'transaction:read');
      const summary = todaySummary(appDb);
      return { ok: true, success: true, data: { subtotal: summary.total, discountAmount: 0, taxAmount: 0, total: summary.total, count: summary.count } };
    } catch (error: any) {
      return { ok: false, success: false, error: { code: error.code || 'INTERNAL', message: error.message } };
    }
  });

  ipcMain.handle('dialog:pickSavePath', async (_event: any, input: { token: string; defaultName?: string }) => {
    try {
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, input?.token);
      assertPermission(user, 'settings:write');
      const { canceled, filePath } = await dialog.showSaveDialog({
        title: 'Simpan Backup Database',
        defaultPath: input?.defaultName ?? 'vyapara-backup.vyapara-backup',
        filters: [{ name: 'VYAPARA Backup', extensions: ['vyapara-backup'] }],
      });
      if (canceled || !filePath) return { ok: true, success: true, data: { path: null } };
      return { ok: true, success: true, data: { path: filePath } };
    } catch (error: any) {
      return { ok: false, success: false, error: { code: error.code || 'INTERNAL', message: error.message } };
    }
  });

  ipcMain.handle('dialog:pickRestoreFile', async (_event: any, input: { token: string }) => {
    try {
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, input?.token);
      assertPermission(user, 'settings:write');
      const { canceled, filePaths } = await dialog.showOpenDialog({
        title: 'Pilih File Backup untuk Restore',
        properties: ['openFile'],
        filters: [{ name: 'VYAPARA Backup', extensions: ['vyapara-backup', 'db', 'sqlite', 'bak'] }],
      });
      if (canceled || !filePaths?.[0]) return { ok: true, success: true, data: { path: null } };
      return { ok: true, success: true, data: { path: filePaths[0] } };
    } catch (error: any) {
      return { ok: false, success: false, error: { code: error.code || 'INTERNAL', message: error.message } };
    }
  });

  ipcMain.handle('database:backup', async (event: any, input: { token: string; backupPath: string }) => {
    try {
      const { backupDatabase } = await import('./services/backup');
      const { requireUser, assertPermission } = await import('./services/auth');
      if (!input || typeof input.backupPath !== 'string' || input.backupPath.trim().length < 3) {
        return { ok: false, success: false, error: { code: 'VALIDATION', message: 'Lokasi cadangan tidak valid' } };
      }
      const appDb = getDb();
      const user = requireUser(appDb, input.token);
      assertPermission(user, 'settings:write');
      const result = await backupDatabase(appDb, input.backupPath);
      return { ok: true, success: true, data: { path: result } };
    } catch (error: any) {
      return { ok: false, success: false, error: { code: error.code || 'INTERNAL', message: error.message } };
    }
  });

  ipcMain.handle('database:restore', async (event: any, input: { token: string; backupPath: string }) => {
    try {
      const { restoreDatabase } = await import('./services/backup');
      const { requireUser, assertPermission } = await import('./services/auth');
      if (!input || typeof input.backupPath !== 'string' || input.backupPath.trim().length < 3) {
        return { ok: false, success: false, error: { code: 'VALIDATION', message: 'File cadangan tidak valid' } };
      }
      const appDb = getDb();
      const user = requireUser(appDb, input.token);
      assertPermission(user, 'settings:write');
      await restoreDatabase(appDb, input.backupPath);
      logAudit(appDb, { userId: user.id, userName: user.name, action: 'database.restore', entity: 'database', detail: `Restore dari ${input.backupPath}` });
      return { ok: true, success: true };
    } catch (error: any) {
      return { ok: false, success: false, error: { code: error.code || 'INTERNAL', message: error.message } };
    }
  });

  ipcMain.handle('settings:get', async (event: any, input: { token: string }) => {
    try {
      const { getSettings } = await import('./services/settings');
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, input.token);
      assertPermission(user, 'settings:read');
      const result = getSettings(appDb);
      return { ok: true, success: true, data: result };
    } catch (error: any) {
      return { ok: false, success: false, error: { code: error.code || 'INTERNAL', message: error.message } };
    }
  });

  ipcMain.handle('settings:update', async (event: any, input: { token: string; taxRateBps: number; storeName: string; receiptFooter: string }) => {
    try {
      const { updateSettings } = await import('./services/settings');
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, input.token);
      assertPermission(user, 'settings:write');
      const result = updateSettings(appDb, input);
      return { ok: true, success: true, data: result };
    } catch (error: any) {
      return { ok: false, success: false, error: { code: error.code || 'INTERNAL', message: error.message } };
    }
  });

  ipcMain.handle('inventory:getMovements', async (event: any, input: { token: string; productId?: string; movementType?: string; startDate?: string; endDate?: string; limit?: number }) => {
    try {
      const { listStockMovements } = await import('./services/inventory');
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, input.token);
      assertPermission(user, 'inventory:read');
      const result = listStockMovements(appDb, { productId: input.productId, movementType: input.movementType, startDate: input.startDate, endDate: input.endDate, limit: input.limit });
      return { ok: true, success: true, data: result };
    } catch (error: any) {
      return { ok: false, success: false, error: { code: error.code || 'INTERNAL', message: error.message } };
    }
  });

  ipcMain.handle('inventory:createAdjustment', async (event: any, input: { token: string; productId: string; adjustmentType: 'increase' | 'decrease'; quantity: number; reason?: string; referenceNumber?: string; notes?: string }) => {
    try {
      const { createStockAdjustment } = await import('./services/inventory');
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, input.token);
      assertPermission(user, 'inventory:adjust');
      const result = createStockAdjustment(appDb, { ...input, userId: user.id });
      return { ok: true, success: true, data: result };
    } catch (error: any) {
      return { ok: false, success: false, error: { code: error.code || 'INTERNAL', message: error.message } };
    }
  });

  ipcMain.handle('inventory:approveAdjustment', async (event: any, input: { token: string; adjustmentId: string; approved: boolean; notes?: string }) => {
    try {
      const { approveStockAdjustment } = await import('./services/inventory');
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, input.token);
      assertPermission(user, 'inventory:approve');
      const result = approveStockAdjustment(appDb, { ...input, approverId: user.id });
      return { ok: true, success: true, data: result };
    } catch (error: any) {
      return { ok: false, success: false, error: { code: error.code || 'INTERNAL', message: error.message } };
    }
  });

  ipcMain.handle('inventory:getAdjustments', async (event: any, input: { token: string; status?: string; productId?: string; limit?: number }) => {
    try {
      const { listStockAdjustments } = await import('./services/inventory');
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, input.token);
      assertPermission(user, 'inventory:read');
      const result = listStockAdjustments(appDb, { status: input.status, productId: input.productId, limit: input.limit });
      return { ok: true, success: true, data: result };
    } catch (error: any) {
      return { ok: false, success: false, error: { code: error.code || 'INTERNAL', message: error.message } };
    }
  });

  ipcMain.handle('inventory:createOpname', async (event: any, input: { token: string; location?: string; notes?: string }) => {
    try {
      const { createStockOpname } = await import('./services/inventory');
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, input.token);
      assertPermission(user, 'inventory:opname');
      const result = createStockOpname(appDb, { ...input, userId: user.id });
      return { ok: true, success: true, data: result };
    } catch (error: any) {
      return { ok: false, success: false, error: { code: error.code || 'INTERNAL', message: error.message } };
    }
  });

  ipcMain.handle('inventory:addOpnameItem', async (event: any, input: { token: string; opnameId: string; productId: string; physicalStock: number; notes?: string }) => {
    try {
      const { addOpnameItem } = await import('./services/inventory');
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, input.token);
      assertPermission(user, 'inventory:opname');
      const result = addOpnameItem(appDb, input);
      return { ok: true, success: true, data: result };
    } catch (error: any) {
      return { ok: false, success: false, error: { code: error.code || 'INTERNAL', message: error.message } };
    }
  });

  ipcMain.handle('inventory:listOpnameItems', async (event: any, input: { token: string; opnameId: string }) => {
    try {
      const { listOpnameItems } = await import('./services/inventory');
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, input.token);
      assertPermission(user, 'inventory:read');
      const result = listOpnameItems(appDb, input.opnameId);
      return { ok: true, success: true, data: result };
    } catch (error: any) {
      return { ok: false, success: false, error: { code: error.code || 'INTERNAL', message: error.message } };
    }
  });

  ipcMain.handle('inventory:completeOpname', async (event: any, input: { token: string; opnameId: string }) => {
    try {
      const { completeStockOpname } = await import('./services/inventory');
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, input.token);
      assertPermission(user, 'inventory:opname');
      const result = completeStockOpname(appDb, { ...input, userId: user.id });
      return { ok: true, success: true, data: result };
    } catch (error: any) {
      return { ok: false, success: false, error: { code: error.code || 'INTERNAL', message: error.message } };
    }
  });

  ipcMain.handle('inventory:getOpnames', async (event: any, input: { token: string; status?: string; limit?: number }) => {
    try {
      const { listStockOpnames } = await import('./services/inventory');
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, input.token);
      assertPermission(user, 'inventory:read');
      const result = listStockOpnames(appDb, { status: input.status, limit: input.limit });
      return { ok: true, success: true, data: result };
    } catch (error: any) {
      return { ok: false, success: false, error: { code: error.code || 'INTERNAL', message: error.message } };
    }
  });

  ipcMain.handle('inventory:getLowStockAlerts', async (event: any, input: { token: string }) => {
    try {
      const { getLowStockAlerts } = await import('./services/inventory');
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, input.token);
      assertPermission(user, 'inventory:read');
      const result = getLowStockAlerts(appDb);
      return { ok: true, success: true, data: result };
    } catch (error: any) {
      return { ok: false, success: false, error: { code: error.code || 'INTERNAL', message: error.message } };
    }
  });

  ipcMain.handle('inventory:getValuation', async (event: any, input: { token: string }) => {
    try {
      const { getInventoryValuation } = await import('./services/inventory');
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, input.token);
      assertPermission(user, 'inventory:read');
      const result = getInventoryValuation(appDb);
      return { ok: true, success: true, data: result };
    } catch (error: any) {
      return { ok: false, success: false, error: { code: error.code || 'INTERNAL', message: error.message } };
    }
  });

  ipcMain.handle('inventory:upsertSettings', async (event: any, input: { token: string; productId: string; minimumStock?: number; maximumStock?: number; reorderPoint?: number; isLowStockAlertEnabled?: boolean }) => {
    try {
      const { upsertProductInventorySettings } = await import('./services/inventory');
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, input.token);
      assertPermission(user, 'inventory:write');
      const result = upsertProductInventorySettings(appDb, input);
      return { ok: true, success: true, data: result };
    } catch (error: any) {
      return { ok: false, success: false, error: { code: error.code || 'INTERNAL', message: error.message } };
    }
  });

  ipcMain.handle('supplier:create', async (event: any, input: unknown) => {
    try {
      const parsed = SupplierCreateSchema.parse(input);
      const { createSupplier } = await import('./services/supplier');
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, parsed.token);
      assertPermission(user, 'supplier:write');
      const result = createSupplier(appDb, { ...parsed, userId: user.id });
      return { ok: true, success: true, data: result };
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return { ok: false, success: false, error: { code: 'VALIDATION', message: error.issues[0]?.message || 'Invalid input' } };
      }
      const code = error.code || 'INTERNAL';
      const message = error.message || 'Terjadi kesalahan';
      return { ok: false, success: false, error: { code, message } };
    }
  });

  ipcMain.handle('supplier:getAll', async (event: any, input: unknown) => {
    try {
      const parsed = SupplierQuerySchema.parse(input);
      const { listSuppliers } = await import('./services/supplier');
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, parsed.token);
      assertPermission(user, 'supplier:read');
      const result = listSuppliers(appDb, { status: parsed.status, search: parsed.search, limit: parsed.limit });
      return { ok: true, success: true, data: result };
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return { ok: false, success: false, error: { code: 'VALIDATION', message: error.issues[0]?.message || 'Invalid input' } };
      }
      const code = error.code || 'INTERNAL';
      const message = error.message || 'Terjadi kesalahan';
      return { ok: false, success: false, error: { code, message } };
    }
  });

  ipcMain.handle('supplier:update', async (event: any, input: unknown) => {
    try {
      const parsed = SupplierUpdateSchema.parse(input);
      const { updateSupplier } = await import('./services/supplier');
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, parsed.token);
      assertPermission(user, 'supplier:write');
      const { token: _, ...supplierInput } = parsed;
      const cleanInput: { id: string; name?: string; contactPerson?: string; phone?: string; email?: string; address?: string; city?: string; postalCode?: string; country?: string; taxId?: string; notes?: string } = {
        id: supplierInput.id,
        name: supplierInput.name,
        contactPerson: supplierInput.contactPerson ?? undefined,
        phone: supplierInput.phone ?? undefined,
        email: supplierInput.email ?? undefined,
        address: supplierInput.address ?? undefined,
        city: supplierInput.city ?? undefined,
        postalCode: supplierInput.postalCode ?? undefined,
        country: supplierInput.country ?? undefined,
        taxId: supplierInput.taxId ?? undefined,
        notes: supplierInput.notes ?? undefined,
      };
      const result = updateSupplier(appDb, cleanInput);
      return { ok: true, success: true, data: result };
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return { ok: false, success: false, error: { code: 'VALIDATION', message: error.issues[0]?.message || 'Invalid input' } };
      }
      const code = error.code || 'INTERNAL';
      const message = error.message || 'Terjadi kesalahan';
      return { ok: false, success: false, error: { code, message } };
    }
  });

  ipcMain.handle('supplier:deactivate', async (event: any, input: unknown) => {
    try {
      const parsed = SupplierIdSchema.parse(input);
      const { deactivateSupplier } = await import('./services/supplier');
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, parsed.token);
      assertPermission(user, 'supplier:delete');
      deactivateSupplier(appDb, parsed.id);
      return { ok: true, success: true };
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return { ok: false, success: false, error: { code: 'VALIDATION', message: error.issues[0]?.message || 'Invalid input' } };
      }
      const code = error.code || 'INTERNAL';
      const message = error.message || 'Terjadi kesalahan';
      return { ok: false, success: false, error: { code, message } };
    }
  });

  ipcMain.handle('supplier:getTransactions', async (event: any, input: unknown) => {
    try {
      const parsed = SupplierTransactionsQuerySchema.parse(input);
      const { listSupplierTransactions } = await import('./services/supplier');
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, parsed.token);
      assertPermission(user, 'supplier:transactions');
      const result = listSupplierTransactions(appDb, { supplierId: parsed.supplierId, transactionType: parsed.transactionType, startDate: parsed.startDate, endDate: parsed.endDate, limit: parsed.limit });
      return { ok: true, success: true, data: result };
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return { ok: false, success: false, error: { code: 'VALIDATION', message: error.issues[0]?.message || 'Invalid input' } };
      }
      const code = error.code || 'INTERNAL';
      const message = error.message || 'Terjadi kesalahan';
      return { ok: false, success: false, error: { code, message } };
    }
  });

  ipcMain.handle('supplier:invoiceCreate', async (_event: any, input: unknown) => {
    try {
      const parsed = SupplierInvoiceCreateSchema.parse(input);
      const { createSupplierInvoice } = await import('./services/supplier');
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, parsed.token);
      assertPermission(user, 'supplier:transactions');
      const result = createSupplierInvoice(appDb, { ...parsed, userId: user.id });
      return { ok: true, success: true, data: result };
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return { ok: false, success: false, error: { code: 'VALIDATION', message: error.issues[0]?.message || 'Invalid input' } };
      }
      return { ok: false, success: false, error: { code: error.code || 'INTERNAL', message: error.message || 'Terjadi kesalahan' } };
    }
  });

  ipcMain.handle('supplier:invoiceGetAll', async (_event: any, input: unknown) => {
    try {
      const parsed = SupplierInvoiceQuerySchema.parse(input);
      const { listSupplierInvoices } = await import('./services/supplier');
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, parsed.token);
      assertPermission(user, 'supplier:read');
      const result = listSupplierInvoices(appDb, parsed);
      return { ok: true, success: true, data: result };
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return { ok: false, success: false, error: { code: 'VALIDATION', message: error.issues[0]?.message || 'Invalid input' } };
      }
      return { ok: false, success: false, error: { code: error.code || 'INTERNAL', message: error.message || 'Terjadi kesalahan' } };
    }
  });

  ipcMain.handle('supplier:invoiceGet', async (_event: any, input: unknown) => {
    try {
      const parsed = SupplierInvoiceIdSchema.parse(input);
      const { getSupplierInvoice } = await import('./services/supplier');
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, parsed.token);
      assertPermission(user, 'supplier:read');
      const result = getSupplierInvoice(appDb, parsed.id);
      if (!result) {
        return { ok: false, success: false, error: { code: 'NOT_FOUND', message: 'Invoice tidak ditemukan' } };
      }
      return { ok: true, success: true, data: result };
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return { ok: false, success: false, error: { code: 'VALIDATION', message: error.issues[0]?.message || 'Invalid input' } };
      }
      return { ok: false, success: false, error: { code: error.code || 'INTERNAL', message: error.message || 'Terjadi kesalahan' } };
    }
  });

  ipcMain.handle('supplier:invoicePay', async (_event: any, input: unknown) => {
    try {
      const parsed = SupplierInvoicePaySchema.parse(input);
      const { paySupplierInvoice } = await import('./services/supplier');
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, parsed.token);
      assertPermission(user, 'supplier:transactions');
      const result = paySupplierInvoice(appDb, { ...parsed, userId: user.id });
      return { ok: true, success: true, data: result };
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return { ok: false, success: false, error: { code: 'VALIDATION', message: error.issues[0]?.message || 'Invalid input' } };
      }
      return { ok: false, success: false, error: { code: error.code || 'INTERNAL', message: error.message || 'Terjadi kesalahan' } };
    }
  });

  ipcMain.handle('supplier:getPayables', async (_event: any, input: { token: string }) => {
    try {
      const { getPayablesSummary } = await import('./services/supplier');
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, input.token);
      assertPermission(user, 'supplier:read');
      return { ok: true, success: true, data: getPayablesSummary(appDb) };
    } catch (error: any) {
      return { ok: false, success: false, error: { code: error.code || 'INTERNAL', message: error.message || 'Terjadi kesalahan' } };
    }
  });

  // ===== Procurement =====

  ipcMain.handle('procurement:createPurchaseOrder', async (event: any, input: unknown) => {
    try {
      const parsed = PurchaseOrderCreateSchema.parse(input);
      const { createPurchaseOrder } = await import('./services/procurement');
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, parsed.token);
      assertPermission(user, 'procurement:write');
      const result = createPurchaseOrder(appDb, { ...parsed, userId: user.id });
      return { ok: true, success: true, data: result };
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return { ok: false, success: false, error: { code: 'VALIDATION', message: error.issues[0]?.message || 'Invalid input' } };
      }
      const code = error.code || 'INTERNAL';
      const message = error.message || 'Terjadi kesalahan';
      return { ok: false, success: false, error: { code, message } };
    }
  });

  ipcMain.handle('procurement:getPurchaseOrders', async (event: any, input: unknown) => {
    try {
      const parsed = PurchaseOrderQuerySchema.parse(input);
      const { listPurchaseOrders } = await import('./services/procurement');
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, parsed.token);
      assertPermission(user, 'procurement:read');
      const result = listPurchaseOrders(appDb, { status: parsed.status, supplierId: parsed.supplierId, startDate: parsed.startDate, endDate: parsed.endDate, limit: parsed.limit });
      return { ok: true, success: true, data: result };
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return { ok: false, success: false, error: { code: 'VALIDATION', message: error.issues[0]?.message || 'Invalid input' } };
      }
      const code = error.code || 'INTERNAL';
      const message = error.message || 'Terjadi kesalahan';
      return { ok: false, success: false, error: { code, message } };
    }
  });

  ipcMain.handle('procurement:getPurchaseOrder', async (event: any, input: unknown) => {
    try {
      const parsed = PurchaseOrderIdSchema.parse(input);
      const { getPurchaseOrder } = await import('./services/procurement');
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, parsed.token);
      assertPermission(user, 'procurement:read');
      const result = getPurchaseOrder(appDb, parsed.id);
      if (!result) {
        return { ok: false, success: false, error: { code: 'NOT_FOUND', message: 'Purchase order tidak ditemukan' } };
      }
      return { ok: true, success: true, data: result };
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return { ok: false, success: false, error: { code: 'VALIDATION', message: error.issues[0]?.message || 'Invalid input' } };
      }
      const code = error.code || 'INTERNAL';
      const message = error.message || 'Terjadi kesalahan';
      return { ok: false, success: false, error: { code, message } };
    }
  });

  ipcMain.handle('procurement:cancelPurchaseOrder', async (event: any, input: unknown) => {
    try {
      const parsed = PurchaseOrderIdSchema.parse(input);
      const { cancelPurchaseOrder } = await import('./services/procurement');
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, parsed.token);
      assertPermission(user, 'procurement:write');
      const result = cancelPurchaseOrder(appDb, parsed.id);
      if (!result) {
        return { ok: false, success: false, error: { code: 'NOT_FOUND', message: 'Purchase order tidak ditemukan' } };
      }
      return { ok: true, success: true, data: result };
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return { ok: false, success: false, error: { code: 'VALIDATION', message: error.issues[0]?.message || 'Invalid input' } };
      }
      const code = error.code || 'INTERNAL';
      const message = error.message || 'Terjadi kesalahan';
      return { ok: false, success: false, error: { code, message } };
    }
  });

  ipcMain.handle('procurement:receiveGoods', async (event: any, input: unknown) => {
    try {
      const parsed = ReceiveGoodsSchema.parse(input);
      const { receiveGoods } = await import('./services/procurement');
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, parsed.token);
      assertPermission(user, 'procurement:write');
      const result = receiveGoods(appDb, { ...parsed, userId: user.id });
      return { ok: true, success: true, data: result };
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return { ok: false, success: false, error: { code: 'VALIDATION', message: error.issues[0]?.message || 'Invalid input' } };
      }
      const code = error.code || 'INTERNAL';
      const message = error.message || 'Terjadi kesalahan';
      return { ok: false, success: false, error: { code, message } };
    }
  });

  ipcMain.handle('procurement:getReceiving', async (event: any, input: { token: string; purchaseOrderId?: string; limit?: number }) => {
    try {
      const { listGoodsReceiving } = await import('./services/procurement');
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, input.token);
      assertPermission(user, 'procurement:read');
      const result = listGoodsReceiving(appDb, { purchaseOrderId: input.purchaseOrderId, limit: input.limit });
      return { ok: true, success: true, data: result };
    } catch (error: any) {
      const code = error.code || 'INTERNAL';
      const message = error.message || 'Terjadi kesalahan';
      return { ok: false, success: false, error: { code, message } };
    }
  });

  ipcMain.handle('procurement:createPurchaseReturn', async (event: any, input: unknown) => {
    try {
      const parsed = PurchaseReturnCreateSchema.parse(input);
      const { createPurchaseReturn } = await import('./services/procurement');
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, parsed.token);
      assertPermission(user, 'procurement:write');
      const result = createPurchaseReturn(appDb, { ...parsed, userId: user.id });
      return { ok: true, success: true, data: result };
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return { ok: false, success: false, error: { code: 'VALIDATION', message: error.issues[0]?.message || 'Invalid input' } };
      }
      const code = error.code || 'INTERNAL';
      const message = error.message || 'Terjadi kesalahan';
      return { ok: false, success: false, error: { code, message } };
    }
  });

  ipcMain.handle('procurement:getPurchaseReturns', async (event: any, input: unknown) => {
    try {
      const parsed = PurchaseReturnQuerySchema.parse(input);
      const { listPurchaseReturns } = await import('./services/procurement');
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, parsed.token);
      assertPermission(user, 'procurement:read');
      const result = listPurchaseReturns(appDb, { purchaseOrderId: parsed.purchaseOrderId, limit: parsed.limit });
      return { ok: true, success: true, data: result };
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return { ok: false, success: false, error: { code: 'VALIDATION', message: error.issues[0]?.message || 'Invalid input' } };
      }
      const code = error.code || 'INTERNAL';
      const message = error.message || 'Terjadi kesalahan';
      return { ok: false, success: false, error: { code, message } };
    }
  });

  // ===== Finance =====

  ipcMain.handle('finance:openCashDrawer', async (event: any, input: unknown) => {
    try {
      const parsed = CashDrawerOpenSchema.parse(input);
      const { openCashDrawer } = await import('./services/finance');
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, parsed.token);
      assertPermission(user, 'finance:write');
      const result = openCashDrawer(appDb, { userId: user.id, openingBalance: parsed.openingBalance, notes: parsed.notes });
      return { ok: true, success: true, data: result };
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return { ok: false, success: false, error: { code: 'VALIDATION', message: error.issues[0]?.message || 'Invalid input' } };
      }
      const code = error.code || 'INTERNAL';
      const message = error.message || 'Terjadi kesalahan';
      return { ok: false, success: false, error: { code, message } };
    }
  });

  ipcMain.handle('finance:closeCashDrawer', async (event: any, input: unknown) => {
    try {
      const parsed = CashDrawerCloseSchema.parse(input);
      const { closeCashDrawer } = await import('./services/finance');
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, parsed.token);
      assertPermission(user, 'finance:write');
      const result = closeCashDrawer(appDb, { cashDrawerId: parsed.cashDrawerId, closingBalance: parsed.closingBalance, notes: parsed.notes, userId: user.id });
      return { ok: true, success: true, data: result };
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return { ok: false, success: false, error: { code: 'VALIDATION', message: error.issues[0]?.message || 'Invalid input' } };
      }
      const code = error.code || 'INTERNAL';
      const message = error.message || 'Terjadi kesalahan';
      return { ok: false, success: false, error: { code, message } };
    }
  });

  ipcMain.handle('finance:getCashDrawers', async (event: any, input: unknown) => {
    try {
      const parsed = CashDrawerQuerySchema.parse(input);
      const { listCashDrawers } = await import('./services/finance');
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, parsed.token);
      assertPermission(user, 'finance:read');
      const result = listCashDrawers(appDb, { status: parsed.status, userId: parsed.userId, startDate: parsed.startDate, endDate: parsed.endDate, limit: parsed.limit });
      return { ok: true, success: true, data: result };
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return { ok: false, success: false, error: { code: 'VALIDATION', message: error.issues[0]?.message || 'Invalid input' } };
      }
      const code = error.code || 'INTERNAL';
      const message = error.message || 'Terjadi kesalahan';
      return { ok: false, success: false, error: { code, message } };
    }
  });

  ipcMain.handle('finance:recordIncome', async (event: any, input: unknown) => {
    try {
      const parsed = IncomeCreateSchema.parse(input);
      const { recordIncome } = await import('./services/finance');
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, parsed.token);
      assertPermission(user, 'finance:write');
      const result = recordIncome(appDb, { ...parsed, createdBy: user.id });
      return { ok: true, success: true, data: result };
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return { ok: false, success: false, error: { code: 'VALIDATION', message: error.issues[0]?.message || 'Invalid input' } };
      }
      const code = error.code || 'INTERNAL';
      const message = error.message || 'Terjadi kesalahan';
      return { ok: false, success: false, error: { code, message } };
    }
  });

  ipcMain.handle('finance:recordExpense', async (event: any, input: unknown) => {
    try {
      const parsed = ExpenseCreateSchema.parse(input);
      const { recordExpense } = await import('./services/finance');
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, parsed.token);
      assertPermission(user, 'finance:write');
      const result = recordExpense(appDb, { ...parsed, createdBy: user.id });
      return { ok: true, success: true, data: result };
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return { ok: false, success: false, error: { code: 'VALIDATION', message: error.issues[0]?.message || 'Invalid input' } };
      }
      const code = error.code || 'INTERNAL';
      const message = error.message || 'Terjadi kesalahan';
      return { ok: false, success: false, error: { code, message } };
    }
  });

  ipcMain.handle('finance:getCashMovements', async (event: any, input: unknown) => {
    try {
      const parsed = CashMovementsQuerySchema.parse(input);
      const { listCashMovements } = await import('./services/finance');
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, parsed.token);
      assertPermission(user, 'finance:read');
      const result = listCashMovements(appDb, { cashDrawerId: parsed.cashDrawerId, movementType: parsed.movementType, startDate: parsed.startDate, endDate: parsed.endDate, limit: parsed.limit });
      return { ok: true, success: true, data: result };
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return { ok: false, success: false, error: { code: 'VALIDATION', message: error.issues[0]?.message || 'Invalid input' } };
      }
      const code = error.code || 'INTERNAL';
      const message = error.message || 'Terjadi kesalahan';
      return { ok: false, success: false, error: { code, message } };
    }
  });

  ipcMain.handle('finance:getIncomeExpense', async (event: any, input: unknown) => {
    try {
      const parsed = IncomeExpenseQuerySchema.parse(input);
      const { listIncomeRecords, listExpenseRecords } = await import('./services/finance');
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, parsed.token);
      assertPermission(user, 'finance:read');
      const income = listIncomeRecords(appDb, { startDate: parsed.startDate, endDate: parsed.endDate, limit: 1000 });
      const expense = listExpenseRecords(appDb, { startDate: parsed.startDate, endDate: parsed.endDate, limit: 1000 });
      return { ok: true, success: true, data: { income, expense } };
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return { ok: false, success: false, error: { code: 'VALIDATION', message: error.issues[0]?.message || 'Invalid input' } };
      }
      const code = error.code || 'INTERNAL';
      const message = error.message || 'Terjadi kesalahan';
      return { ok: false, success: false, error: { code, message } };
    }
  });

  ipcMain.handle('finance:getProfitAndLoss', async (event: any, input: unknown) => {
    try {
      const parsed = IncomeExpenseQuerySchema.parse(input);
      const { getProfitAndLoss } = await import('./services/finance');
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, parsed.token);
      assertPermission(user, 'finance:read');
      const result = getProfitAndLoss(appDb, { startDate: parsed.startDate, endDate: parsed.endDate });
      return { ok: true, success: true, data: result };
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return { ok: false, success: false, error: { code: 'VALIDATION', message: error.issues[0]?.message || 'Invalid input' } };
      }
      const code = error.code || 'INTERNAL';
      const message = error.message || 'Terjadi kesalahan';
      return { ok: false, success: false, error: { code, message } };
    }
  });

  ipcMain.handle('finance:getCashFlow', async (event: any, input: unknown) => {
    try {
      const parsed = IncomeExpenseQuerySchema.parse(input);
      const { getCashFlow } = await import('./services/finance');
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, parsed.token);
      assertPermission(user, 'finance:read');
      const result = getCashFlow(appDb, { startDate: parsed.startDate, endDate: parsed.endDate });
      return { ok: true, success: true, data: result };
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return { ok: false, success: false, error: { code: 'VALIDATION', message: error.issues[0]?.message || 'Invalid input' } };
      }
      const code = error.code || 'INTERNAL';
      const message = error.message || 'Terjadi kesalahan';
      return { ok: false, success: false, error: { code, message } };
    }
  });

  // ===== Customer =====

  ipcMain.handle('customer:create', async (event: any, input: unknown) => {
    try {
      const parsed = CustomerCreateSchema.parse(input);
      const { createCustomer } = await import('./services/customer');
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, parsed.token);
      assertPermission(user, 'customer:write');
      const result = createCustomer(appDb, { ...parsed, userId: user.id });
      return { ok: true, success: true, data: result };
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return { ok: false, success: false, error: { code: 'VALIDATION', message: error.issues[0]?.message || 'Invalid input' } };
      }
      const code = error.code || 'INTERNAL';
      const message = error.message || 'Terjadi kesalahan';
      return { ok: false, success: false, error: { code, message } };
    }
  });

  ipcMain.handle('customer:getAll', async (event: any, input: unknown) => {
    try {
      const parsed = CustomerQuerySchema.parse(input);
      const { listCustomers } = await import('./services/customer');
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, parsed.token);
      assertPermission(user, 'customer:read');
      const result = listCustomers(appDb, { status: parsed.status, search: parsed.search, limit: parsed.limit });
      return { ok: true, success: true, data: result };
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return { ok: false, success: false, error: { code: 'VALIDATION', message: error.issues[0]?.message || 'Invalid input' } };
      }
      const code = error.code || 'INTERNAL';
      const message = error.message || 'Terjadi kesalahan';
      return { ok: false, success: false, error: { code, message } };
    }
  });

  ipcMain.handle('customer:getCustomer', async (event: any, input: unknown) => {
    try {
      const parsed = CustomerIdSchema.parse(input);
      const { getCustomer, getCustomerReceivables } = await import('./services/customer');
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, parsed.token);
      assertPermission(user, 'customer:read');
      const result = getCustomer(appDb, parsed.id);
      if (!result) {
        return { ok: false, success: false, error: { code: 'NOT_FOUND', message: 'Pelanggan tidak ditemukan' } };
      }
      const receivables = getCustomerReceivables(appDb, parsed.id);
      return { ok: true, success: true, data: { ...result, receivables } };
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return { ok: false, success: false, error: { code: 'VALIDATION', message: error.issues[0]?.message || 'Invalid input' } };
      }
      const code = error.code || 'INTERNAL';
      const message = error.message || 'Terjadi kesalahan';
      return { ok: false, success: false, error: { code, message } };
    }
  });

  ipcMain.handle('customer:update', async (event: any, input: unknown) => {
    try {
      const parsed = CustomerUpdateSchema.parse(input);
      const { updateCustomer } = await import('./services/customer');
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, parsed.token);
      assertPermission(user, 'customer:write');
      const result = updateCustomer(appDb, parsed);
      return { ok: true, success: true, data: result };
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return { ok: false, success: false, error: { code: 'VALIDATION', message: error.issues[0]?.message || 'Invalid input' } };
      }
      const code = error.code || 'INTERNAL';
      const message = error.message || 'Terjadi kesalahan';
      return { ok: false, success: false, error: { code, message } };
    }
  });

  ipcMain.handle('customer:deactivate', async (event: any, input: unknown) => {
    try {
      const parsed = CustomerIdSchema.parse(input);
      const { deactivateCustomer } = await import('./services/customer');
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, parsed.token);
      assertPermission(user, 'customer:write');
      deactivateCustomer(appDb, parsed.id);
      return { ok: true, success: true };
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return { ok: false, success: false, error: { code: 'VALIDATION', message: error.issues[0]?.message || 'Invalid input' } };
      }
      const code = error.code || 'INTERNAL';
      const message = error.message || 'Terjadi kesalahan';
      return { ok: false, success: false, error: { code, message } };
    }
  });

  ipcMain.handle('customer:getTransactions', async (event: any, input: unknown) => {
    try {
      const parsed = CustomerTransactionsQuerySchema.parse(input);
      const { listCustomerTransactions } = await import('./services/customer');
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, parsed.token);
      assertPermission(user, 'customer:read');
      const result = listCustomerTransactions(appDb, { customerId: parsed.customerId, transactionType: parsed.transactionType, startDate: parsed.startDate, endDate: parsed.endDate, limit: parsed.limit });
      return { ok: true, success: true, data: result };
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return { ok: false, success: false, error: { code: 'VALIDATION', message: error.issues[0]?.message || 'Invalid input' } };
      }
      const code = error.code || 'INTERNAL';
      const message = error.message || 'Terjadi kesalahan';
      return { ok: false, success: false, error: { code, message } };
    }
  });

  ipcMain.handle('customer:getReceivables', async (event: any, input: unknown) => {
    try {
      const parsed = CustomerIdSchema.parse(input);
      const { getCustomerReceivables } = await import('./services/customer');
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, parsed.token);
      assertPermission(user, 'customer:read');
      const result = getCustomerReceivables(appDb, parsed.id);
      return { ok: true, success: true, data: result };
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return { ok: false, success: false, error: { code: 'VALIDATION', message: error.issues[0]?.message || 'Invalid input' } };
      }
      const code = error.code || 'INTERNAL';
      const message = error.message || 'Terjadi kesalahan';
      return { ok: false, success: false, error: { code, message } };
    }
  });

  ipcMain.handle('customer:payCredit', async (_event: any, input: unknown) => {
    try {
      const parsed = CustomerPaymentSchema.parse(input);
      const { payCustomerCredit } = await import('./services/customer');
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, parsed.token);
      assertPermission(user, 'customer:write');
      const result = payCustomerCredit(appDb, { ...parsed, userId: user.id });
      return { ok: true, success: true, data: result };
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return { ok: false, success: false, error: { code: 'VALIDATION', message: error.issues[0]?.message || 'Invalid input' } };
      }
      return { ok: false, success: false, error: { code: error.code || 'INTERNAL', message: error.message || 'Terjadi kesalahan' } };
    }
  });

  ipcMain.handle('customer:getStats', async (_event: any, input: unknown) => {
    try {
      const parsed = CustomerIdSchema.parse(input);
      const { getCustomerStats } = await import('./services/customer');
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, parsed.token);
      assertPermission(user, 'customer:read');
      return { ok: true, success: true, data: getCustomerStats(appDb, parsed.id) };
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return { ok: false, success: false, error: { code: 'VALIDATION', message: error.issues[0]?.message || 'Invalid input' } };
      }
      return { ok: false, success: false, error: { code: error.code || 'INTERNAL', message: error.message || 'Terjadi kesalahan' } };
    }
  });

  // ===== Reports =====

  ipcMain.handle('report:sales', async (event: any, input: unknown) => {
    try {
      const parsed = ReportQuerySchema.parse(input);
      const { getSalesReport } = await import('./services/reports');
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, parsed.token);
      assertPermission(user, 'reports:read');
      const result = getSalesReport(appDb, parsed.startDate ? new Date(parsed.startDate).toISOString() : undefined, parsed.endDate ? new Date(parsed.endDate + 86399999).toISOString() : undefined, 'day');
      return { ok: true, success: true, data: result };
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return { ok: false, success: false, error: { code: 'VALIDATION', message: error.issues[0]?.message || 'Invalid input' } };
      }
      const code = error.code || 'INTERNAL';
      const message = error.message || 'Terjadi kesalahan';
      return { ok: false, success: false, error: { code, message } };
    }
  });

  ipcMain.handle('report:bestSelling', async (event: any, input: unknown) => {
    try {
      const parsed = BestSellingQuerySchema.parse(input);
      const { getBestSellingProducts } = await import('./services/reports');
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, parsed.token);
      assertPermission(user, 'reports:read');
      const result = getBestSellingProducts(appDb, parsed.startDate ? new Date(parsed.startDate).toISOString() : undefined, parsed.endDate ? new Date(parsed.endDate + 86399999).toISOString() : undefined, parsed.limit);
      return { ok: true, success: true, data: result };
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return { ok: false, success: false, error: { code: 'VALIDATION', message: error.issues[0]?.message || 'Invalid input' } };
      }
      const code = error.code || 'INTERNAL';
      const message = error.message || 'Terjadi kesalahan';
      return { ok: false, success: false, error: { code, message } };
    }
  });

  ipcMain.handle('report:slowMoving', async (event: any, input: unknown) => {
    try {
      const parsed = ReportQuerySchema.parse(input);
      const { getSlowMovingProducts } = await import('./services/reports');
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, parsed.token);
      assertPermission(user, 'reports:read');
      const result = getSlowMovingProducts(appDb, 90);
      return { ok: true, success: true, data: result };
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return { ok: false, success: false, error: { code: 'VALIDATION', message: error.issues[0]?.message || 'Invalid input' } };
      }
      const code = error.code || 'INTERNAL';
      const message = error.message || 'Terjadi kesalahan';
      return { ok: false, success: false, error: { code, message } };
    }
  });

  ipcMain.handle('report:grossProfit', async (event: any, input: unknown) => {
    try {
      const parsed = ReportQuerySchema.parse(input);
      const { getGrossProfit } = await import('./services/reports');
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, parsed.token);
      assertPermission(user, 'reports:read');
      const result = getGrossProfit(appDb, parsed.startDate ? new Date(parsed.startDate).toISOString() : undefined, parsed.endDate ? new Date(parsed.endDate + 86399999).toISOString() : undefined);
      return { ok: true, success: true, data: result };
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return { ok: false, success: false, error: { code: 'VALIDATION', message: error.issues[0]?.message || 'Invalid input' } };
      }
      const code = error.code || 'INTERNAL';
      const message = error.message || 'Terjadi kesalahan';
      return { ok: false, success: false, error: { code, message } };
    }
  });

  ipcMain.handle('report:inventoryValuation', async (event: any, input: unknown) => {
    try {
      const parsed = ReportQuerySchema.parse(input);
      const { getInventoryValuation } = await import('./services/reports');
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, parsed.token);
      assertPermission(user, 'reports:read');
      const result = getInventoryValuation(appDb);
      return { ok: true, success: true, data: result };
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return { ok: false, success: false, error: { code: 'VALIDATION', message: error.issues[0]?.message || 'Invalid input' } };
      }
      const code = error.code || 'INTERNAL';
      const message = error.message || 'Terjadi kesalahan';
      return { ok: false, success: false, error: { code, message } };
    }
  });

  ipcMain.handle('report:purchase', async (event: any, input: unknown) => {
    try {
      const parsed = ReportQuerySchema.parse(input);
      const { getPurchaseReport } = await import('./services/reports');
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, parsed.token);
      assertPermission(user, 'reports:read');
      const result = getPurchaseReport(appDb, parsed.startDate ? new Date(parsed.startDate).toISOString() : undefined, parsed.endDate ? new Date(parsed.endDate + 86399999).toISOString() : undefined);
      return { ok: true, success: true, data: result };
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return { ok: false, success: false, error: { code: 'VALIDATION', message: error.issues[0]?.message || 'Invalid input' } };
      }
      const code = error.code || 'INTERNAL';
      const message = error.message || 'Terjadi kesalahan';
      return { ok: false, success: false, error: { code, message } };
    }
  });

  ipcMain.handle('report:expense', async (event: any, input: unknown) => {
    try {
      const parsed = ReportQuerySchema.parse(input);
      const { getExpenseReport } = await import('./services/reports');
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, parsed.token);
      assertPermission(user, 'reports:read');
      const result = getExpenseReport(appDb, parsed.startDate ? new Date(parsed.startDate).toISOString() : undefined, parsed.endDate ? new Date(parsed.endDate + 86399999).toISOString() : undefined);
      return { ok: true, success: true, data: result };
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return { ok: false, success: false, error: { code: 'VALIDATION', message: error.issues[0]?.message || 'Invalid input' } };
      }
      const code = error.code || 'INTERNAL';
      const message = error.message || 'Terjadi kesalahan';
      return { ok: false, success: false, error: { code, message } };
    }
  });

  ipcMain.handle('report:cashierPerformance', async (event: any, input: unknown) => {
    try {
      const parsed = CashierPerformanceQuerySchema.parse(input);
      const { getCashierPerformance } = await import('./services/reports');
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, parsed.token);
      assertPermission(user, 'reports:read');
      const result = getCashierPerformance(appDb, parsed.startDate ? new Date(parsed.startDate).toISOString() : undefined, parsed.endDate ? new Date(parsed.endDate + 86399999).toISOString() : undefined);
      return { ok: true, success: true, data: result };
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return { ok: false, success: false, error: { code: 'VALIDATION', message: error.issues[0]?.message || 'Invalid input' } };
      }
      const code = error.code || 'INTERNAL';
      const message = error.message || 'Terjadi kesalahan';
      return { ok: false, success: false, error: { code, message } };
    }
  });

  ipcMain.handle('report:transaction', async (event: any, input: unknown) => {
    try {
      const parsed = ReportQuerySchema.parse(input);
      const { getTransactionReport } = await import('./services/reports');
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, parsed.token);
      assertPermission(user, 'reports:read');
      const result = getTransactionReport(appDb, parsed.startDate ? new Date(parsed.startDate).toISOString() : undefined, parsed.endDate ? new Date(parsed.endDate + 86399999).toISOString() : undefined, parsed.limit);
      return { ok: true, success: true, data: result };
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return { ok: false, success: false, error: { code: 'VALIDATION', message: error.issues[0]?.message || 'Invalid input' } };
      }
      const code = error.code || 'INTERNAL';
      const message = error.message || 'Terjadi kesalahan';
      return { ok: false, success: false, error: { code, message } };
    }
  });

  // ===== Settings & Administration =====

  ipcMain.handle('settings:list', async (event: any, input: unknown) => {
    try {
      const parsed = SettingsListSchema.parse(input);
      const { listSettings } = await import('./services/admin');
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, parsed.token);
      assertPermission(user, 'settings:read');
      const result = listSettings(appDb);
      return { ok: true, success: true, data: result };
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return { ok: false, success: false, error: { code: 'VALIDATION', message: error.issues[0]?.message || 'Invalid input' } };
      }
      const code = error.code || 'INTERNAL';
      const message = error.message || 'Terjadi kesalahan';
      return { ok: false, success: false, error: { code, message } };
    }
  });

  ipcMain.handle('settings:upsert', async (event: any, input: unknown) => {
    try {
      const parsed = SettingsUpsertSchema.parse(input);
      const { upsertSetting } = await import('./services/admin');
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, parsed.token);
      assertPermission(user, 'settings:write');
      const result = upsertSetting(appDb, { key: parsed.key, value: parsed.value });
      return { ok: true, success: true, data: result };
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return { ok: false, success: false, error: { code: 'VALIDATION', message: error.issues[0]?.message || 'Invalid input' } };
      }
      const code = error.code || 'INTERNAL';
      const message = error.message || 'Terjadi kesalahan';
      return { ok: false, success: false, error: { code, message } };
    }
  });

  ipcMain.handle('users:getAll', async (event: any, input: unknown) => {
    try {
      const parsed = UserQuerySchema.parse(input);
      const { listUsers } = await import('./services/admin');
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, parsed.token);
      assertPermission(user, 'settings:write');
      const result = listUsers(appDb, { roleId: parsed.roleId, search: parsed.search, limit: parsed.limit });
      return { ok: true, success: true, data: result };
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return { ok: false, success: false, error: { code: 'VALIDATION', message: error.issues[0]?.message || 'Invalid input' } };
      }
      const code = error.code || 'INTERNAL';
      const message = error.message || 'Terjadi kesalahan';
      return { ok: false, success: false, error: { code, message } };
    }
  });

  ipcMain.handle('users:create', async (event: any, input: unknown) => {
    try {
      const parsed = UserCreateSchema.parse(input);
      const { createUser } = await import('./services/admin');
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, parsed.token);
      assertPermission(user, 'settings:write');
      const result = createUser(appDb, parsed);
      return { ok: true, success: true, data: result };
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return { ok: false, success: false, error: { code: 'VALIDATION', message: error.issues[0]?.message || 'Invalid input' } };
      }
      const code = error.code || 'INTERNAL';
      const message = error.message || 'Terjadi kesalahan';
      return { ok: false, success: false, error: { code, message } };
    }
  });

  ipcMain.handle('users:update', async (event: any, input: unknown) => {
    try {
      const parsed = UserUpdateSchema.parse(input);
      const { updateUser } = await import('./services/admin');
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, parsed.token);
      assertPermission(user, 'settings:write');
      const result = updateUser(appDb, parsed);
      return { ok: true, success: true, data: result };
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return { ok: false, success: false, error: { code: 'VALIDATION', message: error.issues[0]?.message || 'Invalid input' } };
      }
      const code = error.code || 'INTERNAL';
      const message = error.message || 'Terjadi kesalahan';
      return { ok: false, success: false, error: { code, message } };
    }
  });

  ipcMain.handle('users:deactivate', async (event: any, input: unknown) => {
    try {
      const parsed = UserIdSchema.parse(input);
      const { deactivateUser } = await import('./services/admin');
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, parsed.token);
      assertPermission(user, 'settings:write');
      deactivateUser(appDb, parsed.id);
      return { ok: true, success: true };
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return { ok: false, success: false, error: { code: 'VALIDATION', message: error.issues[0]?.message || 'Invalid input' } };
      }
      const code = error.code || 'INTERNAL';
      const message = error.message || 'Terjadi kesalahan';
      return { ok: false, success: false, error: { code, message } };
    }
  });

  ipcMain.handle('roles:getAll', async (event: any, input: unknown) => {
    try {
      const parsed = RoleQuerySchema.parse(input);
      const { listRoles } = await import('./services/admin');
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, parsed.token);
      assertPermission(user, 'settings:write');
      const result = listRoles(appDb);
      return { ok: true, success: true, data: result };
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return { ok: false, success: false, error: { code: 'VALIDATION', message: error.issues[0]?.message || 'Invalid input' } };
      }
      const code = error.code || 'INTERNAL';
      const message = error.message || 'Terjadi kesalahan';
      return { ok: false, success: false, error: { code, message } };
    }
  });

  ipcMain.handle('roles:create', async (event: any, input: unknown) => {
    try {
      const parsed = RoleCreateSchema.parse(input);
      const { createRole } = await import('./services/admin');
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, parsed.token);
      assertPermission(user, 'settings:write');
      const result = createRole(appDb, parsed);
      return { ok: true, success: true, data: result };
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return { ok: false, success: false, error: { code: 'VALIDATION', message: error.issues[0]?.message || 'Invalid input' } };
      }
      const code = error.code || 'INTERNAL';
      const message = error.message || 'Terjadi kesalahan';
      return { ok: false, success: false, error: { code, message } };
    }
  });

  ipcMain.handle('roles:update', async (event: any, input: unknown) => {
    try {
      const parsed = RoleUpdateSchema.parse(input);
      const { updateRole } = await import('./services/admin');
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, parsed.token);
      assertPermission(user, 'settings:write');
      const result = updateRole(appDb, parsed);
      return { ok: true, success: true, data: result };
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return { ok: false, success: false, error: { code: 'VALIDATION', message: error.issues[0]?.message || 'Invalid input' } };
      }
      const code = error.code || 'INTERNAL';
      const message = error.message || 'Terjadi kesalahan';
      return { ok: false, success: false, error: { code, message } };
    }
  });

  ipcMain.handle('roles:deactivate', async (event: any, input: unknown) => {
    try {
      const parsed = RoleIdSchema.parse(input);
      const { deactivateRole } = await import('./services/admin');
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, parsed.token);
      assertPermission(user, 'settings:write');
      deactivateRole(appDb, parsed.id);
      return { ok: true, success: true };
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return { ok: false, success: false, error: { code: 'VALIDATION', message: error.issues[0]?.message || 'Invalid input' } };
      }
      const code = error.code || 'INTERNAL';
      const message = error.message || 'Terjadi kesalahan';
      return { ok: false, success: false, error: { code, message } };
    }
  });

  ipcMain.handle('roles:getPermissions', async (_event: any, input: unknown) => {
    try {
      const parsed = RoleIdSchema.parse(input);
      const { listRolePermissions } = await import('./services/admin');
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, parsed.token);
      assertPermission(user, 'settings:read');
      return { ok: true, success: true, data: listRolePermissions(appDb, parsed.id) };
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return { ok: false, success: false, error: { code: 'VALIDATION', message: error.issues[0]?.message || 'Invalid input' } };
      }
      return { ok: false, success: false, error: { code: error.code || 'INTERNAL', message: error.message || 'Terjadi kesalahan' } };
    }
  });

  ipcMain.handle('roles:setPermissions', async (_event: any, input: unknown) => {
    try {
      const parsed = RolePermissionsSchema.parse(input);
      const { setRolePermissions } = await import('./services/admin');
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, parsed.token);
      assertPermission(user, 'settings:write');
      const result = setRolePermissions(appDb, { roleId: parsed.roleId, permissions: parsed.permissions });
      return { ok: true, success: true, data: result };
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return { ok: false, success: false, error: { code: 'VALIDATION', message: error.issues[0]?.message || 'Invalid input' } };
      }
      return { ok: false, success: false, error: { code: error.code || 'INTERNAL', message: error.message || 'Terjadi kesalahan' } };
    }
  });

  ipcMain.handle('permissions:getAll', async (event: any, input: unknown) => {
    try {
      const parsed = PermissionsGetAllSchema.parse(input);
      const { listPermissions } = await import('./services/admin');
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, parsed.token);
      assertPermission(user, 'settings:write');
      const result = listPermissions(appDb);
      return { ok: true, success: true, data: result };
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return { ok: false, success: false, error: { code: 'VALIDATION', message: error.issues[0]?.message || 'Invalid input' } };
      }
      const code = error.code || 'INTERNAL';
      const message = error.message || 'Terjadi kesalahan';
      return { ok: false, success: false, error: { code, message } };
    }
  });

  ipcMain.handle('sync:getStatus', async (_event: any, input: { token: string }) => {
    try {
      const { requireUser } = await import('./services/auth');
      const db = getDb();
      requireUser(db, input?.token);
      const coord = getSyncCoordinator() ?? initSyncCoordinator(db);
      return { ok: true, success: true, data: coord.getStatus() };
    } catch (error: any) {
      return { ok: false, success: false, error: { code: 'INTERNAL', message: 'Gagal membaca status sinkronisasi' } };
    }
  });

  ipcMain.handle('sync:trigger', async (_event: any, input: { token: string }) => {
    try {
      const { requireUser } = await import('./services/auth');
      const db = getDb();
      requireUser(db, input?.token);
      const coord = getSyncCoordinator() ?? initSyncCoordinator(db);
      const data = await coord.trigger('manual');
      return { ok: true, success: true, data };
    } catch (error: any) {
      return { ok: false, success: false, error: { code: 'INTERNAL', message: 'Gagal memicu sinkronisasi' } };
    }
  });

  // ===== Catalog (categories & units) =====

  ipcMain.handle('category:create', async (_event: any, input: { token: string; name: string; description?: string | null }) => {
    try {
      const { requireUser, assertPermission } = await import('./services/auth');
      const { createCategory } = await import('./services/catalog');
      const appDb = getDb();
      const user = requireUser(appDb, input.token);
      assertPermission(user, 'settings:write');
      const data = createCategory(appDb, input);
      return { ok: true, success: true, data };
    } catch (error: any) {
      return { ok: false, success: false, error: { code: error.code || 'INTERNAL', message: error.message } };
    }
  });

  ipcMain.handle('category:update', async (_event: any, input: { token: string; id: string; name?: string; description?: string | null }) => {
    try {
      const { requireUser, assertPermission } = await import('./services/auth');
      const { renameCategory } = await import('./services/catalog');
      const appDb = getDb();
      const user = requireUser(appDb, input.token);
      assertPermission(user, 'settings:write');
      renameCategory(appDb, input);
      return { ok: true, success: true };
    } catch (error: any) {
      return { ok: false, success: false, error: { code: error.code || 'INTERNAL', message: error.message } };
    }
  });

  ipcMain.handle('category:delete', async (_event: any, input: { token: string; id: string }) => {
    try {
      const { requireUser, assertPermission } = await import('./services/auth');
      const { deleteCategory } = await import('./services/catalog');
      const appDb = getDb();
      const user = requireUser(appDb, input.token);
      assertPermission(user, 'settings:write');
      deleteCategory(appDb, input.id);
      return { ok: true, success: true };
    } catch (error: any) {
      return { ok: false, success: false, error: { code: error.code || 'INTERNAL', message: error.message } };
    }
  });

  ipcMain.handle('unit:create', async (_event: any, input: { token: string; name: string; symbol?: string | null }) => {
    try {
      const { requireUser, assertPermission } = await import('./services/auth');
      const { createUnit } = await import('./services/catalog');
      const appDb = getDb();
      const user = requireUser(appDb, input.token);
      assertPermission(user, 'settings:write');
      const data = createUnit(appDb, input);
      return { ok: true, success: true, data };
    } catch (error: any) {
      return { ok: false, success: false, error: { code: error.code || 'INTERNAL', message: error.message } };
    }
  });

  ipcMain.handle('unit:update', async (_event: any, input: { token: string; id: string; name?: string; symbol?: string | null }) => {
    try {
      const { requireUser, assertPermission } = await import('./services/auth');
      const { renameUnit } = await import('./services/catalog');
      const appDb = getDb();
      const user = requireUser(appDb, input.token);
      assertPermission(user, 'settings:write');
      renameUnit(appDb, input);
      return { ok: true, success: true };
    } catch (error: any) {
      return { ok: false, success: false, error: { code: error.code || 'INTERNAL', message: error.message } };
    }
  });

  ipcMain.handle('unit:delete', async (_event: any, input: { token: string; id: string }) => {
    try {
      const { requireUser, assertPermission } = await import('./services/auth');
      const { deleteUnit } = await import('./services/catalog');
      const appDb = getDb();
      const user = requireUser(appDb, input.token);
      assertPermission(user, 'settings:write');
      deleteUnit(appDb, input.id);
      return { ok: true, success: true };
    } catch (error: any) {
      return { ok: false, success: false, error: { code: error.code || 'INTERNAL', message: error.message } };
    }
  });

  ipcMain.handle('update:check', async () => {
    try {
      const status = await checkForUpdates();
      return { ok: true, success: true, data: status };
    } catch (error: any) {
      return { ok: false, success: false, error: { code: error.code || 'INTERNAL', message: error.message } };
    }
  });

  ipcMain.handle('update:download', async () => {
    try {
      const status = await downloadUpdate();
      return { ok: true, success: true, data: status };
    } catch (error: any) {
      return { ok: false, success: false, error: { code: error.code || 'INTERNAL', message: error.message } };
    }
  });

  ipcMain.handle('update:install', async () => {
    try {
      await installUpdate();
      return { ok: true, success: true };
    } catch (error: any) {
      return { ok: false, success: false, error: { code: error.code || 'INTERNAL', message: error.message } };
    }
  });

  ipcMain.handle('update:getStatus', async () => {
    return { ok: true, success: true, data: getUpdateStatus() };
  });

  // ===== Superadmin & Branding =====

  ipcMain.handle('branding:get', async () => {
    try {
      const appDb = getDb();
      const branding = getBranding(appDb);
      const logoDataUrl = brandLogoDataUrl(appDb);
      return { ok: true, success: true, data: { ...branding, logoDataUrl } };
    } catch (error: any) {
      return { ok: false, success: false, error: { code: error.code || 'INTERNAL', message: error.message } };
    }
  });

  ipcMain.handle('branding:set', async (_event: any, input: { token: string; patch: Record<string, string | null> }) => {
    try {
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, input.token);
      assertPermission(user, 'settings:write');
      if (user.role !== 'superadmin') {
        return { ok: false, success: false, error: { code: 'FORBIDDEN', message: 'Hanya superadmin yang boleh mengubah branding' } };
      }
      const patch: any = {};
      for (const [k, v] of Object.entries(input.patch || {})) {
        if (v === null) continue;
        patch[k] = v;
      }
      const branding = setBranding(appDb, patch);
      const logoDataUrl = brandLogoDataUrl(appDb);
      return { ok: true, success: true, data: { ...branding, logoDataUrl } };
    } catch (error: any) {
      return { ok: false, success: false, error: { code: error.code || 'INTERNAL', message: error.message } };
    }
  });

  ipcMain.handle('branding:pickLogo', async (_event: any, input: { token: string }) => {
    try {
      const { requireUser, assertPermission } = await import('./services/auth');
      const { dialog } = await import('electron');
      const appDb = getDb();
      const user = requireUser(appDb, input.token);
      assertPermission(user, 'settings:write');
      if (user.role !== 'superadmin') {
        return { ok: false, success: false, error: { code: 'FORBIDDEN', message: 'Hanya superadmin yang boleh mengganti logo' } };
      }
      const result = await dialog.showOpenDialog({
        title: 'Pilih Logo Aplikasi',
        filters: [{ name: 'Gambar', extensions: ['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif'] }],
        properties: ['openFile'],
      });
      if (result.canceled || !result.filePaths[0]) {
        return { ok: true, success: true, data: { canceled: true } };
      }
      const { logoPath } = copyLogo(appDb, result.filePaths[0], app.getPath('userData'));
      const logoDataUrl = brandLogoDataUrl(appDb);
      return { ok: true, success: true, data: { canceled: false, logoPath, logoDataUrl } };
    } catch (error: any) {
      return { ok: false, success: false, error: { code: error.code || 'INTERNAL', message: error.message } };
    }
  });

  ipcMain.handle('branding:resetLogo', async (_event: any, input: { token: string }) => {
    try {
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, input.token);
      assertPermission(user, 'settings:write');
      appDb.sqlite.prepare(`DELETE FROM settings WHERE key = 'brand_logo_path'`).run();
      return { ok: true, success: true };
    } catch (error: any) {
      return { ok: false, success: false, error: { code: error.code || 'INTERNAL', message: error.message } };
    }
  });

  ipcMain.handle('branding:pickIcon', async (_event: any, input: { token: string }) => {
    try {
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, input.token);
      assertPermission(user, 'settings:write');
      if (user.role !== 'superadmin') {
        return { ok: false, success: false, error: { code: 'FORBIDDEN', message: 'Hanya superadmin yang boleh mengganti ikon' } };
      }
      const result = await dialog.showOpenDialog({
        title: 'Pilih Ikon Aplikasi',
        filters: [{ name: 'Gambar', extensions: ['png', 'jpg', 'jpeg', 'ico', 'webp'] }],
        properties: ['openFile'],
      });
      if (result.canceled || !result.filePaths[0]) {
        return { ok: true, success: true, data: { canceled: true } };
      }
      const { iconPath } = copyIcon(appDb, result.filePaths[0], app.getPath('userData'));
      const image = nativeImage.createFromPath(iconPath);
      BrowserWindow.getAllWindows().forEach((w) => w.setIcon(image));
      return { ok: true, success: true, data: { canceled: false, iconPath } };
    } catch (error: any) {
      return { ok: false, success: false, error: { code: error.code || 'INTERNAL', message: error.message } };
    }
  });

  ipcMain.handle('branding:resetIcon', async (_event: any, input: { token: string }) => {
    try {
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, input.token);
      assertPermission(user, 'settings:write');
      if (user.role !== 'superadmin') {
        return { ok: false, success: false, error: { code: 'FORBIDDEN', message: 'Hanya superadmin yang boleh mereset ikon' } };
      }
      resetIcon(appDb);
      const defaultIcon = path.join(__dirname, '..', '..', 'assets', 'brand', 'vyapara-icon.png');
      const image = nativeImage.createFromPath(defaultIcon);
      BrowserWindow.getAllWindows().forEach((w) => w.setIcon(image));
      return { ok: true, success: true };
    } catch (error: any) {
      return { ok: false, success: false, error: { code: error.code || 'INTERNAL', message: error.message } };
    }
  });

  ipcMain.handle('danger:wipeSessions', async (_event: any, input: { token: string }) => {
    try {
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, input.token);
      assertPermission(user, 'settings:write');
      if (user.role !== 'superadmin') {
        return { ok: false, success: false, error: { code: 'FORBIDDEN', message: 'Hanya superadmin' } };
      }
      const count = wipeSessions(appDb);
      logAudit(appDb, { userId: user.id, userName: user.name, action: 'danger.wipeSessions', entity: 'sessions', detail: `${count} sesi dihapus` });
      return { ok: true, success: true, data: { deleted: count } };
    } catch (error: any) {
      return { ok: false, success: false, error: { code: error.code || 'INTERNAL', message: error.message } };
    }
  });

  ipcMain.handle('danger:wipeAdminUsers', async (_event: any, input: { token: string }) => {
    try {
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, input.token);
      assertPermission(user, 'settings:write');
      if (user.role !== 'superadmin') {
        return { ok: false, success: false, error: { code: 'FORBIDDEN', message: 'Hanya superadmin' } };
      }
      const count = wipeNonSuperadminUsers(appDb);
      logAudit(appDb, { userId: user.id, userName: user.name, action: 'danger.wipeAdminUsers', entity: 'users', detail: `${count} akun dihapus` });
      return { ok: true, success: true, data: { deleted: count } };
    } catch (error: any) {
      return { ok: false, success: false, error: { code: error.code || 'INTERNAL', message: error.message } };
    }
  });

  ipcMain.handle('danger:factoryReset', async (_event: any, input: { token: string; confirm: string }) => {
    try {
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, input.token);
      assertPermission(user, 'settings:write');
      if (user.role !== 'superadmin') {
        return { ok: false, success: false, error: { code: 'FORBIDDEN', message: 'Hanya superadmin' } };
      }
      if ((input.confirm ?? '') !== 'HAPUS-SEMUA-DATA') {
        return { ok: false, success: false, error: { code: 'CONFIRMATION_REQUIRED', message: 'Ketik HAPUS-SEMUA-DATA untuk konfirmasi' } };
      }
      factoryReset(appDb);
      logAudit(appDb, { userId: user.id, userName: user.name, action: 'danger.factoryReset', entity: 'appdata', detail: 'Factory reset executed by superadmin' });
      return { ok: true, success: true };
    } catch (error: any) {
      return { ok: false, success: false, error: { code: error.code || 'INTERNAL', message: error.message } };
    }
  });

  // ===== Printer (thermal ESC/POS) =====

  ipcMain.handle('printer:getConfig', async (_event: any, input: { token: string }) => {
    try {
      const { requireUser } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, input.token);
      const data = getPrinterConfig(appDb);
      return { ok: true, success: true, data };
    } catch (error: any) {
      return { ok: false, success: false, error: { code: error.code || 'INTERNAL', message: error.message } };
    }
  });

  ipcMain.handle('printer:setConfig', async (_event: any, input: { token: string; printerName?: string; paperWidth?: '58mm' | '80mm'; silent?: boolean }) => {
    try {
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, input.token);
      assertPermission(user, 'settings:write');
      const { token: _t, ...patch } = input;
      const data = setPrinterConfig(appDb, patch);
      return { ok: true, success: true, data };
    } catch (error: any) {
      return { ok: false, success: false, error: { code: error.code || 'INTERNAL', message: error.message } };
    }
  });

  ipcMain.handle('printer:list', async (_event: any, input: { token: string }) => {
    try {
      const { requireUser } = await import('./services/auth');
      const appDb = getDb();
      requireUser(appDb, input.token);
      const printers = await listPrinters();
      return { ok: true, success: true, data: printers };
    } catch (error: any) {
      return { ok: false, success: false, error: { code: error.code || 'INTERNAL', message: error.message } };
    }
  });

  ipcMain.handle('printer:printReceipt', async (_event: any, input: { token: string; payload: ReceiptPayload }) => {
    try {
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, input.token);
      assertPermission(user, 'transaction:write');
      await printReceipt(appDb, input.payload);
      return { ok: true, success: true };
    } catch (error: any) {
      return { ok: false, success: false, error: { code: error.code || 'INTERNAL', message: error.message } };
    }
  });

  ipcMain.handle('printer:printInvoice', async (_event: any, input: { token: string; payload: ReceiptPayload & { dueDate?: string | null } }) => {
    try {
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, input.token);
      assertPermission(user, 'transaction:write');
      await printInvoice(appDb, input.payload);
      return { ok: true, success: true };
    } catch (error: any) {
      return { ok: false, success: false, error: { code: error.code || 'INTERNAL', message: error.message } };
    }
  });

  // ===== Import / Export (CSV) =====

  ipcMain.handle('import:productsCsv', async (_event: any, input: { token: string }) => {
    try {
      const { dialog } = await import('electron');
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, input.token);
      assertPermission(user, 'product:write');
      const result = await dialog.showOpenDialog({
        title: 'Import Produk dari CSV',
        filters: [{ name: 'CSV', extensions: ['csv'] }],
        properties: ['openFile'],
      });
      if (result.canceled || !result.filePaths[0]) return { ok: true, success: true, data: { canceled: true } };
      const text = fs.readFileSync(result.filePaths[0], 'utf8');
      const report = importProductsCsv(appDb, text, user.id);
      return { ok: true, success: true, data: { canceled: false, ...report } };
    } catch (error: any) {
      return { ok: false, success: false, error: { code: error.code || 'INTERNAL', message: error.message } };
    }
  });

  ipcMain.handle('import:customersCsv', async (_event: any, input: { token: string }) => {
    try {
      const { dialog } = await import('electron');
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, input.token);
      assertPermission(user, 'customer:write');
      const result = await dialog.showOpenDialog({
        title: 'Import Pelanggan dari CSV',
        filters: [{ name: 'CSV', extensions: ['csv'] }],
        properties: ['openFile'],
      });
      if (result.canceled || !result.filePaths[0]) return { ok: true, success: true, data: { canceled: true } };
      const text = fs.readFileSync(result.filePaths[0], 'utf8');
      const report = importCustomersCsv(appDb, text, user.id);
      return { ok: true, success: true, data: { canceled: false, ...report } };
    } catch (error: any) {
      return { ok: false, success: false, error: { code: error.code || 'INTERNAL', message: error.message } };
    }
  });

  ipcMain.handle('file:saveCsv', async (_event: any, input: { token: string; filename?: string; content: string }) => {
    try {
      const { dialog } = await import('electron');
      const { requireUser } = await import('./services/auth');
      const appDb = getDb();
      requireUser(appDb, input.token);
      if (typeof input.content !== 'string' || input.content.length > 50 * 1024 * 1024) {
        return { ok: false, success: false, error: { code: 'VALIDATION', message: 'Konten CSV tidak valid' } };
      }
      const result = await dialog.showSaveDialog({
        title: 'Simpan Laporan CSV',
        defaultPath: input.filename ?? 'laporan.csv',
        filters: [{ name: 'CSV', extensions: ['csv'] }],
      });
      if (result.canceled || !result.filePath) return { ok: true, success: true, data: { saved: false } };
      fs.writeFileSync(result.filePath, input.content, 'utf8');
      return { ok: true, success: true, data: { saved: true, path: result.filePath } };
    } catch (error: any) {
      return { ok: false, success: false, error: { code: error.code || 'INTERNAL', message: error.message } };
    }
  });

  // ===== Audit Log =====

  ipcMain.handle('audit:list', async (_event: any, input: { token: string; limit?: number }) => {
    try {
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, input.token);
      assertPermission(user, 'reports:read');
      const limit = Math.min(Math.max(Number(input?.limit) || 200, 1), 500);
      return { ok: true, success: true, data: listAuditLogs(appDb, limit) };
    } catch (error: any) {
      return { ok: false, success: false, error: { code: error.code || 'INTERNAL', message: error.message } };
    }
  });

  // ===== Delivery Orders (print dot matrix) =====

  ipcMain.handle('printer:printDeliveryOrder', async (_event: any, input: { token: string; payload: DeliveryOrderPayload }) => {
    try {
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const user = requireUser(appDb, input.token);
      assertPermission(user, 'transaction:write');
      await printDeliveryOrder(appDb, input.payload);
      return { ok: true, success: true };
    } catch (error: any) {
      return { ok: false, success: false, error: { code: error.code || 'INTERNAL', message: error.message } };
    }
  });

  ipcMain.handle('transaction:getInvoicePayload', async (_event: any, input: { token: string; transactionId: string }) => {
    try {
      const { requireUser, assertPermission, hashSession } = await import('./services/auth') as any;
      const appDb = getDb();
      const user = requireUser(appDb, input.token);
      assertPermission(user, 'transaction:read');
      const row = appDb.sqlite.prepare(
        `SELECT t.id, t.transaction_number, t.created_at, t.subtotal, t.discount_amount, t.total_amount, t.payment_method, t.payments_json, c.name AS customer_name
         FROM transactions t LEFT JOIN customers c ON c.id = t.customer_id WHERE t.id = ?`,
      ).get(input.transactionId) as any;
      if (!row) {
        return { ok: false, success: false, error: { code: 'NOT_FOUND', message: 'Transaksi tidak ditemukan' } };
      }
      const items = appDb.sqlite.prepare(
        'SELECT product_name, quantity, price, subtotal FROM transaction_items WHERE transaction_id = ?',
      ).all(input.transactionId) as any[];
      const itemsOut = items.map((i) => ({ productName: i.product_name, quantity: i.quantity, unitPrice: Math.round(i.price), subtotal: Math.round(i.subtotal) }));
      let payments: { method: string; amount: number }[] = [];
      try {
        const parsed = row.payments_json ? JSON.parse(row.payments_json) : [];
        if (Array.isArray(parsed)) {
          payments = parsed.map((p: any) => ({ method: String(p.method ?? 'cash'), amount: Math.round(p.amount ?? 0) }));
        }
      } catch {
        payments = [{ method: row.payment_method ?? 'cash', amount: Math.round(row.total_amount) }];
      }
      const subtotal = Math.round(row.subtotal ?? 0);
      const discount = Math.round(row.discount_amount ?? 0);
      const total = Math.round(row.total_amount ?? subtotal - discount);
      const change = payments.length === 1 && payments[0] ? Math.max(0, Math.round(payments[0].amount - total)) : 0;
      return {
        ok: true,
        success: true,
        data: {
          storeName: getSettingsRow(appDb, 'store_name', 'VYAPARA'),
          tagline: 'SISTEM MANAJEMEN USAHA TERPADU',
          footer: getSettingsRow(appDb, 'receipt_footer', 'Terima kasih atas kunjungan Anda'),
          transactionNumber: row.transaction_number,
          date: new Date(row.created_at).toLocaleString('id-ID'),
          cashier: user.name,
          customerName: row.customer_name || null,
          items: itemsOut,
          subtotal,
          discount,
          total,
          payments,
          change,
        },
      };
    } catch (error: any) {
      return { ok: false, success: false, error: { code: error.code || 'INTERNAL', message: error.message } };
    }
  });

  ipcMain.handle('report:shiftRecap', async (event: any, input: unknown) => {
    try {
      const { getShiftRecap } = await import('./services/reports');
      const { requireUser, assertPermission } = await import('./services/auth');
      const appDb = getDb();
      const parsed = ShiftRecapQuerySchema.parse(input);
      const user = requireUser(appDb, parsed.token);
      assertPermission(user, 'reports:read');
      return { ok: true, success: true, data: getShiftRecap(appDb, parsed.startDate, parsed.endDate) };
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return { ok: false, success: false, error: { code: 'VALIDATION', message: error.issues[0]?.message || 'Invalid input' } };
      }
      return { ok: false, success: false, error: { code: error.code || 'INTERNAL', message: error.message || 'Terjadi kesalahan' } };
    }
  });

  ipcMain.handle('report:receivables', async (_event: any, input: unknown) => {
    try {
      const { getReceivablesAging } = await import('./services/reports');
      const { requireUser, assertPermission } = await import('./services/auth');
      const AppDb = getDb();
      const appDb = AppDb;
      const token = (input as any)?.token ?? '';
      const user = requireUser(appDb, token);
      assertPermission(user, 'reports:read');
      return { ok: true, success: true, data: getReceivablesAging(appDb) };
    } catch (error: any) {
      return { ok: false, success: false, error: { code: error.code || 'INTERNAL', message: error.message || 'Terjadi kesalahan' } };
    }
  });

  // ===== License =====

  ipcMain.handle('license:status', async () => {
    try {
      const appDb = getDb();
      const status = getLicenseStatus(appDb);
      return { ok: true, success: true, data: status };
    } catch (error: any) {
      return { ok: false, success: false, error: { code: error.code || 'INTERNAL', message: error.message } };
    }
  });

  ipcMain.handle('license:enforce', async () => {
    try {
      const appDb = getDb();
      // Enforcement is ON for real installs (packaged app) or when forced via env var.
      // Dev/test runs bypass the gate so E2E can drive the UI directly.
      const enforced = app.isPackaged || process.env.VYAPARA_FORCE_LICENSE === '1';
      if (!enforced) {
        return { ok: true, success: true, data: { enforced: false, status: { state: 'licensed', organizationId: 'dev-mode', organizationName: 'Development (license gate skipped)', activatedAt: new Date().toISOString(), serverUrl: '', lastVerifyAt: new Date().toISOString() } } };
      }
      const status = getLicenseStatus(appDb);
      return { ok: true, success: true, data: { enforced: true, status } };
    } catch (error: any) {
      return { ok: false, success: false, error: { code: error.code || 'INTERNAL', message: error.message } };
    }
  });

  ipcMain.handle('license:activate', async (_event: any, input: { licenseKey: string; serverUrl: string; organizationName?: string }) => {
    try {
      const appDb = getDb();
      const result = await activateLicense(appDb, input ?? { licenseKey: '', serverUrl: '' });
      return result.ok
        ? { ok: true, success: true, data: { organizationId: result.organizationId, organizationName: result.organizationName } }
        : { ok: false, success: false, error: { code: 'ACTIVATION_FAILED', message: result.error } };
    } catch (error: any) {
      return { ok: false, success: false, error: { code: error.code || 'INTERNAL', message: error.message } };
    }
  });

  ipcMain.handle('license:verify', async () => {
    try {
      const appDb = getDb();
      const status = await verifyLicense(appDb);
      return { ok: true, success: true, data: status };
    } catch (error: any) {
      return { ok: false, success: false, error: { code: error.code || 'INTERNAL', message: error.message } };
    }
  });

  // ===== Delivery Orders =====

  ipcMain.handle('deliveryOrder:get', async (_event: any, input: { token: string; transactionId: string }) => {
    try {
      const { requireUser } = await import('./services/auth');
      const appDb = getDb();
      requireUser(appDb, input.token);
      const row = appDb.sqlite.prepare(
        `SELECT t.id, t.transaction_number, t.created_at, t.notes, t.payment_method, t.customer_id AS customer_id,
                c.name AS customer_name, c.phone AS customer_phone, c.address AS customer_address, c.city AS customer_city
         FROM transactions t
         LEFT JOIN customers c ON c.id = t.customer_id
         WHERE t.id = ?`,
      ).get(input.transactionId) as any;
      if (!row) {
        return { ok: false, success: false, error: { code: 'NOT_FOUND', message: 'Transaksi tidak ditemukan' } };
      }
      const items = appDb.sqlite.prepare(
        `SELECT product_name, quantity, price, subtotal FROM transaction_items WHERE transaction_id = ?`,
      ).all(input.transactionId) as any[];
      const subtotal = items.reduce((s, i) => s + Math.round(i.subtotal), 0);
      return {
        ok: true,
        success: true,
        data: {
          id: row.id,
          transactionNumber: row.transaction_number,
          createdAt: row.created_at,
          notes: row.notes,
          paymentMethod: row.payment_method,
          customerName: row.customer_name || null,
          customerPhone: row.customer_phone || null,
          customerAddress: row.customer_address || null,
          customerCity: row.customer_city || null,
          items: items.map((i) => ({ productName: i.product_name, quantity: i.quantity, unitPrice: Math.round(i.price), subtotal: Math.round(i.subtotal) })),
          subtotal,
        },
      };
    } catch (error: any) {
      return { ok: false, success: false, error: { code: error.code || 'INTERNAL', message: error.message } };
    }
  });

  // ===== Sales Returns =====

  ipcMain.handle('salesReturn:create', async (_event: any, input: { token: string; transactionId: string; notes?: string }) => {
    try {
      const { requireUser } = await import('./services/auth');
      const { createSalesReturn } = await import('./services/sales-returns');
      const appDb = getDb();
      const user = requireUser(appDb, input.token);
      const notes = typeof input.notes === 'string' ? input.notes.slice(0, 300) : undefined;
      const ret = createSalesReturn(appDb, { transactionId: input.transactionId, notes, userId: user.id });
      return { ok: true, success: true, data: ret };
    } catch (error: any) {
      return { ok: false, success: false, error: { code: error.code || 'INTERNAL', message: error.message } };
    }
  });

  ipcMain.handle('salesReturn:list', async (_event: any, input: { token: string; limit?: number }) => {
    try {
      const { requireUser } = await import('./services/auth');
      const appDb = getDb();
      requireUser(appDb, input.token);
      const limit = Math.min(Math.max(Number(input?.limit) || 50, 1), 500);
      const rows = appDb.sqlite.prepare(
        `SELECT r.id, r.return_number, r.transaction_id, r.return_date, r.notes, r.status, r.created_at,
                (SELECT COUNT(*) FROM sales_return_items i WHERE i.sales_return_id = r.id) AS item_count,
                (SELECT SUM(i.subtotal) FROM sales_return_items i WHERE i.sales_return_id = r.id) AS total_cost
         FROM sales_returns r
         ORDER BY r.created_at DESC
         LIMIT ?`,
      ).all(limit) as any[];
      return {
        ok: true,
        success: true,
        data: rows.map((r) => ({
          id: r.id,
          returnNumber: r.return_number,
          transactionId: r.transaction_id,
          returnDate: r.return_date,
          notes: r.notes,
          status: r.status,
          createdAt: r.created_at,
          itemCount: r.item_count,
          totalCost: Math.round(r.total_cost ?? 0),
        })),
      };
    } catch (error: any) {
      return { ok: false, success: false, error: { code: error.code || 'INTERNAL', message: error.message } };
    }
  });

  mainWindow.webContents.on('will-navigate', (_event, url) => {
    if (!url.startsWith('http://localhost:1420') && !url.startsWith('https://') && !url.startsWith('file://')) {
      _event.preventDefault();
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  const db = getDb();
  ensureSuperadmin(db);
  void verifyLicense(db).catch(() => { /* verified lazily at next launch */ });
  initSyncCoordinator(db).start();
  if (app.isPackaged) {
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data:; connect-src 'self'",
          ],
        },
      });
    });
  }
  onUpdateStatus((s) => {
    try {
      mainWindow?.webContents.send('update:status', s);
    } catch { /* window may be closing */ }
  });
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('before-quit', () => {
  void getSyncCoordinator()?.stop();
  try {
    if (appDb) appDb.close();
  } catch (error) {
    console.error('Failed to close database cleanly', error);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});