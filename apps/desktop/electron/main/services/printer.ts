/**
 * Thermal/receipt printing service.
 *
 * Approach: render an HTML document sized to the physical paper (58mm / 80mm)
 * into a hidden BrowserWindow and print via the Windows print subsystem. The
 * thermal driver translates to ESC/POS natively. Raw ESC/POS bytes are NOT
 * written directly (requires native bindings built with Visual Studio Build
 * Tools, not available here) — the driver path is the standard Electron
 * approach for thermal printers and is fully compatible with ESC/POS
 * printers (they advertise as normal printers to Windows).
 *
 * Config (stored in settings table, editable from UI / superadmin):
 *   printer_name        — Windows printer name (empty = default/show dialog)
 *   printer_paper_width — '58mm' | '80mm'
 *   printer_silent      — '1' = skip print dialog (default 0)
 */
import { BrowserWindow, app } from 'electron';
import type { AppDatabase } from '../db/open';
import { AppError } from '../errors';

export type PrinterConfig = {
  printerName: string;
  paperWidth: '58mm' | '80mm';
  silent: boolean;
};

const DEFAULT_CONFIG: PrinterConfig = { printerName: '', paperWidth: '80mm', silent: false };

export function getPrinterConfig(appDb: AppDatabase): PrinterConfig {
  const rows = appDb.sqlite
    .prepare(`SELECT key, value FROM settings WHERE key LIKE 'printer_%'`)
    .all() as { key: string; value: string }[];
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const width = map.get('printer_paper_width');
  return {
    printerName: map.get('printer_name') ?? DEFAULT_CONFIG.printerName,
    paperWidth: width === '58mm' || width === '80mm' ? width : DEFAULT_CONFIG.paperWidth,
    silent: (map.get('printer_silent') ?? '0') === '1',
  };
}

export function setPrinterConfig(appDb: AppDatabase, patch: Partial<PrinterConfig>): PrinterConfig {
  const current = getPrinterConfig(appDb);
  const now = new Date().toISOString();
  const upsert = appDb.sqlite.prepare(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
  );
  if (patch.printerName !== undefined) {
    const v = String(patch.printerName).trim().slice(0, 120);
    upsert.run('printer_name', v, now);
    current.printerName = v;
  }
  if (patch.paperWidth !== undefined) {
    if (patch.paperWidth !== '58mm' && patch.paperWidth !== '80mm') {
      throw new AppError('VALIDATION', 'Lebar kertas harus 58mm atau 80mm');
    }
    upsert.run('printer_paper_width', patch.paperWidth, now);
    current.paperWidth = patch.paperWidth;
  }
  if (patch.silent !== undefined) {
    upsert.run('printer_silent', patch.silent ? '1' : '0', now);
    current.silent = patch.silent;
  }
  return current;
}

async function renderPrintWindow(html: string, widthMm: number, heightPx: number, alwaysOnTop = false): Promise<BrowserWindow> {
  const win = new BrowserWindow({
    width: Math.round((widthMm * 96) / 25.4),
    height: heightPx,
    show: false,
    webPreferences: { javascript: false, sandbox: false },
    autoHideMenuBar: true,
    alwaysOnTop,
  });
  await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  return win;
}

function escapeHtml(s: unknown): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

export type ReceiptPayload = {
  storeName: string;
  tagline?: string;
  footer?: string;
  transactionNumber: string;
  date: string;
  cashier?: string;
  customerName?: string | null;
  items: { name: string; qty: number; unitPrice: number; subtotal: number }[];
  subtotal: number;
  discount: number;
  total: number;
  payments: { method: string; amount: number }[];
  change: number;
};

export function buildReceiptHtml(payload: ReceiptPayload, cfg: PrinterConfig): string {
  const idr = (n: number) => 'Rp ' + Math.round(Math.abs(n)).toLocaleString('id-ID');
  const itemsRows = payload.items
    .map(
      (i) => `<div class="ln"><div class="nm">${escapeHtml(i.name)}</div><div class="q">${i.qty} × ${idr(i.unitPrice)}</div><div class="st">${idr(i.subtotal)}</div></div>`,
    )
    .join('');
  const payRows = payload.payments
    .map((p) => `<div class="row"><span>${escapeHtml(p.method)}</span><span>${idr(p.amount)}</span></div>`)
    .join('');
  const width = cfg.paperWidth;
  const storeHtml = escapeHtml(payload.storeName || 'VYAPARA');
  const taglineHtml = payload.tagline ? `<div class="tag">${escapeHtml(payload.tagline)}</div>` : '';

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Receipt</title>
<style>
  @page { size: ${width} auto; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Consolas','Courier New',monospace; font-size: 11px; color: #000; width: ${width}; padding: 8px 6px; }
  .ctr { text-align: center; }
  .store { font-size: 14px; font-weight: 800; letter-spacing: .03em; }
  .tag { font-size: 8px; letter-spacing: .15em; text-transform: uppercase; margin-top: 1px; }
  .divider { border-top: 1px dashed #000; margin: 5px 0; }
  .row { display: flex; justify-content: space-between; font-size: 10px; }
  .ln { margin: 2px 0; }
  .nm { font-size: 10px; }
  .q { font-size: 9px; color: #333; }
  .st { font-size: 10px; text-align: right; }
  .bold { font-weight: 800; }
  .total { font-size: 13px; font-weight: 900; }
  .foot { font-size: 9px; text-align: center; margin-top: 6px; }
</style></head>
<body>
<div class="ctr"><div class="store">${storeHtml}</div>${taglineHtml}</div>
<div class="divider"></div>
<div class="row"><span>No: ${escapeHtml(payload.transactionNumber)}</span></div>
<div class="row"><span>${escapeHtml(payload.date)}</span><span>Kasir: ${escapeHtml(payload.cashier ?? '-')}</span></div>
${payload.customerName ? `<div class="row"><span>Toko: ${escapeHtml(payload.customerName)}</span></div>` : ''}
<div class="divider"></div>
${itemsRows}
<div class="divider"></div>
<div class="row"><span>Subtotal</span><span>${idr(payload.subtotal)}</span></div>
<div class="row"><span>Diskon</span><span>-${idr(payload.discount)}</span></div>
<div class="row total"><span>TOTAL</span><span>${idr(payload.total)}</span></div>
${payRows}
${payload.change > 0 ? `<div class="row"><span>Kembalian</span><span>${idr(payload.change)}</span></div>` : ''}
<div class="divider"></div>
<div class="foot">${escapeHtml(payload.footer ?? 'Terima kasih atas kunjungan Anda')}</div>
</body></html>`;
}

async function printHtml(html: string, cfg: PrinterConfig, widthMm: number, heightPx: number): Promise<void> {
  const win = await renderPrintWindow(html, widthMm, heightPx);
  try {
    await win.webContents.print({ silent: cfg.silent, deviceName: cfg.printerName || undefined, printBackground: true });
  } finally {
    win.close();
  }
}

export async function printReceipt(appDb: AppDatabase, payload: ReceiptPayload): Promise<void> {
  const cfg = getPrinterConfig(appDb);
  const mm = cfg.paperWidth === '58mm' ? 58 : 80;
  await printHtml(buildReceiptHtml(payload, cfg), cfg, mm, 760);
}

export async function printInvoice(appDb: AppDatabase, payload: ReceiptPayload & { dueDate?: string | null }): Promise<void> {
  // Full A4 invoice layout — printer dialog by default (cfg respected for deviceName/silent)
  const cfg = getPrinterConfig(appDb);
  const html = buildInvoiceHtml(payload, cfg);
  await printHtml(html, cfg, 210, 1100); // A4 width
}

export function buildInvoiceHtml(payload: ReceiptPayload & { dueDate?: string | null }, cfg: PrinterConfig): string {
  const idr = (n: number) => 'Rp ' + Math.round(Math.abs(n)).toLocaleString('id-ID');
  const itemsRows = payload.items
    .map(
      (i, idx) => `<tr><td>${idx + 1}</td><td>${escapeHtml(i.name)}</td><td style="text-align:center">${i.qty}</td><td style="text-align:right">${idr(i.unitPrice)}</td><td style="text-align:right">${idr(i.subtotal)}</td></tr>`,
    )
    .join('');
  const payRows = payload.payments
    .map((p) => `<tr><td colspan="4">Pembayaran: ${escapeHtml(p.method)}</td><td style="text-align:right">${idr(p.amount)}</td></tr>`)
    .join('');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Invoice</title>
<style>
  @page { size: A4; margin: 18mm 14mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', 'Segoe UI', sans-serif; font-size: 11px; color: #172033; }
  .brand { display: flex; justify-content: space-between; border-bottom: 3px solid #0D47A1; padding-bottom: 12px; margin-bottom: 18px; }
  .brand-name { font-size: 26px; font-weight: 900; color: #0D47A1; letter-spacing: .02em; }
  .brand-tag { font-size: 10px; letter-spacing: .25em; text-transform: uppercase; color: #FF8F00; font-weight: 800; }
  .doc { font-size: 13px; text-align: right; }
  .doc-title { font-size: 22px; font-weight: 900; color: #0D47A1; }
  .meta { display: flex; gap: 24px; font-size: 10px; margin-bottom: 14px; }
  .meta p { margin: 2px 0; }
  table { width: 100%; border-collapse: collapse; font-size: 10px; }
  th { background: #0D47A1; color: #fff; padding: 6px 8px; text-align: left; font-size: 8px; text-transform: uppercase; letter-spacing: .1em; }
  td { border-bottom: 1px solid #E2E8F0; padding: 6px 8px; }
  tr:nth-child(even) td { background: #F5F7FA; }
  .totals { margin-top: 14px; margin-left: auto; width: 45%; font-size: 11px; }
  .totals-row { display: flex; justify-content: space-between; padding: 2px 0; }
  .grand { border-top: 2px solid #0D47A1; padding-top: 6px; font-size: 14px; font-weight: 900; color: #0D47A1; }
  .foot { margin-top: 26px; font-size: 9px; color: #64748B; border-top: 1px solid #E2E8F0; padding-top: 10px; }
  .sign { display: flex; gap: 80px; margin-top: 46px; }
  .sign-box { width: 170px; border-top: 1px solid #172033; padding-top: 4px; text-align: center; font-size: 9px; text-transform: uppercase; }
</style></head>
<body>
<div class="brand">
  <div><div class="brand-name">${escapeHtml(payload.storeName || 'VYAPARA')}</div><div class="brand-tag">${escapeHtml(payload.tagline ?? 'SISTEM MANAJEMEN USAHA TERPADU')}</div></div>
  <div class="doc"><div class="doc-title">INVOICE</div></div>
</div>
<div class="meta">
  <div><strong>No. Invoice:</strong><p>${escapeHtml(payload.transactionNumber)}</p></div>
  <div><strong>Tanggal:</strong><p>${escapeHtml(payload.date)}</p></div>
  ${payload.dueDate ? `<div><strong>Jatuh Tempo:</strong><p>${escapeHtml(payload.dueDate)}</p></div>` : ''}
  <div><strong>Kasir:</strong><p>${escapeHtml(payload.cashier ?? '-')}</p></div>
  ${payload.customerName ? `<div><strong>Pelanggan:</strong><p>${escapeHtml(payload.customerName)}</p></div>` : ''}
</div>
<table>
<thead><tr><th>#</th><th>Produk/Layanan</th><th style="text-align:center">Qty</th><th style="text-align:right">Harga</th><th style="text-align:right">Subtotal</th></tr></thead>
<tbody>${itemsRows}</tbody>
</table>
<div class="totals">
  <div class="totals-row"><span>Subtotal</span><span>${idr(payload.subtotal)}</span></div>
  <div class="totals-row"><span>Diskon</span><span>-${idr(payload.discount)}</span></div>
  <div class="totals-row grand"><span>TOTAL</span><span>${idr(payload.total)}</span></div>
  ${payRows}
</div>
<div class="sign"><div class="sign-box">Penerima</div><div class="sign-box">Hormat Kami</div></div>
<div class="foot">${escapeHtml(payload.footer ?? 'Terima kasih atas kepercayaan Anda.')}</div>
</body></html>`;
}

export async function listPrinters(): Promise<string[]> {
  return new Promise((resolve) => {
    const win = new BrowserWindow({ show: false, webPreferences: { sandbox: false } });
    win.webContents.getPrintersAsync()
      .then((list) => {
        const names = (list as any[]).map((p) => p.displayName || p.name).filter(Boolean);
        win.close();
        resolve(names);
      })
      .catch(() => {
        win.close();
        resolve([]);
      });
  });
}

export type DeliveryOrderPayload = {
  storeName: string;
  tagline?: string;
  footer?: string;
  transactionNumber: string;
  date: string;
  cashier?: string;
  customerName?: string | null;
  customerPhone?: string | null;
  customerAddress?: string | null;
  customerCity?: string | null;
  items: { productName: string; quantity: number; unitPrice: number; subtotal: number }[];
  subtotal: number;
  notes?: string | null;
};

export function buildDeliveryOrderDotMatrixHtml(payload: DeliveryOrderPayload): string {
  const idr = (n: number) => Math.round(Math.abs(n)).toLocaleString('id-ID');
  const itemsRows = payload.items
    .map((i, idx) => `<tr><td>${idx + 1}.</td><td>${escapeHtml(i.productName)}</td><td style="text-align:center">${i.quantity}</td><td style="text-align:right">${idr(i.unitPrice)}</td><td style="text-align:right">${idr(i.subtotal)}</td></tr>`)
    .join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>DO</title>
<style>
  @page { size: A4; margin: 14mm 12mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Courier New', Courier, monospace; font-size: 11px; color: #000; }
  .ctr { text-align: center; }
  .store { font-size: 15px; font-weight: 700; letter-spacing: .04em; border-bottom: 2px solid #000; padding-bottom: 4px; margin-bottom: 2px; }
  .do-title { font-size: 11px; letter-spacing: .2em; }
  .divider { border-top: 1px dashed #000; margin: 6px 0; }
  .meta { font-size: 10px; }
  .meta p { margin: 1px 0; }
  .cust { border: 1px solid #000; padding: 6px 8px; margin: 6px 0; font-size: 10px; }
  .cust-title { font-size: 9px; letter-spacing: .15em; }
  .cust-name { font-weight: 700; font-size: 12px; }
  table { width: 100%; border-collapse: collapse; font-size: 10px; }
  th, td { border-bottom: 1px solid #000; padding: 3px 6px; }
  th { border-top: 2px solid #000; border-bottom: 2px solid #000; text-align: left; font-size: 9px; letter-spacing: .1em; }
  .totals { margin-left: auto; width: 45%; margin-top: 6px; font-size: 11px; }
  .row { display: flex; justify-content: space-between; }
  .grand { border-top: 2px solid #000; padding-top: 4px; font-weight: 700; font-size: 12px; }
  .notes { border: 1px solid #000; padding: 5px 8px; margin: 6px 0; font-size: 10px; }
  .sig { display: flex; gap: 60px; margin-top: 40px; }
  .sig-box { width: 170px; border-top: 1px solid #000; padding-top: 3px; text-align: center; font-size: 9px; letter-spacing: .1em; }
  .foot { font-size: 8px; margin-top: 14px; border-top: 1px dashed #000; padding-top: 6px; }
</style></head>
<body>
<div class="ctr"><div class="store">${escapeHtml(payload.storeName || 'VYAPARA')}</div><div class="do-title">DELIVERY ORDER — SURAT JALAN</div></div>
<div class="divider"></div>
<div class="meta">
  <p>No.      : <strong>${escapeHtml(payload.transactionNumber)}</strong></p>
  <p>Tanggal  : ${escapeHtml(payload.date)}</p>
  <p>Kasir    : ${escapeHtml(payload.cashier ?? '-')}</p>
</div>
<div class="cust">
  <div class="cust-title">KEPADA YTH.</div>
  <div class="cust-name">${escapeHtml(payload.customerName || 'Pelanggan Umum / Walk-in')}</div>
  ${payload.customerPhone ? `<div>${escapeHtml(payload.customerPhone)}</div>` : ''}
  ${payload.customerAddress ? `<div>${escapeHtml(payload.customerAddress)}${payload.customerCity ? `, ${escapeHtml(payload.customerCity)}` : ''}</div>` : ''}
</div>
<table>
<thead><tr><th>#</th><th>Produk / Layanan</th><th style="text-align:center">Qty</th><th style="text-align:right">HARGA</th><th style="text-align:right">SUBTOTAL</th></tr></thead>
<tbody>${itemsRows}</tbody>
</table>
<div class="totals">
  <div class="row"><span>Subtotal</span><span>${idr(payload.subtotal)}</span></div>
  <div class="row grand"><span>TOTAL</span><span>${idr(payload.subtotal)}</span></div>
</div>
${payload.notes ? `<div class="notes"><strong>Catatan:</strong> ${escapeHtml(payload.notes)}</div>` : ''}
<p style="font-size:9px;margin-top:8px">Barang yang tercantum di atas telah diserahkan dalam kondisi baik.</p>
<div class="sig">
  <div class="sig-box">Penerima</div>
  <div class="sig-box">Kasir / Pengirim</div>
</div>
<div class="foot">${escapeHtml(payload.footer ?? '')}</div>
</body></html>`;
}

export async function printDeliveryOrder(appDb: AppDatabase, payload: DeliveryOrderPayload): Promise<void> {
  const cfg = getPrinterConfig(appDb);
  const html = buildDeliveryOrderDotMatrixHtml(payload);
  await printHtml(html, cfg, 210, 1100);
}
