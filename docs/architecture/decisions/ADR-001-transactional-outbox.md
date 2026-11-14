# ADR 001: Transactional Outbox for Offline-First Sync

- Status: Accepted (Phase 4.1 foundation)
- Date: 2026-11-14

## Context
VYAPARA desktop must operate offline with SQLite as local source of truth and later synchronize to a central server. Business mutations (sales, payments, returns, inventory) must not be lost or duplicated during unreliable/at-least-once delivery.

## Decision
Adopt a local **transactional outbox** table (`sync_outbox`) written in the **same SQLite transaction** as each critical business mutation. Each event gets a globally unique `id`, stable `device_id`, typed aggregate identifiers, JSON payload, `schema_version`, lifecycle status, retry/error metadata, and a UNIQUE `idempotency_key`.

## Rationale
- Atomicity: commit business state and sync intent together or not at all (no dual-write gap).
- Idempotency: unique keys + immutable event identity enable safe retries and server-side dedupe under at-least-once delivery.
- Observability: statuses/errors support retry and conflict handling without blocking POS.

## Consequences
- Requires disciplined integration: every synchronizable mutation must append outbox in-transaction (enforced for Phase 4.1 critical flows; inventory centralized via `recordStockMovement`).
- Payload design must balance replay needs with PII/secrecy minimization.
- Sync engine/transport/conflict resolution deferred to later phases.
