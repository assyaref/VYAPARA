import type { IncomingMessage, ServerResponse } from 'node:http';
import { URL } from 'node:url';
import {
  deviceRegisterRequestSchema,
  deviceRegisterResponseSchema,
  deviceRevokeRequestSchema,
  deviceTokenRenewRequestSchema,
  deviceTokenRenewResponseSchema,
  syncDownloadQuerySchema,
  syncUploadRequestSchema,
  syncUploadResponseSchema,
  SYNC_LIMITS,
} from 'vyapara-shared';
import type { SyncServerDb } from './db/open.js';
import { HttpError, readJsonBody, requireBearerDeviceAuth, sendError, sendJson, sendOk } from './middleware/http.js';
import { authenticateBearerToken, registerDevice, renewDeviceToken, revokeDevice } from './services/devices.js';
import { downloadEvents, ingestEventsBatch } from './services/sync.js';
import { adminOverview } from './services/admin.js';
import { ADMIN_DASHBOARD_HTML } from './admin-dashboard.js';
import { sha256Hex, safeEqualHex } from './services/crypto.js';
import { createLicense, listLicenses, revokeLicense, activateLicense, verifyLicense } from './services/licenses.js';

function requireAdminToken(req: { headers: Record<string, unknown> }, cfg: SyncServerConfig): void {
  if (!cfg.adminToken) {
    throw new HttpError(404, 'NOT_FOUND', 'Admin API is not enabled on this server');
  }
  const auth = (req.headers.authorization as string | undefined) ?? '';
  const expected = sha256Hex(cfg.adminToken);
  const provided = sha256Hex(auth.startsWith('Bearer ') ? auth.slice('Bearer '.length).trim() : '');
  if (!safeEqualHex(expected, provided)) {
    throw new HttpError(401, 'UNAUTHORIZED', 'Admin token required');
  }
}

function sendHtml(res: import('node:http').ServerResponse, html: string): void {
  const payload = Buffer.from(html, 'utf8');
  res.statusCode = 200;
  res.setHeader('content-type', 'text/html; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.setHeader('x-content-type-options', 'nosniff');
  res.setHeader('x-frame-options', 'DENY');
  res.setHeader('content-security-policy', "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'self'");
  res.end(payload);
}

export type SyncServerConfig = {
  enrollmentSecret: string;
  tokenTtlHours?: number;
  adminToken?: string;
};

export async function handleRequest(
  req: IncomingMessage,
  res: ServerResponse,
  db: SyncServerDb,
  cfg: SyncServerConfig,
): Promise<void> {
  try {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
    const method = req.method ?? 'GET';

    if (method === 'POST' && url.pathname === '/v1/sync/devices/register') {
      const body = deviceRegisterRequestSchema.parse(await readJsonBody(req));
      const data = registerDevice(db, body, { expectedEnrollmentSecret: cfg.enrollmentSecret, tokenTtlHours: cfg.tokenTtlHours });
      sendOk(res, deviceRegisterResponseSchema.parse(data), 201);
      return;
    }

    if (method === 'POST' && url.pathname === '/v1/sync/devices/token/renew') {
      const body = deviceTokenRenewRequestSchema.parse(await readJsonBody(req));
      // Authorization/identity derived from token itself (trusted server-side), not client-supplied deviceId.
      const data = renewDeviceToken(db, body.deviceToken, cfg.tokenTtlHours, body.deviceId);
      sendOk(res, deviceTokenRenewResponseSchema.parse(data));
      return;
    }

    if (method === 'POST' && url.pathname === '/v1/sync/devices/revoke') {
      const body = deviceRevokeRequestSchema.parse(await readJsonBody(req));
      const authz = req.headers.authorization;
      if (!authz?.startsWith('Bearer ')) throw new HttpError(401, 'AUTH_REQUIRED', 'Missing bearer token');
      const token = authz.slice('Bearer '.length).trim();
      if (!(cfg.adminToken && token === cfg.adminToken)) {
        const auth = authenticateBearerToken(db, token);
        if (!auth.ok) throw new HttpError(auth.status, auth.code, auth.message);
        if (auth.device.deviceId !== body.deviceId) {
          throw new HttpError(403, 'FORBIDDEN', 'Device token not authorized to revoke target device');
        }
      }
      revokeDevice(db, body.deviceId, body.reason);
      sendOk(res, { deviceId: body.deviceId, status: 'revoked' as const });
      return;
    }

    if (method === 'POST' && url.pathname === '/v1/sync/events/upload') {
      const token = requireBearerDeviceAuth(req);
      const authResult = authenticateBearerToken(db, token);
      if (!authResult.ok) throw new HttpError(authResult.status, authResult.code, authResult.message);
      const body = syncUploadRequestSchema.parse(await readJsonBody(req));
      // Request/device scope derived from authenticated server-side identity only.
      if (body.deviceId !== authResult.device.deviceId) {
        throw new HttpError(403, 'DEVICE_MISMATCH', 'Upload deviceId does not match authenticated device');
      }
      if (body.events.length > SYNC_LIMITS.maxEventsPerBatch) {
        throw new HttpError(400, 'BATCH_TOO_LARGE', 'Too many events in batch');
      }
      const results = ingestEventsBatch(db, authResult.device, body.events);
      const summary = {
        deviceId: authResult.device.deviceId,
        results,
        acceptedCount: results.filter((r) => r.status === 'accepted').length,
        duplicateCount: results.filter((r) => r.status === 'duplicate').length,
        rejectedCount: results.filter((r) => r.status === 'rejected').length,
        conflictCount: results.filter((r) => r.status === 'conflict').length,
      };
      sendOk(res, syncUploadResponseSchema.parse(summary));
      return;
    }

    if (method === 'GET' && url.pathname === '/v1/sync/events/download') {
      const token = requireBearerDeviceAuth(req);
      const authResult = authenticateBearerToken(db, token);
      if (!authResult.ok) throw new HttpError(authResult.status, authResult.code, authResult.message);
      const q = syncDownloadQuerySchema.parse({
        deviceId: url.searchParams.get('deviceId') ?? undefined,
        cursor: url.searchParams.get('cursor') ?? undefined,
        limit: url.searchParams.get('limit') ?? undefined,
      });
      // Client-provided deviceId is a non-authoritative hint; reject if it attempts to target another device.
      if (q.deviceId && q.deviceId !== authResult.device.deviceId) {
        throw new HttpError(403, 'FORBIDDEN', 'Requested device scope is not authorized');
      }
      const data = downloadEvents(db, authResult.device, { cursor: q.cursor, limit: q.limit });
      sendOk(res, data);
      return;
    }

    if (method === 'GET' && url.pathname === '/v1/sync/health') {
      sendOk(res, { status: 'ok', time: new Date().toISOString() });
      return;
    }

    if (method === 'POST' && url.pathname === '/admin/licenses') {
      requireAdminToken(req as any, cfg);
      const body = (await readJsonBody(req)) as any;
      const data = createLicense(db, {
        organizationName: body.organizationName,
        maxActivations: body.maxActivations,
        expiresAt: body.expiresAt ?? null,
        notes: body.notes ?? null,
      });
      sendOk(res, data, 201);
      return;
    }

    if (method === 'GET' && url.pathname === '/admin/licenses') {
      requireAdminToken(req as any, cfg);
      sendOk(res, listLicenses(db));
      return;
    }

    if (method === 'POST' && url.pathname === '/admin/licenses/revoke') {
      requireAdminToken(req as any, cfg);
      const body = (await readJsonBody(req)) as any;
      if (typeof body.licenseId !== 'string' || !body.licenseId) {
        throw new HttpError(400, 'VALIDATION', 'licenseId wajib diisi');
      }
      sendOk(res, revokeLicense(db, body.licenseId));
      return;
    }

    if (method === 'POST' && url.pathname === '/v1/licenses/activate') {
      const body = (await readJsonBody(req)) as any;
      const data = activateLicense(db, {
        licenseKey: body.licenseKey,
        deviceId: body.deviceId,
        organizationName: body.organizationName,
      });
      sendOk(res, data);
      return;
    }

    if (method === 'POST' && url.pathname === '/v1/licenses/verify') {
      const body = (await readJsonBody(req)) as any;
      sendOk(res, verifyLicense(db, { licenseKey: body.licenseKey, deviceId: body.deviceId }));
      return;
    }

    if (method === 'GET' && url.pathname === '/admin') {
      sendHtml(res, ADMIN_DASHBOARD_HTML);
      return;
    }

    if (method === 'GET' && url.pathname === '/admin/api/overview') {
      requireAdminToken(req as any, cfg);
      sendOk(res, adminOverview(db));
      return;
    }

    throw new HttpError(404, 'NOT_FOUND', 'Route not found');
  } catch (err) {
    if (err instanceof Error && err.message === 'INVALID_CURSOR') {
      sendError(res, new HttpError(400, 'INVALID_CURSOR', 'Invalid download cursor'));
      return;
    }
    sendError(res, err);
  }
}
