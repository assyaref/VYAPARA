import type { IncomingMessage, ServerResponse } from 'node:http';
import { ZodError } from 'zod';
import { SYNC_LIMITS } from 'vyapara-shared';

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buf.length;
    if (total > SYNC_LIMITS.maxBodyBytes) {
      throw new HttpError(413, 'PAYLOAD_TOO_LARGE', 'Request body too large');
    }
    chunks.push(buf);
  }
  if (chunks.length === 0) return {};
  const raw = Buffer.concat(chunks).toString('utf8');
  try {
    return JSON.parse(raw);
  } catch {
    throw new HttpError(400, 'INVALID_JSON', 'Invalid JSON body');
  }
}

export function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(payload);
}

export function sendOk(res: ServerResponse, data: unknown, status = 200): void {
  sendJson(res, status, { ok: true, data });
}

export function sendError(res: ServerResponse, err: unknown): void {
  if (err instanceof HttpError) {
    sendJson(res, err.status, { ok: false, error: { code: err.code, message: err.message, details: err.details } });
    return;
  }
  if (err && typeof err === 'object' && 'statusCode' in err && 'code' in err) {
    const e = err as { statusCode: number; code: string; message?: string };
    sendJson(res, e.statusCode, { ok: false, error: { code: String(e.code), message: e.message ?? 'Request failed' } });
    return;
  }
  if (err instanceof ZodError) {
    sendJson(res, 400, { ok: false, error: { code: 'VALIDATION', message: 'Invalid request', details: err.issues } });
    return;
  }
  console.error('[sync-server] unhandled error', err);
  sendJson(res, 500, { ok: false, error: { code: 'INTERNAL', message: 'Internal server error' } });
}

export function requireBearerDeviceAuth(req: IncomingMessage): string {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    throw new HttpError(401, 'AUTH_REQUIRED', 'Missing device bearer token');
  }
  const token = auth.slice('Bearer '.length).trim();
  if (!token) throw new HttpError(401, 'AUTH_REQUIRED', 'Missing device bearer token');
  return token;
}
