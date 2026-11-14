# Synchronization Protocol (Phase 4.1 Design)

> Foundation/spec only. No production sync server implemented in Phase 4.1.

## Goals
- At-least-once delivery with idempotent processing (never assume exactly-once network).
- Safe resume after interruption using durable local outbox state and server cursors/acks.
- Device-authenticated uploads; untrusted payloads validated server-side.

## Device identity & auth (planned)
- Each installation has stable `device_id` (UUID) persisted locally (`device_identity` + sidecar file). Not a hardware fingerprint.
- Future registration: device exchanges enrollment credential for scoped device token/keys stored in OS-protected storage/main process only (never renderer). Requests signed/authenticated per device.
- Server binds events to authenticated `device_id`; rejects mismatched device claims.

## Event envelope (upload)
Suggested JSON per outbox row:
```json
{
  "eventId": "<sync_outbox.id UUID>",
  "deviceId": "<device_identity.device_id>",
  "idempotencyKey": "<sync_outbox.idempotency_key>",
  "eventType": "sale.created|customer.payment.recorded|sales_return.created|inventory.movement.recorded",
  "aggregateType": "transaction|customer_transaction|sales_return|stock_movement",
  "aggregateId": "<domain id>",
  "schemaVersion": 1,
  "createdAt": "<ISO-8601>",
  "payload": { }
}
```
- `eventId`/`idempotencyKey` globally unique; server must enforce unique constraint/dedupe inbox so replay is safe.
- Payloads are domain snapshots needed for deterministic apply; must exclude secrets/tokens/passwords.

## Upload flow (planned)
1. Client selects `pending|failed` events ordered by `created_at` (bounded batch).
2. Marks batch `syncing` (local) before/around send attempt.
3. Server validates auth, schema version, payload; applies idempotently; returns per-event ack: `accepted|duplicate|conflict|rejected`.
4. Client marks `acknowledged` with `server_ack_at` on accepted/duplicate; `conflict` on business conflict (with reason); `failed`/`dead` on transient/permanent errors with retry increment.
5. Retry with exponential backoff + jitter; dead-letter after policy threshold (future). Never silently discard.

## Download / incremental sync (planned)
- Cursor-based pull: `GET /sync/changes?deviceId=&cursor=<opaque>&limit=` returns ordered changes + `nextCursor`.
- Client persists cursor only after durable local apply in a transaction; resume from last committed cursor after crash.
- Server monotonic cursor per device/stream; idempotent re-fetch safe.

## Idempotency & ordering
- Apply keyed by `idempotencyKey`/`eventId`; duplicates become no-ops returning prior result.
- Preserve per-aggregate causal ordering where required (e.g. stock movements) via `created_at` + sequence/server-assigned order; conflicts escalated not overwritten.

## Conflict reporting & policies
- Immutable events (sale/payment/return): reject conflicting mutation of same aggregate; duplicates ok.
- Inventory: movement ledger reconciliation; negative-stock/conflicting adjustments surfaced as conflict for review.
- Master data: include version/etag/hash in future payloads; detect concurrent edits, return both versions/conflict record.
- Deletions: tombstone events with version; restore/conflict rules explicit.

## Versioning & compatibility
- `schemaVersion` per event; server supports N/N-1 during rollout, rejects unknown with upgrade-required signal.
- Additive payload evolution preferred; breaking changes require new event type/version.

## Resumption & integrity
- Local outbox is source of unsynced truth until acked. Ack means server durably accepted/applied idempotently.
- Partial batch failures handled per-event; never mark whole batch acked on partial failure.
- Integrity: server-side invariants for money/stock; client never trusted.

## Open items (Phase 4.2+)
- Transport choice (HTTPS API/queue) aligned to deployment constraints.
- Device enrollment/revocation, key rotation.
- Background sync worker, backoff policy, dead-letter UI/ops.
- Multi-device merge rules per aggregate, conflict resolution UX.
- Tombstone/schema for deletes, PII minimization review.
