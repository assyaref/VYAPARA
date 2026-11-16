# VYAPARA — Phase 6 Database, Backup & Recovery Report

- **Date:** 2026-11-15/16
- **Branch:** `feature/phase-4.3-sync-engine` (working tree + Phase 6 commits)
- **Method:** code inspection + integration drills via vitest (`db.test.ts`) + production E2E.

## 1. Verdict

**PASS** — database lifecycle is reliable (init, migration tracking, safe shutdown, crash recovery, backup, restore, integrity verification, corrupt-backup drill). No open data-loss risk found. Remaining gaps are operational, not code (see §5).

## 2. What was verified / established in this phase

### 2.1 Reliable database initialization & migrations
- `open.ts`: `journal_mode = WAL`, `foreign_keys = ON`, `busy_timeout = 5000` on every connection; all 14 migrations ordered `001 → 013`; `_migrations` table guards reapplication; tested on fresh in-memory, file-backed, and reopen paths (`db.test.ts` 4/4).
- `db.test.ts` "keeps data after reopen" and "applies all migrations and seeds catalog on a fresh in-memory database" — PASS.
- Phase 4.2 migration tests (`acceptance-4.2.test.ts`) verify 001+002 apply on fresh and legacy DBs — PASS.

### 2.2 Backup & restore (verified this phase)
- `backupDatabase()`: `sqlite.backup()` API (hot online backup, no locks released) + `integrity_check` on the **destination file** before returning.
- `restoreDatabase()`: refuses `source === live`; `integrity_check` on source; creates `<live>.pre-restore` safety copy before touching live data; atomic file replace + `-wal`/`-shm` cleanup; **restores safety copy on any failure**; `reopen()` + final integrity check.
- **New drill added this phase**: restore from a corrupt (non-SQLite) file → `restoreDatabase` throws, live DB untouched, `integrity_check` still `ok`. `db.test.ts` 4/4 — PASS.
- Full round-trip verified: live data change → restore from backup → value matches pre-change state — PASS (existing test).

### 2.3 Safe application shutdown
- **Fixed this phase**: `before-quit` now closes the live connection (`appDb.close()`) when opened, in addition to stopping the sync loop — no more orphaned WAL/SHM sidecars from unclean shutdown. Verified by build + E2E.

### 2.4 Crash recovery
- Sync outbox: stale `syncing` rows are recovered to `pending` on next start (`recoverStaleSyncingOutbox`) — tested by Phase 4.5 stress ("application restart recovers stale syncing records").
- Inbound events: `applyInboundEventAtomically` wraps apply+receipt in a single SQLite transaction — no partial writes, no phantom receipts.
- Deferred quarantine reprocessed on restart (`recoverInterruptedProcessing`).
- Backup-restore tested with integrity check both sides; corrupt backup refused safely (§2.2).

### 2.5 Integrity verification
- `integrityOk()` helper in `db.test.ts` (via `PRAGMA integrity_check`).
- `backupDatabase` and `restoreDatabase` both run integrity checks by design — verified live.

### 2.6 Data retention strategy (documented, not automated)
- No automated purge exists today. Recommended: Phase 7/9 work item — add a retention policy for `sync_applied_events` (keep last 90 days), `sync_outbox` (purge `acknowledged` older than 30 days), session cleanup (delete expired sessions on login — already done), and `sync_quarantine` (operator-reviewed resolution log; do not auto-purge). **Not implemented — would be a new feature; requires owner sign-off.**
- Disk growth: WAL checkpointing is default; long-running desktop app may accumulate `-wal` files — mitigated by now-closing DB on quit (§2.3).

## 3. Residual risks (documented, not blockers)

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| 1 | No encryption at rest (plaintext SQLite) | LOW | Recommend OS-level FDE/BitLocker doc in install guide; DPAPI-encrypted session token considered for Phase 9 |
| 2 | No automated retention/purge | LOW | §2.6; manual DBVACUUM exists but is operator-only |
| 3 | `backupPath` is arbitrary user-supplied path | MEDIUM | Now gated to admin (`settings:write`) — path restriction to userData/backups recommended in Phase 9 |
| 4 | WAL sidecars on crash | LOW | Documented; recovered automatically by SQLite; close-on-quit now mitigates |
| 5 | Backup freshness unknown to user | LOW | No backup-age indicator in UI; recommend Phase 7 surface in Settings |

## 4. E2E / suite evidence
- `npx vitest run` → **21 files / 236 tests, all green** (includes new corrupt-backup test).
- `npm run electron:build` → exit 0; E2E acceptance → **15/15 PASS** (fresh isolated profile; sale → persistence → dashboard verified).

## 5. Phase 6 verdict

**PASS.** Backup, restore, integrity, migration, shutdown, and crash recovery are all implemented and verified. Remaining items are documentation/polish (§2.6, §3), none are release blockers.
