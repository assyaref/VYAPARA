// Piutang aging report: credit sale via POS with customer → Laporan → Piutang shows debtor
const { _electron: electron } = require('playwright');
const path = require('path');
const os = require('os');
const fs = require('fs');
const root = process.cwd();
const results = [];
const check = (name, ok) => { results.push({ name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'} | ${name}`); };

(async () => {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'vyapara-e2e-piutang-'));
  const app = await electron.launch({
    executablePath: path.join(root, 'node_modules', 'electron', 'dist', 'electron.exe'),
    args: ['--no-sandbox', `--user-data-dir=${profile}`, path.join(root, 'apps', 'desktop', 'out', 'main', 'main.js')],
    env: { ...process.env, NODE_ENV: 'production' },
    timeout: 45000,
  });
  const page = await app.firstWindow({ timeout: 45000 });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  const bodyText = () => page.evaluate(() => document.body.innerText || '');
  const nav = async (label) => { await page.locator('nav button', { hasText: label, exact: true }).first().click(); await page.waitForTimeout(800); };

  await page.waitForTimeout(2000);
  await page.fill('#name', 'AR Admin');
  await page.fill('#email', 'ar@e2e.test');
  await page.fill('#password', 'rahasia123456');
  await page.fill('#confirm', 'rahasia123456');
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => /omzet hari ini/i.test(document.body.innerText || ''), undefined, { timeout: 15000 });
  check('Admin setup completes', true);

  const seeded = await page.evaluate(async () => {
    const p = await window.vyapara.createProduct({ token: '', name: 'AR Test Item', sku: 'AR-001', barcode: 'AR-001', price: 80000, cost: 50000, stock: 100 });
    const c = await window.vyapara.createCustomer({ token: '', name: 'AR Debtor Utama', phone: '0812345678' });
    return { productId: p?.ok ? p.data.id : null, customerId: c?.ok ? c.data.id : null };
  });
  check('Seed product + customer', !!seeded.productId && !!seeded.customerId);

  await nav('Kasir (POS)');
  await page.fill('input[placeholder="Cari produk atau layanan…"]', 'AR Test');
  await page.waitForTimeout(400);
  await page.locator('button:has-text("AR Test Item")').first().click();

  const picker = page.locator('input[placeholder^="Ketik nama"]');
  await picker.fill('AR Debtor');
  await page.waitForTimeout(400);
  await page.locator('button:has-text("AR Debtor Utama")').first().click();
  await page.waitForTimeout(300);

  // choose Kredit (piutang) — chip only shows when customer selected
  await page.locator('button:has-text("Kredit")').click();
  await page.waitForTimeout(200);
  await page.locator('button:has-text("Bayar (F10)")').click();
  await page.waitForSelector('text=CONTOH NOTA / STRUK', { timeout: 10000 });
  await page.locator('button:has-text("Selesai")').first().click().catch(() => {});
  await page.waitForTimeout(800);
  check('Credit sale completed', true);

  await nav('Laporan & Analisis');
  await page.locator('button:has-text("Piutang")').first().click();
  await page.waitForTimeout(800);
  const txt = await bodyText();
  check('Piutang tab lists debtor with balance', /AR Debtor Utama/.test(txt) && /80\.000|80000/.test(txt));

  const pass = results.filter((r) => r.ok).length;
  const fail = results.length - pass;
  console.log(`SUMMARY ${pass} PASS / ${fail} FAIL (${results.length} checks)`);
  await app.close();
  fs.rmSync(profile, { recursive: true, force: true });
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error('E2E-PIUTANG ERROR:', e); process.exit(1); });
