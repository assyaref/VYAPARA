import type { SyncServerDb } from '../db/open.js';
import { addHoursIso, nowIso, randomToken, safeEqualHex, sha256Hex } from './crypto.js';

export type AuthenticatedDevice = {
  deviceId: string;
  organizationId: string;
  status: 'active' | 'revoked' | 'inactive';
};

export type DeviceAuthResult =
  | { ok: true; device: AuthenticatedDevice }
  | { ok: false; code: string; message: string; status: number };

function ensureOrganization(db: SyncServerDb, organizationId: string): void {
  const now = nowIso();
  db.sqlite
    .prepare('INSERT OR IGNORE INTO sync_organizations (organization_id, name, created_at) VALUES (?, NULL, ?)')
    .run(organizationId, now);
}

export function registerDevice(
  db: SyncServerDb,
  input: { deviceId: string; organizationId: string; enrollmentSecret: string; deviceName?: string },
  options: { expectedEnrollmentSecret: string; tokenTtlHours?: number },
): { deviceId: string; organizationId: string; deviceToken: string; tokenExpiresAt: string; status: 'active' } {
  if (!safeEqualStrings(input.enrollmentSecret, options.expectedEnrollmentSecret)) {
    throw Object.assign(new Error('Invalid enrollment secret'), { code: 'AUTH_INVALID', statusCode: 401 });
  }
  const now = nowIso();
  const token = randomToken(32);
  const tokenHash = sha256Hex(token);
  const tokenExpiresAt = addHoursIso(options.tokenTtlHours ?? 24 * 30);

  const tx = db.sqlite.transaction(() => {
    ensureOrganization(db, input.organizationId);
    const existing = db.sqlite
      .prepare('SELECT device_id, organization_id, status FROM sync_devices WHERE device_id = ?')
      .get(input.deviceId) as { device_id: string; organization_id: string; status: string } | undefined;

    if (existing?.status === 'revoked') {
      throw Object.assign(new Error('Device revoked'), { code: 'DEVICE_REVOKED', statusCode: 403 });
    }
    if (existing && existing.organization_id !== input.organizationId) {
      // Explicit tenant binding: a device cannot migrate across organizations via re-registration.
      throw Object.assign(new Error('Device already bound to a different organization'), { code: 'DEVICE_ORG_MISMATCH', statusCode: 403 });
    }

    if (existing) {
      db.sqlite
        .prepare(
          `UPDATE sync_devices
           SET device_name = COALESCE(?, device_name), token_hash = ?, token_expires_at = ?, status = 'active',
               updated_at = ?, revoked_at = NULL, revoke_reason = NULL
           WHERE device_id = ?`,
        )
        .run(input.deviceName ?? null, tokenHash, tokenExpiresAt, now, input.deviceId);
    } else {
      db.sqlite
        .prepare(
          `INSERT INTO sync_devices (device_id, organization_id, device_name, enrollment_secret_hash, token_hash, token_expires_at, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
        )
        .run(
          input.deviceId,
          input.organizationId,
          input.deviceName ?? null,
          sha256Hex(options.expectedEnrollmentSecret),
          tokenHash,
          tokenExpiresAt,
          now,
          now,
        );
    }
  });
  tx();

  return { deviceId: input.deviceId, organizationId: input.organizationId, deviceToken: token, tokenExpiresAt, status: 'active' };
}

function safeEqualStrings(a: string, b: string): boolean {
  const ha = sha256Hex(a);
  const hb = sha256Hex(b);
  return safeEqualHex(ha, hb);
}

// Derive identity exclusively from server-side token lookup (never from client-supplied deviceId/org).
export function authenticateBearerToken(db: SyncServerDb, token: string): DeviceAuthResult {
  const tokenHash = sha256Hex(token);
  const row = db.sqlite
    .prepare('SELECT device_id, organization_id, token_hash, token_expires_at, status FROM sync_devices WHERE token_hash = ?')
    .get(tokenHash) as
    | { device_id: string; organization_id: string; token_hash: string | null; token_expires_at: string | null; status: 'active' | 'revoked' | 'inactive' }
    | undefined;

  if (!row) return { ok: false, code: 'AUTH_INVALID', message: 'Invalid device credentials', status: 401 };
  if (row.status === 'revoked') return { ok: false, code: 'DEVICE_REVOKED', message: 'Device revoked', status: 403 };
  if (row.status !== 'active') return { ok: false, code: 'DEVICE_INACTIVE', message: 'Device not active', status: 403 };
  if (!row.token_hash || !safeEqualHex(tokenHash, row.token_hash)) {
    return { ok: false, code: 'AUTH_INVALID', message: 'Invalid device credentials', status: 401 };
  }
  if (!row.token_expires_at || new Date(row.token_expires_at).getTime() <= Date.now()) {
    return { ok: false, code: 'TOKEN_EXPIRED', message: 'Device token expired', status: 401 };
  }
  return { ok: true, device: { deviceId: row.device_id, organizationId: row.organization_id, status: row.status } };
}

export function renewDeviceToken(
  db: SyncServerDb,
  currentToken: string,
  tokenTtlHours = 24 * 30,
  claimedDeviceId?: string,
): { deviceId: string; organizationId: string; deviceToken: string; tokenExpiresAt: string } {
  const auth = authenticateBearerToken(db, currentToken);
  if (!auth.ok) throw Object.assign(new Error(auth.message), { code: auth.code, statusCode: auth.status });
  if (claimedDeviceId && claimedDeviceId !== auth.device.deviceId) {
    throw Object.assign(new Error('Device identity mismatch'), { code: 'DEVICE_MISMATCH', statusCode: 403 });
  }
  const token = randomToken(32);
  const tokenExpiresAt = addHoursIso(tokenTtlHours);
  db.sqlite
    .prepare('UPDATE sync_devices SET token_hash = ?, token_expires_at = ?, updated_at = ? WHERE device_id = ?')
    .run(sha256Hex(token), tokenExpiresAt, nowIso(), auth.device.deviceId);
  return { deviceId: auth.device.deviceId, organizationId: auth.device.organizationId, deviceToken: token, tokenExpiresAt };
}

export function revokeDevice(db: SyncServerDb, deviceId: string, reason?: string): void {
  const row = db.sqlite.prepare('SELECT device_id FROM sync_devices WHERE device_id = ?').get(deviceId) as
    | { device_id: string }
    | undefined;
  if (!row) throw Object.assign(new Error('Device not found'), { code: 'NOT_FOUND', statusCode: 404 });
  const now = nowIso();
  // Keep token_hash so revoked credentials are recognized as revoked (403) rather than unknown (401),
  // but status='revoked' is authoritative and blocks authentication/renewal/download/upload.
  db.sqlite
    .prepare(
      `UPDATE sync_devices SET status = 'revoked', token_expires_at = NULL, revoked_at = ?, revoke_reason = ?, updated_at = ? WHERE device_id = ?`,
    )
    .run(now, reason ?? null, now, deviceId);
}
