import { app, net, safeStorage } from 'electron';
import * as fs from 'node:fs';
import * as path from 'node:path';

export type SyncCredentials = {
  apiBaseUrl: string;
  deviceId: string;
  organizationId: string;
  deviceToken: string;
  tokenExpiresAt?: string;
  updatedAt: string;
};

function credsPath(): string {
  return path.join(app.getPath('userData'), 'sync-credentials.bin');
}

export function isOnline(): boolean {
  try {
    return net?.online ?? (typeof navigator !== 'undefined' ? navigator.onLine : true);
  } catch {
    return true;
  }
}

export function loadSyncCredentials(): SyncCredentials | null {
  try {
    if (!safeStorage.isEncryptionAvailable()) return null;
    const p = credsPath();
    if (!fs.existsSync(p)) return null;
    const buf = fs.readFileSync(p);
    const json = safeStorage.decryptString(buf);
    const parsed = JSON.parse(json) as Partial<SyncCredentials>;
    if (!parsed.apiBaseUrl || !parsed.deviceId || !parsed.organizationId || !parsed.deviceToken) return null;
    return {
      apiBaseUrl: String(parsed.apiBaseUrl),
      deviceId: String(parsed.deviceId),
      organizationId: String(parsed.organizationId),
      deviceToken: String(parsed.deviceToken),
      tokenExpiresAt: parsed.tokenExpiresAt ? String(parsed.tokenExpiresAt) : undefined,
      updatedAt: String(parsed.updatedAt ?? new Date().toISOString()),
    };
  } catch {
    return null;
  }
}

export function saveSyncCredentials(creds: Omit<SyncCredentials, 'updatedAt'>): { ok: true } | { ok: false; reason: string } {
  try {
    if (!safeStorage.isEncryptionAvailable()) {
      return { ok: false, reason: 'secure_storage_unavailable' };
    }
    const payload: SyncCredentials = { ...creds, updatedAt: new Date().toISOString() };
    const enc = safeStorage.encryptString(JSON.stringify(payload));
    fs.mkdirSync(path.dirname(credsPath()), { recursive: true });
    fs.writeFileSync(credsPath(), enc);
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : 'save_failed' };
  }
}

export function clearSyncCredentials(): void {
  try {
    const p = credsPath();
    if (fs.existsSync(p)) fs.unlinkSync(p);
  } catch {
    // ignore
  }
}
