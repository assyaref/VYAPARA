// Screenshot: Pengaturan → Backup & Restore tab renders
const { _electron: electron } = require('playwright');
const path = require('path');
const os = require('os');
const fs = require('fs');
const root = process.cwd();
(async () => {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'vyapara-bak-shot-'));
  const app = await electron.launch({
    executablePath: path.join(root, 'node_modules', 'electron', 'dist', 'electron.exe'),
    args: ['--no-sandbox', `--user-data-dir=${profile}`, path.join(root, 'apps', 'desktop', 'out', 'main', 'main.js')],
    env: { ...process.env, NODE_ENV: 'production' },
    timeout: 45000,
  });
  const page = await app.firstWindow({ timeout: 45000 });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  await page.waitForTimeout(2500);
  await page.fill('#name', 'Bak Admin');
  await page.fill('#email', 'bak@e2e.test');
  await page.fill('#password', 'rahasia123456');
  await page.fill('#confirm', 'rahasia123456');
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => /omzet hari ini/i.test(document.body.innerText || ''), undefined, { timeout: 15000 });
  await page.locator('nav button', { hasText: 'Pengaturan' }).click();
  await page.waitForTimeout(800);
  await page.locator('button:has-text("Backup & Restore")').click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(root, 'evidence', 'backup-restore-ui.png') });
  const txt = await page.evaluate(() => document.body.innerText);
  console.log('RENDER_OK', /Cadangkan seluruh data toko/.test(txt) && /Buat Backup Sekarang/.test(txt) && /Restore dari File/.test(txt));
  await app.close();
  fs.rmSync(profile, { recursive: true, force: true });
  process.exit(0);
})().catch((e) => { console.error('ERR', e); process.exit(1); });
