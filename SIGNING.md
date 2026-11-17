# VYAPARA — Installer Signing Pipeline

This document describes how VYAPARA installers are built, signed, and verified.

## TL;DR

```bash
# Unsigned build (default — works today, installer shows SmartScreen warning on other PCs)
node scripts/build-installer.mjs

# Signed build (after you obtain an Authenticode certificate)
$env:CSC_LINK='D:\secrets\vyapara-authoricode.pfx'
$env:CSC_KEY_PASSWORD='********'
node scripts/build-installer.mjs
```

Certificates and passwords are **never** committed. Keep them out of the repo
and out of `.env` files that might be copied around.

## What you need for real signing

1. An **Authenticode code-signing certificate** from a CA trusted by Windows:
   DigiCert, Sectigo, GlobalSign, SSL.com, etc. Developer/EV certificates cost
   roughly **$70–500 per year**; identity verification is required.
2. The certificate exported as **`.pfx`** (PKCS#12) with its private key, plus
   the **export password**.
3. On this machine: nothing else. Electron-builder reads `CSC_LINK` /
   `CSC_KEY_PASSWORD` automatically.

> A self-signed certificate will make Windows treat the installer as
> *untrusted* on machines that don't explicitly trust your cert. Self-signing
> is suitable only for internal distribution to a known machine set that has
> imported your CA — it is not a public release substitute.

## The pipeline

`scripts/build-installer.mjs` does three things, always in order:

1. `electron-vite build` — bundles main/preload/renderer.
2. `electron-builder --win nsis` — packages the installer. If `CSC_LINK` and
   `CSC_KEY_PASSWORD` are present, the app `.exe` and the NSIS installer are
   Authenticode-signed; otherwise the build proceeds unsigned.
3. Writes `apps/desktop/release/SHA256SUMS.txt` — SHA-256 of every installer
   produced, for distribution-time integrity checks.

Set `SIGNING_REQUIRED=true` to make the build **fail** when no certificate is
configured. Use this in release/CI environments:

```bash
$env:SIGNING_REQUIRED='true'
node scripts/build-installer.mjs   # exits 1 if CSC env vars are missing
```

## Verifying a build

```powershell
# Authenticode status (valid / not signed / invalid)
(Get-AuthenticodeSignature '.\apps\desktop\release\VYAPARA-Setup-1.0.0.exe').Status

# SHA-256 checksum matches the shipped SHA256SUMS.txt
Get-FileHash '.\apps\desktop\release\VYAPARA-Setup-1.0.0.exe' -Algorithm SHA256
```

When the certificate is valid, the installer also shows the publisher name and
"Verified publisher" in UAC + SmartScreen.

## CI example (GitHub Actions)

```yaml
jobs:
  release:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - shell: pwsh
        run: |
          $env:CSC_LINK = ${{ secrets.CSC_LINK }}          # base64 of the .pfx, or a path to a checked-out temp file
          $env:CSC_KEY_PASSWORD = ${{ secrets.CSC_KEY_PASSWORD }}
          $env:SIGNING_REQUIRED = 'true'
          node scripts/build-installer.mjs
      - uses: actions/upload-artifact@v4
        with:
          name: installer
          path: apps/desktop/release/
```

> For CI, prefer `CSC_LINK` containing **base64 of the .pfx** (standard
> electron-builder convention) or write the pfx to a temp file from a secret.
> Never put the `.pfx` itself in the repo.

## SmartScreen reality check

A freshly issued certificate will still show SmartScreen warnings for the
*first* few thousand downloads until reputation accrues — this is true for
every new publisher and cannot be worked around by tooling. What signing
guarantees is: publisher identity verified and tamper detection, which is what
Windows requires to eventually suppress the warning.

## What is NOT in scope here

- The NSIS installer is produced **unsigned** today. Signing the already-built
  installer requires the certificate; without it the only correct behavior is
  an unsigned release with clearly documented SmartScreen behavior.
- Notarization (macOS) is out of scope; this targets Windows.
