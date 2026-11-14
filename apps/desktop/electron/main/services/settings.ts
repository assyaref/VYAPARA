import type { AppDatabase } from '../db/open';

export type StoreSettings = {
  taxRateBps: number;
  storeName: string;
  receiptFooter: string;
};

function readValue(db: AppDatabase, key: string, fallback: string): string {
  const row = db.sqlite.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
  return row?.value ?? fallback;
}

export function getSettings(db: AppDatabase): StoreSettings {
  const rawRate = Number(readValue(db, 'tax_rate_bps', '0'));
  return {
    taxRateBps: Number.isInteger(rawRate) && rawRate >= 0 && rawRate <= 10_000 ? rawRate : 0,
    storeName: readValue(db, 'store_name', 'VYAPARA'),
    receiptFooter: readValue(db, 'receipt_footer', 'Terima kasih'),
  };
}

export function updateSettings(db: AppDatabase, input: StoreSettings): StoreSettings {
  const upsert = db.sqlite.prepare(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
  );
  const now = new Date().toISOString();
  const write = db.sqlite.transaction(() => {
    upsert.run('tax_rate_bps', String(input.taxRateBps), now);
    upsert.run('store_name', input.storeName, now);
    upsert.run('receipt_footer', input.receiptFooter, now);
  });
  write();
  return getSettings(db);
}
