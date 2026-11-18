import { randomBytes, randomUUID } from 'node:crypto';
import type { SyncServerDb } from '../db/open.js';
import { nowIso, sha256Hex } from './crypto.js';
import { AppError } from '../errors.js';

const LICENSE_KEY_REGEX = /^VYPR-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

export function generateLicenseKey(): string {
  const block = () => randomBytes(3).toString('hex').toUpperCase().slice(0, 4);
  return 'VYPR-' + block() + '-' + block() + '-' + block();
}

export function maskLicenseKey(key: string): string {
  return key.slice(0, 9) + '****';
}

export type LicenseRecord = {
  id: string;
  keyMasked: string;
  organizationId: string;
  organizationName: string | null;
  status: 'active' | 'revoked' | 'expired';
  maxActivations: number;
  activatedCount: number;
  deviceId: string | null;
  notes: string | null;
  createdAt: string;
  activatedAt: string | null;
  revokedAt: string | null;
  expiresAt: string | null;
};

function mapLicense(r: any): LicenseRecord {
  return {
    id: r.id,
    keyMasked: r.key_masked,
    organizationId: r.organization_id,
    organizationName: r.organization_name ?? null,
    status: r.status,
    maxActivations: r.max_activations,
    activatedCount: r.activated_count,
    deviceId: r.device_id ?? null,
    notes: r.notes ?? null,
    createdAt: r.created_at,
    activatedAt: r.activated_at ?? null,
    revokedAt: r.revoked_at ?? null,
    expiresAt: r.expires_at ?? null,
  };
}

export function createLicense(
  db: SyncServerDb,
  input: { organizationName?: string; maxActivations?: number; expiresAt?: string | null; notes?: string | null },
): LicenseRecord & { key: string } {
  const organizationId = randomUUID();
  const name = input.organizationName?.trim() || null;
  const now = nowIso();
  const key = generateLicenseKey();

  db.sqlite
    .prepare('INSERT OR IGNORE INTO sync_organizations (organization_id, name, created_at) VALUES (?, ?, ?)')
    .run(organizationId, name, now);

  const id = randomUUID();
  const maxActivations = Math.max(1, Math.round(input.maxActivations ?? 1));
  db.sqlite
    .prepare(
      'INSERT INTO licenses (id, key_hash, key_masked, organization_id, organization_name, status, max_activations, activated_count, notes, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    )
    .run(id, sha256Hex(key), maskLicenseKey(key), organizationId, name, 'active', maxActivations, 0, input.notes ?? null, now, input.expiresAt ?? null);

  return {
    id,
    key,
    keyMasked: maskLicenseKey(key),
    organizationId,
    organizationName: name,
    status: 'active',
    maxActivations,
    activatedCount: 0,
    deviceId: null,
    notes: input.notes ?? null,
    createdAt: now,
    activatedAt: null,
    revokedAt: null,
    expiresAt: input.expiresAt ?? null,
  };
}

export function activateLicense(
  db: SyncServerDb,
  input: { licenseKey: string; deviceId: string; organizationName?: string },
): { organizationId: string; organizationName: string | null; licenseId: string } {
  const key = input.licenseKey.trim().toUpperCase();
  if (!LICENSE_KEY_REGEX.test(key)) {
    throw new AppError('VALIDATION', 'Format serial tidak valid (VYPR-XXXX-XXXX-XXXX)');
  }
  const keyHash = sha256Hex(key);
  const row = db.sqlite.prepare('SELECT * FROM licenses WHERE key_hash = ?').get(keyHash) as any;
  if (!row) {
    throw new AppError('LICENSE_INVALID', 'Serial number tidak dikenal');
  }
  if (row.status === 'revoked') {
    throw new AppError('LICENSE_REVOKED', 'Serial number ini telah dinonaktifkan oleh pemilik');
  }
  if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
    db.sqlite.prepare("UPDATE licenses SET status = 'expired', revoked_at = ? WHERE id = ?").run(nowIso(), row.id);
    throw new AppError('LICENSE_EXPIRED', 'Serial number sudah kadaluarsa');
  }
  if (row.activated_count >= row.max_activations && row.device_id !== input.deviceId) {
    throw new AppError('LICENSE_LIMIT', 'Serial number ini sudah dipakai di perangkat lain');
  }

  const now = nowIso();
  const orgName = input.organizationName?.trim() || row.organization_name || null;
  const tx = db.sqlite.transaction(() => {
    if (orgName && !row.organization_name) {
      db.sqlite.prepare('UPDATE licenses SET organization_name = ? WHERE id = ?').run(orgName, row.id);
    }
    db.sqlite
      .prepare(
        'UPDATE licenses SET activated_count = CASE WHEN activated_count < max_activations THEN activated_count + 1 ELSE activated_count END, device_id = ?, activated_at = COALESCE(activated_at, ?) WHERE id = ?',
      )
      .run(input.deviceId, now, row.id);
  });
  tx();

  return { organizationId: row.organization_id, organizationName: orgName, licenseId: row.id };
}

export function verifyLicense(
  db: SyncServerDb,
  input: { licenseKey: string; deviceId: string },
): { status: 'active' | 'revoked' | 'expired'; organizationId: string } {
  const key = input.licenseKey.trim().toUpperCase();
  const keyHash = sha256Hex(key);
  const row = db.sqlite.prepare('SELECT * FROM licenses WHERE key_hash = ?').get(keyHash) as any;
  if (!row) return { status: 'revoked', organizationId: '' };
  const expired = !!row.expires_at && new Date(row.expires_at).getTime() < Date.now();
  return { status: expired || row.status === 'revoked' ? 'revoked' : 'active', organizationId: row.organization_id };
}

export function listLicenses(db: SyncServerDb, limit = 100): LicenseRecord[] {
  const rows = db.sqlite
    .prepare('SELECT * FROM licenses ORDER BY created_at DESC LIMIT ?')
    .all(Math.min(Math.max(limit, 1), 500)) as any[];
  return rows.map(mapLicense);
}

export function revokeLicense(db: SyncServerDb, licenseId: string): LicenseRecord {
  const row = db.sqlite.prepare('SELECT * FROM licenses WHERE id = ?').get(licenseId) as any;
  if (!row) throw new AppError('NOT_FOUND', 'License tidak ditemukan');
  const now = nowIso();
  db.sqlite.prepare("UPDATE licenses SET status = 'revoked', revoked_at = ? WHERE id = ?").run(now, licenseId);
  return mapLicense({ ...row, status: 'revoked', revoked_at: now });
}

export function deleteLicense(db: SyncServerDb, licenseId: string): void {
  db.sqlite.prepare('DELETE FROM licenses WHERE id = ?').run(licenseId);
}
