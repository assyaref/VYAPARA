const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

const input = process.argv[2];
const output = process.argv[3];

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1200,
    height: 1600,
    show: false,
    webPreferences: { contextIsolation: true, sandbox: false },
  });
  await win.loadFile(input);
  await new Promise((r) => setTimeout(r, 2500));
  const pdf = await win.webContents.printToPDF({
    printBackground: true,
    pageSize: 'A4',
    margins: { top: 0.55, bottom: 0.65, left: 0.55, right: 0.55 },
    displayHeaderFooter: false,
  });
  fs.writeFileSync(output, pdf);
  console.log('written', output, pdf.length, 'bytes');
  app.quit();
});
app.on('window-all-closed', () => {});
