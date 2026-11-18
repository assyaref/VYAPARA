/**
 * Desktop license service — activation gate for client installs.
 *
 * Flow:
 *  1. First launch: app shows "Aktivasi Lisensi" screen (server URL + serial).
 *  2. activateLicense() calls the sync server's /v1/licenses/activate with this
 *     device's identity; on success stores { licenseKey, organizationId, licenseId }
 *     in the local settings table (server configured per-installation).
 *  3. Subsequent launches: app loads stored license and proceeds to login.
 *  4. License can be re-checked online via verifyLicense() — if the server says
 *     the key is revoked/expired, the app blocks access. If the server is
 *     unreachable, a 30-day grace period from the last successful activation is honored.
 */
import type { AppDatabase } from '../db/open';
import { getOrCreateDeviceIdentity } from './device-identity';

export type LicenseStatus =
  | { state: 'licensed'; organizationId: string; organizationName: string | null; activatedAt: string; serverUrl: string; lastVerifyAt: string | null }
  | { state: 'unlicensed' }
  | { state: 'revoked'; reason: string };

const KEYS = {
  licenseKey: 'license_key',
  licenseOrganizationId: 'license_organization_id',
  licenseOrganizationName: 'license_organization_name',
  licenseActivatedAt: 'license_activated_at',
  licenseLastVerifyAt: 'license_last_verify_at',
  licenseServerUrl: 'license_server_url',
};

function readSetting(db: AppDatabase, key: string): string | null {
  const row = db.sqlite.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

function writeSetting(db: AppDatabase, key: string, value: string): void {
  db.sqlite
    .prepare(
      `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    )
    .run(key, value, new Date().toISOString());
}

export function getLicenseStatus(db: AppDatabase): LicenseStatus {
  const key = readSetting(db, KEYS.licenseKey);
  if (!key) return { state: 'unlicensed' };
  const organizationId = readSetting(db, KEYS.licenseOrganizationId) ?? '';
  const organizationName = readSetting(db, KEYS.licenseOrganizationName);
  const activatedAt = readSetting(db, KEYS.licenseActivatedAt) ?? new Date().toISOString();
  const serverUrl = readSetting(db, KEYS.licenseServerUrl) ?? '';
  const lastVerifyAt = readSetting(db, KEYS.licenseLastVerifyAt);
  if (!organizationId) return { state: 'unlicensed' };
  return { state: 'licensed', organizationId, organizationName, activatedAt, serverUrl, lastVerifyAt };
}

function normalizeServerUrl(url: string): string {
  let u = url.trim();
  if (!u) return u;
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
  return u.replace(/\/+$/, '');
}

async function postJson(url: string, body: unknown, timeoutMs = 10_000): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await res.text();
    let parsed: any = null;
    try { parsed = text ? JSON.parse(text) : null; } catch { parsed = { ok: false, error: { message: text } }; }
    return parsed;
  } finally {
    clearTimeout(timer);
  }
}

export type ActivationResult =
  | { ok: true; organizationId: string; organizationName: string | null }
  | { ok: false; error: string };

export async function activateLicense(
  db: AppDatabase,
  input: { licenseKey: string; serverUrl: string; organizationName?: string },
): Promise<ActivationResult> {
  const licenseKey = input.licenseKey.trim().toUpperCase();
  const serverUrl = normalizeServerUrl(input.serverUrl);
  if (!licenseKey) return { ok: false, error: 'Serial number wajib diisi' };
  if (!serverUrl) return { ok: false, error: 'URL server lisensi wajib diisi' };

  const deviceId = getOrCreateDeviceIdentity(db).deviceId;
  try {
    const res = await postJson(`${serverUrl}/v1/licenses/activate`, {
      licenseKey,
      deviceId,
      organizationName: input.organizationName?.trim() || undefined,
    });
    if (!res?.ok) {
      return { ok: false, error: res?.error?.message ?? `Aktivasi ditolak (HTTP ${res?.statusCode ?? '?'}) — pastikan server lisensi aktif dan serial benar` };
    }
    writeSetting(db, KEYS.licenseKey, licenseKey);
    writeSetting(db, KEYS.licenseOrganizationId, res.data?.organizationId ?? '');
    writeSetting(db, KEYS.licenseOrganizationName, res.data?.organizationName ?? '');
    writeSetting(db, KEYS.licenseActivatedAt, new Date().toISOString());
    writeSetting(db, KEYS.licenseLastVerifyAt, new Date().toISOString());
    writeSetting(db, KEYS.licenseServerUrl, serverUrl);
    return { ok: true, organizationId: res.data?.organizationId ?? '', organizationName: res.data?.organizationName ?? null };
  } catch (err: any) {
    return { ok: false, error: `Tidak dapat menghubungi server lisensi di ${serverUrl}: ${err?.message ?? err}` };
  }
}

/** Re-verify with the server; honors a 30-day offline grace period. */
export async function verifyLicense(db: AppDatabase): Promise<LicenseStatus> {
  const current = getLicenseStatus(db);
  if (current.state !== 'licensed') return current;

  const lastVerifyMs = current.lastVerifyAt ? Date.parse(current.lastVerifyAt) : 0;
  const daysSinceVerify = (Date.now() - lastVerifyMs) / 86_400_000;
  if (daysSinceVerify > 30) {
    return { state: 'revoked', reason: 'Lisensi tidak dapat diverifikasi selama 30 hari (offline terlalu lama atau server dinonaktifkan). Hubungi penjual untuk memperpanjang.' };
  }

  try {
    const deviceId = getOrCreateDeviceIdentity(db).deviceId;
    const licenseKey = readSetting(db, KEYS.licenseKey)!;
    const res = await postJson(`${current.serverUrl}/v1/licenses/verify`, { licenseKey, deviceId }, 5_000);
    if (res?.data?.status === 'active') {
      writeSetting(db, KEYS.licenseLastVerifyAt, new Date().toISOString());
      return current;
    }
    return { state: 'revoked', reason: 'Serial number telah dinonaktifkan di server lisensi.' };
  } catch {
    // Server unreachable — honor grace period (already checked above)
    return current;
  }
}

export function clearLicense(db: AppDatabase): void {
  for (const key of Object.values(KEYS)) {
    db.sqlite.prepare('DELETE FROM settings WHERE key = ?').run(key);
  }
}
