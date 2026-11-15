// E2E smoke: real Electron app, fresh temp user-data profile.
// Usage: node evidence/e2e-smoke.cjs
const { _electron: electron } = require('playwright');
const path = require('path');
const os = require('os');
const fs = require('fs');

const root = process.cwd();
const profile = path.join(os.tmpdir(), 'vyapara-e2e-profile-' + Date.now());
const results = [];
const check = (name, ok) => {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'} | ${name}`);
};

(async () => {
  fs.rmSync(profile, { recursive: true, force: true });

  const app = await electron.launch({
    executablePath: path.join(root, 'node_modules', 'electron', 'dist', 'electron.exe'),
    args: [
      '--no-sandbox',
      `--user-data-dir=${profile}`,
      path.join(root, 'apps', 'desktop', 'out', 'main', 'main.js'),
    ],
    env: { ...process.env, NODE_ENV: 'production' },
    timeout: 45000,
  });

  const page = await app.firstWindow({ timeout: 45000 });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') console.log('[renderer:' + m.type() + ']', m.text().slice(0, 300));
  });

  const bodyText = () => page.evaluate(() => document.body.innerText || '');
  await page.waitForTimeout(3000);

  let text = await bodyText();
  check('App renders setup or login screen', /Siapkan Administrator|Masuk ke Aplikasi/.test(text));

  const needsSetup = /Siapkan Administrator/.test(text);
  check('Fresh profile requires admin setup', needsSetup);

  if (needsSetup) {
    await page.fill('#name', 'E2E Admin');
    await page.fill('#email', 'admin@e2e.test');
    await page.fill('#password', 'rahasia123456');
    await page.fill('#confirm', 'rahasia123456');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(5000);
    text = await bodyText();
    check('Admin setup completes, dashboard renders', /Selamat|Omzet Hari Ini|Grafik Penjualan/.test(text));
  }

  text = await bodyText();
  check('Dashboard KPI cards render', /omzet hari ini/i.test(text) && /transaksi hari ini/i.test(text));
  check('Dashboard 7-day chart renders', /Grafik Penjualan 7 Hari/.test(text));
  check('Sidebar user block shows admin', /E2E Admin|Pemilik Toko/.test(text));

  await page.locator('nav button', { hasText: 'Kasir (POS)' }).click();
  await page.waitForTimeout(1500);
  text = await bodyText();
  check('POS screen opens', /Keranjang|Jumlah Bayar/.test(text));

  await page.locator('nav button', { hasText: 'Dashboard' }).click();
  await page.waitForTimeout(1000);
  text = await bodyText();
  check('Navigation back to Dashboard', /omzet hari ini/i.test(text));

  await page.locator('nav button', { hasText: 'Pengaturan' }).click();
  await page.waitForTimeout(1500);
  text = await bodyText();
  check('Settings screen opens', text.length > 50);

  await page.locator('nav button', { hasText: 'Dashboard' }).click();
  await page.waitForTimeout(1000);

  await page.screenshot({ path: path.join(root, 'evidence', 'e2e-dashboard.png') });
  console.log('screenshot saved: evidence/e2e-dashboard.png');

  const pass = results.filter((r) => r.ok).length;
  const fail = results.length - pass;
  console.log(`SUMMARY ${pass} PASS / ${fail} FAIL (total ${results.length})`);
  await app.close();
  fs.rmSync(profile, { recursive: true, force: true });
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => {
  console.error('E2E ERROR:', e);
  process.exit(1);
});
