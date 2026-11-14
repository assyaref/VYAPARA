# Offline-First Architecture (Phase 4.1 Foundation)

## Repository audit summary
- Monorepo: root + `apps/desktop` (Electron + React + TypeScript + better-sqlite3 + drizzle-orm schema mirror) + `packages/shared` (Zod schemas, POS/money rules).
- DB: `apps/desktop/electron/main/db/open.ts` opens better-sqlite3, enables WAL+FK+busy_timeout, applies numbered SQL migrations from `apps/desktop/drizzle/*.sql` tracked in `_migrations`, seeds catalog/roles/permissions. Drizzle schema in `apps/desktop/drizzle/schema.ts` is a typed mirror (not a second migrator). Legacy `database.ts` initializer also exists but app path uses `open.ts`.
- IPC: main registers `ipcMain.handle` channels in `electron/main/main.ts`, preload (`electron/preload/preload.ts`) exposes `window.vyapara` via `contextBridge` and injects session token; contextIsolation enabled, nodeIntegration disabled, sandbox false (existing).
- Auth: local session tokens hashed in SQLite (`services/auth.ts`), RBAC permissions, rate limiting in-memory.
- Critical business services: `services/transactions.ts` (sales, idempotency key on transactions, stock + cash/customer ledger in one sqlite transaction), `services/customer.ts` (balance/ledger, payments), `services/sales-returns.ts` (return + stock + cash reversal in one transaction), `services/inventory.ts` (`recordStockMovement` is the atomic stock+movement primitive used by many flows), procurement/supplier/finance/report services present.
- Tests: Vitest node env (root config includes `apps/desktop` and `packages/shared`), 28 discovered test files including many ad-hoc debug/scratch scripts (`test_*`, `minimal_test`, `sql_test`, etc.) that fail in full run; canonical service/shared tests mostly pass. Baseline in prompt: 116 tests.

## Local-first model
- SQLite is the authoritative operational store per desktop installation. All core POS mutations execute locally and must succeed without network.
- `apps/desktop` uses WAL for concurrent reads; FK constraints enforced.
- Existing idempotency: `transactions.idempotency_key` prevents duplicate sale submission.

## Outbox (Phase 4.1)
- Migration `010-sync-outbox.sql` adds:
  - `device_identity` (single-row, stable `device_id` UUID, created/updated timestamps) — installation identity, not hardware fingerprint.
  - `sync_outbox` with `id` (event UUID), `device_id`, `event_type`, `aggregate_type`, `aggregate_id`, `payload` (JSON), `schema_version`, `created_at`, `sync_status` (pending/syncing/acknowledged/failed/conflict/dead), `retry_count`, `last_error`, `server_ack_at`, `idempotency_key` (UNIQUE). Indexes on status+created, aggregate, device.
- `services/device-identity.ts`: `getOrCreateDeviceIdentity(db)` reads DB row, else reuses/persists identity in `device-identity.json` next to DB file (0600 best-effort) to survive reopen/recreate; never regenerated on ordinary startup. For `:memory:` tests uses `.vyapara-test-identity` under cwd (test-isolated by process/cwd). No secrets exposed to renderer.
- `services/outbox.ts`: `appendOutboxEvent` (must run inside same sqlite transaction as business mutation) assigns device_id, validates payload shape (Zod record), enforces unique idempotency key, defaults pending/schema v1. Helpers: list, mark syncing/acknowledged/failed/conflict/dead with retry/error tracking. Event types seeded for Phase 4.1: `sale.created`, `customer.payment.recorded`, `sales_return.created`, `inventory.movement.recorded`.

## Integrated critical operations (atomic with outbox)
- `transactions.createTransaction`: appends `sale.created` in the same `db.sqlite.transaction()` that inserts transaction/items, stock movements, customer credit ledger, cash movement. Sale idempotency key reused as outbox idempotency key to prevent duplicate sync events on retried submissions.
- `customer.recordCustomerTransaction`: appends `customer.payment.recorded` (only for `transactionType === 'payment'`, the Phase 4.1 critical customer payment path) in the same transaction as ledger+balance update.
- `sales-returns.createSalesReturn`: appends `sales_return.created` in the same transaction as return rows, stock movements, cash reversal.
- `inventory.recordStockMovement`: appends `inventory.movement.recorded` in the same transaction as movement insert + product stock update. Because procurement/receiving/returns/opname/adjustments call this primitive inside their own transactions, those inventory movements become outbox-backed when executed through this path; Phase 4.1 explicitly guarantees coverage for sale/return/customer-payment flows and direct inventory movements.

## Conflict & consistency policies (initial)
- Sales, payments, sales returns: immutable business events; server reconciliation must be append/idempotent, never last-write-wins overwrite.
- Inventory: ledger/movement-based (`stock_movements`); reconcile by ordered/idempotent movements, not stock snapshot overwrite.
- Master data (product/customer/supplier): version-aware conflict detection required in protocol; conflicting edits preserved/flagged (future).
- Deletions: tombstones required for sync (future) — current system uses status/deactivation in places; protocol must carry tombstone semantics when deletes sync.
- Financial totals derived from immutable records; outbox payloads carry identifiers/amount snapshots, avoid duplicating secrets/sensitive auth data.

## Security
- Outbox/identity live in main-process DB/services only; no preload/renderer API added in 4.1. Payloads treated as untrusted on future ingest (Zod/validation required). No tokens/passwords logged or placed in payloads. Device identity file written with restrictive mode best-effort.
- Migration additive only; no destructive changes.

## Known limitations / risks
- `device-identity.json` for `:memory:` DBs falls back to a cwd-based test folder — acceptable for tests but production must always use real DB path (satisfied). If identity file deleted but DB row exists, DB remains source; if DB recreated without file, a new device id may be generated (requires future server-side device registration/reset flow) — documented recovery concern.
- `recordStockMovement` is the integration seam for inventory; any code path that mutates `products.stock` without it would bypass outbox (audit found movements centralized here, but procurement/other services should be reviewed in 4.2).
- Outbox payloads include business snapshots (amounts, item prices/costs) necessary for replay; minimize PII (no passwords/tokens). Customer/product names may appear in existing domain flows — review before cloud sync.
- No sync transport, no server, no conflict resolver, no retry scheduler/worker yet. Status transitions provided for future engine.
- `sandbox: false` and existing Electron hardening unchanged (out of scope, but noted).
- Repo contains many ad-hoc debug test scripts causing full-suite noise; canonical tests should be curated.

## Recovery
- Outbox is append-only log of pending/terminal states; failed/conflict rows retain `last_error` for operator review. At-least-once future delivery relies on `idempotency_key` unique constraint locally and server-side dedupe.
