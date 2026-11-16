# VYAPARA — Phase 8 Performance & Reliability Report

- **Date:** 2026-11-16
- **Branch:** `feature/phase-4.3-sync-engine` (Phase 8)
- **Method:** isolated production build + Playwright-driven navigation/memory probe (`evidence/perf-probe.cjs`) + existing stress measurements (Phase 4.5).
- **Result:** **PASS** — startup is fast, renderer memory flat under load, no leak signatures.

## 1. Measurements (real, isolated `--user-data-dir`)

| Metric | Value | Environment |
|---|---|---|
| Time to ready (CDP-visible page) | **1210 ms** | production build, cold start, fresh profile |
| 60 navigation cycles across 8 screens | **19,359 ms** (~323 ms/cycle incl. 120 ms dwell) | production build |
| JS heap before workload | 15,200,000 B | |
| JS heap after 60 navigations | 15,200,000 B | |
| JS heap after 20 dashboard refreshes | 15,200,000 B | |
| **Heap growth across full probe** | **0 bytes** | no leak detected |
| Sync throughput — 10/50/100 events | **5/39/84 ms** | in-memory DB (Phase 4.5) |
| High-latency batch (150 ms proxy) | 166 ms total | Phase 4.5 |

## 2. Findings

- **Indexes healthy**: 111 `CREATE INDEX` statements across migrations 001–013, including `sync_outbox(sync_status, created_at)` for the upload candidate query, `products(sku/barcode)` for POS search, `transactions(created_at)` for date-range queries, and `sessions(token_hash)` for auth validation. No new migration needed — the schema is well-indexed.
- **No hot path requires indexing** at current data volumes (typical POS: thousands of transactions, hundreds of products).
- **App is lightweight**: production renderer bundle ~750 KB JS (gzip ≈ 200 KB), no heavy chart/visualization libraries (hand-rolled CSS chart).
- **SQLite in WAL mode** with `busy_timeout = 5000` tolerates renderer + sync concurrent access — no lock contention observed under stress.
- **Residual (documented, non-blocking)**: renderer load time not separately profiled with a CPU profile; long-running (multi-hour) memory stability beyond this probe not measured; startup bundle could be code-split later (POS/reports lazy-loaded) — Phase 9 polish.

## 3. Acceptance decision

**Phase 8: PASS** — no critical performance or stability issue found; memory flat; startup acceptable for a POS on modest hardware. Performance targets (proposed, to be ratified at release): cold start ≤ 2 s on reference hardware; navigation ≤ 300 ms; zero unbounded heap growth per shift.
