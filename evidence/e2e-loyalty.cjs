// Loyalty points: POS checkout with customer → earn points; verify via IPC
const { _electron: electron } = require('playwright');
const path = require('path');
const os = require('os');
const fs = require('fs');
const root = process.cwd();
const results = [];
const check = (name, ok) => { results.push({ name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'} | ${name}`); };

(async () => {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'vyapara-e2e-loy-'));
  const app = await electron.launch({
    executablePath: path.join(root, 'node_modules', 'electron', 'dist', 'electron.exe'),
    args: ['--no-sandbox', `--user-data-dir=${profile}`, path.join(root, 'apps', 'desktop', 'out', 'main', 'main.js')],
    env: { ...process.env, NODE_ENV: 'production' },
    timeout: 45000,
  });
  const page = await app.firstWindow({ timeout: 45000 });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  const bodyText = () => page.evaluate(() => document.body.innerText || '');
  const fillByLabel = async (labelText, value) => {
    const input = page.locator(`xpath=//label[contains(.,"${labelText}")]/following-sibling::input[1]`);
    await input.first().waitFor({ timeout: 5000 });
    await input.first().fill(String(value));
  };
  const nav = async (label) => { await page.locator('nav button', { hasText: label, exact: true }).first().click(); await page.waitForTimeout(700); };

  await page.waitForTimeout(2000);
  await page.fill('#name', 'Loy Admin');
  await page.fill('#email', 'loy@e2e.test');
  await page.fill('#password', 'rahasia123456');
  await page.fill('#confirm', 'rahasia123456');
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => /omzet hari ini/i.test(document.body.innerText || ''), undefined, { timeout: 15000 });
  check('Admin setup completes', true);

  const seeded = await page.evaluate(async () => {
    const p = await window.vyapara.createProduct({ token: '', name: 'Loyalty Test Widget', sku: 'LOY-001', barcode: 'LOY-001', price: 50000, cost: 30000, stock: 100 });
    const c = await window.vyapara.createCustomer({ token: '', name: 'Marwan Loyal', phone: '081111111111' });
    return { productId: p?.ok ? p.data.id : null, customerId: c?.ok ? c.data.id : null };
  });
  check('Seed product + customer', !!seeded.productId && !!seeded.customerId);

  await nav('Kasir (POS)');
  await page.fill('input[placeholder="Cari produk atau layanan…"]', 'Loyalty Test');
  await page.waitForTimeout(400);
  await page.locator('button:has-text("Loyalty Test Widget")').first().click();

  // select customer via picker (placeholder check first that the picker exists)
  const picker = page.locator('input[placeholder^="Ketik nama"]');
  await picker.waitFor({ timeout: 5000 });
  await picker.fill('Marwan');
  await page.waitForTimeout(400);
  await page.locator('button:has-text("Marwan Loyal")').first().click();
  await page.waitForTimeout(300);
  const loyaltyTag = await bodyText();
  check('Customer picker shows points for selected customer', /Poin 0/.test(loyaltyTag));

  await fillByLabel('Jumlah Bayar', '50000');
  await page.locator('button:has-text("Bayar (F10)")').click();
  await page.waitForSelector('text=CONTOH NOTA / STRUK', { timeout: 10000 });
  await page.locator('button:has-text("Selesai")').first().click().catch(() => {});
  await page.waitForTimeout(800);
  check('Sale with customer completed', true);

  const bal = await page.evaluate(async (id) => {
    const res = await window.vyapara.getCustomer({ token: '', id });
    return res?.ok ? res.data : null;
  }, seeded.customerId);
  console.log('BALANCE', JSON.stringify(bal));
  check('Earned loyalty points (>=5)', bal && bal.loyaltyPoints >= 5, `points=${bal?.loyaltyPoints}`);

  const pass = results.filter((r) => r.ok).length;
  const fail = results.length - pass;
  console.log(`SUMMARY ${pass} PASS / ${fail} FAIL (${results.length} checks)`);
  await app.close();
  fs.rmSync(profile, { recursive: true, force: true });
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error('E2E-LOY ERROR:', e); process.exit(1); });
