const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const file = 'file:///' + path.resolve(process.argv[2]).replace(/\\/g, '/');
  await page.goto(file, { waitUntil: 'networkidle', timeout: 60000 });
  const out = process.argv[3];
  await page.pdf({
    path: out,
    format: 'A4',
    printBackground: true,
    margin: { top: '14mm', bottom: '16mm', left: '14mm', right: '14mm' },
    displayHeaderFooter: true,
    headerTemplate: '<div style="font-size:8px;color:#64748B;width:100%;text-align:center;padding-top:4px;border-bottom:1px solid #E2E8F0">VYAPARA Business Management — Panduan Penggunaan v1.0.0</div>',
    footerTemplate: '<div style="font-size:8px;color:#64748B;width:100%;display:flex;justify-content:space-between;padding:0 14mm;border-top:1px solid #E2E8F0;padding-top:4px"><span>© 2026 VYAPARA Business Management</span><span>Halaman <span class="pageNumber"></span> / <span class="totalPages"></span></span></div>',
  });
  await browser.close();
  console.log('written', out);
  process.exit(0);
})().catch((e) => { console.error('ERR', e); process.exit(1); });
