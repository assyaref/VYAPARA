// Phase 4 — Business Functional Acceptance sweep through the REAL app.
// Fresh temp profile; real IPC renderer bridge; real SQLite persistence.
const { _electron: electron } = require('playwright');
const path = require('path');
const os = require('os');
const fs = require('fs');

const root = process.cwd();
const results = [];
const check = (name, ok) => {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'} | ${name}`);
};

(async () => {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'vyapara-e2e-acceptance-'));
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
    const input = page.locator(`xpath=//label[contains(.,"${labelText}")]/following-sibling::input[1]`);
    await input.waitFor({ timeout: 5000 });
    await input.fill(String(value));
  };
  const nav = async (label) => {
    await page.locator('nav button', { hasText: label }).click();
    await page.waitForTimeout(900);
  };

  // 1. Setup admin on fresh profile
  await page.waitForTimeout(2500);
  let text = await bodyText();
  check('Setup screen renders on fresh profile', /Siapkan Administrator/.test(text));
  await page.fill('#name', 'E2E Admin');
  await page.fill('#email', 'admin@e2e.test');
  await page.fill('#password', 'rahasia123456');
  await page.fill('#confirm', 'rahasia123456');
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => /omzet hari ini/i.test(document.body.innerText || ''), undefined, { timeout: 15000 });
  check('Admin setup completes, dashboard renders', true);

  // 2. Seed catalog through the app's real IPC bridge
  const seed = await page.evaluate(`(async () => {
    const a = await window.vyapara.createProduct({ name: 'Kertas HVS A4', barcode: '899000111001', sku: 'KRT-HVS-A4', price: 50000, cost: 30000, stock: 100 });
    const b = await window.vyapara.createProduct({ name: 'Pulpen Hitam', barcode: '899000111002', sku: 'PLP-HTM', price: 5000, cost: 2000, stock: 200 });
    return { a: a.ok, b: b.ok, data: [a.data, b.data] };
  })()`);
  check('Product catalog seeded via IPC', !!(seed && seed.a && seed.b));

  // 3. POS sale: 2 x Kertas + 1 x Pulpen = 105.000
  await nav('Kasir (POS)');
  await page.fill('input[placeholder="Cari produk atau layanan…"]', 'Kertas');
  await page.waitForTimeout(400);
  await page.locator('button:has-text("Kertas HVS A4")').click();
  await page.locator('button:has-text("Kertas HVS A4")').click();
  await page.fill('input[placeholder="Cari produk atau layanan…"]', 'Pulpen');
  await page.waitForTimeout(400);
  await page.locator('button:has-text("Pulpen Hitam")').click();
  await fillByLabel('Jumlah Bayar', '150000');
  const checkoutBtn = page.locator('button:has-text("Bayar")');
  check('Checkout enabled with sufficient payment', await checkoutBtn.isEnabled());
  await checkoutBtn.click();
  await page.waitForSelector('text=CONTOH NOTA / STRUK', { timeout: 10000 });
  check('Receipt modal renders with transaction number', true);
  await page.locator('button:has-text("Tutup"), button:has-text("Selesai")').first().click({ timeout: 2000 }).catch(async () => {
    await page.locator('.fixed.inset-0.z-50 > .fixed').first().click({ timeout: 2000 }).catch(() => {});
  });
  await page.waitForTimeout(600);

  // 4. Dashboard reflects the sale
  await nav('Dashboard');
  text = await bodyText();
  check('Dashboard shows today omzet (105.000)', /105\.000/.test(text));
  check('Dashboard shows latest transaction (INV-)', /INV-/.test(text));

  // 5. Stock persisted correctly via IPC (100 - 2 = 98)
  const stock = await page.evaluate(`(async () => {
    const res = await window.vyapara.getProducts({ includeInactive: false });
    const p = res.data.find((p) => p.sku === 'KRT-HVS-A4');
    return p ? p.stock : -1;
  })()`);
  check('Stock persisted at 98 after sale of 2', stock === 98, `got ${stock}`);

  // 6. Customer module: create + persist
  await nav('Pelanggan');
  await page.locator('button:has-text("Tambah Pelanggan")').click();
  await fillByLabel('Nama Pelanggan', 'Budi Santoso');
  await fillByLabel('Telepon', '081234567890');
  await fillByLabel('Email', 'budi@toko.id');
  await fillByLabel('Alamat', 'Jl. Merdeka No. 1');
  await fillByLabel('Kota', 'Jakarta');
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(800);
  const custSearch = page.locator('input[placeholder*="Cari nama pelanggan"]');
  await custSearch.fill('Budi');
  await page.waitForTimeout(400);
  text = await bodyText();
  check('Customer created and searchable', /Budi Santoso/.test(text));

  // 7. Supplier module: create + persist
  await nav('Pemasok');
  await page.locator('button:has-text("Tambah Pemasok")').click();
  await fillByLabel('Nama Pemasok', 'PT Sinar Abadi');
  await fillByLabel('Telepon', '0217654321');
  await fillByLabel('Email', 'sales@ptsinarabadi.co.id');
  await fillByLabel('Alamat', 'Jl. Industri No. 5');
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(800);
  const suppSearch = page.locator('input[placeholder*="Cari nama pemasok"]');
  await suppSearch.fill('Sinar');
  await page.waitForTimeout(400);
  text = await bodyText();
  check('Supplier created and searchable', /PT Sinar Abadi/.test(text));

  // 8. Finance: record income, then open Laporan tab
  await nav('Keuangan');
  await page.locator('button:has-text("Pemasukan")').click();
  await fillByLabel('Tipe Pemasukan', 'Penjualan ATK');
  await fillByLabel('Jumlah', '150000');
  await fillByLabel('Deskripsi', 'Omzet uji penerimaan');
  await page.locator('button[type="submit"]:has-text("Catat Pemasukan")').click();
  await page.waitForTimeout(800);
  text = await bodyText();
  check('Income recorded without error', !/error/i.test(text) && !/Gagal/i.test(text));
  await page.locator('button:has-text("Laporan")').first().click();
  await page.waitForTimeout(600);
  text = await bodyText();
  check('Finance Laporan tab renders', /(Pemasukan|Pengeluaran|Laporan)/.test(text));

  // 9. Reports module renders, no crash on tab switch
  await nav('Laporan & Analisis');
  text = await bodyText();
  check('Reports page renders', /Laporan/.test(text));
  for (const tab of ['Penjualan', 'Transaksi', 'Terlaris', 'Inventaris']) {
    const btn = page.locator('button', { hasText: tab });
    if (await btn.count()) { await btn.click(); await page.waitForTimeout(500); }
  }
  text = await bodyText();
  check('Reports tabs switch without crash', text.length > 100 && !/undefined/.test(text));

  // 10. Administration: admin user listed
  await nav('Pengaturan');
  text = await bodyText();
  check('Admin user visible in settings', /E2E Admin/.test(text));

  // 11. Offline Sync screen reachable from nav and renders engine status
  await nav('Offline Sync');
  text = await bodyText();
  check('Offline Sync screen renders with engine status', /(Status sinkronisasi|Offline Sync|Idle|Sinkronkan Sekarang)/.test(text));
  await page.screenshot({ path: path.join(root, 'evidence', 'acceptance-offline.png') });

  // 11. Screenshots
  await nav('Dashboard');
  await page.screenshot({ path: path.join(root, 'evidence', 'acceptance-dashboard.png') });
  await nav('Kasir (POS)');
  await page.screenshot({ path: path.join(root, 'evidence', 'acceptance-pos.png') });

  const pass = results.filter((r) => r.ok).length;
  const fail = results.length - pass;
  console.log(`SUMMARY ${pass} PASS / ${fail} FAIL (${results.length} checks), pageErrors=${pageErrors.length}`);
  await app.close();
  fs.rmSync(profile, { recursive: true, force: true });
  process.exit(fail === 0 && pageErrors.length === 0 ? 0 : 1);
})().catch((e) => { console.error('ACCEPTANCE ERROR:', e); process.exit(1); });
