# VYAPARA — Phase 10 Central Sync Server Production Readiness

- **Status:** BLOCKED — no staging or production infrastructure exists for the sync server. Nothing may be deployed without owner authorization.
- **Date:** 2026-11-16

## 1. What exists (verified)

- Sync server (`apps/sync-server`): routes `/v1/sync/devices/{register,token/renew,revoke}`, `/v1/sync/events/{upload,download}`.
- Token auth: device tokens hashed (sha256) + timing-safe compare; enrollment secret hashed; org binding immutable (`DEVICE_ORG_MISMATCH`); `DEVICE_MISMATCH` on upload body.
- Tenant isolation: per-organization `server_seq`, org-scoped cursor (`{s,o}`); cross-tenant claims ignored; forged cursor rejected; revoke/expiry/invalid-token covered by tests.
- Ingest: transactional, idempotent (`UNIQUE(device_id,event_id)`, `UNIQUE(device_id,idempotency_key)`), per-event acks, `acceptance-4.2.test.ts` + `sync-server.test.ts` verify security contract (all pass).
- Migrations 001 (core) + 002 (tenant isolation); `data/` directory used at runtime (`SYNC_DB_PATH`).
- Rate limiting: none on HTTP routes (enrollment secret brute force possible in theory — mitigate at edge/proxy or add limiter before exposure).
- **No health endpoint, no TLS, no monitoring, no logging framework, no backup job, no resource/usage limits.**

## 2. What production readiness requires (blocked)

1. Host with TLS termination (or cert-manager/reverse proxy in front of the node service).
2. Secret management: `SYNC_ENROLLMENT_SECRET` (≥16 chars), `SYNC_ADMIN_TOKEN` — never in repo; env-injected at deploy time.
3. **Security gap:** no rate limit on `/register` (brute-force of enrollment secret). Fix before internet exposure: add per-IP limiter (e.g., 5 register/minute) + edge WAF rule.
4. Health check endpoint `/v1/sync/health` returning db+uptime (required for load balancer/orchestration).
5. Logging: structured JSON (request id, deviceId, orgId, event counts) → stdout → log aggregation; error alerting on 5xx.
6. Database: `data/sync-server.db` on persistent volume; scheduled `PRAGMA integrity_check` + backup (e.g., daily, keep 14 days) + documented restore drill.
7. Resource limits: container CPU/memory; body size cap already 1 MB; event count cap 100/batch; SQLite WAL fine for single-node.
8. Staging environment first: deploy to staging, run acceptance-4.2 + 4.5 stress suites against it (`SYNC_DB_PATH` isolated), only then production.

## 3. Required environment inventory (to be filled at deployment)

```
SYNC_DB_PATH=<persistent-path>/sync-server.db   # default ./data/sync-server.db
SYNC_ENROLLMENT_SECRET=<min 16 chars, random>   # generate: openssl rand -hex 32
SYNC_ADMIN_TOKEN=<optional, for admin revocation>
PORT=8787
```

## 4. Verdict

**BLOCKED.** Local development sync-server is functional and security-tested (257 tests green incl. tenant isolation), but production readiness requires an assigned host, secrets, TLS, health endpoint, and a rate limiter — and staging acceptance (Phase 12) cannot be executed without infrastructure.
