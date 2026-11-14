import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { AppDatabase } from '../db/open';
import { getOrCreateDeviceIdentity } from './device-identity';

function tmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'vyapara-device-'));
}

describe('device identity', () => {
  it('creates and reuses a stable device identity across reopen', () => {
    const dir = tmpDir();
    const dbPath = path.join(dir, 'vyapara.db');
    try {
      const db = new AppDatabase(dbPath);
      const first = getOrCreateDeviceIdentity(db);
      expect(first.deviceId).toMatch(/[0-9a-f-]{36}/i);
      expect(first.createdAt).toBeTruthy();
      db.close();

      const db2 = new AppDatabase(dbPath);
      const second = getOrCreateDeviceIdentity(db2);
      expect(second.deviceId).toBe(first.deviceId);
      expect(second.createdAt).toBe(first.createdAt);
      db2.close();

      // identity file persisted outside DB
      const idFile = path.join(dir, 'device-identity.json');
      expect(fs.existsSync(idFile)).toBe(true);
      const parsed = JSON.parse(fs.readFileSync(idFile, 'utf8')) as { deviceId: string };
      expect(parsed.deviceId).toBe(first.deviceId);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
