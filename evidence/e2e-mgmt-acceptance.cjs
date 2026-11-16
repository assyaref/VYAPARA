// Phase 4.6 — E2E acceptance for the four management modules
// Products / Catalog / SalesReturns / StockAdjustments — real flows through real UI
const { _electron: electron } = require('playwright');
const path = require('path');
const os = require('os');
const fs = require('fs');

const root = process.cwd();
const results = [];
const check = (name, ok) => { results.push({ name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'} | ${name}`); };

(async () => {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'vyapara-e2e-mgmt-'));
  const pageErrors = [];
  const app = await electron.launch({
    executablePath: path.join(root, 'node_modules', 'electron', 'dist', 'electron.exe'),
    args: ['--no-sandbox', `--user-data-dir=${profile}`, path.join(root, 'apps', 'desktop', 'out', 'main', 'main.js')],
    env: { ...process.env, NODE_ENV: 'production' },
    timeout: 45000,
  });
  const page = await app.firstWindow({ timeout: 45000 });
  page.on('pageerror', (e) => { console.log('[pageerror]', e.message); pageErrors.push(e.message); });

  const bodyText = () => page.evaluate(() => document.body.innerText || '');
  const fillByLabel = async (labelText, value) => {
    const input = page.locator(`xpath=//label[contains(.,"${labelText}")]/following-sibling::input[1]`).or(page.locator(`xpath=//label[contains(.,"${labelText}")]/../input`));
    await input.first().waitFor({ timeout: 5000 });
    await input.first().fill(String(value));
  };
  const selectByLabel = async (labelText, value) => {
    const sel = page.locator(`xpath=//label[contains(.,"${labelText}")]/following-sibling::select[1]`).or(page.locator(`xpath=//label[contains(.,"${labelText}")]/../select`));
    await sel.first().waitFor({ timeout: 5000 });
    await sel.first().selectOption(String(value));
  };
  const nav = async (label) => { await page.locator('nav button', { hasText: label }).click(); await page.waitForTimeout(900); };
  const productsIpcRead = () => page.evaluate(`(async () => {
    const res = await window.vyapara.getProducts({ token: '', includeInactive: false });
    return res.data;
  })()`);

  // ---- Setup admin ----
  await page.waitForTimeout(2500);
  let text = await bodyText();
  check('Setup screen renders', /Siapkan Administrator/.test(text));
  await page.fill('#name', 'Mgmt Admin');
  await page.fill('#email', 'mgmt@e2e.test');
  await page.fill('#password', 'rahasia123456');
  await page.fill('#confirm', 'rahasia123456');
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => /omzet hari ini/i.test(document.body.innerText || ''), undefined, { timeout: 15000 });
  check('Admin setup completes, dashboard renders', true);

  // ---- 1. Products: create via UI form ----
  await nav('Produk');
  await page.locator('button:has-text("Tambah Produk")').click();
  await page.fill('#f-name', 'Buku Gambar A3');
  await page.fill('#f-sku', 'BGR-A3');
  await page.fill('#f-barcode', 'BGR-A3-001');
  await page.fill('#f-price', '25000');
  await page.fill('#f-cost', '15000');
  await page.fill('#f-stock', '30');
  await page.locator('button[type="submit"]:has-text("Simpan")').click();
  await page.waitForTimeout(1200);
  text = await bodyText();
  check('Product created via form and visible in list', /Buku Gambar A3/.test(text) && /BGR-A3/.test(text));

  // ---- 2. Catalog: create category and unit via UI form ----
  await nav('Katalog');
  await page.fill('#cat-name', 'Alat Tulis');
  await page.fill('#cat-desc', 'ATK kategori uji');
  await page.locator('button:has-text("Tambah")').first().click();
  await page.waitForTimeout(800);
  text = await bodyText();
  check('New category "Alat Tulis" visible in list', /Alat Tulis/.test(text));

  await page.locator('button:has-text("Satuan")').first().click();
  await page.waitForTimeout(400);
  await page.fill('#unit-name', 'Lusin');
  await page.fill('#unit-symbol', 'lus');
  await page.locator('button:has-text("Tambah")').first().click();
  await page.waitForTimeout(800);
  text = await bodyText();
  check('New unit "Lusin" visible in list', /Lusin/.test(text));

  // ---- 3. Sell → stock deducted → retur via UI → stock restored ----
  await nav('Kasir (POS)');
  await page.fill('input[placeholder="Cari produk atau layanan…"]', 'Buku Gambar A3');
  await page.waitForTimeout(400);
  await page.locator('button:has-text("Buku Gambar A3")').first().click();
  await fillByLabel('Jumlah Bayar', '50000');
  await page.locator('button:has-text("Bayar")').click();
  await page.waitForSelector('text=CONTOH NOTA / STRUK', { timeout: 10000 });
  await page.locator('button:has-text("Selesai")').click();
  await page.waitForTimeout(600);
  let prods = await productsIpcRead();
  const p1 = prods.find((p) => p.sku === 'BGR-A3');
  check('Stock decreased to 29 after sale', !!p1 && p1.stock === 29, JSON.stringify(p1 && p1.stock));

  // get transaction id via IPC list — read it from dashboard instead for UI-purity; use IPC here for determinism
  // (the goal is verifying the returns UI works against a real transaction)
  const txn = await page.evaluate(`(async () => {
    const t = await window.vyapara.getTransactions({ token: '', limit: 1 });
    return t.data && t.data[0] ? t.data[0] : null;
  })()`);

  await nav('Retur Penjualan');
  // find the row with our transaction (INV- prefix) and click Retur (in the first table, not nav)
  const returBtn = page.locator('table:first-of-type button:has-text("Retur")').first();
  await returBtn.waitFor({ timeout: 8000 });
  page.once('dialog', (d) => d.accept());
  await returBtn.click();
  await page.waitForTimeout(1500);
  prods = await productsIpcRead();
  const p2 = prods.find((p) => p.sku === 'BGR-A3');
  check('Stock restored to 30 after retur', !!p2 && p2.stock === 30, JSON.stringify(p2 && p2.stock));

  text = await bodyText();
  check('Retur appears in riwayat', /RET-/.test(text));

  // ---- 4. StockAdjustments: create + approve via UI ----
  await nav('Penyesuaian Stok');
  // pick product and qty via UI
  const productSelect = page.locator('select#sa-product');
  await productSelect.selectOption({ index: 1 });
  await page.fill('#sa-qty', '5');
  await page.fill('#sa-reason', 'selisih opname uji');
  await page.locator('button:has-text("Ajukan Penyesuaian")').click();
  await page.waitForTimeout(1200);
  text = await bodyText();
  check('Adjustment submitted and pending visible', /selisih opname uji/.test(text) && /Pending/i.test(text));

  // approve it (admin)
  const approveBtn = page.locator('button:has-text("Setuju")').first();
  await approveBtn.waitFor({ timeout: 8000 });
  await approveBtn.click();
  await page.waitForTimeout(1200);
  prods = await productsIpcRead();
  const p3 = prods.find((p) => p.sku === 'BGR-A3');
  check('Stock increased to 35 after approved adjustment', !!p3 && p3.stock === 35, JSON.stringify(p3 && p3.stock));

  // ---- Report ----
  const pass = results.filter((r) => r.ok).length;
  const fail = results.length - pass;
  console.log(`SUMMARY ${pass} PASS / ${fail} FAIL (${results.length} checks), pageErrors=${pageErrors.length}`);
  await app.close();
  fs.rmSync(profile, { recursive: true, force: true });
  process.exit(fail === 0 && pageErrors.length === 0 ? 0 : 1);
})().catch((e) => { console.error('ACCEPTANCE-MGMT ERROR:', e); process.exit(1); });
