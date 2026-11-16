> **ADDENDUM 2026-11-16 — Installer artifact now exists; install test still pending clean VM.**
> electron-builder 26.18.0 installed (approved). `apps/desktop/package.json` now carries `version: 1.0.0`, `description`, `author`, and a `build` config (appId `id.vyapara.desktop`, productName `VYAPARA`, NSIS target, perMachine installer, `npmRebuild: false` because the prebuilt `better-sqlite3` binding already ships working for Electron 45 — rebuilding demands Visual Studio Build Tools, absent here).
> Runtime native module moved `better-sqlite3` from devDependencies to dependencies so it is packaged.
> **Built artifact (unsigned):**
> `apps/desktop/release/VYAPARA Setup 1.0.0.exe` (132,028,764 bytes, SHA256 e197b0a3c118d3d52a22eece16d1e6390906194cdf880157d0f0e182694fc5d7) + `VYAPARA Setup 1.0.0.exe.blockmap`.
> **Verified:** `release/win-unpacked/VYAPARA.exe` launched with isolated temp profile passes the full production E2E (16/16 PASS, 0 page errors, POS sale persisted). Installer executable itself was NOT installed/launched (no clean VM; would mutate this host).
> Remaining gate: clean-machine install/uninstall/upgrade acceptance + optional Authenticode signing.

# VYAPARA — Phase 9 Windows Release Engineering Report

- **Status:** **PARTIAL / NOT VERIFIED FOR RELEASE** — installer artifact built (unsigned); install/uninstall/upgrade acceptance on clean VM NOT VERIFIED. Production remains unclaimable until clean-machine acceptance + optional Authenticode signing.
- **Date:** 2026-11-16

## 1. What is verified (release-readiness prerequisites that DO exist)

| Item | Evidence |
|---|---|
| Production electron build succeeds | `npm run electron:build` exit 0; `out/main/main.js` + `out/preload/preload.mjs` + `dist/` produced |
| Renderer production bundle | `dist/` (index.html + `./assets/index-*.js`, ~750 KB JS) |
| Preload packaging mode | `out/preload/preload.mjs` (ESM preload accepted by dev build; sandbox constraint documented) |
| App icon wired & loads | `assets/brand/vyapara-icon.png` (256×256, from `VYAPARA_Visual_Assets/02_App_Icons/Windows_App_Icon.png`); log line confirmed fixed |
| App runs reliably | E2E 16/16 PASS, 0 page errors; stable across 60 navigations + 20 refreshes (heap flat) |
| Installer script referenced | root `package.json` script `build:installer` → `scripts/build-installer.js` — **file does not exist** |
| Native modules | `better-sqlite3` externalized in main bundle; works on `node_modules/.bin` (build host) but will need rebuild against target Electron ABI for installer |
| Version metadata | `apps/desktop/package.json` `main` fixed; `version` not yet pinned for release |

## 2. What is missing (blocks acceptance)

1. **Installer builder** — `electron-builder` / `electron-packager` / NSIS / Squirrel are not installed; root `build:installer` target is a dangling script reference.
2. **Code-signing certificate** — no Authenticode cert; unsigned installers trigger SmartScreen warnings.
3. **Clean Windows test environment** — no VM to test install → first-launch → login → workflow → offline → online sync → restart → uninstall → upgrade → DB preservation.
4. **App version decision** — `apps/desktop/package.json` lacks a release `version` (implicit 1.0.0 from `app.getVersion()` fallback).
5. **Artifact checksums / provenance** — cannot be produced without the installer artifact itself.

## 3. Required to unblock (owner actions)

1. Approve `npm install --save-dev electron-builder` (network download, ~200 MB, build-time only).
2. Provide Authenticode certificate (.pfx) or explicitly authorize unsigned release (document SmartScreen warning to users).
3. Provide a clean Windows VM (or authorize a physical test machine) for install/uninstall/upgrade acceptance.
4. Decide release version (suggest `1.0.0`); approve adding `build` config to `apps/desktop/package.json`.
5. Approve (or provide) code-signing process and artifact storage location.

## 4. Executable plan once unblocked

1. `npm install --save-dev electron-builder`
2. Add `build` config to `apps/desktop/package.json` (`productName: VYAPARA`, `appId: id.vyapara.desktop`, `directories.output: release`, `win.target: nsis`, `icon: assets/brand/vyapara-icon.png`, `files: [out/**, dist/**, assets/brand/**, drizzle/**]`)
3. `npm run electron:build` → verify `out/` + `dist/`
4. `npx electron-builder --win nsis` → `release/VYAPARA Setup 1.0.0.exe` + blockmap + `.sha256` checksum
5. Install on clean VM → verify: fresh install, first launch (Setup Admin), login, POS sale, offline mode, online sync, restart, uninstall, DB preservation across upgrade, SmartScreen behavior
6. Write `RELEASE_NOTES.md` (1.0.0: initial production release), `INSTALL.md`, `UPGRADE.md`, `ROLLBACK.md`, `BUILD_PROVENANCE.md`

## 5. Verdict

**Phase 9: BLOCKED.** No installer may be claimed production-ready. Release acceptance remains **NOT VERIFIED** until §3 is resolved and §4 executed with evidence on a clean environment.
