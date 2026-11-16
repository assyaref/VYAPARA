// E2E — Faktur Pemasok: create → pay partial → pay full, via the real UI
const { _electron: electron } = require('playwright');
const path = require('path');
const os = require('os');
const fs = require('fs');
const root = process.cwd();
const results = [];
const check = (name, ok) => { results.push({ name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'} | ${name}`); };

(async () => {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'vyapara-e2e-inv-'));
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

  // setup
  await page.waitForTimeout(2000);
  await page.fill('#name', 'Inv Admin');
  await page.fill('#email', 'inv@e2e.test');
  await page.fill('#password', 'rahasia123456');
  await page.fill('#confirm', 'rahasia123456');
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => /omzet hari ini/i.test(document.body.innerText || ''), undefined, { timeout: 15000 });
  check('Admin setup completes', true);

  // seed a supplier via IPC (fast)
  const sup = await page.evaluate(async () => {
    const r = await window.vyapara.getSuppliers({ token: '', includeInactive: false });
    if (Array.isArray(r?.data) && r.data.length) return r.data[0].id;
    const c = await window.vyapara.createSupplier({ token: '', name: 'PT E2E Inv Supplier', contactPerson: 'Budi', phone: '08123' });
    return c?.data?.id ?? null;
  });
  check('Supplier available for invoice', !!sup);

  // nav to Faktur Pemasok
  await nav('Faktur Pemasok');
  let txt = await bodyText();
  check('Faktur Pemasok page renders', /Daftar Faktur/.test(txt) && /total hutang pemasok/i.test(txt));

  // open create modal
  await page.locator('button:has-text("Faktur Baru")').click();
  await page.waitForTimeout(300);
  await page.locator('#f-supplier').selectOption(sup);
  await page.locator('#f-due').fill(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
  await page.locator('#f-tax').fill('0');
  await page.locator('input[placeholder*="Kertas"]').first().fill('Kertas A4 80gsm');
  await page.locator('table tbody input[type="number"]').nth(0).fill('10'); // qty
  await page.locator('table tbody input[type="number"]').nth(1).fill('50000'); // unitPrice
  await page.locator('button:has-text("Simpan Faktur")').click();
  await page.waitForTimeout(1500);
  txt = await bodyText();
  check('Invoice created, visible in list', /SI\d{8}-\d{4}/.test(txt));
  if (!/SI\d{8}-\d{4}/.test(txt)) {
    await app.close();
    fs.rmSync(profile, { recursive: true, force: true });
    process.exit(1);
  }

  // pay partial
  await page.locator('button:has-text("Bayar")').first().click();
  await page.waitForTimeout(300);
  await page.locator('#pay-amount').fill('250000');
  await page.locator('button:has-text("Bayar Sekarang")').click();
  await page.waitForTimeout(1200);
  txt = await bodyText();
  check('Invoice moved to Sebagian after partial payment', /Sebagian/.test(txt));

  // pay the rest
  await page.locator('button:has-text("Bayar")').first().click();
  await page.waitForTimeout(300);
  await page.locator('#pay-amount').fill('250000');
  await page.locator('button:has-text("Bayar Sekarang")').click();
  await page.waitForTimeout(1200);
  const tbodyTxt = await page.locator('table tbody').innerText();
  check('Invoice fully Lunas', /Lunas/.test(tbodyTxt) && !/Sebagian/.test(tbodyTxt));

  const pass = results.filter((r) => r.ok).length;
  const fail = results.length - pass;
  console.log(`SUMMARY ${pass} PASS / ${fail} FAIL (${results.length} checks)`);
  await app.close();
  fs.rmSync(profile, { recursive: true, force: true });
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error('E2E-INV ERROR:', e); process.exit(1); });
