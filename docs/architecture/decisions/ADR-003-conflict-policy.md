# ADR 003: Conflict and Consistency Policies (Initial)

- Status: Accepted (Phase 4.1 foundation)
- Date: 2026-11-14

## Context
Offline multi-device sync can produce concurrent edits. Financial and inventory correctness cannot rely on unconditional last-write-wins.

## Decision
- **Sales, payments, sales returns:** immutable business events; server apply must be idempotent/append-oriented, no LWW overwrite.
- **Inventory:** movement/ledger-based reconciliation (`stock_movements`), not snapshot overwrite; conflicts (e.g. invalid resulting state) flagged for resolution.
- **Master data (products/customers/suppliers):** require version/etag-aware conflict detection; preserve both versions or raise resolvable conflict.
- **Deletions:** use tombstones when synchronized (future schema/protocol support).

## Rationale
Preserves auditability and financial/stock integrity under concurrent or replayed operations.

## Consequences
Conflict resolver UX and full versioning/tombstones deferred to Phase 4.2+; protocol and payloads must evolve to carry versions.
