// E2E — Pembelian: buat PO via UI → terima barang via UI → stok & status terverifikasi
const { _electron: electron } = require('playwright');
const path = require('path');
const os = require('os');
const fs = require('fs');
const root = process.cwd();
const results = [];
const check = (name, ok) => { results.push({ name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'} | ${name}`); };

(async () => {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'vyapara-e2e-proc-'));
  const app = await electron.launch({
    executablePath: path.join(root, 'node_modules', 'electron', 'dist', 'electron.exe'),
    args: ['--no-sandbox', `--user-data-dir=${profile}`, path.join(root, 'apps', 'desktop', 'out', 'main', 'main.js')],
    env: { ...process.env, NODE_ENV: 'production', VYAPARA_DEV_SEED_SUPERADMIN: '1' },
    timeout: 45000,
  });
  const page = await app.firstWindow({ timeout: 45000 });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  const bodyText = () => page.evaluate(() => document.body.innerText || '');
  const nav = async (label) => { await page.locator('nav button', { hasText: label, exact: true }).first().click(); await page.waitForTimeout(900); };

  // setup admin
  await page.waitForTimeout(2000);
  await page.fill('#name', 'Proc Admin');
  await page.fill('#email', 'proc@e2e.test');
  await page.fill('#password', 'rahasia123456');
  await page.fill('#confirm', 'rahasia123456');
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => /omzet hari ini/i.test(document.body.innerText || ''), undefined, { timeout: 15000 });
  check('Admin setup completes', true);

  // seed product + supplier via IPC
  const seeded = await page.evaluate(async () => {
    const p = await window.vyapara.createProduct({
      token: '', name: 'PO Uji Kertas', sku: 'PO-UJI-001', barcode: 'PO-UJI-001',
      price: 30000, cost: 20000, stock: 0,
    });
    const s = await window.vyapara.createSupplier({ token: '', name: 'PT PO Uji Supplies', contactPerson: 'Budi', phone: '08123' });
    return { productId: p?.data?.id, supplierId: s?.data?.id };
  });
  check('Seed product + supplier created', !!seeded.productId && !!seeded.supplierId);

  await nav('Pembelian');
  await page.locator('button:has-text("Tambah Purchase Order")').click();
  await page.waitForTimeout(600);
  await page.locator('select').first().selectOption(seeded.supplierId);
  // first item row
  const itemSelects = page.locator('select').filter({ hasText: 'Pilih produk' });
  await itemSelects.first().selectOption(seeded.productId);
  const qtyInput = page.locator('input[placeholder="Qty"]').first();
  await qtyInput.fill('6');
  const priceInput = page.locator('input[placeholder="Harga"]').first();
  await priceInput.fill('20000');
  await page.locator('button:has-text("Simpan Purchase Order")').click();
  await page.waitForTimeout(1500);
  let txt = await bodyText();
  console.log('AFTER_SAVE', JSON.stringify(txt.slice(-600)));
  check('Purchase order created and listed', /PO\d{8}-\d{4}/.test(txt) && /PT PO Uji Supplies/.test(txt));

  // stock before receive
  const before = await page.evaluate(async () => (await window.vyapara.getProducts({ token: '', includeInactive: false })).data.find((p) => p.sku === 'PO-UJI-001')?.stock);

  // receive goods: open detail via the receive icon, then confirm full receipt
  await page.locator('button[title="Terima Barang"]').first().click();
  await page.waitForTimeout(800);
  await page.locator('button:has-text("Konfirmasi Penerimaan")').click();
  page.once('dialog', (d) => d.accept());
  await page.waitForTimeout(1500);
  txt = await bodyText();
  console.log('AFTER_RECEIVE', JSON.stringify(txt.slice(-700)));
  check('PO status moved to received', /received/.test(txt));

  const after = await page.evaluate(async () => (await window.vyapara.getProducts({ token: '', includeInactive: false })).data.find((p) => p.sku === 'PO-UJI-001')?.stock);
  check('Stock increased from 0 to 6 after receiving goods', before === 0 && after === 6, `before=${before} after=${after}`);

  const pass = results.filter((r) => r.ok).length;
  const fail = results.length - pass;
  console.log(`SUMMARY ${pass} PASS / ${fail} FAIL (${results.length} checks)`);
  await app.close();
  fs.rmSync(profile, { recursive: true, force: true });
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error('E2E-PROC ERROR:', e); process.exit(1); });
