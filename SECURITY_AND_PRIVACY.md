# Security and Privacy

## Electron

`contextIsolation: true`, `nodeIntegration: false`, sandbox where
compatible, typed IPC allowlist, Zod validation, CSP, navigation
restrictions, safe external links, patched dependencies. No arbitrary
shell or generic filesystem bridge.

## Secrets

Never commit `.env`. Never ship Supabase service-role key. Client public
key is not authorization; use Auth/RLS. Server secrets stay server-side.
Provide `.env.example` placeholders only.

## Authorization

Enforce permissions in trusted process/backend, not only UI. Least
privilege. Protect owner reports. Audit discounts, returns, stock
adjustments, payments, role changes, backup/restore, conflict
resolution.

## Local data

Database in user-data folder. Protect backups. Avoid logging customer
data, credentials, and payment secrets. Validate restore before
replacing active data.

## Uploads

Allowlist file types, validate signatures where practical, enforce size,
generate storage names, prevent path traversal, keep private, never
trust user path.

## Privacy

Collect only necessary business data. Document export, retention, and
deletion. No analytics sharing without explicit product decision.
