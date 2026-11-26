import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import * as http from 'node:http';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { createSyncServer } from '../src/server.js';
import { signS3Request, createBackupService, backupConfigFromEnv, type BackupConfig } from '../src/services/backup.js';

const AK = 'AKIDEXAMPLEKEY';
const SK = 'secret-example-key-0123456789';
const BUCKET = 'vyapara-backups';

/** Minimal path-style S3 stand-in that re-verifies every SigV4 signature. */
function fakeS3() {
  const objects = new Map<string, { body: Buffer; lastModified: Date }>();
  let rejected = 0;
  const server = http.createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const c of req) chunks.push(c as Buffer);
    const body = Buffer.concat(chunks);
    const url = new URL(req.url ?? '/', 'http://x');
    const decodedPath = url.pathname.split('/').map(decodeURIComponent).join('/');
    const query = Object.fromEntries(url.searchParams.entries());
    const amzDate = String(req.headers['x-amz-date']);
    const date = new Date(`${amzDate.slice(0, 4)}-${amzDate.slice(4, 6)}-${amzDate.slice(6, 8)}T${amzDate.slice(9, 11)}:${amzDate.slice(11, 13)}:${amzDate.slice(13, 15)}Z`);
    const extra: Record<string, string> = {};
    if (req.headers['content-type'] && req.method === 'PUT') extra['content-type'] = String(req.headers['content-type']);
    const expected = signS3Request({
      method: req.method!, host: String(req.headers.host), path: decodedPath, query, headers: extra,
      payloadHash: createHash('sha256').update(body).digest('hex'), region: 'auto', accessKeyId: AK, secretAccessKey: SK, date,
    });
    if (expected.authorization !== req.headers.authorization) {
      rejected++;
      res.writeHead(403).end('<Error><Code>SignatureDoesNotMatch</Code></Error>');
      return;
    }
    const key = decodedPath.replace(`/${BUCKET}/`, '');
    if (req.method === 'PUT') { objects.set(key, { body, lastModified: new Date() }); res.writeHead(200).end(); return; }
    if (req.method === 'DELETE') { objects.delete(key); res.writeHead(204).end(); return; }
    if (req.method === 'GET' && decodedPath === `/${BUCKET}`) {
      const items = [...objects.entries()].filter(([k]) => k.startsWith(query.prefix ?? ''));
      const xml = `<ListBucketResult><IsTruncated>false</IsTruncated>${items
        .map(([k, o]) => `<Contents><Key>${k}</Key><LastModified>${o.lastModified.toISOString()}</LastModified><Size>${o.body.length}</Size></Contents>`)
        .join('')}</ListBucketResult>`;
      res.writeHead(200, { 'content-type': 'application/xml' }).end(xml);
      return;
    }
    res.writeHead(404).end();
  });
  return {
    objects,
    get rejected() { return rejected; },
    async start() {
      await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
      return `http://127.0.0.1:${(server.address() as any).port}`;
    },
    close: () => new Promise<void>((r) => server.close(() => r())),
  };
}

describe('SigV4 signer', () => {
  it('matches the AWS S3 documentation example (GET object with Range)', () => {
    const h = signS3Request({
      method: 'GET',
      host: 'examplebucket.s3.amazonaws.com',
      path: '/test.txt',
      headers: { range: 'bytes=0-9' },
      payloadHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      region: 'us-east-1',
      accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
      secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
      date: new Date('2013-05-24T00:00:00Z'),
    });
    expect(h.authorization).toBe(
      'AWS4-HMAC-SHA256 Credential=AKIAIOSFODNN7EXAMPLE/20130524/us-east-1/s3/aws4_request, SignedHeaders=host;range;x-amz-content-sha256;x-amz-date, Signature=f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41',
    );
  });
});

describe('sync-server backups', () => {
  let s3: ReturnType<typeof fakeS3>;
  let endpoint: string;
  let app: ReturnType<typeof createSyncServer>;
  let dir: string;
  const cfg = (): BackupConfig => ({
    s3: { endpoint, bucket: BUCKET, region: 'auto', accessKeyId: AK, secretAccessKey: SK, urlStyle: 'path' },
    intervalHours: 24,
    retentionDays: 14,
    minKeep: 2,
  });

  beforeEach(async () => {
    s3 = fakeS3();
    endpoint = await s3.start();
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-backup-test-'));
    app = createSyncServer({ dbPath: path.join(dir, 'sync.db'), config: { enrollmentSecret: 'x'.repeat(20), adminToken: 'admin-token-1234567890' } });
    app.db.sqlite.prepare('INSERT INTO sync_organizations (organization_id, name, created_at) VALUES (?, ?, ?)').run('org-1', 'Toko Uji', new Date().toISOString());
  });
  afterEach(async () => {
    await app.close().catch(() => {});
    await s3.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('uploads a gzipped, restorable snapshot with valid signatures', async () => {
    const svc = createBackupService(app.db, cfg());
    const r = await svc.runNow();
    expect(r.key).toMatch(/^vyapara-sync\/sync-server-.*\.db\.gz$/);
    expect(s3.rejected).toBe(0);

    const restored = path.join(dir, 'restored.db');
    fs.writeFileSync(restored, gunzipSync(s3.objects.get(r.key)!.body));
    const Ctor = app.db.sqlite.constructor as any;
    const rdb = new Ctor(restored, { readonly: true });
    try {
      expect(rdb.prepare('SELECT name FROM sync_organizations WHERE organization_id = ?').get('org-1')).toEqual({ name: 'Toko Uji' });
    } finally {
      rdb.close();
    }
    expect(svc.status().lastSuccessAt).not.toBeNull();
  });

  it('runIfDue skips when a recent backup exists and runs when it is stale', async () => {
    let clock = new Date('2026-11-26T00:00:00Z');
    const svc = createBackupService(app.db, cfg(), { now: () => clock });
    expect(await svc.runIfDue()).not.toBeNull(); // empty bucket → runs
    expect(await svc.runIfDue()).toBeNull(); // fresh → skips
    for (const o of s3.objects.values()) o.lastModified = new Date(Date.now() - 25 * 3600_000);
    clock = new Date(Date.now());
    expect(await svc.runIfDue()).not.toBeNull(); // stale → runs again
    expect(s3.objects.size).toBe(2);
  });

  it('prunes backups past retention but always keeps the newest ones', async () => {
    const svc = createBackupService(app.db, cfg());
    for (let i = 0; i < 4; i++) {
      s3.objects.set(`vyapara-sync/old-${i}.db.gz`, { body: Buffer.from('x'), lastModified: new Date(Date.now() - (20 + i) * 86400_000) });
    }
    const r = await svc.runNow();
    // 5 objects: new + 4 old. minKeep=2 keeps new + old-0; old-1..3 are past 14 days → deleted.
    expect(r.deleted.sort()).toEqual(['vyapara-sync/old-1.db.gz', 'vyapara-sync/old-2.db.gz', 'vyapara-sync/old-3.db.gz']);
    expect([...s3.objects.keys()].sort()).toEqual([r.key, 'vyapara-sync/old-0.db.gz'].sort());
  });

  it('surfaces storage errors without throwing away the cause', async () => {
    const svc = createBackupService(app.db, { ...cfg(), s3: { ...cfg().s3, secretAccessKey: 'wrong-secret' } });
    await expect(svc.runNow()).rejects.toThrow('SignatureDoesNotMatch');
    expect(svc.status().lastError).toContain('SignatureDoesNotMatch');
  });

  it('admin routes list and trigger backups behind the admin token', async () => {
    const backup = createBackupService(app.db, cfg());
    const server = createSyncServer({ dbPath: ':memory:', config: { enrollmentSecret: 'x'.repeat(20), adminToken: 'admin-token-1234567890', backup } });
    const addr = await server.listen(0);
    const base = `http://127.0.0.1:${addr.port}`;
    const auth = { authorization: 'Bearer admin-token-1234567890' };
    try {
      expect((await fetch(`${base}/admin/backups/run`, { method: 'POST' })).status).toBe(401);
      const run = await fetch(`${base}/admin/backups/run`, { method: 'POST', headers: auth });
      expect(run.status).toBe(201);
      const list = await (await fetch(`${base}/admin/backups`, { headers: auth })).json();
      expect(list.data.enabled).toBe(true);
      expect(list.data.backups).toHaveLength(1);
    } finally {
      await server.close();
    }
  });

  it('is disabled when bucket env vars are missing', () => {
    expect(backupConfigFromEnv({})).toBeNull();
    const c = backupConfigFromEnv({ BACKUP_S3_ENDPOINT: 'https://t3.storageapi.dev', BACKUP_S3_BUCKET: 'b', BACKUP_S3_ACCESS_KEY_ID: 'a', BACKUP_S3_SECRET_ACCESS_KEY: 's' });
    expect(c).toMatchObject({ intervalHours: 24, retentionDays: 14, s3: { region: 'auto', urlStyle: 'virtual' } });
  });
});
