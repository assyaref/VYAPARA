import type { AppDatabase } from '../db/open';
import { downloadEventsTransport, SyncTransportError } from './transport';
import { getDownloadCursor, setDownloadCursor } from './store';
import { applyInboundEventAtomically, type InboundEvent } from './inbound';
import { safeErrorSummary, type SyncConfig } from './types';
import { encodeCursor } from 'vyapara-shared';

export type DownloadRunResult = { pages: number; events: number; applied: number; quarantined: number; ignored: number; retryableFailure: boolean; authFailure: boolean; stoppedOnError?: string };

export async function runDownloadOnce(args: {
  db: AppDatabase;
  cfg: SyncConfig;
  token: string;
  organizationId: string;
  localDeviceId: string;
  signal?: AbortSignal;
}): Promise<DownloadRunResult> {
  let pages = 0;
  let events = 0;
  let applied = 0;
  let quarantined = 0;
  let ignored = 0;
  const { db, cfg, token, organizationId, localDeviceId, signal } = args;
  let cursor = getDownloadCursor(db, organizationId) ?? undefined;
  try {
    for (;;) {
      if (args.signal?.aborted) throw new SyncTransportError({ kind: 'aborted', retryable: false, safeMessage: 'Sync cancelled' });
      const res = await downloadEventsTransport({
        baseUrl: args.cfg.apiBaseUrl,
        token: args.token,
        timeoutMs: args.cfg.requestTimeoutMs,
        signal: args.signal,
        query: { cursor, limit: args.cfg.downloadLimit },
      });
      pages += 1;
      let pageMaxSeq: number | null = null;
      for (const raw of res.events) {
        events += 1;
        if (typeof raw.serverSeq === 'number') {
          pageMaxSeq = pageMaxSeq === null ? raw.serverSeq : Math.max(pageMaxSeq, raw.serverSeq);
        }
        const ev: InboundEvent = {
          serverSeq: raw.serverSeq,
          eventId: raw.eventId,
          deviceId: raw.deviceId,
          idempotencyKey: raw.idempotencyKey,
          eventType: raw.eventType,
          aggregateType: raw.aggregateType,
          aggregateId: raw.aggregateId,
          schemaVersion: raw.schemaVersion,
          createdAt: raw.createdAt,
          payload: raw.payload as Record<string, unknown>,
          receivedAt: raw.receivedAt,
          remoteVersion: typeof raw.remoteVersion === "number" ? raw.remoteVersion : undefined,
        };
        const outcome = applyInboundEventAtomically(db, ev, localDeviceId, organizationId);
        // If receipt insert failed, transaction would throw and we stop without advancing cursor.
        if (outcome.kind === 'applied') applied += 1;
        else if (outcome.kind === 'quarantined') quarantined += 1;
        else ignored += 1;
      }
      // Advance cursor only after durable application/quarantine receipts for this page.
      // When the server signals the final page (hasNext=false) it omits nextCursor, so derive
      // the cursor from the last event's serverSeq to avoid re-fetching already-receipted events.
      const nextCursor = res.nextCursor ?? (pageMaxSeq !== null ? encodeCursor(pageMaxSeq, args.organizationId) : null);
      if (nextCursor) {
        setDownloadCursor(args.db, args.organizationId, nextCursor);
        cursor = nextCursor;
      }
      if (!res.hasMore) break;
      if (res.events.length === 0 && res.hasMore) break; // defensive
    }
    return { pages, events, applied, quarantined, ignored, retryableFailure: false, authFailure: false };
  } catch (e) {
    if (e instanceof SyncTransportError) {
      if (e.kind === 'unauthorized' || e.kind === 'revoked') return { pages, events, applied, quarantined, ignored, retryableFailure: false, authFailure: true, stoppedOnError: e.safeMessage };
      if (e.kind === 'expired') return { pages, events, applied, quarantined, ignored, retryableFailure: true, authFailure: true, stoppedOnError: e.safeMessage };
      if (e.retryable || e.kind === 'timeout' || e.kind === 'network') return { pages, events, applied, quarantined, ignored, retryableFailure: true, authFailure: false, stoppedOnError: e.safeMessage };
      // invalid cursor or invalid response: do not reset silently
      if (e.kind === 'http' && e.code === 'INVALID_CURSOR') {
        return { pages, events, applied, quarantined, ignored, retryableFailure: false, authFailure: false, stoppedOnError: 'Invalid download cursor' };
      }
      return { pages, events, applied, quarantined, ignored, retryableFailure: false, authFailure: false, stoppedOnError: e.safeMessage };
    }
    // DB/apply error means event not durably applied/quarantined; cursor not advanced past it.
    return { pages, events, applied, quarantined, ignored, retryableFailure: false, authFailure: false, stoppedOnError: safeErrorSummary(e) };
  }
}

