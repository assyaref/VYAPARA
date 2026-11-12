# Project Plan — VYAPARA

## Visi

Sistem manajemen terpadu untuk toko ATK, percetakan, fotokopi,
laminating, dan jilid.

## Sasaran

- Operasional tetap berjalan tanpa internet.
- Satu invoice untuk gabungan barang dan jasa.
- Stok dan keuangan dapat diaudit.
- Owner dapat melihat laporan online.
- Sync idempotent dan tahan restart.
- Supabase sebagai cloud awal; VPS sebagai target migrasi.

## Pengguna

Owner, Admin, Kasir, Operator Layanan, Supervisor. Rilis awal satu
toko/satu komputer; multi-terminal dan multi-cabang bukan target awal.

## In scope

Windows desktop, POS terpadu, ATK, printing/banner, Layanan Dokumen,
inventory, pelanggan, supplier, procurement, finance, reports, Supabase
sync, web dashboard, backup/restore, Windows installer.

## Out of scope awal

Multi-cabang, marketplace, payment gateway otomatis, payroll, akuntansi
double-entry penuh, multi-terminal real-time kompleks.

## Prinsip

Offline-first; local SQLite untuk transaksi langsung; cloud sebagai
salinan tersinkronisasi; satu order banyak item; payment dan fulfillment
terpisah; keamanan dan audit sebagai standar.

## Deliverables

Source code, migrations, desktop app, web dashboard, sync engine, tests,
backup/restore, installer, user guide, developer guide, migration
runbook.

## Success criteria

Transaksi offline tersimpan setelah restart; retry tidak menggandakan;
order campuran satu invoice; partial fulfillment benar; laporan dapat
direkonsiliasi; dashboard menampilkan freshness; backup dapat
dipulihkan; installer diuji pada Windows bersih.

## Risiko

| Risiko           | Mitigasi                             |
|------------------|--------------------------------------|
| Duplicate sync   | UUID, idempotency, unique constraint |
| Data hilang      | Backup dan recovery test             |
| Conflict         | Conflict queue dan ownership policy  |
| Laporan parsial  | Freshness indicator                  |
| Supabase lock-in | Provider interfaces                  |
| IPC tidak aman   | Typed allowlist dan Zod              |
| HPP salah        | Owner approval dan snapshot          |
| Printer berbeda  | Adapter dan tes perangkat nyata      |
| Scope membesar   | Phase gate                           |
