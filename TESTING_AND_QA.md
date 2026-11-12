# Testing and QA

## Layers

Unit tests, SQLite integration tests, provider contract tests, desktop
E2E, web E2E, manual hardware tests, backup/recovery tests.

## Critical unit tests

Photocopy price by page/copy/size/color/duplex; laminating by
size/quantity; binding by type/options; banner area/minimum charge;
discount/rounding; payment balance; fulfillment aggregate; stock
validation; cost snapshots.

## Critical integration tests

1.  Mixed order: ATK + banner + photocopy + binding + laminating.
2.  Exactly one invoice.
3.  Multiple partial payments.
4.  Some items completed while banner is processing.
5.  Correct stock/material movements.
6.  Rollback on failure.
7.  Duplicate sync event.
8.  Offline order then app restart.
9.  Retry after reconnect.
10. Conflict handling.
11. Return/reversal.
12. Backup/restore.

## E2E cashier

Login, customer, add mixed items, confirm one invoice, accept DP, print,
update item status, add settlement, complete order correctly.

## E2E offline

Disable network, create order, restart app, verify local record,
reconnect, verify exactly one cloud record, verify dashboard freshness.

## Owner dashboard

Owner login, date filters, reports, order detail, pending sync
indicator, unauthorized role denied.

## Quality gates

Lint, typecheck, relevant tests, production build, security review, docs
update. Record exact command/output. Never claim tests pass without
running them.

## Hardware

Test actual scanner/printer models. A simulated print is not hardware
certification.
