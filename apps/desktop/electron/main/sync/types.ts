export type SyncPhase = 'idle' | 'connecting' | 'uploading' | 'downloading' | 'applying' | 'retrying' | 'offline' | 'error';

export type SyncStatusSnapshot = {
  phase: SyncPhase;
  online: boolean;
  lastSyncAt: string | null;
  pendingCount: number;
  failedCount: number;
  lastError: string | null;
  retryAt: string | null;
  inProgress: boolean;
};

export type SyncConfig = {
  apiBaseUrl: string;
  uploadBatchSize: number;
  downloadLimit: number;
  requestTimeoutMs: number;
  periodicIntervalMs: number;
  maxBackoffMs: number;
  baseBackoffMs: number;
};

export const DEFAULT_SYNC_CONFIG: SyncConfig = {
  apiBaseUrl: (typeof process !== 'undefined' && process.env.VYAPARA_SYNC_API_BASE_URL) || 'http://127.0.0.1:8787',
  uploadBatchSize: 50,
  downloadLimit: 50,
  requestTimeoutMs: 15000,
  periodicIntervalMs: 30000,
  maxBackoffMs: 5 * 60 * 1000,
  baseBackoffMs: 2000,
};

export function safeErrorSummary(err: unknown): string {
  if (err && typeof err === 'object') {
    const any = err as any;
    if (typeof any.safeMessage === 'string') return any.safeMessage.slice(0, 300);
    if (typeof any.code === 'string' && typeof any.message === 'string' && !/token|secret|authorization|bearer/i.test(any.message)) {
      return `${any.code}: ${String(any.message).slice(0, 240)}`;
    }
    if (typeof any.code === 'string') return String(any.code).slice(0, 120);
  }
  if (err instanceof Error) {
    const m = err.message || 'Error';
    if (/token|secret|authorization|bearer|password/i.test(m)) return 'Sync request failed';
    return m.slice(0, 300);
  }
  return 'Sync failed';
}

export function computeBackoffMs(attempt: number, base: number, max: number): number {
  const exp = Math.min(max, base * Math.pow(2, Math.max(0, attempt - 1)));
  const jitter = Math.floor(Math.random() * Math.max(250, exp * 0.2));
  return Math.min(max, exp + jitter);
}

export function nowIso(): string {
  return new Date().toISOString();
}
