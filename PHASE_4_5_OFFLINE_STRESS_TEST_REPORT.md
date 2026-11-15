# VYAPARA — Phase 4.5 Offline & Synchronization Stress Test Report

- **Date:** 2026-11-15
- **Branch:** `feature/phase-4.3-sync-engine`
- **Scope:** Phase 3 of the master execution prompt — offline & sync stress testing.
- **Verdict:** **PASS (with one documented architectural boundary, §8)** — no transaction loss, no duplicate financial posting, no cross-tenant leakage, no unrecoverable synchronization state.
- **Suite:** `apps/desktop/electron/main/sync/stress-4.5.test.ts` (18 scenarios, real `createSyncServer` over local HTTP; proxies for flaky/high-latency/mid-drain interruption; **no business logic mocked**).
- **Result:** **18/18 PASS**. Full test suite after this phase: **22 files / 236 tests, all green**.

## 1. Environment
- win32 (Windows 11), Node v24.18.0, Electron v45.3.1, better-sqlite3 13.1.1, vitest 5.1.0.
- Isolated environments only: `:memory:` SQLite + throwaway `--user-data-dir` profiles and tmp files (never the real app/production profile; no repo `data/` access).
- Device enrollment uses real server registration with `enrollmentSecret`; tokens issued by the server are used (no fabricated credentials).
- Each sale produces **2 outbox events** (`sale.created` + `inventory.movement.recorded`); **creating a product emits 1** `inventory.movement.recorded` (opening stock). All expectations are computed dynamically via `outboxTotal()` — no hardcoded counts.

## 2. Scenarios & Evidence (18 tests)

### Network resilience (7)
| # | Scenario | Result |
|---|---|---|
| 1 | Startup while **offline** proceeds offline; recovers & drains on reconnect (coordinator `start()`/`trigger()`, real creds) | PASS |
| 2 | Offline burst: **25 sales** drain completely on reconnect (single `runUploadOnce`, batch 100) | PASS |
| 3 | Server unavailable (`127.0.0.1:1`) → retryable failure; **all 5 pending events preserved**; recovery delivers all | PASS |
| 4 | Request timeout (1 ms client vs 2000 ms delay-proxy) → no acks; after recovery **exactly-once** delivery | PASS |
| 5 | High latency (150 ms proxy): batch of 21 events acknowledged in **166 ms** | PASS |
| 6 | Intermittent connectivity (proxy 503s first attempt): retryable failure; no server rows; after retry **all 7 delivered** | PASS |
| 7 | Application restart: `syncing` rows recovered to `pending` on reopen; full drain verified from disk | PASS |

### Synchronization integrity (7)
| # | Scenario | Result |
|---|---|---|
| 8 | Duplicate delivery is **idempotent** end-to-end (accepted → duplicate; server row count unchanged) | PASS |
| 9 | Partial batch failure: oversized event (70 KB > 64 KB limit) rejected as `PAYLOAD_TOO_LARGE` (**terminal, `dead`**); the rest acknowledged; sales flow intact | PASS |
| 10 | Download cursor resumes after **mid-drain interruption** (proxy fails page 2): first drain applies exactly page 1, resume delivers the rest, re-drain applies **zero** events; `not-a-cursor` not silently reset | PASS |
| 11 | Inbound events classified safely: applied once, duplicate → `ignored`, self-originated → `ignored`, corrupt schema → `quarantined` | PASS |
| 12 | Deferred (`DEFERRED_PHASE_4_4`) recovery across restart: event reprocessed & applied locally; no re-upload | PASS |
| 13 | Conflict engine at volume: 10 duplicate-event conflicts → all auto-resolved (`REJECT_DUPLICATE`); 5 financial conflicts → **all retained for manual review**; 3 master-data conflicts with newer remote timestamps → `AUTO_LATEST_TIMESTAMP` + auto-resolved; **org-A pending = 5, org-B = 0** | PASS |
| 14 | Endurance tiers **10 / 50 / 100 sales**: tier uploads in **5 / 39 / 84 ms**; all 321 events drained; outbox empty | PASS |

### Tenant & device security (4)
| # | Scenario | Result |
|---|---|---|
| 15 | Tenant isolation at volume: org-B device (claiming `organizationId: ORG_A`) receives **0** org-A events (scope from token binding, never client claim) | PASS |
| 16 | Revoked device token (self-revoke via `/v1/sync/devices/revoke`) → upload `authFailure`, **0 acks**, all 9 events preserved | PASS |
| 17 | Invalid token → rejected, no state mutation, server empty | PASS |
| 18 | Cross-tenant cursor tampering (forged base64 `{s,o:ORG_A}` on org-B device) → **rejected**, no state change | PASS |

## 3. Commands & Results
```bash
npx vitest run apps/desktop/electron/main/sync/stress-4.5.test.ts
# Test Files  1 passed (1) / Tests 18 passed (18)
npx vitest run                                   # full suite
# Test Files 22 passed (22) / Tests 236 passed (236)
```

## 4. Metrics captured
- `high_latency_batch_upload_ms`: **166 ms**
- `tier_upload` 10 → **5 ms**, 50 → **39 ms**, 100 → **84 ms**
- `conflicts_pending_orgA`: **5** (financial only)

## 5. Test-quality notes (tests corrected, assertions never weakened)
- Counting model **measured, not assumed**: product seeding emits one `inventory.movement.recorded` (`stock_in`); each sale emits two events. All expectations are computed (`outboxTotal`).
- `runUploadOnce` uploads only `uploadBatchSize` per call — endurance drains in rounds; expected ack counts adjusted accordingly.
- `createSyncCoordinator().trigger()` is a **silent no-op until `start()` is called** (`stopped` starts `true`); the offline-startup scenario now calls `start()` and `stop()`. (Engine API footgun; documented, not altered — outside the test's remit.)
- HTTP proxies count one attempt per batch, so "first attempt fails" uses `failFirst: 1`; mid-drain interruption uses a **live-mutable `failAfter: 1`** proxy that is healed in place.
- `sync_quarantine.event_id` FK → `sync_applied_events`; the deferred-recovery fixture now seeds the parent receipt first.
- No assertion was weakened; all 18 scenarios assert exact outcomes.

## 6. Cross-verification with runtime
Production-mode launch (isolated temp profile) ran the real app (main → preload → renderer → DB → login/dashboard) with **zero errors**; E2E (Playwright) passed **9/9** including setup → login → dashboard → POS navigation; login page renders the new `Logo_Primary_Concept.png`.

## 7. Security observations validated under stress
- Cross-tenant isolation holds at volume and even when the client lies about `organizationId` — the server scopes purely from the device→org binding.
- Cursor is bound to organization (`{s,o}` signed payload); forged cross-tenant cursors are rejected.
- Revoked tokens immediately block upload (fail-closed; no partial delivery).
- Duplicate event delivery is idempotent at every layer (transport ack dedupe → `sync_applied_events` receipts → `detected_duplicate` → `REJECT_DUPLICATE`).

## 8. Documented architectural boundary (not a test failure; owner decision required)
The Phase 4.2 server event log **never publishes `remoteVersion`** (no column, never selected, never returned). The fail-closed `MISSING_REMOTE_VERSION` rule in `inbound.ts` therefore quarantines **every real inbound event** (and cursors still advance, since quarantine counts as a receipt). Stress scenarios exercise cursor/dedupe/conflict paths by injecting events with `remoteVersion` present (the engine's contract). **Real inter-device sync remains effectively disabled until the server publishes per-aggregate versions** (new server migration + ingest/download changes) **or the owner explicitly authorizes the degraded-mode behavior as the interim contract.** This is the single blocking decision for Phase 4.6/4.5-production readiness; both artifacts (this file + `POST_4_4_ARCHITECTURE_RUNTIME_INVESTIGATION.md` §4.3/§10) record it.

## 9. Regression status
- No change to any remediation-area runtime logic (`inbound.ts`, conflict engine, store, transport, coordinator). One temporary outbound edit was reverted byte-exact (recorded in `POST_4_4_ARCHITECTURE_RUNTIME_INVESTIGATION.md`).
- Desktop unit suite: **217 → 236 passed**; E2E: 9/9; typechecks: clean; electron build: exit 0.

## 10. Verdict & next steps
**Phase 4.5 offline/sync stress testing: PASS**, with the §8 boundary as the only open architectural decision. Recommended next phases per master prompt: Phase 4 (business functional acceptance), Phase 5 (security & data-integrity audit), Phase 6 (backup/recovery) — none started; Phases 10–14 blocked on staging infrastructure and explicit production authorization.
