# Decisions — VYAPARA

File ini melanjutkan `DECISIONS.md` di root (yang tidak diubah). D-001–D-010
dan Q-001–Q-011 tetap berlaku sebagaimana tercantum di root. Saran default
**bukan** kebijakan yang disetujui sampai owner mengonfirmasi.

## Confirmed (dari dokumentasi)

D-001 s.d. D-010 sesuai root `DECISIONS.md`.

## Usulan teknis Phase 0 (menunggu persetujuan)

| ID | Usulan | Alasan |
|---|---|---|
| P-001 | Package manager **npm** (v11, sudah terpasang) | pnpm tidak terpasang. npm workspaces cukup dan paling minim gesekan dengan electron-builder. |
| P-002 | Struktur **monorepo npm workspaces**: `apps/desktop`, `apps/web` (Phase 14), `packages/shared` (kontrak, schema Zod, tipe). Di dalam `apps/desktop`: `electron/main/{ipc,services,database,sync,printing}`, `electron/preload`, `src/{app,components,features,domain,application,shared}`. | Mengikuti `ARCHITECTURE.md`, tetapi memisahkan Next.js dan Electron secara bersih serta berbagi kontrak/schema. |
| P-003 | Tooling desktop: **electron-vite** (main/preload/renderer dalam satu konfigurasi Vite) | Mendukung Vite 8 (peer `^6 \|\| ^7 \|\| ^8`). Pola standar untuk Electron + React + TS. |
| P-004 | Versi target (cek npm 2026-11-12): Electron 45.3.1, Vite 8.3.8, React 19.3.1, Tailwind 4.3.5, Zod 4.6.7, Vitest 5.1.0, Playwright 1.65.0, electron-builder 26.18.0. Versi di-pin exact. | Versi stabil terbaru. Kompatibilitas diverifikasi di Phase 1. |
| P-005 | TypeScript: coba 7.0.2. Jika typescript-eslint/electron-vite belum mendukung, fallback ke rilis 5.x/6.x terakhir yang didukung, lalu catat hasilnya. | R-03 |
| P-006 | Hardening Electron Phase 1: `contextIsolation: true`, `nodeIntegration: false`, **`sandbox: true`**, `webSecurity: true`, CSP ketat (tanpa `unsafe-eval` di produksi), blokir `will-navigate` ke luar app, `setWindowOpenHandler` → deny (link eksternal hanya https melalui allowlist), satu instance (`requestSingleInstanceLock`), dan DevTools nonaktif di build produksi. | `SECURITY_AND_PRIVACY.md` |
| P-007 | IPC: kontrak channel di `packages/shared`, schema Zod untuk request/response, validasi di main, preload hanya mengekspos fungsi spesifik (bukan `ipcRenderer` mentah) | Master prompt §5 |
| P-008 | Font Inter di-**bundle lokal** (paket `@fontsource`/file woff2 berlisensi OFL), bukan Google Fonts CDN | Offline-first dan CSP ketat |
| P-009 | Token warna dari `DESIGN_SYSTEM.md` adalah sumber kebenaran, bukan sampel PNG swatch | Lihat ASSET_INVENTORY temuan #6 |
| P-010 | Driver SQLite diputuskan di Phase 2 melalui spike: `better-sqlite3` (didukung penuh Drizzle, perlu binary native untuk Electron) vs alternatif. Phase 1 **tidak** menyentuh database. | R-02 |

## Pertanyaan baru untuk owner

| ID | Pertanyaan | Saran default |
|---|---|---|
| Q-012 | Warna resmi mengikuti hex dokumen atau swatch PNG? | Hex dokumen |
| Q-013 | Apakah merek VYAPARA sudah terdaftar (boleh memakai ®)? | Hapus ® sampai ada bukti pendaftaran |
| Q-014 | Lokasi kanonik dokumen progres/keputusan: root atau `docs/`? | `docs/` untuk dokumen hidup. Root tetap sebagai paket spesifikasi awal. |
| Q-015 | Boleh `git init` di workspace ini? Apakah `Design Reference/` dan `VYAPARA_Visual_Assets/` ikut di-commit? | Ya `git init`. Aset di-commit (~9 MB, tidak berubah) atau dipindah ke Git LFS. |
| Q-016 | "Paket Layanan" (tab di mockup POS): apakah fitur bundel harga diperlukan? | Tunda, bukan bagian spesifikasi |
| Q-017 | Siapa yang akan membuat logo/ikon vektor final? | Claude membuat SVG redraw sementara. Desainer memfinalkan. |
| Q-018 | Boleh memasang Visual Studio Build Tools (C++) bila native module membutuhkan? | Ya, hanya jika prebuilt tidak tersedia |
| Q-019 | Rencana sertifikat code signing untuk installer? | Putuskan sebelum Phase 16 |
| Q-020 | Nama perusahaan/appId untuk installer (contoh `id.vyapara.desktop`)? | Perlu input owner |

## Catatan scope dari Design Reference

Elemen berikut terlihat di mockup tetapi **tidak** diimplementasikan tanpa
persetujuan terpisah: Multi Outlet/Cabang, PWA/Mobile app, selector toko
("Toko Utama"), Paket Layanan, dan edit data dari web. QRIS dicatat manual
(sesuai `MODULE_SPECIFICATION.md`).
