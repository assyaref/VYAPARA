/**
 * Automatic off-site backups of the sync-server SQLite database to S3-compatible
 * object storage (e.g. a Railway Storage Bucket).
 *
 * - Snapshot: better-sqlite3 online backup API (consistent while the server runs).
 * - Verify: PRAGMA integrity_check on the snapshot before it leaves the host.
 * - Upload: gzip, PUT with AWS Signature V4 (no SDK dependency).
 * - Retention: objects older than `retentionDays` are deleted, always keeping the newest `minKeep`.
 * - Scheduling is "catch-up" based: every check lists the bucket and runs a backup only when the
 *   newest one is older than `intervalHours`. A host that sleeps (Railway free plan) therefore
 *   backs up on wake instead of silently skipping days.
 */
import { createHash, createHmac } from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { gzipSync } from 'node:zlib';
import type { SyncServerDb } from '../db/open.js';

export type S3Config = {
  endpoint: string; // e.g. https://t3.storageapi.dev
  bucket: string;
  region: string; // "auto" works for Railway
  accessKeyId: string;
  secretAccessKey: string;
  urlStyle?: 'virtual' | 'path';
};

export type BackupConfig = {
  s3: S3Config;
  prefix?: string;
  intervalHours?: number;
  retentionDays?: number;
  minKeep?: number;
};

export type BackupObject = { key: string; lastModified: string; size: number };

export type BackupRunResult = {
  key: string;
  sizeBytes: number;
  rawBytes: number;
  durationMs: number;
  deleted: string[];
};

// ---------------------------------------------------------------- SigV4

function sha256HexBuf(data: string | Buffer): string {
  return createHash('sha256').update(data).digest('hex');
}
function hmac(key: Buffer | string, data: string): Buffer {
  return createHmac('sha256', key).update(data, 'utf8').digest();
}
function rfc3986(s: string): string {
  return encodeURIComponent(s).replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
}

export type SignInput = {
  method: string;
  host: string;
  path: string; // already-decoded path, e.g. /bucket/key name
  query?: Record<string, string>;
  headers?: Record<string, string>; // extra headers to sign (lower-case names)
  payloadHash: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  date: Date;
};

/** AWS Signature Version 4 for S3. Returns the headers to send (including Authorization). */
export function signS3Request(input: SignInput): Record<string, string> {
  const amzDate = input.date.toISOString().replace(/[:-]|\.\d{3}/g, ''); // YYYYMMDDTHHMMSSZ
  const dateStamp = amzDate.slice(0, 8);
  const headers: Record<string, string> = {
    host: input.host,
    'x-amz-content-sha256': input.payloadHash,
    'x-amz-date': amzDate,
  };
  for (const [k, v] of Object.entries(input.headers ?? {})) headers[k.toLowerCase()] = String(v).trim();
  const names = Object.keys(headers).sort();
  const canonicalHeaders = names.map((n) => `${n}:${headers[n]}\n`).join('');
  const signedHeaders = names.join(';');
  const canonicalUri = input.path.split('/').map(rfc3986).join('/') || '/';
  const canonicalQuery = Object.entries(input.query ?? {})
    .map(([k, v]) => [rfc3986(k), rfc3986(v)] as const)
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] < b[1] ? -1 : 1))
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  const canonicalRequest = [input.method, canonicalUri, canonicalQuery, canonicalHeaders, signedHeaders, input.payloadHash].join('\n');
  const scope = `${dateStamp}/${input.region}/s3/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256HexBuf(canonicalRequest)].join('\n');
  const kDate = hmac('AWS4' + input.secretAccessKey, dateStamp);
  const kRegion = hmac(kDate, input.region);
  const kService = hmac(kRegion, 's3');
  const kSigning = hmac(kService, 'aws4_request');
  const signature = createHmac('sha256', kSigning).update(stringToSign, 'utf8').digest('hex');
  const out: Record<string, string> = { ...headers };
  delete out.host; // fetch sets Host from the URL
  out.authorization = `AWS4-HMAC-SHA256 Credential=${input.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  return out;
}

// ---------------------------------------------------------------- minimal S3 client

export class S3Client {
  constructor(private cfg: S3Config, private fetchImpl: typeof fetch = fetch) {}

  private target(key: string | null): { url: URL; host: string; path: string } {
    const base = new URL(this.cfg.endpoint);
    const virtual = (this.cfg.urlStyle ?? 'virtual') === 'virtual';
    const host = virtual ? `${this.cfg.bucket}.${base.host}` : base.host;
    const p = virtual ? `/${key ?? ''}` : `/${this.cfg.bucket}${key !== null ? '/' + key : ''}`;
    const url = new URL(`${base.protocol}//${host}`);
    url.pathname = p.split('/').map(rfc3986).join('/');
    return { url, host, path: p };
  }

  private async send(method: string, key: string | null, opts: { query?: Record<string, string>; body?: Buffer; headers?: Record<string, string> } = {}): Promise<Response> {
    const { url, host, path: p } = this.target(key);
    for (const [k, v] of Object.entries(opts.query ?? {})) url.searchParams.set(k, v);
    const body = opts.body ?? Buffer.alloc(0);
    const headers = signS3Request({
      method,
      host,
      path: p,
      query: opts.query,
      headers: opts.headers,
      payloadHash: sha256HexBuf(body),
      region: this.cfg.region,
      accessKeyId: this.cfg.accessKeyId,
      secretAccessKey: this.cfg.secretAccessKey,
      date: new Date(),
    });
    const res = await this.fetchImpl(url, {
      method,
      headers,
      body: method === 'PUT' ? new Uint8Array(body) : undefined,
      signal: AbortSignal.timeout(120_000),
    });
    if (!res.ok) {
      const text = (await res.text().catch(() => '')).slice(0, 300);
      const code = /<Code>([^<]+)<\/Code>/.exec(text)?.[1] ?? `HTTP_${res.status}`;
      throw Object.assign(new Error(`S3 ${method} failed: ${code}`), { code: 'BACKUP_S3_ERROR', status: res.status });
    }
    return res;
  }

  async putObject(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.send('PUT', key, { body, headers: { 'content-type': contentType } });
  }

  async deleteObject(key: string): Promise<void> {
    await this.send('DELETE', key);
  }

  async listObjects(prefix: string): Promise<BackupObject[]> {
    const out: BackupObject[] = [];
    let token: string | undefined;
    for (let page = 0; page < 50; page++) {
      const query: Record<string, string> = { 'list-type': '2', prefix };
      if (token) query['continuation-token'] = token;
      const xml = await (await this.send('GET', null, { query })).text();
      for (const m of xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)) {
        const block = m[1] ?? "";
        const key = decodeXml(/<Key>([\s\S]*?)<\/Key>/.exec(block)?.[1] ?? '');
        if (!key) continue;
        out.push({
          key,
          lastModified: /<LastModified>([^<]+)<\/LastModified>/.exec(block)?.[1] ?? '',
          size: Number(/<Size>(\d+)<\/Size>/.exec(block)?.[1] ?? 0),
        });
      }
      const truncated = /<IsTruncated>true<\/IsTruncated>/.test(xml);
      token = /<NextContinuationToken>([^<]+)<\/NextContinuationToken>/.exec(xml)?.[1];
      if (!truncated || !token) break;
      token = decodeXml(token);
    }
    return out;
  }
}

function decodeXml(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

// ---------------------------------------------------------------- backup service

export type BackupService = {
  readonly enabled: true;
  readonly prefix: string;
  runNow: () => Promise<BackupRunResult>;
  list: () => Promise<BackupObject[]>;
  /** Run a backup if the newest one is older than the interval. Returns the result or null when not due. */
  runIfDue: () => Promise<BackupRunResult | null>;
  status: () => { lastSuccessAt: string | null; lastError: string | null; running: boolean };
  start: (log?: (msg: string) => void) => void;
  stop: () => void;
};

export function createBackupService(db: SyncServerDb, cfg: BackupConfig, deps: { fetchImpl?: typeof fetch; now?: () => Date } = {}): BackupService {
  const s3 = new S3Client(cfg.s3, deps.fetchImpl);
  const prefix = (cfg.prefix ?? 'vyapara-sync/').replace(/^\/+/, '');
  const intervalMs = Math.max(1, cfg.intervalHours ?? 24) * 3600_000;
  const retentionMs = Math.max(1, cfg.retentionDays ?? 14) * 86400_000;
  const minKeep = Math.max(1, cfg.minKeep ?? 3);
  const now = deps.now ?? (() => new Date());
  let running: Promise<BackupRunResult> | null = null;
  let lastSuccessAt: string | null = null;
  let lastError: string | null = null;
  let timers: NodeJS.Timeout[] = [];

  async function snapshot(): Promise<{ gz: Buffer; rawBytes: number }> {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vyapara-backup-'));
    const file = path.join(dir, 'snapshot.db');
    try {
      await db.sqlite.backup(file);
      const Ctor = db.sqlite.constructor as new (p: string, o?: unknown) => any;
      const check = new Ctor(file, { readonly: true });
      try {
        const rows = check.prepare('PRAGMA integrity_check').all() as { integrity_check: string }[];
        if (rows.length !== 1 || rows[0]?.integrity_check !== 'ok') {
          throw Object.assign(new Error('Snapshot failed integrity_check'), { code: 'BACKUP_INTEGRITY' });
        }
      } finally {
        check.close();
      }
      const raw = fs.readFileSync(file);
      return { gz: gzipSync(raw, { level: 9 }), rawBytes: raw.length };
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }

  async function prune(): Promise<string[]> {
    const objects = (await s3.listObjects(prefix)).sort((a, b) => Date.parse(b.lastModified) - Date.parse(a.lastModified));
    const cutoff = now().getTime() - retentionMs;
    const doomed = objects.slice(minKeep).filter((o) => Date.parse(o.lastModified) < cutoff);
    for (const o of doomed) await s3.deleteObject(o.key);
    return doomed.map((o) => o.key);
  }

  async function doRun(): Promise<BackupRunResult> {
    const started = Date.now();
    try {
      const { gz, rawBytes } = await snapshot();
      const stamp = now().toISOString().replace(/[:.]/g, '-');
      const key = `${prefix}sync-server-${stamp}.db.gz`;
      await s3.putObject(key, gz, 'application/gzip');
      const deleted = await prune();
      lastSuccessAt = now().toISOString();
      lastError = null;
      return { key, sizeBytes: gz.length, rawBytes, durationMs: Date.now() - started, deleted };
    } catch (e: any) {
      lastError = `${e?.code ?? 'BACKUP_FAILED'}: ${String(e?.message ?? e).slice(0, 200)}`;
      throw e;
    }
  }

  function runNow(): Promise<BackupRunResult> {
    if (!running) running = doRun().finally(() => { running = null; });
    return running;
  }

  async function runIfDue(): Promise<BackupRunResult | null> {
    const objects = await s3.listObjects(prefix);
    const newest = objects.reduce((m, o) => Math.max(m, Date.parse(o.lastModified) || 0), 0);
    if (newest && now().getTime() - newest < intervalMs) {
      lastSuccessAt ??= new Date(newest).toISOString();
      return null;
    }
    return runNow();
  }

  return {
    enabled: true,
    prefix,
    runNow,
    list: () => s3.listObjects(prefix),
    runIfDue,
    status: () => ({ lastSuccessAt, lastError, running: running !== null }),
    start(log = (m) => console.log(m)) {
      const tick = () => {
        runIfDue()
          .then((r) => { if (r) log(`backup uploaded ${r.key} (${r.sizeBytes} bytes gz, ${r.durationMs} ms, pruned ${r.deleted.length})`); })
          .catch((e) => log(`backup failed: ${lastError ?? e?.message ?? e}`));
      };
      timers.push(setTimeout(tick, 60_000));
      timers.push(setInterval(tick, Math.min(intervalMs, 3600_000)));
      for (const t of timers) t.unref?.();
    },
    stop() {
      for (const t of timers) clearTimeout(t);
      timers = [];
    },
  };
}

/** Build backup config from env. Returns null (backups off) when the bucket is not configured. */
export function backupConfigFromEnv(env: NodeJS.ProcessEnv): BackupConfig | null {
  const endpoint = env.BACKUP_S3_ENDPOINT;
  const bucket = env.BACKUP_S3_BUCKET;
  const accessKeyId = env.BACKUP_S3_ACCESS_KEY_ID;
  const secretAccessKey = env.BACKUP_S3_SECRET_ACCESS_KEY;
  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) return null;
  const num = (v: string | undefined, d: number) => (v && Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : d);
  return {
    s3: {
      endpoint,
      bucket,
      region: env.BACKUP_S3_REGION || 'auto',
      accessKeyId,
      secretAccessKey,
      urlStyle: env.BACKUP_S3_URL_STYLE === 'path' ? 'path' : 'virtual',
    },
    prefix: env.BACKUP_PREFIX || 'vyapara-sync/',
    intervalHours: num(env.BACKUP_INTERVAL_HOURS, 24),
    retentionDays: num(env.BACKUP_RETENTION_DAYS, 14),
  };
}
