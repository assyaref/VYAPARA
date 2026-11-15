import { describe, expect, it, beforeEach, afterAll, vi } from 'vitest';
import * as os from 'node:os';
import * as path from 'node:path';
import * as fs from 'node:fs';

const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vyapara-creds-'));

vi.mock('electron', () => ({
  app: { getPath: () => userDataDir },
  net: { online: true },
  safeStorage: {
    isEncryptionAvailable: () => true,
    encryptString: (s: string) => Buffer.from('enc:' + s, 'utf8'),
    decryptString: (b: Buffer) => {
      const t = b.toString('utf8');
      if (t.startsWith('enc:')) return t.slice(4);
      throw new Error('not-encrypted');
    },
  },
}));

import { loadSyncCredentials, saveSyncCredentials, clearSyncCredentials, type SyncCredentials } from './credentials';

function baseCreds(overrides: Partial<SyncCredentials> = {}): Omit<SyncCredentials, 'updatedAt'> {
  return {
    apiBaseUrl: 'http://127.0.0.1:8787',
    deviceId: 'dev-1',
    organizationId: 'org-1',
    deviceToken: 'tok-abcdef',
    tokenExpiresAt: '2099-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('sync credentials', () => {
  beforeEach(() => {
    fs.mkdirSync(userDataDir, { recursive: true });
    clearSyncCredentials();
  });
  afterAll(() => {
    clearSyncCredentials();
    try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch {}
  });

  it('persists and retrieves credentials round-trip', () => {
    const saved = saveSyncCredentials(baseCreds());
    expect(saved.ok).toBe(true);
    const loaded = loadSyncCredentials();
    expect(loaded).not.toBeNull();
    expect(loaded!.apiBaseUrl).toBe('http://127.0.0.1:8787');
    expect(loaded!.deviceId).toBe('dev-1');
    expect(loaded!.organizationId).toBe('org-1');
    expect(loaded!.deviceToken).toBe('tok-abcdef');
    expect(loaded!.tokenExpiresAt).toBe('2099-01-01T00:00:00.000Z');
    expect(typeof loaded!.updatedAt).toBe('string');
  });

  it('returns null when no credentials file exists', () => {
    expect(loadSyncCredentials()).toBeNull();
  });

  it('overwrites existing credentials on save', () => {
    saveSyncCredentials(baseCreds({ deviceId: 'dev-a' }));
    saveSyncCredentials(baseCreds({ deviceId: 'dev-b' }));
    const loaded = loadSyncCredentials();
    expect(loaded!.deviceId).toBe('dev-b');
  });

  it('clears credentials', () => {
    saveSyncCredentials(baseCreds());
    expect(loadSyncCredentials()).not.toBeNull();
    clearSyncCredentials();
    expect(loadSyncCredentials()).toBeNull();
  });

  it('loadSyncCredentials returns null when token is missing', () => {
    // Corrupt the stored file by writing a partial payload directly
    const p = path.join(userDataDir, 'sync-credentials.bin');
    fs.writeFileSync(p, Buffer.from('enc:{}', 'utf8'));
    expect(loadSyncCredentials()).toBeNull();
  });
});
