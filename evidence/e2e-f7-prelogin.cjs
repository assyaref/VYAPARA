// F7 superadmin portal must also work BEFORE login (on the setup/login screen)
const { _electron: electron } = require('playwright');
const path = require('path');
const os = require('os');
const fs = require('fs');
const root = process.cwd();
const results = [];
const check = (name, ok) => { results.push({ name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'} | ${name}`); };

(async () => {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'vyapara-f7-pre-'));
  const app = await electron.launch({
    executablePath: path.join(root, 'node_modules', 'electron', 'dist', 'electron.exe'),
    args: ['--no-sandbox', `--user-data-dir=${profile}`, path.join(root, 'apps', 'desktop', 'out', 'main', 'main.js')],
    env: { ...process.env, NODE_ENV: 'production', VYAPARA_DEV_SEED_SUPERADMIN: '1' },
    timeout: 45000,
  });
  const page = await app.firstWindow({ timeout: 45000 });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  const bodyText = () => page.evaluate(() => document.body.innerText || '');

  await page.waitForTimeout(2500);
  let txt = await bodyText();
  check('Setup screen renders for fresh profile', /Siapkan Administrator/.test(txt));

  await page.keyboard.press('F7');
  await page.waitForTimeout(600);
  txt = await bodyText();
  check('F7 opens superadmin portal on setup screen', /SUPERADMIN/.test(txt) && /Portal Rahasia/i.test(txt));

  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  txt = await bodyText();
  check('Escape closes portal, setup screen back', /Siapkan Administrator/.test(txt));

  const pass = results.filter((r) => r.ok).length;
  const fail = results.length - pass;
  console.log(`SUMMARY ${pass} PASS / ${fail} FAIL (${results.length} checks)`);
  await app.close();
  fs.rmSync(profile, { recursive: true, force: true });
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error('E2E-F7-PRE ERROR:', e); process.exit(1); });
