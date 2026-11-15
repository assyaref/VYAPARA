# VYAPARA Central Sync API Contract (Phase 4.2.1, v1 hardened)

Base path: `/v1/sync`
Content-Type: `application/json; charset=utf-8` for requests/responses.
All error responses: `{ "ok": false, "error": { "code": string, "message": string, "details?": any } }`
All success responses: `{ "ok": true, "data": ... }`

## Security & tenant isolation (Phase 4.2.1)
- **Explicit ownership model:** every device is bound to exactly one `organizationId` at registration (trusted server-side association stored in `sync_devices.organization_id`). Events are stored with `sync_events.organization_id` derived from the authenticated device's organization (never from client payload claims).
- **Assumption (documented):** no prior production tenant model existed; Phase 4.2.1 introduces the smallest safe explicit model (single-organization-per-device) for data isolation. Multi-tenant business policies, org provisioning, and admin RBAC are not invented here.
- **Authorization source of truth:** device identity and tenant scope are derived **only** from server-side bearer-token lookup (`token_hash -> device + organization + status`). Client-supplied `deviceId`/query hints are never used to grant scope.
- Download scope is restricted to the authenticated device's `organization_id` via server-side query predicate.
- Client-provided `deviceId` hints on download/upload are rejected when they do not match the authenticated device (`403 FORBIDDEN` / `403 DEVICE_MISMATCH`).
- Cursors are opaque and tenant-bound (`{s: lastServerSeq, o: organizationId}` encoded). Cursors whose embedded organization does not match the authenticated organization are rejected (`400 INVALID_CURSOR`) to prevent cursor manipulation/bypass.
- Device auth remains independent of desktop user sessions. Tokens are hashed at rest, expiring, renewable, revocable.
- Revoke requires `Bearer <adminToken>` or a valid bearer token belonging to the **same** target device.
- TLS required in deployment; request/batch/payload limits enforced.

## Device registration
`POST /v1/sync/devices/register`
Auth: none (server-configured enrollment secret required).
Request:
```json
{ "deviceId": "uuid", "organizationId": "uuid", "enrollmentSecret": "string(>=16)", "deviceName?": "string" }
```
Response 201:
```json
{ "ok": true, "data": { "deviceId":"uuid","organizationId":"uuid","deviceToken":"...","tokenExpiresAt":"ISO-8601","status":"active" } }
```
Errors: `401 AUTH_INVALID`, `403 DEVICE_REVOKED|DEVICE_ORG_MISMATCH`, `400 VALIDATION`.
Notes: re-registration for an existing active/inactive device is allowed only within the same bound organization (token rotation); cross-organization rebinding is rejected.

## Device token renewal
`POST /v1/sync/devices/token/renew`
Auth: none in header (current token in body, validated server-side). `deviceId` in body is optional and, if provided, must match token-derived identity or request is rejected.
Request: `{ "deviceId?":"uuid", "deviceToken":"..." }`
Response 200: `{ "ok":true, "data": { "deviceId":"uuid","organizationId":"uuid","deviceToken":"...","tokenExpiresAt":"ISO-8601" } }`
Errors: `401 AUTH_INVALID|TOKEN_EXPIRED`, `403 DEVICE_REVOKED|DEVICE_INACTIVE|DEVICE_MISMATCH`.

## Device revoke/deactivate
`POST /v1/sync/devices/revoke`
Auth: `Bearer <adminToken>` OR `Bearer <deviceToken>` of the same target device only.
Request: `{ "deviceId":"uuid", "reason?":"string" }`
Response 200: `{ "ok":true, "data": { "deviceId":"uuid","status":"revoked" } }`
Errors: `401 AUTH_REQUIRED|AUTH_INVALID`, `403 FORBIDDEN|DEVICE_REVOKED`, `404 NOT_FOUND`.

## Event batch upload
`POST /v1/sync/events/upload`
Auth: `Bearer <deviceToken>`.
Authorization: authenticated device identity resolved from token; `body.deviceId` must equal authenticated device (else `403 DEVICE_MISMATCH`); each event `deviceId` must equal authenticated device. Stored `organization_id` is taken from authenticated device, not from request.
Request/response shape unchanged from Phase 4.2 aside from stricter authz binding:
```json
{ "deviceId":"uuid", "events":[{ "eventId":"uuid","deviceId":"uuid","idempotencyKey":"string","eventType":"...","aggregateType":"string","aggregateId":"string","schemaVersion":1,"createdAt":"ISO-8601","payload":{} }] }
```
Per-event outcomes and durability guarantees unchanged: `accepted|duplicate|conflict|rejected`; request processed in DB transaction, durable before 200; storage failure rolls back with no ack.
Errors: `401 AUTH_*`, `403 DEVICE_*|DEVICE_MISMATCH`, `400 VALIDATION/BATCH_TOO_LARGE`, `413 PAYLOAD_TOO_LARGE`.

## Incremental event download
`GET /v1/sync/events/download?cursor=<opaque?>&limit=<1..200>&deviceId=<uuid?>`
Auth: `Bearer <deviceToken>`.
Authorization/scope: returns only events where `sync_events.organization_id = authenticatedDevice.organization_id` (server-derived). `deviceId` query param is optional non-authoritative hint and is rejected with `403 FORBIDDEN` if not equal to authenticated device. **No cross-tenant or cross-device-override access.**
Response 200:
```json
{ "ok": true, "data": { "events":[{ "serverSeq":1, "eventId":"...","deviceId":"...","idempotencyKey":"...","eventType":"...","aggregateType":"...","aggregateId":"...","schemaVersion":1,"createdAt":"...","payload":{},"receivedAt":"..." }], "nextCursor":"opaque|null", "hasMore":false } }
```
Cursor semantics (tenant-safe):
- Opaque base64url token encoding `{s: lastServerSeq, o: organizationId}`.
- `s` is the last delivered global `server_seq` within the authorized organization result stream; query filters by `organization_id = authenticated org AND server_seq > s` ordered by `server_seq ASC` (stable, deterministic, resumable).
- Cursor's embedded `o` must match authenticated organization or request is rejected (`400 INVALID_CURSOR`).
- Repeated requests with same cursor are safe/read-only. Client persists cursor only after durable local apply.

Errors: `400 INVALID_CURSOR|VALIDATION`, `401 AUTH_*`, `403 DEVICE_*|FORBIDDEN`.

## Health
`GET /v1/sync/health` (no auth).

## Compatibility
- API path v1, event `schemaVersion` 1 supported. Additive evolution preferred; breaking changes require explicit versioning.
