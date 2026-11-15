import type { AppDatabase } from '../db/open';
import { uploadEventsTransport, type TransportOptions, SyncTransportError } from './transport';
import { listUploadCandidates, markOutboxSyncingBatch, markOutboxAck, markOutboxRetryable, markOutboxTerminal, revertSyncingToPending } from './store';
import { computeBackoffMs, nowIso, safeErrorSummary, type SyncConfig } from './types';

export type UploadRunResult = { uploaded: number; acknowledged: number; failed: number; retryableFailure: boolean; authFailure: boolean };

function toRequestEvent(c: ReturnType<typeof listUploadCandidates>[number]) {
  return {
    eventId: c.id,
    deviceId: c.deviceId,
    idempotencyKey: c.idempotencyKey,
    eventType: c.eventType,
    aggregateType: c.aggregateType,
    aggregateId: c.aggregateId,
    schemaVersion: c.schemaVersion,
    createdAt: c.createdAt,
    payload: c.payload,
  };
}

export async function runUploadOnce(args: {
  db: AppDatabase;
  cfg: SyncConfig;
  token: string;
  signal?: AbortSignal;
}): Promise<UploadRunResult> {
  const candidates = listUploadCandidates(args.db, args.cfg.uploadBatchSize);
  if (candidates.length === 0) return { uploaded: 0, acknowledged: 0, failed: 0, retryableFailure: false, authFailure: false };

  const ids = candidates.map((c) => c.id);
  markOutboxSyncingBatch(args.db, ids);

  const byId = new Map(candidates.map((c) => [c.id, c]));
  try {
    const res = await uploadEventsTransport({
      baseUrl: args.cfg.apiBaseUrl,
      token: args.token,
      timeoutMs: args.cfg.requestTimeoutMs,
      signal: args.signal,
      request: { deviceId: candidates[0]!.deviceId, events: candidates.map(toRequestEvent) },
    });
    const ackAt = nowIso();
    let acknowledged = 0;
    let failed = 0;
    for (const r of res.results) {
      const ev = byId.get(r.eventId);
      if (!ev) continue;
      if (r.status === 'accepted' || r.status === 'duplicate') {
        markOutboxAck(args.db, ev.id, ackAt);
        acknowledged += 1;
      } else if (r.status === 'conflict') {
        markOutboxTerminal(args.db, ev.id, r.message || r.code || 'Conflict', 'conflict');
        failed += 1;
      } else {
        // rejected: decide retryable vs terminal from code
        const code = r.code || '';
        const terminal = ['SCHEMA_UNSUPPORTED', 'INVALID_EVENT_TYPE', 'INVALID_PAYLOAD', 'PAYLOAD_TOO_LARGE', 'DEVICE_MISMATCH'].includes(code);
        if (terminal) {
          markOutboxTerminal(args.db, ev.id, r.message || code || 'Rejected');
        } else {
          const attempt = (ev.attemptCount || 0) + 1;
          const delay = computeBackoffMs(attempt, args.cfg.baseBackoffMs, args.cfg.maxBackoffMs);
          markOutboxRetryable(args.db, ev.id, r.message || code || 'Rejected', new Date(Date.now() + delay).toISOString());
        }
        failed += 1;
      }
    }
    return { uploaded: ids.length, acknowledged, failed, retryableFailure: false, authFailure: false };
  } catch (e) {
    // Timeout/network/5xx after server commit risk: DO NOT ack. Revert syncing to pending/failed retryable so original event retries with same id/idempotency.
    if (e instanceof SyncTransportError) {
      if (e.kind === 'unauthorized' || e.kind === 'revoked') {
        revertSyncingToPending(args.db, ids);
        return { uploaded: ids.length, acknowledged: 0, failed: ids.length, retryableFailure: false, authFailure: true };
      }
      if (e.kind === 'expired') {
        revertSyncingToPending(args.db, ids);
        return { uploaded: ids.length, acknowledged: 0, failed: ids.length, retryableFailure: true, authFailure: true };
      }
      if (e.retryable || e.kind === 'timeout' || e.kind === 'network') {
        for (const c of candidates) {
          const attempt = (c.attemptCount || 0) + 1;
          const delay = computeBackoffMs(attempt, args.cfg.baseBackoffMs, args.cfg.maxBackoffMs);
          markOutboxRetryable(args.db, c.id, e.safeMessage, new Date(Date.now() + delay).toISOString());
        }
        return { uploaded: ids.length, acknowledged: 0, failed: ids.length, retryableFailure: true, authFailure: false };
      }
      // non-retryable transport/http/config
      for (const c of candidates) markOutboxTerminal(args.db, c.id, e.safeMessage);
      return { uploaded: ids.length, acknowledged: 0, failed: ids.length, retryableFailure: false, authFailure: false };
    }
    // unknown error: treat as retryable, do not ack
    const msg = safeErrorSummary(e);
    for (const c of candidates) {
      const attempt = (c.attemptCount || 0) + 1;
      const delay = computeBackoffMs(attempt, args.cfg.baseBackoffMs, args.cfg.maxBackoffMs);
      markOutboxRetryable(args.db, c.id, msg, new Date(Date.now() + delay).toISOString());
    }
    return { uploaded: ids.length, acknowledged: 0, failed: ids.length, retryableFailure: true, authFailure: false };
  }
}
