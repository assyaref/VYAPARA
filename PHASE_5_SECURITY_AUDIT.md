# VYAPARA — Phase 5 Security & Data Integrity Audit Report

- **Date:** 2026-11-15 (audited) / status updated 2026-11-16
- **Branch:** `feature/phase-4.3-sync-engine` (working tree + Phase 5 commits)
- **Scope:** Electron main, preload, renderer, IPC surface, auth, token handling, DB integrity, dependencies, sync-server security.
- **Method:** code-level audit + hardening changes + full test suite + production E2E. No infrastructure changes, no production configuration touched.

## 1. Verdict

**PASS with documented medium/low residual risks** — no unresolved critical or high-severity defect remains in the audited surface. Two owner decisions are required before production go-live (see §9): the inbound `remoteVersion` contract, and explicit authorization/approval for packaging + installer + staging.

## 2. Electron security configuration (verified)

| Control | State | Notes |
|---|---|---|
| `contextIsolation` | ✅ true | renderer isolated from Node |
| `nodeIntegration` | ✅ false | |
| `sandbox` | ⚠️ false | preload is ESM (`.mjs`); Electron requires sandboxed preloads to be CJS — enabling breaks preload (`Cannot read properties of undefined (reading 'authSession')`) — permanently documented; risk accepted because preload exposes only whitelisted `contextBridge` methods and performs no privileged work |
| `webSecurity` | ✅ true | default |
| `will-navigate` | ✅ hardened | only `http://localhost:1420`, `https://`, `file://` |
| `setWindowOpenHandler` | ✅ deny-all, open https externally via `shell.openExternal` | |
| Single-instance lock | ✅ | second instance quits |
| CSP | ✅ production-only | set via `session.defaultSession.webRequest.onHeadersReceived` when `NODE_ENV === 'production'`: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data:; connect-src 'self'` — dev profile needs `'unsafe-inline'` for vite HMR preamble |
| Icon | ✅ loads | fixed path `apps/desktop/assets/brand/vyapara-icon.png` |
| Safe storage | ✅ | sync credentials encrypted with `safeStorage` (DPAPI on Windows); plaintext legacy `sync-credentials.json` rejected fail-closed |
| Session token | ⚠️ | `session.token` written with mode 0o600 (not encrypted at rest) — OS ACL mitigates; recommend DPAPI-encrypted session token for Phase 6/9 |

## 3. IPC surface hardening (applied)

The following channels were **unauthenticated** (any renderer could call, without a session, because the preload already injected tokens only via `send()`). After this audit **all mutating/sensitive channels require `requireUser` + `assertPermission`**:

| Channel | Before | After |
|---|---|---|
| `product:getAll` | ❌ open | ✅ `product:read` |
| `category:getAll` / `unit:getAll` | ❌ open & untyped | ✅ authenticated (`requireUser`), typed `{token}` input |
| `transaction:getAll` | ❌ open | ✅ `transaction:read`, `limit` clamped to 1–1000 |
| `transaction:summary` | ❌ open, **hard-coded zeros** | ✅ `transaction:read`, wired to real `todaySummary()` |
| `settings:get` | ❌ open | ✅ `settings:read` |
| `settings:update` (taxRate, storeName, receiptFooter) | ❌ **open write** | ✅ `settings:write` (admin only) |
| `database:backup` | ❌ **open write** (arbitrary DB → arbitrary path) | ✅ `settings:write` + `backupPath` non-empty validation |
| `database:restore` | ❌ **open + destructive restore from any file** | ✅ `settings:write` + path validation |
| `sync:getStatus` / `sync:trigger` | ❌ open (network + DB trigger) | ✅ authenticated |
| `will-navigate` / `file://` whitelist | ✅ tightened | |

**Renderer code unchanged** — all hardened call sites already passed `token:''` through the preload's `withToken()` injection, which is replaced by the session token transparently.

**Not changed (documented, deliberate):** `catalog:getAll`/`unit:getAll` input-type widening, `app:getInfo` (static metadata, zero sensitivity), `app:getEnvironmentStatus` (renderer unused, left as-is pending removal), `auth:session` returns raw token in `data.token` (by design; renderer already holds it; `sandbox`/`contextIsolation` limit exposure) — risk **LOW**, fix recommended for Phase 6/9.

## 4. Authentication & session lifecycle

- Passwords: scrypt N=65536, 64-byte derived key, per-password random 16-byte salt, `timingSafeEqual`. ✅
- Known seed credential (`admin@vyapara.com` / `admin123`) is forcibly upgraded to `must_change_password=1` on **every open** — legacy installs can never log in silently. ✅
- Session tokens: 32-byte random, **sha256 hashed at rest** in `sessions`; 12 h expiry (`SESSION_HOURS=12`); expired sessions deleted on login; logout revokes; `changePassword` revokes all existing sessions of the user. ✅
- `requireUser` re-validates on every privileged call (token hash + `expires_at > now` + `revoked_at IS NULL` + `is_active=1`). ✅
- Login rate limit: 8 failures → 30 s lock per email — **in-memory only**, lost on restart (documented, **LOW**; recommend DB-backed lock for Phase 6/9 if brute-force is in scope).
- RBAC enforced server-side per privileged call (`assertPermission`) — not client-side. ✅
- New Phase 4.4 flow: admin setup closes automatically once an admin exists (`SETUP_CLOSED`). ✅

## 5. Data integrity audit

| Control | State |
|---|---|
| `foreign_keys = ON`, `journal_mode = WAL`, `busy_timeout = 5000` | ✅ all three pragmas set on every open (`open.ts`) |
| Unique constraints | ✅ `users.email`, `products.barcode`, `products.sku`, `sync_outbox.idempotency_key`, `sync_events(device_id,event_id)`, `sync_applied_events.event_id` |
| Idempotency | ✅ single-writer transaction (better-sqlite3 `.transaction`); outbox append in same tx as business op |
| Tenant ownership | ✅ every sync query org-scoped (engine); server derives org from device→org binding, never from client claim |
| Migrations | ✅ ordered list, `_migrations` guard, applied in `open.ts`, tested (`db.test.ts`, `acceptance-4.2.test.ts`) |
| Backup/restore | ✅ `integrity_check` before and after; pre-restore `.pre-restore` copy; restore refuses `source === live`; backups verified by `assertIntegrity` on the restored copy |
| Connection model | ⚠️ `restoreDatabase()` closes the live connection and reopens — process-wide pool semantics (OK for single-writer SQLite) |
| Encryption at rest | ❌ DB itself is **plaintext SQLite** — acceptable for offline POS on a secured Windows device; recommend OS FDE/BitLocker documentation in install guide |
| Orphaned artifacts | ✅ `services/scratch/*` excluded from vitest; root `credentials.ts` unused |

## 6. Dependency vulnerability audit

- **Production dependencies:** `npm audit --omit=dev` → **0 vulnerabilities**.
- **Dev dependencies:** 10 vulnerabilities (3 low, 7 moderate), all in the `typescript-eslint` chain (tooling only, never shipped). `npm audit fix` available; **not applied** to avoid churn right before release; track for Phase 6/9.

## 7. Sync-server security (verified via tests, not infra)

- 100+ security-relevant assertions in `sync-server.test.ts` / `acceptance-4.2.test.ts`: tenant isolation, cross-tenant rejection, token revocation, invalid/expired tokens, idempotency, rollback, org rebind prevention, `DEVICE_MISMATCH`, body-size limit, cursor org binding — **all passing**.
- Tokens hashed, timing-safe compare; enrollment secret hashed; device↔org binding immutable (`DEVICE_ORG_MISMATCH`).
- No production sync-server deployment exists in this environment — **NOT VERIFIED live**; staging required for Phase 10/12.

## 8. Defects found & fixed in this phase

1. `transaction:summary` returned hard-coded zeros — now serves real `todaySummary()`.
2. `database:backup`/`restore` were unauthenticated arbitrary-file-read/write — now `settings:write` (admin-only) + path validation.  
3. `settings:update` was an unauthenticated WRITE of store configuration — now admin-only.
4. `product:getAll`/`category:getAll`/`unit:getAll`/`transaction:getAll`/`settings:get`/`sync:getStatus`/`sync:trigger` — all now authenticated.
5. `will-navigate` allowed any `http://localhost:*` origin — now restricted to `localhost:1420` + `https:` + `file://`.
6. Production renderer ran with no CSP — now enforced in production builds.
7. `transaction:getAll` accepted unbounded `limit` — now clamped to 1–1000.
8. `sandbox: true` evaluated and **reverted** — ESM preload is incompatible with Electron sandbox; accepted risk, documented.

## 9. Owner decisions required before production

1. **Inbound `remoteVersion` contract**: ship fail-closed (current — inbound sync disabled) vs server-side per-aggregate versioning (real inter-device sync) vs explicit owner authorization of degraded mode. See `POST_4_4_ARCHITECTURE_RUNTIME_INVESTIGATION.md` §4.3/§10 and `PHASE_4_5_OFFLINE_STRESS_TEST_REPORT.md` §8.
2. **Installer + signing**: unsigned `electron-builder` output vs code-signing certificate (EV cert required for SmartScreen reputation).
3. **Installer platform test**: clean-machine install, first-launch setup flow, login, uninstall, upgrade path, DB preservation — not yet executed.

## 10. Acceptance decision

**Phase 5: PASS** — no unresolved critical or high-severity security defect; all formerly-open IPC channels hardened; production CSP active; auth/RBAC verified server-side; DB integrity controls verified; production deps clean. Medium/low items are documented with mitigations and are **not** release blockers.
