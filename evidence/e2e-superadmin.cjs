// E2E — Superadmin portal (F7): provisioning, login, branding control
// Password comes from env: E2E_SUPERADMIN_PASSWORD (no secret in repo).
const { _electron: electron } = require('playwright');
const path = require('path');
const os = require('os');
const fs = require('fs');
const root = process.cwd();
const results = [];
const check = (name, ok) => { results.push({ name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'} | ${name}`); };

const SUPERADMIN_PASSWORD = process.env.E2E_SUPERADMIN_PASSWORD;
if (!SUPERADMIN_PASSWORD) {
  console.log('SKIP | E2E_SUPERADMIN_PASSWORD not set — set it to run this test');
  process.exit(0);
}

(async () => {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'vyapara-e2e-sa-'));
  const app = await electron.launch({
    executablePath: path.join(root, 'node_modules', 'electron', 'dist', 'electron.exe'),
    args: ['--no-sandbox', `--user-data-dir=${profile}`, path.join(root, 'apps', 'desktop', 'out', 'main', 'main.js')],
    env: { ...process.env, NODE_ENV: 'production', VYAPARA_DEV_SEED_SUPERADMIN: '1' },
    timeout: 45000,
  });
  const page = await app.firstWindow({ timeout: 45000 });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  const bodyText = () => page.evaluate(() => document.body.innerText || '');

  // setup admin (fresh profile shows setup screen)
  await page.waitForTimeout(2500);
  await page.fill('#name', 'Store Admin');
  await page.fill('#email', 'admin@e2e.test');
  await page.fill('#password', 'rahasia123456');
  await page.fill('#confirm', 'rahasia123456');
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => /omzet hari ini/i.test(document.body.innerText || ''), undefined, { timeout: 15000 });
  check('Admin setup completes', true);

  // F7 opens portal with dark themed login
  await page.keyboard.press('F7');
  await page.waitForTimeout(600);
  let txt = await bodyText();
  check('F7 opens Superadmin portal login', /SUPERADMIN/.test(txt) && /Portal Rahasia/i.test(txt));

  // login as seeded superadmin
  await page.locator('input[type="email"]').last().fill('superadmin@assyaref.dev');
  await page.locator('input[type="password"]').last().fill(SUPERADMIN_PASSWORD);
  await page.locator('button:has-text("Buka Portal")').click();
  await page.waitForTimeout(1500);
  txt = await bodyText();
  check('Superadmin login accepted', /SUPERADMIN PORTAL/.test(txt) || /Branding/.test(txt) || /Danger Zone/.test(txt));

  // branding: rename app
  await page.locator('button:has-text("Branding")').first().click().catch(() => {});
  await page.waitForTimeout(300);
  const appNameInput = page.locator('input[value="VYAPARA"]').first();
  await appNameInput.fill('KEDAI SINAR');
  await page.locator('button:has-text("Simpan")').first().click();
  await page.waitForTimeout(1200);
  check('Branding app name saved and applied', await page.evaluate(() => document.title.includes('KEDAI SINAR')));

  // danger zone reachable
  await page.locator('button:has-text("Danger Zone")').first().click();
  await page.waitForTimeout(300);
  txt = await bodyText();
  check('Danger Zone renders with reset guard', /Factory Reset/i.test(txt) && /HAPUS-SEMUA-DATA/.test(txt));

  // close portal
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  txt = await bodyText();
  check('Escape closes portal back to app', !/SUPERADMIN/.test(txt) || /Dashboard/.test(txt));

  const pass = results.filter((r) => r.ok).length;
  const fail = results.length - pass;
  console.log(`SUMMARY ${pass} PASS / ${fail} FAIL (${results.length} checks)`);
  await app.close();
  fs.rmSync(profile, { recursive: true, force: true });
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error('E2E-SA ERROR:', e); process.exit(1); });
