#!/usr/bin/env node
/**
 * Create/promote the superadmin account on THIS machine.
 * Run AFTER installing the app, with the app CLOSED:
 *   node scripts/create-superadmin.mjs <path-to-vyapara.db> <email> <password>
 *
 * Safe to run multiple times; only changes role assignment.
 */
import Database from 'better-sqlite3';
import { scryptSync, randomBytes } from 'node:crypto';
import { v4 as uuidv4 } from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';

const [,, dbArg, emailArg, passwordArg] = process.argv;
if (!dbArg || !emailArg || !passwordArg) {
  console.error('Usage: node scripts/create-superadmin.mjs <db-path> <email> <password>');
  process.exit(1);
}
if (!fs.existsSync(dbArg)) {
  console.error(`DB not found: ${dbArg}`);
  process.exit(1);
}
if (passwordArg.length < 10) {
  console.error('Password must be >= 10 characters');
  process.exit(1);
}

const email = emailArg.trim().toLowerCase();
const db = new Database(dbArg);

// Ensure superadmin role exists (migration already creates it, but be defensive)
const role = db.prepare("SELECT id FROM roles WHERE name = 'superadmin'").get();
if (!role) {
  db.prepare("INSERT INTO roles (id, name, description) VALUES ('role-superadmin', 'superadmin', 'Full access incl. branding')").run();
}

const hashPassword = (p) => {
  const salt = randomBytes(16).toString('hex');
  const key = scryptSync(p, salt, 64, { N: 65536, maxmem: 128 * 1024 * 1024 }).toString('hex');
  return `${salt}:${key}`;
};

const now = new Date().toISOString();
const user = db.prepare('SELECT id, role_id FROM users WHERE email = ?').get(email);
if (user) {
  db.prepare('UPDATE users SET role_id = ?, must_change_password = 0, updated_at = ? WHERE id = ?')
    .run('role-superadmin', now, user.id);
  console.log(`Promoted existing account ${email} to superadmin`);
} else {
  db.prepare(
    "INSERT INTO users (id, name, email, password, role_id, must_change_password, is_active, created_at, updated_at) VALUES (?, 'Superadmin', ?, ?, 'role-superadmin', 0, 1, ?, ?)",
  ).run(uuidv4(), email, hashPassword(passwordArg), now, now);
  console.log(`Created superadmin account: ${email}`);
}
db.close();
console.log('Done. Restart the app, then press F7 to open the superadmin portal.');
