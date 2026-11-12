# Roadmap — VYAPARA

| Phase | Scope                                        |
|-------|----------------------------------------------|
| 0     | Workspace and asset audit                    |
| 1     | Electron, React, secure IPC foundation       |
| 2     | SQLite, Drizzle, migrations                  |
| 3     | Login, users, RBAC, settings                 |
| 4     | Master data products/services                |
| 5     | Inventory and stock ledger                   |
| 6     | Unified POS, invoice, payments               |
| 7     | Barcode and printer integration              |
| 8     | Layanan Dokumen: fotokopi, laminating, jilid |
| 9     | Printing/banner workflow                     |
| 10    | Procurement and suppliers                    |
| 11    | Finance and reports                          |
| 12    | Supabase cloud foundation                    |
| 13    | Offline sync engine                          |
| 14    | Next.js Owner Dashboard                      |
| 15    | Security, backup, restore, performance       |
| 16    | Windows installer and release                |

## Phase gates

Each phase requires plan, implementation, migrations if any, lint,
typecheck, unit/integration tests, build, documentation update, and
owner review.

## Phase 0

Inspect workspace, assets, Git, package files, and existing source. Do
not alter existing user work. Produce asset inventory, risk register,
decisions, and Phase 1 plan.

## Phase 6 acceptance

One mixed order; one invoice; multiple payments; correct balance; atomic
stock/payment/order write; receipt print; return/reversal.

## Phase 13 acceptance

Outbox survives restart; retry idempotent; no duplicate transaction;
conflict queue; pending/error status; sync freshness.

## Phase 14 acceptance

Owner reports on desktop/mobile; date filters; secure auth; freshness
and pending sync indicators.

## Phase report

List completed scope, changed files, migrations, exact commands/results,
known limitations, risks, and next phase.
