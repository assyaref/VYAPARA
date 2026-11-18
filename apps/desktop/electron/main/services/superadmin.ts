/**
 * Superadmin & branding service.
 *
 * Superadmin is a built-in account (superadmin@assyaref.dev) seeded on first
 * run with full CRUD on every entity, plus branding control (logo, colors,
 * app name, tagline) and destructive whole-database actions.
 *
 * Security notes:
 *  - Password is stored only as scrypt hash (same as normal users).
 *  - IPC layer gates every superadmin action behind assertPermission('settings:write')
 *    plus an explicit role === 'superadmin' check.
 *  - Destructive actions require a typed confirmation phrase.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { randomUUID } from 'node:crypto';
import type { AppDatabase } from '../db/open';
import { AppError } from '../errors';

const SUPERADMIN_EMAIL = 'superadmin@assyaref.dev';
// Password NOT stored in repo — only its scrypt hash. Password was chosen by the owner.
const SUPERADMIN_PASSWORD_HASH = 'd6bbb622e895382e213c914b8d632314:2ff83e9dc2bbb2a23f8caf855e75c192c6756adf8a1a81a172fa9e9155ed522116631deddec73795e9392584c04574cc5aa79abb3041fb45485c494c8d5e9aa1';
const SUPERADMIN_ROLE = 'superadmin';

// Every permission the app enforces — kept in sync with services/*.ts
const ALL_PERMISSIONS = [
  'settings:read', 'settings:write',
  'product:read', 'product:write',
  'transaction:read', 'transaction:write',
  'inventory:read', 'inventory:write', 'inventory:adjust', 'inventory:approve', 'inventory:opname',
  'stock:adjust', 'stock:opname',
  'procurement:read', 'procurement:write',
  'supplier:read', 'supplier:write', 'supplier:transactions', 'supplier:delete',
  'customer:read', 'customer:write',
  'finance:read', 'finance:write',
  'reports:read',
  'database:backup', 'database:restore',
];

export function ensureSuperadmin(appDb: AppDatabase): void {
  const sqlite = appDb.sqlite;
  // 1. Role
  const roleId = 'role-superadmin';
  sqlite.prepare(
    `INSERT OR IGNORE INTO roles (id, name, description) VALUES (?, ?, ?)`,
  ).run(roleId, SUPERADMIN_ROLE, 'Superadmin — akses penuh termasuk branding & penghapusan data');

  // 2. Ensure every permission row exists
  const insertPerm = sqlite.prepare(
    `INSERT OR IGNORE INTO permissions (id, name, description) VALUES (?, ?, ?)`,
  );
  for (const name of ALL_PERMISSIONS) {
    insertPerm.run(`perm-${name.replace(/[^a-z0-9-]/g, '-')}`, name, name);
  }

  // 3. Grant all permissions to superadmin role
  const grant = sqlite.prepare(
    `INSERT OR IGNORE INTO role_permissions (id, role_id, permission_id)
     SELECT lower(hex(randomblob(16))), ?, id FROM permissions WHERE name = ?`,
  );
  for (const name of ALL_PERMISSIONS) {
    grant.run(roleId, name);
  }

  // 4. Superadmin user (create if absent)
  const existing = sqlite.prepare('SELECT id FROM users WHERE email = ?').get(SUPERADMIN_EMAIL) as
    | { id: string }
    | undefined;
  if (!existing) {
    const now = new Date().toISOString();
    sqlite
      .prepare(
        `INSERT INTO users (id, name, email, password, role_id, must_change_password, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 0, 1, ?, ?)`,
      )
      .run(randomUUID(), 'Superadmin', SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD_HASH, roleId, now, now);
  }
}

// ===== Branding =====

export type Branding = {
  appName: string;
  tagline: string;
  primaryColor: string;
  sidebarColor: string;
  accentColor: string;
  logoPath: string | null;
};

const DEFAULT_BRANDING: Branding = {
  appName: 'VYAPARA',
  tagline: 'SISTEM MANAJEMEN USAHA TERPADU',
  primaryColor: '#0D47A1',
  sidebarColor: '#0B3B73',
  accentColor: '#FF8F00',
  logoPath: null,
};

export function getBranding(appDb: AppDatabase): Branding {
  const rows = appDb.sqlite
    .prepare(`SELECT key, value FROM settings WHERE key LIKE 'brand_%'`)
    .all() as { key: string; value: string }[];
  const map = new Map(rows.map((r) => [r.key, r.value]));
  return {
    appName: map.get('brand_app_name') ?? DEFAULT_BRANDING.appName,
    tagline: map.get('brand_tagline') ?? DEFAULT_BRANDING.tagline,
    primaryColor: map.get('brand_primary_color') ?? DEFAULT_BRANDING.primaryColor,
    sidebarColor: map.get('brand_sidebar_color') ?? DEFAULT_BRANDING.sidebarColor,
    accentColor: map.get('brand_accent_color') ?? DEFAULT_BRANDING.accentColor,
    logoPath: map.get('brand_logo_path') ?? DEFAULT_BRANDING.logoPath,
  };
}

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export function setBranding(appDb: AppDatabase, patch: Partial<Branding>): Branding {
  const current = getBranding(appDb);
  const next: Branding = { ...current };
  const upsert = appDb.sqlite.prepare(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
  );
  const now = new Date().toISOString();
  const set = (key: string, value: string) => upsert.run(key, value, now);

  if (patch.appName !== undefined) {
    const v = String(patch.appName).trim().slice(0, 60);
    if (!v) throw new AppError('VALIDATION', 'Nama aplikasi tidak boleh kosong');
    next.appName = v; set('brand_app_name', v);
  }
  if (patch.tagline !== undefined) {
    const v = String(patch.tagline).trim().slice(0, 80);
    next.tagline = v; set('brand_tagline', v);
  }
  for (const [field, key] of [['primaryColor', 'brand_primary_color'], ['sidebarColor', 'brand_sidebar_color'], ['accentColor', 'brand_accent_color']] as const) {
    const v = patch[field];
    if (v !== undefined) {
      const c = String(v).trim();
      if (!HEX_RE.test(c)) throw new AppError('VALIDATION', 'Warna harus format #RRGGBB');
      (next as any)[field] = c; set(key, c);
    }
  }
  return next;
}

export function copyLogo(appDb: AppDatabase, srcPath: string, userDataDir: string): { logoPath: string } {
  const ext = path.extname(srcPath).toLowerCase();
  if (!['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif'].includes(ext)) {
    throw new AppError('VALIDATION', 'Logo harus PNG/JPG/WEBP/SVG/GIF');
  }
  const stat = fs.statSync(srcPath);
  if (stat.size > 2 * 1024 * 1024) {
    throw new AppError('VALIDATION', 'Logo maksimal 2 MB');
  }
  const destDir = path.join(userDataDir, 'branding');
  fs.mkdirSync(destDir, { recursive: true });
  const dest = path.join(destDir, `logo${ext}`);
  fs.copyFileSync(srcPath, dest);
  const now = new Date().toISOString();
  appDb.sqlite
    .prepare(
      `INSERT INTO settings (key, value, updated_at) VALUES ('brand_logo_path', ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    )
    .run(dest, now);
  return { logoPath: dest };
}

export function brandLogoDataUrl(appDb: AppDatabase): string | null {
  const { logoPath } = getBranding(appDb);
  if (!logoPath || !fs.existsSync(logoPath)) return null;
  const ext = path.extname(logoPath).toLowerCase().replace('.', '');
  const mime = ext === 'svg' ? 'image/svg+xml' : ext === 'png' ? 'image/png' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'webp' ? 'image/webp' : 'image/gif';
  const b64 = fs.readFileSync(logoPath).toString('base64');
  return `data:${mime};base64,${b64}`;
}

// ===== Danger zone =====

export function wipeSessions(appDb: AppDatabase): number {
  const r = appDb.sqlite.prepare('DELETE FROM sessions').run();
  return Number(r.changes);
}

/** Delete every non-superadmin user (and their sessions). */
export function wipeNonSuperadminUsers(appDb: AppDatabase): number {
  const count = appDb.sqlite
    .prepare(
      `SELECT COUNT(*) AS c FROM users u JOIN roles r ON r.id = u.role_id WHERE r.name <> ?`,
    )
    .get(SUPERADMIN_ROLE) as { c: number };
  // Delete sessions of non-superadmin users first (FK cascade handles it too, but be explicit)
  appDb.sqlite
    .prepare(
      `DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE role_id != ?)`,
    )
    .run('role-superadmin');
  appDb.sqlite
    .prepare('DELETE FROM users WHERE role_id != ?')
    .run('role-superadmin');
  return count.c;
}

/** Delete ALL business data. Keeps superadmin account, roles/permissions, categories/units seeds, device identity. */
export function factoryReset(appDb: AppDatabase): void {
  const tablesToClear = [
    'sync_quarantine', 'sync_conflicts', 'sync_conflict_resolution_history',
    'sync_sync_entity_versions' , 'sync_entity_versions',
    'sync_applied_events', 'sync_outbox', 'sync_state',
    'sales_return_items', 'sales_returns',
    'purchase_return_items', 'purchase_returns',
    'supplier_invoice_items', 'supplier_invoices',
    'goods_receiving_items', 'goods_receiving',
    'purchase_order_items', 'purchase_orders',
    'customer_transactions', 'customers',
    'expense_records', 'income_records', 'cash_movements', 'cash_drawers',
    'stock_movements', 'stock_adjustments', 'stock_opname_items', 'stock_opname',
    'product_inventory_settings', 'inventory_valuation_items', 'inventory_valuation',
    'supplier_transactions', 'suppliers',
    'transaction_items', 'transactions',
    'products',
    'sessions', 'users',
    'settings',
  ];
  const uniqueTables = [...new Set(tablesToClear)];
  const tx = appDb.sqlite.transaction(() => {
    appDb.sqlite.exec('PRAGMA foreign_keys = OFF;');
    for (const table of uniqueTables) {
      try {
        appDb.sqlite.prepare(`DELETE FROM ${table}`).run();
      } catch {
        // table may not exist in older schemas — skip
      }
    }
    appDb.sqlite.exec('PRAGMA foreign_keys = ON;');
    // Recreate superadmin after user wipe
    ensureSuperadmin(appDb);
  });
  tx();
}
