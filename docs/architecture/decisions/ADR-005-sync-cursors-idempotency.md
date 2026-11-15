# ADR 005: Sync API Versioning, Cursors, and Idempotent Acknowledgment

- Status: Accepted (Phase 4.2 initial implementation)
- Date: 2026-11-15

## Context
Desktop clients upload outbox events at-least-once and must safely resume after interruption. The server must not acknowledge uncommitted data, must dedupe replays, and must provide deterministic incremental downloads.

## Decision
- Version HTTP contract under `/v1/sync/*` and require `schemaVersion` in event envelopes; reject unsupported schema versions with permanent `schema_unsupported` error.
- Upload endpoint processes batches item-by-item inside a database transaction boundary per request such that either all durable writes for acknowledged outcomes in that request commit, or none do; partial batch success is represented only when each item outcome is durably committed before response (implementation commits request transaction after full validation/application pass, returning per-item results; a storage failure rolls back and returns retryable error without acknowledging).
- Idempotency: same `(deviceId,eventId)` or `(deviceId,idempotencyKey)` replay returns prior accepted/duplicate outcome without mutating history.
- Download cursor is an opaque base64 encoding of the last seen `server_seq` integer. Results ordered by `server_seq ASC`, limited by page size; `nextCursor` returned when more results exist. Repeated requests with same cursor are safe/read-only.

## Rationale
Explicit versioning, durable-before-ack, and monotonic cursors provide recoverability and compatibility guarantees needed for offline-first sync.

## Consequences
Clients must persist cursor only after durable local apply (per protocol). Future protocol changes require additive evolution or `/v2` with negotiated compatibility.
