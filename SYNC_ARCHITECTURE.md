# Offline-First Synchronization

## Write flow

``` mermaid
sequenceDiagram
  participant UI
  participant Main as Electron Main
  participant DB as SQLite
  participant Outbox
  participant Cloud
  UI->>Main: Create order
  Main->>DB: Begin transaction
  Main->>DB: Save order, items, payments, stock
  Main->>Outbox: Add sync event
  Main->>DB: Commit
  Main-->>UI: Local success
  Outbox->>Cloud: Send when online
  Cloud-->>Outbox: Accepted / duplicate / conflict
  Outbox->>DB: Update sync state
```

Order and outbox event commit atomically. Network is at-least-once;
business effect must be idempotent.

## Outbox

Fields: id, aggregate_type/id, event_type, payload_version, payload,
idempotency_key, created_at, attempt_count, next_attempt_at, status,
last_error.

## Reliability

UUID global IDs, unique idempotency key, cloud unique constraint, inbox
deduplication, exponential backoff with jitter, dead-letter/error state,
manual retry. Never silently discard failures.

## Conflict

Initial single-device scope: desktop owns local operational writes;
cloud accepts synced records; owner dashboard initially read-only. No
generic last-write-wins for invoice, payment, or stock. Conflicts
require review.

## UI status

Show online/offline, syncing, last success, pending count, failed count,
retry action, safe error detail.

## Reporting freshness

Cloud dashboard exposes last sync per device, last ingest time, pending
count when known, and warning for stale/incomplete data.

## Attachments

Store locally when offline; validate type/size; generate UUID names;
upload later; private storage; resumable/retry behavior. Never upload
executable files.

## VPS

Version sync contracts. VPS API must preserve idempotency,
authorization, and conflict semantics before cutover.
