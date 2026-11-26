/**
 * Device enrollment from the desktop: the sync server can be a different host
 * than the license server. Runs against a REAL sync server over local HTTP.
 */
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import * as os from 'node:os';
import { randomUUID } from 'node:crypto';

const { state } = vi.hoisted(() => ({ state: { online: true, creds: null as any } }));

vi.mock('electron', () => ({
  app: { getPath: () => os.tmpdir() },
  net: { online: true },
  safeStorage: {
    isEncryptionAvailable: () => false,
    encryptString: (s: string) => Buffer.from(s),
    decryptString: (b: Buffer) => b.toString(),
  },
}));
vi.mock('./credentials', () => ({
  loadSyncCredentials: () => state.creds,
  saveSyncCredentials: (c: any) => {
    state.creds = { ...c, updatedAt: new Date().toISOString() };
    return { ok: true };
  },
  isOnline: () => state.online,
}));

import { AppDatabase } from '../db/open';
import { setupAdmin } from '../services/auth';
import { createProduct } from '../services/products';
import { getOrCreateDeviceIdentity } from '../services/device-identity';
import { createSyncServer } from '../../../../../apps/sync-server/src/server';
import { createSyncCoordinator, normalizeSyncBaseUrl } from './coordinator';

const ENROLLMENT = 'test-enrollment-secret-123456';
const ORG = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

function makeDb(): AppDatabase {
  const db = new AppDatabase(':memory:');
  setupAdmin(db, { name: 'Admin', email: 'admin@vyapara.com', password: 'rahasia123456' });
  return db;
}

describe('sync enrollment (separate sync server)', () => {
  let app: any;
  let db: AppDatabase;
  let baseUrl: string;

  beforeEach(async () => {
    state.online = true;
    state.creds = null;
    app = createSyncServer({ dbPath: ':memory:', config: { enrollmentSecret: ENROLLMENT } });
    const addr = await app.listen(0);
    baseUrl = `http://127.0.0.1:${addr.port}`;
    db = makeDb();
  });
  afterEach(async () => {
    db.close();
    await app.close();
  });

  it('starts not enrolled, enrolls with the license org, then uploads pending events', async () => {
    const coord = createSyncCoordinator({ db, cfg: { apiBaseUrl: 'http://127.0.0.1:1', periodicIntervalMs: 60000 } });
    expect(coord.getConnection().enrolled).toBe(false);

    const adminId = (db.sqlite.prepare("SELECT id FROM users WHERE email = 'admin@vyapara.com'").get() as { id: string }).id;
    const s = randomUUID();
    createProduct(db, { name: 'Kertas A4', barcode: 'B' + s, sku: 'S' + s, price: 50000, cost: 40000, stock: 10, userId: adminId });

    const conn = await coord.enroll({ apiBaseUrl: baseUrl + '/', enrollmentSecret: ENROLLMENT, organizationId: ORG, deviceName: 'Kasir 1' });
    expect(conn).toMatchObject({ enrolled: true, apiBaseUrl: baseUrl, organizationId: ORG });
    expect(state.creds.deviceId).toBe(getOrCreateDeviceIdentity(db).deviceId);

    const device = app.db.sqlite.prepare('SELECT organization_id, device_name FROM sync_devices WHERE device_id = ?').get(state.creds.deviceId);
    expect(device).toEqual({ organization_id: ORG, device_name: 'Kasir 1' });

    coord.start();
    try {
      const status = await coord.trigger('manual');
      expect(status.lastError).toBeNull();
      expect(status.pendingCount).toBe(0);
      const serverEvents = (app.db.sqlite.prepare('SELECT COUNT(*) AS c FROM sync_events').get() as { c: number }).c;
      expect(serverEvents).toBeGreaterThan(0);
    } finally {
      await coord.stop();
    }
  });

  it('rejects a wrong enrollment code with a readable message and stores nothing', async () => {
    const coord = createSyncCoordinator({ db });
    await expect(
      coord.enroll({ apiBaseUrl: baseUrl, enrollmentSecret: 'wrong-secret-0000000000', organizationId: ORG }),
    ).rejects.toThrow('Kode pendaftaran salah');
    expect(state.creds).toBeNull();
    expect(coord.getConnection().enrolled).toBe(false);
  });

  it('reports an unreachable server', async () => {
    const coord = createSyncCoordinator({ db, cfg: { requestTimeoutMs: 2000 } });
    await expect(
      coord.enroll({ apiBaseUrl: 'http://127.0.0.1:1', enrollmentSecret: ENROLLMENT, organizationId: ORG }),
    ).rejects.toThrow('Server sync tidak bisa dihubungi');
  });

  it('normalizes server URLs', () => {
    expect(normalizeSyncBaseUrl(' sync.contoh.com/ ')).toBe('https://sync.contoh.com');
    expect(normalizeSyncBaseUrl('http://127.0.0.1:8787//')).toBe('http://127.0.0.1:8787');
  });
});
