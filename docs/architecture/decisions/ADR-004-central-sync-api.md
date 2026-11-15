# ADR 004: Central Sync API for Phase 4.2

- Status: Accepted (Phase 4.2 initial implementation)
- Date: 2026-11-15

## Context
Phase 4.1 established local-first SQLite, transactional outbox, stable device identity, typed/versioned sync events, idempotency keys, and conflict policies (ADR-001/002/003). Phase 4.2 requires a central synchronization API to receive and distribute events across desktop installations with device authentication, durable idempotent ingestion, acknowledgments, and resumable incremental download.

## Decision
- Implement a lightweight TypeScript HTTP API in `apps/sync-server` using Node.js built-in `node:http` (no web framework dependency) with Zod validation and shared contracts in `packages/shared/src/sync.ts`.
- Use SQLite (`better-sqlite3`) for server-side persistence in development/test and simple deployments; keep schema/migrations explicit so storage can be replaced later without changing the API contract.
- Authenticate devices independently of desktop session tokens via enrollment credentials issued at registration and rotated/renewed bearer device tokens (hashed at rest). Support revocation and reject inactive/revoked devices.
- Ingest events in batches transactionally with per-event idempotency on `(device_id, event_id)` and `(device_id, idempotency_key)`. Return per-event acknowledgments; never acknowledge before durable commit.
- Assign a monotonic server cursor (`server_seq`, INTEGER AUTOINCREMENT) on accepted/duplicate ingestion and expose incremental download ordered by `server_seq` with stable pagination cursors.
- Treat uploaded events as untrusted: validate envelope, schema version, payload shape, device binding, and size/limits server-side. Preserve immutable financial/inventory event history (append-only ingest records).

## Rationale
- Minimal dependencies and local testability satisfy Phase 4.2 constraints and avoid cloud spending.
- Node HTTP + better-sqlite3 provide transactional semantics and straightforward isolated test DBs.
- Server-assigned monotonic cursor is deterministic and resumable across reconnects, avoiding client-clock ordering issues.
- Hashed device tokens, revocation, request limits, and strict validation reduce replay/abuse risk while keeping device auth separate from local user sessions.

## Consequences
- SQLite server storage is suitable for dev/single-node early deployments; horizontal scaling/multi-writer HA will require a future storage/locking strategy.
- Enrollment secret handling must be operationally controlled; production requires TLS termination and secure secret distribution (not implemented in-app).
- Download currently returns accepted server events for authorized devices; fine-grained authorization/multi-tenant partitioning may evolve with protocol versioning.
- Desktop outbox transport client is deferred; API contract is designed for compatibility with existing Phase 4.1 event envelopes.
