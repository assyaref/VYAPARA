# ADR 002: Stable Device Identity

- Status: Accepted (Phase 4.1 foundation)
- Date: 2026-11-14

## Context
Multi-device sync requires attributing events to a specific installation without depending on volatile hardware fingerprints or regenerating identity on restart.

## Decision
Persist a UUID `device_id` in `device_identity` (single-row) and mirror it in a local sidecar file (`device-identity.json`) beside the database. `getOrCreateDeviceIdentity` returns the DB value when present, otherwise reuses/creates a persisted UUID and stores it; never regenerates on ordinary startup. No secrets in renderer.

## Rationale
- Stable, non-hardware identifier suitable for server device registration/auth binding.
- Survives app restart and supports recovery when DB row must be rehydrated from sidecar.
- Avoids privacy/volatility issues of hardware fingerprints.

## Consequences
- If both DB and sidecar are lost, a new identity is created (server must handle re-enrollment/reset — future). File permissions best-effort.
- Production enrollment/credential issuance and revocation are future work.
