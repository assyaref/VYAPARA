#!/usr/bin/env node
/**
 * VYAPARA installer build pipeline.
 *
 * Behavior:
 *  - Builds the Electron main/preload/renderer bundles (electron-vite build).
 *  - Runs electron-builder for Windows NSIS.
 *  - If CSC_LINK + CSC_KEY_PASSWORD are set, the installer and app exe are
 *    Authenticode-signed by electron-builder automatically.
 *  - Always writes release/SHA256SUMS.txt for the built artifacts.
 *  - If SIGNING_REQUIRED=true and no CSC env vars are present, the build FAILS
 *    loudly instead of producing an unsignable "signed-looking" release.
 *
 * Usage:
 *   node scripts/build-installer.mjs                 # unsigned (default)
 *   CSC_LINK=path\to\cert.pfx CSC_KEY_PASSWORD=... node scripts/build-installer.mjs
 */
import { execFileSync } from 'node:child_process';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

const root = process.cwd();
const desktopDir = path.join(root, 'apps', 'desktop');
const releaseDir = path.join(desktopDir, 'release');

const hasCert = !!process.env.CSC_LINK && !!process.env.CSC_KEY_PASSWORD;
const signingRequired = process.env.SIGNING_REQUIRED === 'true';

if (signingRequired && !hasCert) {
  console.error('SIGNING_REQUIRED=true but CSC_LINK / CSC_KEY_PASSWORD are not set. Refusing to produce an unsigned installer.');
  process.exit(1);
}

console.log(`[build-installer] mode: ${hasCert ? 'SIGNED' : 'unsigned'}`);

console.log('[build-installer] 1/3 electron-vite build…');
execFileSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['electron-vite', 'build'], {
  cwd: desktopDir,
  stdio: 'inherit',
  env: process.env,
  shell: true,
});

console.log('[build-installer] 2/3 electron-builder…');
execFileSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['electron-builder', '--win', 'nsis'], {
  cwd: desktopDir,
  stdio: 'inherit',
  env: process.env,
  shell: true,
});

console.log('[build-installer] 3/3 checksums…');
if (fs.existsSync(releaseDir)) {
  const lines = [];
  for (const name of fs.readdirSync(releaseDir)) {
    if (!/\.(exe|msi|zip|7z)$/.test(name)) continue;
    const filePath = path.join(releaseDir, name);
    const hash = crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
    lines.push(`${hash}  ${name}`);
    console.log(`  SHA256 ${hash}  ${name}`);
  }
  fs.writeFileSync(path.join(releaseDir, 'SHA256SUMS.txt'), lines.join('\n') + '\n', 'utf8');
  console.log(`[build-installer] wrote release/SHA256SUMS.txt (${lines.length} artifact(s))`);
} else {
  console.error('[build-installer] release/ directory not found — builder output missing');
  process.exit(1);
}

console.log(`[build-installer] done (${hasCert ? 'signed' : 'unsigned'}).`);
