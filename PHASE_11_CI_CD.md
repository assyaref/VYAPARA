# VYAPARA — Phase 11 CI/CD & Release Automation

- **Status:** PARTIAL — CI workflow added and ready; release automation intentionally left manual (code signing + clean install test pending).
- **Date:** 2026-11-16

## 1. Added

`.github/workflows/ci.yml` — verifies on push/PR to `main` and `feature/**` (Windows runner):

1. Checkout (`actions/checkout@v4`)
2. Node 24 (`actions/setup-node@v4`, npm cache)
3. `npm ci` (root) + `npm ci --prefix apps/desktop`
4. TypeScript: shared, desktop, root, electron (all four project configs)
5. `npm test` — full suite (236 tests)
6. `npm run electron:build` — production main/preload/renderer build

No secrets. No deploy steps. Release packaging intentionally NOT in CI yet.

## 2. Not automated (by decision)

- Installer build (`electron-builder`) + signing — blocked on certificate + clean install test (Phase 9).
- Release tagging/publishing — requires explicit owner approval.
- Artifact checksums/provenance — generated only after real installer artifact exists.
- Deployment — Phase 10/13 blocked.

## 3. Required to finish Phase 11

1. Approve `electron-builder` install + Authenticode cert (or unsigned release with documented SmartScreen behavior).
2. Clean Windows VM for install/uninstall/upgrade acceptance (Phase 9 §3).
3. Add `release` job to CI: build installer → checksum → upload artifact (no publish until approved).
4. Pin GitHub Actions to SHA (v4 tags pinned by major version — acceptable; SHA pinning optional).

## 4. Verdict

**PARTIAL (CI VERIFY PASS).** CI will gate every push/PR on typecheck + full test suite + production build. Release automation remains blocked on Phase 9 inputs.
