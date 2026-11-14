import { randomUUID } from 'node:crypto';
import type { AppDatabase } from '../db/open';
import { AppError } from '../errors';
import { hashPassword } from './passwords';

export type AdminUserRecord = {
  id: string;
  name: string;
  email: string;
  roleId: string | null;
  roleName: string | null;
  mustChangePassword: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AdminRoleRecord = {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
};

export type AdminPermissionRecord = {
  id: string;
  name: string;
  description: string | null;
};

export type SettingRecord = {
  key: string;
  value: string;
  updatedAt: string;
};

type UserRow = {
  id: string;
  name: string;
  email: string;
  role_id: string | null;
  must_change_password: number;
  is_active: number;
  created_at: string;
  updated_at: string;
};

type RoleRow = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
};

type PermissionRow = {
  id: string;
  name: string;
  description: string | null;
};

export function listUsers(
  db: AppDatabase,
  filters: { roleId?: string; search?: string; limit?: number } = {},
): AdminUserRecord[] {
  const clauses: string[] = [];
  const params: any[] = [];
  if (filters.roleId) {
    clauses.push('u.role_id = ?');
    params.push(filters.roleId);
  }
  if (filters.search) {
    clauses.push('(u.name LIKE ? OR u.email LIKE ?)');
    params.push(`%${filters.search}%`, `%${filters.search}%`);
  }
  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  const limit = filters.limit ? `LIMIT ${filters.limit}` : '';

  const rows = db.sqlite
    .prepare(
      `SELECT u.id, u.name, u.email, u.role_id, u.must_change_password,
              u.created_at, u.updated_at, r.name AS role_name
       FROM users u
       LEFT JOIN roles r ON r.id = u.role_id
       ${where}
       ORDER BY u.name COLLATE NOCASE
       ${limit}`,
    )
    .all(...params) as (UserRow & { role_name: string | null })[];

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    roleId: row.role_id,
    roleName: row.role_name,
    mustChangePassword: row.must_change_password === 1,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export function createUser(
  db: AppDatabase,
  input: { name: string; email: string; password: string; roleId: string },
): AdminUserRecord {
  const existing = db.sqlite.prepare('SELECT id FROM users WHERE lower(email) = lower(?)').get(input.email.trim()) as { id: string } | undefined;
  if (existing) {
    throw new AppError('CONFLICT', 'Email sudah terdaftar');
  }

  const role = db.sqlite.prepare('SELECT id, name FROM roles WHERE id = ?').get(input.roleId) as { id: string; name: string } | undefined;
  if (!role) {
    throw new AppError('NOT_FOUND', 'Peran tidak ditemukan');
  }

  const now = new Date().toISOString();
  const id = randomUUID();
  db.sqlite
    .prepare(
      `INSERT INTO users (id, name, email, password, role_id, must_change_password, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
    )
    .run(id, input.name.trim(), input.email.trim().toLowerCase(), hashPassword(input.password), input.roleId, now, now);

  return {
    id,
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    roleId: input.roleId,
    roleName: role.name,
    mustChangePassword: false,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
}

export function updateUser(
  db: AppDatabase,
  input: { id: string; name?: string; email?: string; roleId?: string; isActive?: boolean },
): AdminUserRecord {
  const existing = db.sqlite.prepare('SELECT id, name, email, role_id, must_change_password, is_active, created_at, updated_at FROM users WHERE id = ?').get(input.id) as UserRow | undefined;
  if (!existing) {
    throw new AppError('NOT_FOUND', 'Pengguna tidak ditemukan');
  }

  if (input.email !== undefined && input.email !== existing.email) {
    const dup = db.sqlite.prepare('SELECT id FROM users WHERE lower(email) = lower(?) AND id <> ?').get(input.email.trim(), existing.id) as { id: string } | undefined;
    if (dup) {
      throw new AppError('CONFLICT', 'Email sudah terdaftar');
    }
  }

  if (input.roleId !== undefined) {
    const role = db.sqlite.prepare('SELECT id FROM roles WHERE id = ?').get(input.roleId) as { id: string } | undefined;
    if (!role) {
      throw new AppError('NOT_FOUND', 'Peran tidak ditemukan');
    }
  }

  const now = new Date().toISOString();
  const assignments: string[] = [];
  const params: any[] = [];
  const set = (column: string, value: string | number | null) => {
    assignments.push(`${column} = ?`);
    params.push(value);
  };
  if (input.name !== undefined) set('name', input.name.trim());
  if (input.email !== undefined) set('email', input.email.trim().toLowerCase());
  if (input.roleId !== undefined) set('role_id', input.roleId);
  if (input.isActive !== undefined) set('is_active', input.isActive ? 1 : 0);
  set('updated_at', now);
  params.push(input.id);

  db.sqlite.prepare(`UPDATE users SET ${assignments.join(', ')} WHERE id = ?`).run(...params);

  const row = db.sqlite
    .prepare(
      `SELECT u.id, u.name, u.email, u.role_id, u.must_change_password, u.is_active, u.created_at, u.updated_at, r.name AS role_name
       FROM users u LEFT JOIN roles r ON r.id = u.role_id WHERE u.id = ?`,
    )
    .get(input.id) as (UserRow & { role_name: string | null }) | undefined;

  return {
    id: row!.id,
    name: row!.name,
    email: row!.email,
    roleId: row!.role_id,
    roleName: row!.role_name,
    mustChangePassword: row!.must_change_password === 1,
    isActive: row!.is_active === 1,
    createdAt: row!.created_at,
    updatedAt: row!.updated_at,
  };
}

export function deactivateUser(db: AppDatabase, id: string): void {
  const existing = db.sqlite.prepare('SELECT id FROM users WHERE id = ?').get(id) as { id: string } | undefined;
  if (!existing) {
    throw new AppError('NOT_FOUND', 'Pengguna tidak ditemukan');
  }
  const now = new Date().toISOString();
  db.sqlite.prepare('UPDATE users SET is_active = 0, updated_at = ? WHERE id = ?').run(now, id);
}

export function listRoles(db: AppDatabase): AdminRoleRecord[] {
  const rows = db.sqlite
    .prepare('SELECT id, name, description, created_at FROM roles ORDER BY name COLLATE NOCASE')
    .all() as RoleRow[];
  return rows.map((row) => ({ id: row.id, name: row.name, description: row.description, createdAt: row.created_at }));
}

export function createRole(db: AppDatabase, input: { name: string; description?: string }): AdminRoleRecord {
  const name = input.name.trim();
  const existing = db.sqlite.prepare('SELECT id FROM roles WHERE lower(name) = lower(?)').get(name) as { id: string } | undefined;
  if (existing) {
    throw new AppError('CONFLICT', 'Peran sudah ada');
  }
  const now = new Date().toISOString();
  const id = randomUUID();
  db.sqlite.prepare('INSERT INTO roles (id, name, description, created_at) VALUES (?, ?, ?, ?)').run(id, input.name, input.description ?? null, now);
  return { id, name: input.name, description: input.description ?? null, createdAt: now };
}

export function updateRole(db: AppDatabase, input: { id: string; name?: string; description?: string | null }): AdminRoleRecord {
  const existing = db.sqlite.prepare('SELECT id, name, description, created_at FROM roles WHERE id = ?').get(input.id) as RoleRow | undefined;
  if (!existing) {
    throw new AppError('NOT_FOUND', 'Peran tidak ditemukan');
  }
  const name = input.name?.trim();
  if (name !== undefined && name.toLowerCase() !== existing.name.toLowerCase()) {
    const dup = db.sqlite.prepare('SELECT id FROM roles WHERE lower(name) = lower(?) AND id <> ?').get(name, existing.id) as { id: string } | undefined;
    if (dup) {
      throw new AppError('CONFLICT', 'Peran sudah ada');
    }
  }
  const now = new Date().toISOString();
  const assignments: string[] = [];
  const params: any[] = [];
  if (name !== undefined) { assignments.push('name = ?'); params.push(name); }
  if (input.description !== undefined) { assignments.push('description = ?'); params.push(input.description); }
  params.push(input.id);
  if (assignments.length === 0) {
    return { id: existing.id, name: existing.name, description: existing.description, createdAt: existing.created_at };
  }
  db.sqlite.prepare(`UPDATE roles SET ${assignments.join(', ')} WHERE id = ?`).run(...params);
  const row = db.sqlite.prepare('SELECT id, name, description, created_at FROM roles WHERE id = ?').get(input.id) as RoleRow;
  return { id: row.id, name: row.name, description: row.description, createdAt: row.created_at };
}

export function deactivateRole(db: AppDatabase, id: string): void {
  const existing = db.sqlite.prepare('SELECT id FROM roles WHERE id = ?').get(id) as { id: string } | undefined;
  if (!existing) {
    throw new AppError('NOT_FOUND', 'Peran tidak ditemukan');
  }
}

export function listPermissions(db: AppDatabase): AdminPermissionRecord[] {
  return db.sqlite
    .prepare('SELECT id, name, description FROM permissions ORDER BY name COLLATE NOCASE')
    .all() as PermissionRow[];
}

export function listSettings(db: AppDatabase): SettingRecord[] {
  return db.sqlite
    .prepare('SELECT key, value, updated_at FROM settings ORDER BY key')
    .all() as SettingRecord[];
}

export function upsertSetting(db: AppDatabase, input: { key: string; value: string }): SettingRecord {
  const now = new Date().toISOString();
  db.sqlite
    .prepare(
      `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    )
    .run(input.key, input.value, now);
  const row = db.sqlite.prepare('SELECT key, value, updated_at FROM settings WHERE key = ?').get(input.key) as SettingRecord;
  return row;
}

export function listRolePermissions(db: AppDatabase, roleId: string): string[] {
  const role = db.sqlite.prepare('SELECT id FROM roles WHERE id = ?').get(roleId);
  if (!role) {
    throw new AppError('NOT_FOUND', 'Peran tidak ditemukan');
  }
  const rows = db.sqlite
    .prepare(
      `SELECT p.name AS name
       FROM role_permissions rp
       JOIN permissions p ON p.id = rp.permission_id
       WHERE rp.role_id = ?
       ORDER BY p.name`,
    )
    .all(roleId) as { name: string }[];
  return rows.map((row) => row.name);
}

export function setRolePermissions(
  db: AppDatabase,
  input: { roleId: string; permissions: string[] },
): string[] {
  const role = db.sqlite.prepare('SELECT id, name FROM roles WHERE id = ?').get(input.roleId) as
    | { id: string; name: string }
    | undefined;
  if (!role) {
    throw new AppError('NOT_FOUND', 'Peran tidak ditemukan');
  }
  if (role.name === 'admin') {
    throw new AppError('VALIDATION', 'Izin peran admin tidak dapat diubah');
  }
  const unique = [...new Set(input.permissions)];
  const rows = db.sqlite
    .prepare(`SELECT id, name FROM permissions WHERE name IN (${unique.map(() => '?').join(',') || "''"})`)
    .all(...unique) as { id: string; name: string }[];
  if (rows.length !== unique.length) {
    throw new AppError('VALIDATION', 'Izin tidak dikenal');
  }

  const remove = db.sqlite.prepare('DELETE FROM role_permissions WHERE role_id = ?');
  const insert = db.sqlite.prepare(
    'INSERT INTO role_permissions (id, role_id, permission_id) VALUES (?, ?, ?)',
  );
  const write = db.sqlite.transaction(() => {
    remove.run(input.roleId);
    for (const row of rows) {
      insert.run(randomUUID(), input.roleId, row.id);
    }
  });
  write();
  return listRolePermissions(db, input.roleId);
}

export function getUser(db: AppDatabase, id: string): AdminUserRecord | undefined {
  const row = db.sqlite
    .prepare(
      `SELECT u.id, u.name, u.email, u.role_id, u.must_change_password, u.is_active,
              u.created_at, u.updated_at, r.name AS role_name
       FROM users u LEFT JOIN roles r ON r.id = u.role_id WHERE u.id = ?`,
    )
    .get(id) as (UserRow & { role_name: string | null }) | undefined;
  if (!row) {
    return undefined;
  }
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    roleId: row.role_id,
    roleName: row.role_name,
    mustChangePassword: row.must_change_password === 1,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
