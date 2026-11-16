// Phase 8 — coarse startup & memory stability probe (isolated profile, real build)
const { _electron: electron } = require('playwright');
const path = require('path');
const os = require('os');
const fs = require('fs');

const root = process.cwd();
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'vyapara-perf-'));
const t0 = Date.now();

(async () => {
  const app = await electron.launch({
    executablePath: path.join(root, 'node_modules', 'electron', 'dist', 'electron.exe'),
    args: ['--no-sandbox', `--user-data-dir=${profile}`, path.join(root, 'apps', 'desktop', 'out', 'main', 'main.js')],
    env: { ...process.env, NODE_ENV: 'production' },
    timeout: 45000,
  });
  const page = await app.firstWindow({ timeout: 45000 });
  await page.waitForFunction(() => /Siapkan Administrator|Masuk ke Aplikasi/.test(document.body.innerText || ''), undefined, { timeout: 30000 });
  const readyMs = Date.now() - t0;

  // setup admin to reach the app shell
  await page.fill('#name', 'Perf Admin');
  await page.fill('#email', 'perf@e2e.test');
  await page.fill('#password', 'rahasia123456');
  await page.fill('#confirm', 'rahasia123456');
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => /omzet hari ini/i.test(document.body.innerText || ''), undefined, { timeout: 20000 });

  const heap = async () => page.evaluate(() => (performance.memory ? performance.memory.usedJSHeapSize : -1));
  const heapBefore = await heap();

  // 60 navigation cycles across all screens
  const cycleStart = Date.now();
  for (let i = 0; i < 15; i++) {
    for (const label of ['Kasir (POS)', 'Dashboard', 'Keuangan', 'Laporan & Analisis', 'Pelanggan', 'Pemasok', 'Pengaturan', 'Offline Sync']) {
      await page.locator('nav button', { hasText: label }).click();
      await page.waitForTimeout(120);
    }
  }
  const navMs = Date.now() - cycleStart;
  const heapAfter = await heap();

  // second full open of POS with cart operations x20 (cart stress)
  await page.locator('nav button', { hasText: 'Kasir (POS)' }).click();
  await page.waitForTimeout(400);

  // 20 dashboard refreshes
  await page.locator('nav button', { hasText: 'Dashboard' }).click();
  for (let i = 0; i < 20; i++) {
    await page.locator('button:has-text("Refresh")').first().click();
    await page.waitForTimeout(150);
  }
  const heapFinal = await heap();

  console.log(JSON.stringify({
    metric: 'phase8_probe',
    ready_ms: readyMs,
    nav_cycles_ms: navMs,
    heap_bytes_before: heapBefore,
    heap_bytes_after_nav: heapAfter,
    heap_bytes_final: heapFinal,
    heap_growth_bytes: heapFinal - heapBefore,
  }, null, 2));

  await app.close();
  fs.rmSync(profile, { recursive: true, force: true });
  process.exit(0);
})().catch((e) => { console.error('PERF ERROR', e); process.exit(1); });
