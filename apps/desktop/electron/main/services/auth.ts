import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { PublicUser } from 'vyapara-shared';
import type { AppDatabase } from '../db/open';
import { AppError } from '../errors';
import { hashPassword, verifyPassword } from './passwords';

const SESSION_HOURS = 12;
const MAX_FAILURES = 8;
const LOCK_MS = 30_000;

const failures = new Map<string, { count: number; lockedUntil: number }>();

export function resetAuthRateLimit(): void {
  failures.clear();
}

type UserRow = {
  id: string;
  name: string;
  email: string;
  password: string;
  role_name: string | null;
  must_change_password: number;
  is_active: number;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function assertPasswordPolicy(password: string, email: string): void {
  if (password.length < 10 || password.length > 200) {
    throw new AppError('VALIDATION', 'Kata sandi minimal 10 karakter');
  }
  if (password.toLowerCase() === email.toLowerCase()) {
    throw new AppError('VALIDATION', 'Kata sandi tidak boleh sama dengan email');
  }
}

function noteFailure(email: string): void {
  const current = failures.get(email) ?? { count: 0, lockedUntil: 0 };
  current.count += 1;
  if (current.count >= MAX_FAILURES) {
    current.lockedUntil = Date.now() + LOCK_MS;
    current.count = 0;
  }
  failures.set(email, current);
}

function assertNotLocked(email: string): void {
  const current = failures.get(email);
  if (current && current.lockedUntil > Date.now()) {
    throw new AppError('RATE_LIMITED', 'Terlalu banyak percobaan. Coba lagi sebentar.');
  }
}

function clearFailures(email: string): void {
  failures.delete(email);
}

function loadUser(db: AppDatabase, email: string): UserRow | undefined {
  return db.sqlite
    .prepare(
      `SELECT u.id, u.name, u.email, u.password, u.must_change_password, u.is_active, r.name AS role_name
       FROM users u
       LEFT JOIN roles r ON r.id = u.role_id
       WHERE u.email = ?`,
    )
    .get(email) as UserRow | undefined;
}

function permissionsFor(db: AppDatabase, userId: string): string[] {
  const rows = db.sqlite
    .prepare(
      `SELECT p.name AS name
       FROM users u
       JOIN role_permissions rp ON rp.role_id = u.role_id
       JOIN permissions p ON p.id = rp.permission_id
       WHERE u.id = ?`,
    )
    .all(userId) as { name: string }[];
  return rows.map((row) => row.name);
}

function toPublicUser(db: AppDatabase, row: UserRow): PublicUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role_name ?? 'viewer',
    permissions: permissionsFor(db, row.id),
    mustChangePassword: row.must_change_password === 1,
  };
}

function issueSession(db: AppDatabase, user: PublicUser): { token: string; user: PublicUser } {
  const token = randomBytes(32).toString('base64url');
  const expires = new Date(Date.now() + SESSION_HOURS * 60 * 60 * 1000).toISOString();
  db.sqlite
    .prepare(
      'INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)',
    )
    .run(randomUUID(), user.id, hashToken(token), expires, new Date().toISOString());
  return { token, user };
}

export function needsSetup(db: AppDatabase): boolean {
  const row = db.sqlite.prepare('SELECT COUNT(*) AS c FROM users').get() as { c: number };
  return row.c === 0;
}

export function setupAdmin(
  db: AppDatabase,
  input: { name: string; email: string; password: string },
): { token: string; user: PublicUser } {
  if (!needsSetup(db)) {
    throw new AppError('SETUP_CLOSED', 'Administrator sudah ada');
  }
  const email = normalizeEmail(input.email);
  assertPasswordPolicy(input.password, email);
  const role = db.sqlite.prepare('SELECT id FROM roles WHERE name = ?').get('admin') as
    | { id: string }
    | undefined;
  if (!role) {
    throw new AppError('INTERNAL', 'Peran administrator tidak tersedia');
  }
  const now = new Date().toISOString();
  const id = randomUUID();
  db.sqlite
    .prepare(
      `INSERT INTO users (id, name, email, password, role_id, must_change_password, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
    )
    .run(id, input.name.trim(), email, hashPassword(input.password), role.id, now, now);
  const created = loadUser(db, email);
  if (!created) {
    throw new AppError('INTERNAL', 'Administrator tidak dapat dibuat');
  }
  return issueSession(db, toPublicUser(db, created));
}

export function login(
  db: AppDatabase,
  input: { email: string; password: string },
): { token: string; user: PublicUser } {
  const email = normalizeEmail(input.email);
  assertNotLocked(email);
  const row = loadUser(db, email);
  if (!row || !verifyPassword(input.password, row.password)) {
    noteFailure(email);
    throw new AppError('INVALID_CREDENTIALS', 'Email atau kata sandi salah');
  }
  if (row.is_active !== 1) {
    throw new AppError('FORBIDDEN', 'Akun pengguna tidak aktif');
  }
  clearFailures(email);
  db.sqlite.prepare(`DELETE FROM sessions WHERE expires_at < ?`).run(new Date().toISOString());
  return issueSession(db, toPublicUser(db, row));
}

export function readSession(db: AppDatabase, token: string): PublicUser | null {
  const row = db.sqlite
    .prepare(
      `SELECT u.id, u.name, u.email, u.password, u.must_change_password, u.is_active, r.name AS role_name
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN roles r ON r.id = u.role_id
       WHERE s.token_hash = ? AND s.revoked_at IS NULL AND s.expires_at > ? AND u.is_active = 1`,
    )
    .get(hashToken(token), new Date().toISOString()) as UserRow | undefined;
  if (!row) {
    return null;
  }
  return toPublicUser(db, row);
}

export function requireUser(db: AppDatabase, token: string): PublicUser {
  const user = readSession(db, token);
  if (!user) {
    throw new AppError('UNAUTHENTICATED', 'Sesi tidak berlaku. Masuk kembali.');
  }
  return user;
}

export function assertPermission(user: PublicUser, permission: string): void {
  if (user.mustChangePassword) {
    throw new AppError('PASSWORD_CHANGE_REQUIRED', 'Ganti kata sandi sebelum melanjutkan');
  }
  if (!user.permissions.includes(permission)) {
    throw new AppError('FORBIDDEN', 'Anda tidak memiliki akses untuk tindakan ini');
  }
}

export function logout(db: AppDatabase, token: string): void {
  db.sqlite
    .prepare(`UPDATE sessions SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL`)
    .run(new Date().toISOString(), hashToken(token));
}

export function changePassword(
  db: AppDatabase,
  token: string,
  currentPassword: string,
  nextPassword: string,
): { token: string; user: PublicUser } {
  const sessionUser = requireUser(db, token);
  const row = loadUser(db, sessionUser.email);
  if (!row || !verifyPassword(currentPassword, row.password)) {
    throw new AppError('INVALID_CREDENTIALS', 'Kata sandi saat ini salah');
  }
  assertPasswordPolicy(nextPassword, row.email);
  if (verifyPassword(nextPassword, row.password)) {
    throw new AppError('VALIDATION', 'Kata sandi baru harus berbeda');
  }
  const now = new Date().toISOString();
  db.sqlite
    .prepare('UPDATE users SET password = ?, must_change_password = 0, updated_at = ? WHERE id = ?')
    .run(hashPassword(nextPassword), now, row.id);
  db.sqlite
    .prepare('UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL')
    .run(now, row.id);
  const refreshed = loadUser(db, row.email);
  if (!refreshed) {
    throw new AppError('INTERNAL', 'Pengguna tidak ditemukan');
  }
  return issueSession(db, toPublicUser(db, refreshed));
}
