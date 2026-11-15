import {
  SYNC_API_VERSION,
  SYNC_LIMITS,
  deviceRegisterRequestSchema,
  deviceRegisterResponseSchema,
  deviceTokenRenewRequestSchema,
  deviceTokenRenewResponseSchema,
  syncDownloadQuerySchema,
  syncDownloadResponseSchema,
  syncUploadRequestSchema,
  syncUploadResponseSchema,
  type SyncDownloadQuery,
  type SyncUploadRequest,
  type DeviceRegisterRequest,
} from 'vyapara-shared';
import type { z } from 'zod';

type DeviceRegisterResponse = z.infer<typeof deviceRegisterResponseSchema>;
type DeviceTokenRenewResponse = z.infer<typeof deviceTokenRenewResponseSchema>;
type SyncDownloadResponse = z.infer<typeof syncDownloadResponseSchema>;
type SyncUploadResponse = z.infer<typeof syncUploadResponseSchema>;

export type TransportError = {
  kind: 'timeout' | 'network' | 'unauthorized' | 'expired' | 'revoked' | 'http' | 'invalid_response' | 'oversized' | 'aborted' | 'config';
  status?: number;
  code?: string;
  retryable: boolean;
  safeMessage: string;
};

export class SyncTransportError extends Error {
  kind: TransportError['kind'];
  status?: number;
  code?: string;
  retryable: boolean;
  safeMessage: string;
  constructor(info: TransportError) {
    super(info.safeMessage);
    this.name = 'SyncTransportError';
    this.kind = info.kind;
    this.status = info.status;
    this.code = info.code;
    this.retryable = info.retryable;
    this.safeMessage = info.safeMessage;
  }
}

export type TransportOptions = {
  baseUrl: string;
  token?: string;
  timeoutMs: number;
  signal?: AbortSignal;
};

function joinUrl(base: string, p: string): string {
  return `${base.replace(/\/+$/, '')}${p}`;
}

async function readJsonLimited(res: Response): Promise<unknown> {
  const text = await res.text();
  if (Buffer.byteLength(text, 'utf8') > SYNC_LIMITS.maxBodyBytes) {
    throw new SyncTransportError({ kind: 'oversized', retryable: false, safeMessage: 'Response too large' });
  }
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new SyncTransportError({ kind: 'invalid_response', retryable: false, safeMessage: 'Malformed server response' });
  }
}

function classifyHttpError(status: number, body: any): SyncTransportError {
  const code = body?.error?.code;
  if (status === 401) {
    if (code === 'TOKEN_EXPIRED') return new SyncTransportError({ kind: 'expired', status, code, retryable: true, safeMessage: 'Device token expired' });
    return new SyncTransportError({ kind: 'unauthorized', status, code, retryable: false, safeMessage: 'Unauthorized device' });
  }
  if (status === 403) {
    if (code === 'DEVICE_REVOKED') return new SyncTransportError({ kind: 'revoked', status, code, retryable: false, safeMessage: 'Device revoked' });
    return new SyncTransportError({ kind: 'unauthorized', status, code, retryable: false, safeMessage: 'Forbidden' });
  }
  if (status === 408 || status === 429 || status >= 500) {
    return new SyncTransportError({ kind: 'http', status, code, retryable: true, safeMessage: `Server error (${status})` });
  }
  return new SyncTransportError({ kind: 'http', status, code, retryable: false, safeMessage: `Request failed (${status})` });
}

async function requestJson<T>(opts: TransportOptions & { method: string; path: string; body?: unknown; schema: z.ZodType<T>; auth?: boolean }): Promise<T> {
  if (!opts.baseUrl) throw new SyncTransportError({ kind: 'config', retryable: false, safeMessage: 'Sync API base URL not configured' });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new Error('timeout')), opts.timeoutMs);
  const onAbort = () => controller.abort(opts.signal?.reason);
  opts.signal?.addEventListener('abort', onAbort, { once: true });
  try {
    const bodyStr = opts.body === undefined ? undefined : JSON.stringify(opts.body);
    if (bodyStr && Buffer.byteLength(bodyStr, 'utf8') > SYNC_LIMITS.maxBodyBytes) {
      throw new SyncTransportError({ kind: 'oversized', retryable: false, safeMessage: 'Request payload too large' });
    }
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (opts.auth !== false && opts.token) headers.authorization = `Bearer ${opts.token}`;
    const res = await fetch(joinUrl(opts.baseUrl, opts.path), {
      method: opts.method,
      headers,
      body: bodyStr,
      signal: controller.signal,
    } as RequestInit);
    const json = await readJsonLimited(res);
    if (!res.ok) throw classifyHttpError(res.status, json);
    const data = (json as any)?.ok ? (json as any).data : json;
    const parsed = opts.schema.safeParse(data);
    if (!parsed.success) throw new SyncTransportError({ kind: 'invalid_response', retryable: false, safeMessage: 'Invalid server response schema' });
    return parsed.data;
  } catch (e: any) {
    if (e instanceof SyncTransportError) throw e;
    if (controller.signal.aborted) {
      const reason = controller.signal.reason;
      if (opts.signal?.aborted) throw new SyncTransportError({ kind: 'aborted', retryable: false, safeMessage: 'Sync cancelled' });
      throw new SyncTransportError({ kind: 'timeout', retryable: true, safeMessage: 'Sync request timed out' });
    }
    throw new SyncTransportError({ kind: 'network', retryable: true, safeMessage: 'Network unavailable' });
  } finally {
    clearTimeout(timeout);
    opts.signal?.removeEventListener('abort', onAbort);
  }
}

export async function registerDeviceTransport(opts: TransportOptions & { request: DeviceRegisterRequest }): Promise<DeviceRegisterResponse> {
  const body = deviceRegisterRequestSchema.parse(opts.request);
  const out = await requestJson({
    ...opts,
    method: 'POST',
    path: `/${SYNC_API_VERSION}/sync/devices/register`,
    body,
    schema: deviceRegisterResponseSchema,
    auth: false,
  });
  return out;
}

export async function renewDeviceTokenTransport(opts: TransportOptions & { deviceId?: string; deviceToken: string }): Promise<DeviceTokenRenewResponse> {
  const body = deviceTokenRenewRequestSchema.parse({ deviceId: opts.deviceId, deviceToken: opts.deviceToken });
  const out = await requestJson({
    ...opts,
    method: 'POST',
    path: `/${SYNC_API_VERSION}/sync/devices/token/renew`,
    body,
    schema: deviceTokenRenewResponseSchema,
    auth: false,
  });
  return out;
}

export async function uploadEventsTransport(opts: TransportOptions & { request: SyncUploadRequest }): Promise<SyncUploadResponse> {
  const body = syncUploadRequestSchema.parse(opts.request);
  return requestJson({
    ...opts,
    method: 'POST',
    path: `/${SYNC_API_VERSION}/sync/events/upload`,
    body,
    schema: syncUploadResponseSchema,
  });
}

export async function downloadEventsTransport(opts: TransportOptions & { query: SyncDownloadQuery }): Promise<SyncDownloadResponse> {
  const q = syncDownloadQuerySchema.parse(opts.query);
  const params = new URLSearchParams();
  if (q.cursor) params.set('cursor', q.cursor);
  if (q.limit) params.set('limit', String(q.limit));
  // do not send deviceId hint unless needed; server derives scope from token
  const qs = params.toString();
  return requestJson({
    ...opts,
    method: 'GET',
    path: `/${SYNC_API_VERSION}/sync/events/download${qs ? `?${qs}` : ''}`,
    schema: syncDownloadResponseSchema,
  });
}