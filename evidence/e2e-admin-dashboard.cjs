// Screenshot the owner dashboard through the bundled Electron as a browser
const { _electron: electron } = require('playwright');
const path = require('path');
const root = process.cwd();
(async () => {
  const url = process.argv[2];
  const token = process.argv[3];
  const app = await electron.launch({
    executablePath: path.join(root, 'node_modules', 'electron', 'dist', 'electron.exe'),
    args: ['--no-sandbox', url],
    timeout: 15000,
  });
  const page = await app.firstWindow({ timeout: 15000 });
  page.setViewportSize({ width: 1360, height: 860 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'evidence/admin-gate.png' });
  await page.locator('#token').fill(token);
  await page.locator('#enter').click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'evidence/admin-dashboard.png' });
  await app.close();
  console.log('done');
})().catch((e) => { console.error('ERR', e); process.exit(1); });
