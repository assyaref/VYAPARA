import { z } from 'zod';

// Phase 4.2 central sync API contracts (versioned, /v1)
// Designed to be compatible with Phase 4.1 desktop outbox envelopes.

export const SYNC_API_VERSION = 'v1' as const;
export const SYNC_SCHEMA_VERSION = 1 as const;

export const SYNC_EVENT_TYPES = [
  'sale.created',
  'customer.payment.recorded',
  'sales_return.created',
  'inventory.movement.recorded',
] as const;
export type SyncEventType = (typeof SYNC_EVENT_TYPES)[number];

export const deviceIdSchema = z.string().uuid();
export const eventIdSchema = z.string().uuid();
export const idempotencyKeySchema = z.string().min(1).max(200);
export const aggregateTypeSchema = z.string().min(1).max(80);
export const aggregateIdSchema = z.string().min(1).max(120);

// Strict envelope for accepted/known schema version (compatible with Phase 4.1).
export const syncEventEnvelopeSchema = z.object({
  eventId: eventIdSchema,
  deviceId: deviceIdSchema,
  idempotencyKey: idempotencyKeySchema,
  eventType: z.enum(SYNC_EVENT_TYPES),
  aggregateType: aggregateTypeSchema,
  aggregateId: aggregateIdSchema,
  schemaVersion: z.literal(SYNC_SCHEMA_VERSION),
  createdAt: z.string().min(1).max(64),
  payload: z.record(z.string(), z.unknown()),
}).strict();

// Transport-level upload event: lenient on schemaVersion so server can return per-event
// `schema_unsupported` acknowledgments instead of failing the whole batch parse.
export const syncUploadEventSchema = z.object({
  eventId: eventIdSchema,
  deviceId: deviceIdSchema,
  idempotencyKey: idempotencyKeySchema,
  eventType: z.string().min(1).max(80),
  aggregateType: aggregateTypeSchema,
  aggregateId: aggregateIdSchema,
  schemaVersion: z.number().int(),
  createdAt: z.string().min(1).max(64),
  payload: z.record(z.string(), z.unknown()).default({}),
}).passthrough();

export type SyncEventEnvelope = z.infer<typeof syncEventEnvelopeSchema>;

export const organizationIdSchema = z.string().uuid();

export const deviceRegisterRequestSchema = z.object({
  deviceId: deviceIdSchema,
  // Explicit trusted tenant/organization binding for the device (Phase 4.2.1).
  // Assumption: a device is enrolled into exactly one organization at registration time.
  organizationId: organizationIdSchema,
  enrollmentSecret: z.string().min(16).max(256),
  deviceName: z.string().min(1).max(120).optional(),
}).strict();
export type DeviceRegisterRequest = z.infer<typeof deviceRegisterRequestSchema>;

export const deviceRegisterResponseSchema = z.object({
  deviceId: deviceIdSchema,
  organizationId: organizationIdSchema,
  deviceToken: z.string().min(32),
  tokenExpiresAt: z.string().datetime(),
  status: z.enum(['active']),
});

export const deviceTokenRenewRequestSchema = z.object({
  // deviceId retained for client compatibility but server derives identity from token and rejects mismatches.
  deviceId: deviceIdSchema.optional(),
  deviceToken: z.string().min(32),
}).strict();
export type DeviceTokenRenewRequest = z.infer<typeof deviceTokenRenewRequestSchema>;

export const deviceTokenRenewResponseSchema = z.object({
  deviceId: deviceIdSchema,
  organizationId: organizationIdSchema,
  deviceToken: z.string().min(32),
  tokenExpiresAt: z.string().datetime(),
});

export const deviceRevokeRequestSchema = z.object({
  deviceId: deviceIdSchema,
  reason: z.string().max(300).optional(),
}).strict();
export type DeviceRevokeRequest = z.infer<typeof deviceRevokeRequestSchema>;

export const syncUploadRequestSchema = z.object({
  deviceId: deviceIdSchema,
  events: z.array(syncUploadEventSchema).min(1).max(100),
}).strict();
export type SyncUploadRequest = z.infer<typeof syncUploadRequestSchema>;

export const perEventAckSchema = z.object({
  eventId: eventIdSchema,
  idempotencyKey: idempotencyKeySchema,
  status: z.enum(['accepted', 'duplicate', 'conflict', 'rejected']),
  serverSeq: z.number().int().positive().nullable(),
  code: z.string().optional(),
  message: z.string().optional(),
});
export type PerEventAck = z.infer<typeof perEventAckSchema>;

export const syncUploadResponseSchema = z.object({
  deviceId: deviceIdSchema,
  results: z.array(perEventAckSchema),
  acceptedCount: z.number().int().nonnegative(),
  duplicateCount: z.number().int().nonnegative(),
  rejectedCount: z.number().int().nonnegative(),
  conflictCount: z.number().int().nonnegative(),
});

export const syncDownloadQuerySchema = z.object({
  // Optional client hint only; server ignores it for authorization scope and may reject mismatches.
  deviceId: deviceIdSchema.optional(),
  cursor: z.string().max(512).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
});
export type SyncDownloadQuery = z.infer<typeof syncDownloadQuerySchema>;

export const syncDownloadEventSchema = syncEventEnvelopeSchema.extend({
  serverSeq: z.number().int().positive(),
  receivedAt: z.string().datetime(),
});

export const syncDownloadResponseSchema = z.object({
  events: z.array(syncDownloadEventSchema),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
});

export const syncErrorSchema = z.object({
  ok: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});

export const syncOkSchema = <T extends z.ZodTypeAny>(data: T) =>
  z.object({ ok: z.literal(true), data });

export function encodeCursor(serverSeq: number, organizationId: string): string {
  return Buffer.from(JSON.stringify({ s: serverSeq, o: organizationId }), 'utf8').toString('base64url');
}

export function decodeCursor(cursor: string): { serverSeq: number; organizationId?: string } {
  try {
    const raw = Buffer.from(cursor, 'base64url').toString('utf8');
    const parsed = JSON.parse(raw) as { s?: unknown; o?: unknown };
    if (typeof parsed.s !== 'number' || !Number.isInteger(parsed.s) || parsed.s < 0) {
      throw new Error('invalid');
    }
    if (parsed.o !== undefined && (typeof parsed.o !== 'string' || parsed.o.length < 1 || parsed.o.length > 100)) {
      throw new Error('invalid');
    }
    return { serverSeq: parsed.s, organizationId: parsed.o as string | undefined };
  } catch {
    throw new Error('INVALID_CURSOR');
  }
}

// Batch/request limits
export const SYNC_LIMITS = {
  maxEventsPerBatch: 100,
  maxBodyBytes: 1024 * 1024, // 1MB
  maxPayloadBytesPerEvent: 64 * 1024,
  defaultDownloadLimit: 50,
  maxDownloadLimit: 200,
} as const;
