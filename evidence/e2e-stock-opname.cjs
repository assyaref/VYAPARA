// E2E — Opname Stok: buat sesi → hitung fisik → selesaikan → stok ter-koreksi
const { _electron: electron } = require('playwright');
const path = require('path');
const os = require('os');
const fs = require('fs');
const root = process.cwd();
const results = [];
const check = (name, ok) => { results.push({ name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'} | ${name}`); };

(async () => {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'vyapara-e2e-opn-'));
  const app = await electron.launch({
    executablePath: path.join(root, 'node_modules', 'electron', 'dist', 'electron.exe'),
    args: ['--no-sandbox', `--user-data-dir=${profile}`, path.join(root, 'apps', 'desktop', 'out', 'main', 'main.js')],
    env: { ...process.env, NODE_ENV: 'production' },
    timeout: 45000,
  });
  const page = await app.firstWindow({ timeout: 45000 });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  const bodyText = () => page.evaluate(() => document.body.innerText || '');
  const nav = async (label) => { await page.locator('nav button', { hasText: label, exact: true }).first().click(); await page.waitForTimeout(700); };

  await page.waitForTimeout(2000);
  await page.fill('#name', 'Opn Admin');
  await page.fill('#email', 'opn@e2e.test');
  await page.fill('#password', 'rahasia123456');
  await page.fill('#confirm', 'rahasia123456');
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => /omzet hari ini/i.test(document.body.innerText || ''), undefined, { timeout: 15000 });
  check('Admin setup completes', true);

  // seed: one product with known stock via IPC
  const seeded = await page.evaluate(async () => {
    const c = await window.vyapara.createProduct({
      token: '', name: 'Opname Uji A4', sku: 'OPN-A4-001', barcode: 'OPN-A4-001',
      price: 30000, cost: 20000, stock: 12,
    });
    return c?.ok ? c.data : null;
  });
  check('Seed product created', !!seeded, JSON.stringify(seeded));

  await nav('Opname Stok');
  let txt = await bodyText();
  check('Opname Stok page renders with valuation', /Opname Stok/.test(txt) && /Valuasi/i.test(txt));

  // create opname session
  await page.fill('#opn-loc', 'Gudang Utama');
  await page.fill('#opn-notes', 'opname uji otomatis');
  await page.locator('button:has-text("Buat Sesi Opname")').click();
  await page.waitForTimeout(1000);
  txt = await bodyText();
  check('Opname session created', /OPN-|opn-/i.test(txt) || /Gudang Utama/.test(txt));

  // add item (physical 10 → diff -2)
  await page.locator('#opn-item-prod').selectOption({ index: 1 });
  await page.fill('#opn-item-qty', '10');
  await page.locator('button:has-text("Tambah")').last().click();
  await page.waitForTimeout(800);
  txt = await bodyText();
  check('Opname item added with negative difference', /-2/.test(txt));

  // complete opname
  page.once('dialog', (d) => d.accept());
  await page.locator('button:has-text("Selesaikan Opname")').click();
  await page.waitForTimeout(1500);
  txt = await bodyText();
  check('Opname completed', /completed/.test(txt));

  // verify stock is now 10
  const prods = await page.evaluate(async () => (await window.vyapara.getProducts({ token: '', includeInactive: false })).data);
  const p = Array.isArray(prods) ? prods.find((x) => x.sku === 'OPN-A4-001') : null;
  check('Stock adjusted to physical (10)', !!p && p.stock === 10, `stock=${p?.stock}`);

  const pass = results.filter((r) => r.ok).length;
  const fail = results.length - pass;
  console.log(`SUMMARY ${pass} PASS / ${fail} FAIL (${results.length} checks)`);
  await app.close();
  fs.rmSync(profile, { recursive: true, force: true });
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error('E2E-OPN ERROR:', e); process.exit(1); });
