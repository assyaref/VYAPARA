# Phase 1 Plan — Electron, React, Secure IPC Foundation

Status: **Draf. Menunggu persetujuan owner.** Belum ada kode yang ditulis.

## Tujuan

Kerangka aplikasi desktop yang aman dan dapat dibangun: Electron + React +
TypeScript strict + Vite + Tailwind, dengan IPC typed yang tervalidasi Zod,
quality gate lengkap (lint, typecheck, test, build), dan app shell UI kosong
sesuai design system.

## Di luar scope Phase 1

SQLite/Drizzle (Phase 2), login/RBAC (Phase 3), modul bisnis, Supabase, web
dashboard, dan installer final. App shell **tidak** memuat tombol menu palsu.
Item sidebar untuk modul yang belum ada ditampilkan nonaktif dengan label
"Segera" atau tidak ditampilkan sama sekali (lihat keputusan di bawah).

## Deliverables

1. **Repo dan tooling**
   - `git init`, `.gitignore` (node_modules, out/dist, `.env*` kecuali
     `.env.example`, `*.sqlite*`, backup, log), dan `.editorconfig`.
   - Root `package.json` (npm workspaces), `apps/desktop`, `packages/shared`.
   - TypeScript strict (`strict`, `noUncheckedIndexedAccess`,
     `exactOptionalPropertyTypes`), ESLint (flat config), dan Prettier.
2. **Main process** (`apps/desktop/electron/main`)
   - `BrowserWindow` dengan hardening P-006, minimum 1366×768.
   - CSP via header `session.webRequest` + meta.
   - Blokir navigasi/`window.open`, single-instance lock, dan penanganan
     `will-attach-webview` (deny).
   - Registry IPC: hanya channel di allowlist. Payload divalidasi Zod. Error
     dikembalikan sebagai objek aman (tanpa stack/detail internal).
3. **Preload** (`apps/desktop/electron/preload`)
   - `contextBridge.exposeInMainWorld('vyapara', {...})` dengan API typed.
     Tanpa `ipcRenderer` mentah.
4. **Kontrak bersama** (`packages/shared/contracts`)
   - Channel awal (fungsional, bukan dummy): `app:getInfo` (nama, versi,
     platform, mode) dan `app:getEnvironmentStatus` (status online/offline
     dari main).
5. **Renderer** (`apps/desktop/src`)
   - React 19 + Tailwind 4 dengan token warna `DESIGN_SYSTEM.md`, font Inter
     lokal, dan angka tabular.
   - App shell: sidebar navy + logo, header dengan status koneksi
     (Online/Offline dengan teks + warna) dan versi app, serta halaman
     "Beranda" berisi info versi dari IPC.
   - Logo: SVG redraw sementara yang ditandai placeholder (Q-017).
6. **Tests**
   - Vitest: validasi schema IPC (payload valid/invalid), registry menolak
     channel tidak terdaftar, dan util umum.
   - Test konfigurasi keamanan: `webPreferences` sesuai P-006.
   - Playwright (`_electron`) smoke test: app terbuka, judul benar,
     `window.require`/`process` tidak tersedia di renderer, `window.vyapara`
     hanya memiliki key yang di-allowlist, dan navigasi eksternal diblokir.
7. **Docs**: perbarui `docs/PROGRESS.md`, `docs/DECISIONS.md`, CHANGELOG,
   dan tambahkan `docs/DEVELOPER_GUIDE.md` (cara run/build/test).

## Command yang akan dijalankan (setelah disetujui)

```bash
git init
npm init -y                       # root, lalu edit ke workspaces
npm install -D <devDeps exact>    # electron, electron-vite, vite, typescript,
                                  # @vitejs/plugin-react, tailwindcss, @tailwindcss/vite,
                                  # eslint, typescript-eslint, prettier, vitest,
                                  # @playwright/test, electron-builder
npm install react react-dom zod   # + @fontsource/inter
npm run lint
npm run typecheck
npm run test                      # vitest
npm run build                     # electron-vite build
npm run test:e2e                  # playwright electron smoke
npm audit --omit=dev
```

Catatan: `npm install electron` mengunduh binary Electron (~100 MB) dari
GitHub. Tidak ada perintah yang menghapus atau menimpa file di root maupun
folder aset.

## Risiko Phase 1

- R-03 kompatibilitas TS 7. Ada fallback (P-005).
- R-19 path dengan spasi. Build dan E2E diuji dari path ini.
- R-04 versi baru. Semua di-pin exact dan lockfile di-commit.

## Kriteria selesai

Semua command di atas berhasil dan output-nya dicatat. App terbuka di
Windows menampilkan shell dengan status koneksi nyata. Test keamanan lulus.
Dokumentasi diperbarui. Laporan phase berisi daftar file, command, hasil,
dan keterbatasan.

## Butuh keputusan sebelum mulai

- Q-014 (lokasi dokumen), Q-015 (`git init` dan commit aset), Q-013 (®),
  Q-020 (appId; sementara bisa placeholder `id.vyapara.desktop`).
- P-001–P-010 (usulan teknis).
- Sidebar Phase 1: tampilkan menu modul nonaktif berlabel "Segera" **atau**
  hanya Beranda? Saran: hanya Beranda, agar tidak ada UI tanpa fungsi.
