# ADR 006: Tenant-Scoped Sync Authorization and Cursor Binding (Phase 4.2.1)

- Status: Accepted (Phase 4.2.1 security hardening)
- Date: 2026-11-15

## Context
Phase 4.2 download returned events ordered by global `server_seq` without tenant/organization scoping, allowing any authenticated device to read all ingested events (cross-device/cross-tenant data exposure). The project had no explicit tenant ownership model.

## Decision
- Introduce the smallest safe explicit ownership model: `sync_organizations` and a mandatory `organization_id` binding on `sync_devices` and `sync_events` (and `sync_event_ack_log`). A device is enrolled into exactly one organization at registration; cross-organization rebinding is rejected. Existing data (dev/test) is backfilled to a documented default migrated organization during migration.
- Derive authorization scope exclusively from server-side bearer-token lookup to a trusted `(device_id, organization_id, status)` record. Client-supplied `deviceId`/query/body hints must not grant scope and are rejected on mismatch.
- Restrict download to `WHERE organization_id = <authenticated org> AND server_seq > <cursor.s> ORDER BY server_seq ASC` with limit+1 pagination.
- Bind cursors to organization by encoding `{s,o}`; reject cursors whose `o` does not match authenticated organization.
- Preserve idempotency `(device_id,event_id)/(device_id,idempotency_key)` semantics, per-request transactional durability-before-ack, and per-event outcomes.
- Revoke authorization requires admin token or same-device token; revoked/invalid tokens rejected.

## Assumptions
No production multi-tenant policy existed. This model enforces isolation boundaries but does not define org provisioning, membership, or administrative RBAC beyond minimal revoke controls.

## Consequences
- Closes cross-tenant download exposure and cursor-manipulation bypass within defined model.
- Clients must send `organizationId` at registration and handle updated token-renew/register/download response/behavior.
- Future multi-tenant business policy (org lifecycle, fine-grained roles, per-org enrollment secrets) requires explicit design and migration.
