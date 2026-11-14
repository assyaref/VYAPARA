import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type Database from 'better-sqlite3';

const SALT_LEN = 16;
const KEY_LEN = 64;
const COST = 65536;

const REMOVED_SEED_PASSWORD = 'admin123';
const REMOVED_SEED_EMAIL = 'admin@vyapara.com';

const SCRYPT_MAXMEM = 128 * 1024 * 1024;

export function hashPassword(password: string): string {
  const salt = randomBytes(SALT_LEN).toString('hex');
  const key = scryptSync(password, salt, KEY_LEN, { N: COST, maxmem: SCRYPT_MAXMEM }).toString('hex');
  return `${salt}:${key}`;
}

export function verifyPassword(password: string, passwordHash: string): boolean {
  const [salt, key] = passwordHash.split(':');
  if (!salt || !key) {
    return false;
  }
  const derivedKey = scryptSync(password, salt, KEY_LEN, { N: COST, maxmem: SCRYPT_MAXMEM });
  const hashBuffer = Buffer.from(key, 'hex');
  return timingSafeEqual(derivedKey, hashBuffer);
}

export function remediateKnownPassword(sqlite: Database.Database): void {
  const row = sqlite
    .prepare('SELECT id, password FROM users WHERE email = ?')
    .get(REMOVED_SEED_EMAIL) as { id: string; password: string } | undefined;
  if (!row) {
    return;
  }
  if (!verifyPassword(REMOVED_SEED_PASSWORD, row.password)) {
    return;
  }
  sqlite.prepare('UPDATE users SET must_change_password = 1, updated_at = ? WHERE id = ?').run(
    new Date().toISOString(),
    row.id,
  );
}
