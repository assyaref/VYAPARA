import type { AppDatabase } from '../db/open';
import { getOrCreateDeviceIdentity } from '../services/device-identity';
import { DEFAULT_SYNC_CONFIG, computeBackoffMs, nowIso, safeErrorSummary, type SyncConfig, type SyncStatusSnapshot } from './types';
import { loadSyncCredentials, saveSyncCredentials, isOnline, type SyncCredentials } from './credentials';
import { recoverStaleSyncingOutbox, countOutbox, getSyncState, setSyncState } from './store';
import { runUploadOnce } from './upload';
import { runDownloadOnce } from './download';
import { registerDeviceTransport, renewDeviceTokenTransport, SyncTransportError } from './transport';

export type SyncCoordinator = {
  start: () => void;
  stop: () => Promise<void>;
  trigger: (reason?: string) => Promise<SyncStatusSnapshot>;
  getStatus: () => SyncStatusSnapshot;
  setConfigOverride: (partial: Partial<Pick<SyncConfig, 'apiBaseUrl' | 'periodicIntervalMs'>>) => void;
  /** Register this device on a sync server and store its token. The server may differ from the license server. */
  enroll: (input: SyncEnrollInput) => Promise<SyncConnectionInfo>;
  getConnection: () => SyncConnectionInfo;
};

export type SyncEnrollInput = {
  apiBaseUrl: string;
  enrollmentSecret: string;
  organizationId: string;
  deviceName?: string;
};

export type SyncConnectionInfo = {
  enrolled: boolean;
  apiBaseUrl: string | null;
  organizationId: string | null;
  tokenExpiresAt: string | null;
};

export function normalizeSyncBaseUrl(url: string): string {
  let u = url.trim();
  if (!u) return u;
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
  return u.replace(/\/+$/, '');
}

export function createSyncCoordinator(args: { db: AppDatabase; cfg?: Partial<SyncConfig> }): SyncCoordinator {
  let cfg: SyncConfig = { ...DEFAULT_SYNC_CONFIG, ...(args.cfg ?? {}) };
  let creds: SyncCredentials | null = loadSyncCredentials();
  if (creds?.apiBaseUrl) cfg.apiBaseUrl = creds.apiBaseUrl;
  let timer: NodeJS.Timeout | null = null;
  let periodic: NodeJS.Timeout | null = null;
  let running = false;
  let queued = false;
  let stopped = true;
  let abort: AbortController | null = null;
  let backoffAttempt = 0;
  let retryAt: string | null = null;
  let snapshot: SyncStatusSnapshot = {
    phase: 'idle',
    online: isOnline(),
    lastSyncAt: getSyncState(args.db, 'last_sync_at'),
    pendingCount: 0,
    failedCount: 0,
    lastError: null,
    retryAt: null,
    inProgress: false,
  };

  function refreshCounts() {
    const c = countOutbox(args.db);
    snapshot = { ...snapshot, pendingCount: c.pending, failedCount: c.failed, online: isOnline(), retryAt };
  }
  function setPhase(phase: SyncStatusSnapshot['phase'], extra?: Partial<SyncStatusSnapshot>) {
    refreshCounts();
    snapshot = {
      ...snapshot,
      phase,
      inProgress: !(phase === 'idle' || phase === 'offline' || phase === 'error' || phase === 'retrying'),
      ...extra,
    };
  }

  async function ensureToken(): Promise<SyncCredentials | null> {
    creds = loadSyncCredentials();
    if (!creds) return null;
    if (creds.apiBaseUrl) cfg.apiBaseUrl = creds.apiBaseUrl;
    const exp = creds.tokenExpiresAt ? Date.parse(creds.tokenExpiresAt) : NaN;
    if (Number.isFinite(exp) && exp - Date.now() > 60_000) return creds;
    try {
      const renewed = await renewDeviceTokenTransport({
        baseUrl: cfg.apiBaseUrl,
        timeoutMs: cfg.requestTimeoutMs,
        deviceToken: creds.deviceToken,
        deviceId: creds.deviceId,
      });
      const next: SyncCredentials = {
        organizationId: renewed.organizationId,
        deviceId: renewed.deviceId,
        deviceToken: renewed.deviceToken,
        tokenExpiresAt: renewed.tokenExpiresAt,
        apiBaseUrl: cfg.apiBaseUrl,
        updatedAt: nowIso(),
      };
      const saved = saveSyncCredentials(next);
      if (!saved.ok) return creds;
      creds = next;
      return creds;
    } catch (e) {
      if (e instanceof SyncTransportError && (e.kind === 'revoked' || e.kind === 'unauthorized')) {
        snapshot = { ...snapshot, lastError: e.safeMessage };
        return null;
      }
      return creds;
    }
  }

  async function runCycle(_reason: string): Promise<void> {
    if (stopped) return;
    if (running) { queued = true; return; }
    running = true;
    queued = false;
    abort = new AbortController();
    try {
      refreshCounts();
      if (!isOnline()) { setPhase('offline'); return; }
      let c = await ensureToken();
      if (!c) { setPhase('error', { lastError: snapshot.lastError || 'Sync not enrolled or secure credentials unavailable' }); return; }
      const identity = getOrCreateDeviceIdentity(args.db);
      if (identity.deviceId !== c.deviceId) {
        setPhase('error', { lastError: 'Device identity mismatch' });
        return;
      }

      setPhase('connecting');
      setPhase('uploading');
      const up = await runUploadOnce({ db: args.db, cfg, token: c.deviceToken, signal: abort.signal });
      if (up.authFailure) {
        c = await ensureToken();
        if (!c) { setPhase('error', { lastError: 'Device authentication failed' }); return; }
      }
      if (stopped || abort.signal.aborted) return;

      setPhase('downloading');
      const down = await runDownloadOnce({ db: args.db, cfg, token: c!.deviceToken, organizationId: c!.organizationId, localDeviceId: c!.deviceId, signal: abort.signal });
      if (down.stoppedOnError) {
        if (down.authFailure && !down.retryableFailure) {
          setPhase('error', { lastError: down.stoppedOnError });
          return;
        }
        if (down.retryableFailure || !isOnline()) {
          backoffAttempt += 1;
          const delay = computeBackoffMs(backoffAttempt, cfg.baseBackoffMs, cfg.maxBackoffMs);
          retryAt = new Date(Date.now() + delay).toISOString();
          setPhase('retrying', { lastError: down.stoppedOnError, retryAt });
          schedule(delay);
          return;
        }
        setPhase('error', { lastError: down.stoppedOnError });
        return;
      }
      if (up.retryableFailure) {
        backoffAttempt += 1;
        const delay = computeBackoffMs(backoffAttempt, cfg.baseBackoffMs, cfg.maxBackoffMs);
        retryAt = new Date(Date.now() + delay).toISOString();
        setPhase('retrying', { lastError: snapshot.lastError || 'Retry scheduled', retryAt });
        schedule(delay);
        return;
      }

      backoffAttempt = 0;
      retryAt = null;
      const ts = nowIso();
      setSyncState(args.db, 'last_sync_at', ts);
      setPhase('idle', { lastSyncAt: ts, lastError: null, retryAt: null });
    } catch (e) {
      if (stopped || abort?.signal.aborted) return;
      const msg = safeErrorSummary(e);
      backoffAttempt += 1;
      const delay = computeBackoffMs(backoffAttempt, cfg.baseBackoffMs, cfg.maxBackoffMs);
      retryAt = new Date(Date.now() + delay).toISOString();
      setPhase(isOnline() ? 'retrying' : 'offline', { lastError: msg, retryAt });
      schedule(delay);
    } finally {
      running = false;
      abort = null;
      refreshCounts();
      if (queued && !stopped) void runCycle('queued');
    }
  }

  function clearTimer() { if (timer) { clearTimeout(timer); timer = null; } }
  function schedule(ms: number) {
    if (stopped) return;
    clearTimer();
    timer = setTimeout(() => { timer = null; void runCycle('timer'); }, Math.max(1000, ms));
  }
  function startPeriodic() {
    if (periodic) clearInterval(periodic);
    periodic = setInterval(() => { if (!stopped) void runCycle('periodic'); }, cfg.periodicIntervalMs);
  }

  return {
    start() {
      if (!stopped) return;
      stopped = false;
      recoverStaleSyncingOutbox(args.db);
      refreshCounts();
      startPeriodic();
      schedule(1500);
    },
    async stop() {
      stopped = true;
      clearTimer();
      if (periodic) { clearInterval(periodic); periodic = null; }
      abort?.abort();
      const start = Date.now();
      while (running && Date.now() - start < 5000) await new Promise(r => setTimeout(r, 50));
    },
    async trigger() {
      await runCycle('manual');
      return { ...snapshot, online: isOnline(), retryAt };
    },
    getStatus() { refreshCounts(); return { ...snapshot, online: isOnline(), retryAt }; },
    setConfigOverride(partial) {
      cfg = { ...cfg, ...partial };
      if (!stopped) startPeriodic();
    },
    async enroll(input) {
      const apiBaseUrl = normalizeSyncBaseUrl(input.apiBaseUrl);
      if (!apiBaseUrl) throw Object.assign(new Error('URL server sync wajib diisi'), { code: 'VALIDATION' });
      const identity = getOrCreateDeviceIdentity(args.db);
      let res;
      try {
        res = await registerDeviceTransport({
          baseUrl: apiBaseUrl,
          timeoutMs: cfg.requestTimeoutMs,
          request: {
            deviceId: identity.deviceId,
            organizationId: input.organizationId,
            enrollmentSecret: input.enrollmentSecret,
            deviceName: input.deviceName?.trim() || undefined,
          },
        });
      } catch (e) {
        if (e instanceof SyncTransportError) {
          const msg = e.kind === 'unauthorized' ? 'Kode pendaftaran salah'
            : e.kind === 'revoked' ? 'Perangkat ini sudah dicabut di server sync'
            : e.kind === 'timeout' || e.kind === 'network' ? 'Server sync tidak bisa dihubungi'
            : e.safeMessage;
          throw Object.assign(new Error(msg), { code: e.code ?? 'SYNC_ENROLL_FAILED' });
        }
        throw e;
      }
      const saved = saveSyncCredentials({
        apiBaseUrl,
        deviceId: res.deviceId,
        organizationId: res.organizationId,
        deviceToken: res.deviceToken,
        tokenExpiresAt: res.tokenExpiresAt,
      });
      if (!saved.ok) throw Object.assign(new Error('Penyimpanan aman tidak tersedia: ' + saved.reason), { code: 'SECURE_STORAGE' });
      creds = loadSyncCredentials();
      cfg = { ...cfg, apiBaseUrl };
      backoffAttempt = 0;
      retryAt = null;
      snapshot = { ...snapshot, lastError: null };
      if (!stopped) schedule(500);
      return this.getConnection();
    },
    getConnection() {
      const c = loadSyncCredentials();
      return {
        enrolled: !!c,
        apiBaseUrl: c?.apiBaseUrl ?? null,
        organizationId: c?.organizationId ?? null,
        tokenExpiresAt: c?.tokenExpiresAt ?? null,
      };
    },
  };
}
