# Risk Register — VYAPARA

Dibuat: 2026-11-12 (Phase 0). Skala: Dampak (D) dan Kemungkinan (K) =
Rendah / Sedang / Tinggi.

| ID | Risiko | D | K | Mitigasi | Phase |
|---|---|---|---|---|---|
| R-01 | Workspace **bukan repository Git**, sehingga tidak ada riwayat dan rollback | Tinggi | Pasti (saat ini) | `git init` + `.gitignore` sebelum menulis kode (butuh persetujuan, Q-015) | 1 |
| R-02 | Native module SQLite (`better-sqlite3`) gagal build untuk Electron. **MSVC Build Tools tidak terpasang** di mesin ini. | Tinggi | Sedang | Spike di awal Phase 2: cek prebuilt binary untuk versi Electron terpilih. Alternatif: pasang VS Build Tools atau pilih driver lain (Q-018). | 2 |
| R-03 | TypeScript terbaru adalah 7.0 (compiler native baru). Tooling (typescript-eslint, electron-vite, Drizzle) mungkin belum kompatibel. | Sedang | Sedang | Phase 1 memverifikasi kompatibilitas. Jika bermasalah, pin ke TS 5.x/6.x terakhir yang didukung semua tool, lalu catat di DECISIONS. | 1 |
| R-04 | Versi paket sangat baru (Electron 45, Vite 8, React 19.3, Tailwind 4, Zod 4) sehingga ada risiko breaking change atau dokumentasi lama | Sedang | Sedang | Pin versi exact, commit lockfile, dan baca changelog/dokumentasi resmi sebelum memakai API | 1+ |
| R-05 | Aset logo hanya raster translusen (alpha ≤254), tidak ada vektor, ikon ≤287 px | Sedang | Pasti | Redraw SVG + generate `.ico`. Placeholder diberi label jelas sampai aset final disetujui. | 1/16 |
| R-06 | Simbol ® dan merek pihak ketiga (Windows/Apple/Android) di aset | Sedang | Sedang | Jangan pakai mark pihak ketiga. Pakai ® hanya jika merek terdaftar (Q-013). | 1 |
| R-07 | Design Reference memuat fitur di luar scope (Multi Outlet/Cabang, PWA/Mobile, selector "Toko Utama", Paket Layanan) | Sedang | Tinggi | Phase gate. Elemen di luar scope tidak dibuat sebagai tombol palsu. Paket Layanan menunggu keputusan (Q-016). | 4–6 |
| R-08 | Definisi laba ("Laba Kotor"), HPP, pajak, pembulatan, dan pengakuan DP belum disetujui | Tinggi | Pasti | Q-002–Q-006. Laporan menampilkan definisi. Tidak ada aturan akuntansi karangan. | 6/11 |
| R-09 | Duplicate transaction saat sync/retry | Tinggi | Sedang | UUID, idempotency key, unique constraint di cloud, inbox dedupe, dan test integrasi | 13 |
| R-10 | Kehilangan data lokal (crash, disk, salah restore) | Tinggi | Sedang | WAL, transaksi atomik, backup konsisten (SQLite backup API), validasi restore, uji pemulihan | 2/15 |
| R-11 | Laporan cloud tampak lengkap padahal ada outbox pending | Tinggi | Sedang | Indikator freshness/pending/last sync di setiap laporan | 13–14 |
| R-12 | Supabase lock-in | Sedang | Sedang | Interface provider. Domain tidak meng-import SDK. Test kontrak provider. | 12 |
| R-13 | Kebocoran service-role key/secret | Tinggi | Rendah | Tidak ada secret di desktop/renderer/repo. `.env.example` saja. Scan sebelum commit. | 12+ |
| R-14 | IPC tidak aman (generic bridge, payload tidak tervalidasi) | Tinggi | Rendah | Allowlist channel typed, Zod di main, `sandbox: true`, CSP, blokir navigasi/`window.open`. Ditetapkan di Phase 1. | 1 |
| R-15 | Variasi printer thermal/scanner | Sedang | Tinggi | Adapter printing + tes perangkat nyata (Q-007/Q-008) | 7 |
| R-16 | Timezone/tanggal salah (UTC vs Asia/Jakarta) memicu laporan harian bergeser | Sedang | Sedang | Simpan UTC, tampilkan dengan timezone toko (Q-009), dan uji batas tengah malam | 2/11 |
| R-17 | Scope creep (16 phase, banyak modul) | Sedang | Tinggi | Satu phase per iterasi, persetujuan owner tiap phase | Semua |
| R-18 | Duplikasi dokumen: root `*.md` vs `docs/*.md` (ASSET_INVENTORY, DECISIONS, PROGRESS) | Rendah | Pasti | Tetapkan lokasi kanonik (Q-014) | 1 |
| R-19 | Path workspace mengandung spasi ("PROJECT - FullStack Developer", "…hybird") | Rendah | Sedang | Quote path di semua script. Uji build/electron-builder dari path ini sejak Phase 1. | 1 |
| R-20 | Ukuran aset (~9 MB PNG) masuk repo | Rendah | Sedang | Putuskan apakah folder referensi di-commit atau di-ignore (Q-015) | 1 |
| R-21 | Code signing installer Windows belum ada, sehingga muncul peringatan SmartScreen | Sedang | Tinggi | Rencanakan sertifikat sebelum Phase 16 (Q-019) | 16 |
