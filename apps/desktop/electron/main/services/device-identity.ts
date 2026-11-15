import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import type { AppDatabase } from '../db/open';

export type DeviceIdentity = {
  deviceId: string;
  createdAt: string;
  updatedAt: string;
};

let inMemoryIdentityCounter = 0;

function identityFilePath(dbPath: string): string {
  const dir = dbPath === ':memory:'
    ? path.join(os.tmpdir(), '.vyapara-test-identity', String(++inMemoryIdentityCounter))
    : path.dirname(dbPath);
  return path.join(dir, 'device-identity.json');
}

function readPersisted(file: string): DeviceIdentity | null {
  try {
    const raw = fs.readFileSync(file, 'utf8');
    const parsed = JSON.parse(raw) as Partial<DeviceIdentity>;
    if (!parsed.deviceId || !parsed.createdAt || !parsed.updatedAt) return null;
    return { deviceId: parsed.deviceId, createdAt: parsed.createdAt, updatedAt: parsed.updatedAt };
  } catch {
    return null;
  }
}

function persist(file: string, identity: DeviceIdentity): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(identity, null, 2), { encoding: 'utf8', mode: 0o600 });
}

export function getOrCreateDeviceIdentity(db: AppDatabase): DeviceIdentity {
  const now = new Date().toISOString();
  const existing = db.sqlite
    .prepare('SELECT device_id, created_at, updated_at FROM device_identity WHERE id = 1')
    .get() as { device_id: string; created_at: string; updated_at: string } | undefined;
  if (existing) {
    return { deviceId: existing.device_id, createdAt: existing.created_at, updatedAt: existing.updated_at };
  }

  const file = identityFilePath(db.path);
  let identity = readPersisted(file);
  if (!identity) {
    identity = { deviceId: randomUUID(), createdAt: now, updatedAt: now };
    persist(file, identity);
  }

  db.sqlite
    .prepare(
      'INSERT INTO device_identity (id, device_id, created_at, updated_at) VALUES (1, ?, ?, ?) ON CONFLICT(id) DO NOTHING',
    )
    .run(identity.deviceId, identity.createdAt, identity.updatedAt);
  const row = db.sqlite
    .prepare('SELECT device_id, created_at, updated_at FROM device_identity WHERE id = 1')
    .get() as { device_id: string; created_at: string; updated_at: string };
  return { deviceId: row.device_id, createdAt: row.created_at, updatedAt: row.updated_at };
}
