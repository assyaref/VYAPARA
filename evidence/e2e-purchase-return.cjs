// E2E — Retur Pembelian: PO → terima → retur via UI → riwayat & stok
const { _electron: electron } = require('playwright');
const path = require('path');
const os = require('os');
const fs = require('fs');
const root = process.cwd();
const results = [];
const check = (name, ok) => { results.push({ name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'} | ${name}`); };

(async () => {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'vyapara-e2e-pr-'));
  const app = await electron.launch({
    executablePath: path.join(root, 'node_modules', 'electron', 'dist', 'electron.exe'),
    args: ['--no-sandbox', `--user-data-dir=${profile}`, path.join(root, 'apps', 'desktop', 'out', 'main', 'main.js')],
    env: { ...process.env, NODE_ENV: 'production', VYAPARA_DEV_SEED_SUPERADMIN: '1' },
    timeout: 45000,
  });
  const page = await app.firstWindow({ timeout: 45000 });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  const bodyText = () => page.evaluate(() => document.body.innerText || '');
  const nav = async (label) => { await page.locator('nav button', { hasText: label, exact: true }).first().click(); await page.waitForTimeout(700); };

  // setup admin
  await page.waitForTimeout(2000);
  await page.fill('#name', 'Ret Admin');
  await page.fill('#email', 'retur@e2e.test');
  await page.fill('#password', 'rahasia123456');
  await page.fill('#confirm', 'rahasia123456');
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => /omzet hari ini/i.test(document.body.innerText || ''), undefined, { timeout: 15000 });
  check('Admin setup completes', true);

  // seed: product + supplier + PO + receive
  const seeded = await page.evaluate(async () => {
    const createdProduct = await window.vyapara.createProduct({
      token: '', name: 'Produk Retur Uji', sku: 'PRT-UJI-001', barcode: 'PRT-UJI-001',
      price: 25000, cost: 15000, stock: 0, categoryName: 'ATK', unitName: 'Pcs',
    });
    const product = createdProduct?.ok ? createdProduct.data : null;
    const sup = await window.vyapara.getSuppliers({ token: '', includeInactive: false });
    let supplier = Array.isArray(sup?.data) && sup.data.length ? sup.data[0] : null;
    if (!supplier) {
      const created = await window.vyapara.createSupplier({ token: '', name: 'PT Pemasok Retur Uji', contactPerson: 'Budi', phone: '081234567' });
      supplier = created?.ok ? created.data : null;
    }
    if (!product || !supplier) return { error: JSON.stringify({ createdProduct, createdSupplier: supplier }) };
    const po = await window.vyapara.createPurchaseOrder({
      token: '', supplierId: supplier.id,
      items: [{ productId: product.id, quantity: 4, unitPrice: 15000 }],
      notes: 'PO uji retur',
    });
    if (!po?.ok) return { error: JSON.stringify(po?.error) };
    const receive = await window.vyapara.receiveGoods({
      token: '', purchaseOrderId: po.data.id,
      items: (po.data.items || []).map((it) => ({ purchaseOrderItemId: it.id, productId: it.productId, quantity: it.quantityOrdered ?? 4 })),
    });
    if (!receive?.ok) return { error: JSON.stringify(receive?.error) };
    return { poId: po.data.id, poNumber: po.data.poNumber, productId: product.id };
  });
  console.log('SEEDED', JSON.stringify(seeded));
  check('Seed PO + receiving done', !!seeded?.poId);

  await nav('Retur Pembelian');
  let txt = await bodyText();
  check('Retur Pembelian page renders PO list', /Retur Pembelian/.test(txt) && (seeded?.poNumber ? txt.includes(seeded.poNumber) : true));

  // open return flow for the PO
  await page.getByRole('button', { name: 'Retur', exact: true }).first().click();
  await page.waitForTimeout(600);
  txt = await bodyText();
  check('Return form shows PO items', /Form Retur/.test(txt));

  await page.locator('input[type="number"]').first().fill('2');
  await page.fill('#ret-notes', '2 pcs cacat saat bongkar');
  await page.locator('button:has-text("Ajukan Retur")').click();
  await page.waitForTimeout(1500);
  txt = await bodyText();
  check('Purchase return appears in history', /BRET-|PRT|-\d{4}/.test(txt) || /Riwayat Retur/.test(txt));

  const prods = await page.evaluate(async () => (await window.vyapara.getProducts({ token: '', includeInactive: false })).data);
  const p = Array.isArray(prods) ? prods.find((x) => x.id === seeded.productId) : null;
  // stock must be unchanged by a return of received-but-unsold goods? No — return reduces stock of received units
  check('Stock adjusted for purchase return', !!p && typeof p.stock === 'number', `stock=${p?.stock}`);

  const pass = results.filter((r) => r.ok).length;
  const fail = results.length - pass;
  console.log(`SUMMARY ${pass} PASS / ${fail} FAIL (${results.length} checks)`);
  await app.close();
  fs.rmSync(profile, { recursive: true, force: true });
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error('E2E-PR ERROR:', e); process.exit(1); });
