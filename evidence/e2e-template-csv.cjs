// Screenshot Products and Customers pages showing Template CSV buttons
const { _electron: electron } = require('playwright');
const path = require('path');
const os = require('os');
const fs = require('fs');
const root = process.cwd();
(async () => {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'vyapara-tmpl-'));
  const app = await electron.launch({
    executablePath: path.join(root, 'node_modules', 'electron', 'dist', 'electron.exe'),
    args: ['--no-sandbox', `--user-data-dir=${profile}`, path.join(root, 'apps', 'desktop', 'out', 'main', 'main.js')],
    env: { ...process.env, NODE_ENV: 'production' },
    timeout: 45000,
  });
  const page = await app.firstWindow({ timeout: 45000 });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  await page.waitForTimeout(2000);
  await page.fill('#name', 'Tmpl Admin');
  await page.fill('#email', 'tmpl@e2e.test');
  await page.fill('#password', 'rahasia123456');
  await page.fill('#confirm', 'rahasia123456');
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => /omzet hari ini/i.test(document.body.innerText || ''), undefined, { timeout: 15000 });
  const nav = async (label) => { await page.locator('nav button', { hasText: label, exact: true }).first().click(); await page.waitForTimeout(800); };
  await nav('Produk');
  const productsButtons = await page.locator('button:has-text("Template CSV")').count();
  console.log('PRODUK Template CSV buttons:', productsButtons);
  await page.screenshot({ path: 'evidence/template-csv-products.png' });
  await nav('Pelanggan');
  const customerButtons = await page.locator('button:has-text("Template CSV")').count();
  console.log('PELANGGAN Template CSV buttons:', customerButtons);
  await page.screenshot({ path: 'evidence/template-csv-customers.png' });
  await app.close();
  fs.rmSync(profile, { recursive: true, force: true });
  process.exit(productsButtons >= 1 && customerButtons >= 1 ? 0 : 1);
})().catch((e) => { console.error('ERR', e); process.exit(1); });
