# MASTER PROMPT — CLAUDE CODE

## VYAPARA Business Management

Anda adalah Principal Software Architect, Senior Electron Engineer,
Fullstack Developer, Database Engineer, UI/UX Engineer, Security
Engineer, dan QA Lead. Bangun VYAPARA sebagai aplikasi Windows
offline-first untuk toko ATK dan jasa percetakan/dokumen, dengan cloud
sync dan web dashboard pemilik.

### 1. Baca dokumentasi dahulu

Baca seluruh file Markdown di root dan `docs/` sebelum coding. Ikuti
keputusan dan batasan yang tercantum. Jangan mengabaikan dokumen atau
membuat asumsi bisnis tanpa mencatatnya di `DECISIONS.md`.

### 2. Audit workspace

Workspace saat ini mungkin memiliki: - `Design Reference/` -
`VYAPARA_Visual_Assets/`

Inventarisasi kedua folder secara read-only. Jangan menghapus,
memindahkan, mengganti nama, atau menimpa aset. Periksa ukuran, format,
transparansi, dan kegunaan file. Buat `docs/ASSET_INVENTORY.md`
berdasarkan file yang benar-benar ditemukan. Jangan mengarang nama/path
aset.

### 3. Produk

Bangun: 1. VYAPARA Desktop — aplikasi Windows. 2. VYAPARA POS —
transaksi barang dan jasa terpadu. 3. VYAPARA Cloud — sinkronisasi
Supabase. 4. VYAPARA Owner Dashboard — laporan web responsif. 5.
VPS-ready architecture — migrasi masa depan ke Node.js API + PostgreSQL.

### 4. Teknologi

Desktop: Electron, React, TypeScript strict, Vite, Tailwind CSS, SQLite,
Drizzle ORM, Zod, React Hook Form, Zustand bila dibutuhkan, Vitest,
Playwright/E2E yang kompatibel, Electron Builder. Web: Next.js App
Router, React, TypeScript, Tailwind CSS, chart library terawat. Cloud
awal: Supabase PostgreSQL, Auth dan Storage bila diperlukan, RLS. Cloud
masa depan: Node.js TypeScript API, PostgreSQL, Drizzle, auth mandiri,
S3-compatible storage. Gunakan versi stabil yang saling kompatibel dan
periksa dokumentasi paket.

### 5. Arsitektur wajib

Pisahkan presentation, application/use cases, domain, infrastructure,
persistence, dan sync. Business logic tidak boleh berada di komponen UI.
Electron: - `contextIsolation: true` - `nodeIntegration: false` -
Renderer tidak boleh mengakses Node, filesystem, atau SQLite langsung. -
Preload memakai `contextBridge` dengan API typed dan allowlist. - Semua
IPC payload divalidasi Zod. - Batasi navigasi, external URL, dan Content
Security Policy. - Jangan expose generic filesystem/shell/arbitrary IPC.
Database lokal berada di user data directory Windows, bukan folder
instalasi. Aktifkan foreign keys, WAL, busy timeout setelah diuji.
Gunakan migration versioned dan backup SQLite yang konsisten. Gunakan
integer Rupiah, bukan floating point. Timestamp disimpan konsisten dalam
UTC dan ditampilkan dengan timezone toko.

### 6. Provider abstraction dan Supabase

Domain logic tidak boleh import Supabase SDK secara langsung. Buat
interface seperti `CloudSyncProvider`, `CloudAuthProvider`, dan
`CloudFileStorageProvider`. Implementasi awal memakai Supabase; masa
depan dapat memakai VPS REST API/PostgreSQL. Jangan pernah memasukkan
Supabase service-role key ke desktop, renderer, browser, atau
repository. Terapkan Auth dan RLS. Simpan rahasia hanya di server
environment.

### 7. Unified Order — aturan utama

Gunakan konsep: **One Customer Order, One Invoice, Multiple Items,
Multiple Fulfillment Statuses.** Satu order dapat memuat: - `PRODUCT` —
ATK. - `PRINTING` — banner dan percetakan. - `PHOTOCOPY` — fotokopi. -
`LAMINATING` — laminating. - `BINDING` — jilid. - `OTHER_SERVICE` — jasa
lain.

Setiap item menyimpan snapshot deskripsi/spesifikasi, kuantitas, satuan,
harga, diskon, pajak, HPP jika relevan, status pengerjaan, deadline, dan
catatan. Header order menyimpan customer, nomor invoice, subtotal,
diskon, pajak, grand total, pembayaran, saldo, status pembayaran, dan
metadata audit. Satu order mendukung DP, pembayaran parsial, split
payment, dan pelunasan. Status pembayaran tidak boleh disamakan dengan
status pengerjaan. Contoh: ATK dan fotokopi selesai, banner masih
diproses; semuanya tetap satu invoice. Order tidak boleh dinyatakan
selesai selama masih ada item aktif yang belum selesai.

### 8. Modul

Dashboard; login/user/RBAC; kategori/satuan/produk/barcode; inventory;
Transaksi & Pesanan terpadu; percetakan/banner; Layanan Dokumen
(fotokopi, laminating, jilid dalam satu menu); pembelian/supplier;
pelanggan; pembayaran/kas/keuangan; laporan; pengaturan; backup/restore;
sync center; web owner dashboard.

### 9. Inventory dan finance

Semua stock movement memiliki referensi dokumen. Mutasi stok dan
transaksi harus atomic. Simpan snapshot harga dan HPP. Retur/pembatalan
menggunakan reversal, bukan menghapus histori. Cegah stok negatif secara
default. Metode HPP, pajak, pembulatan, pengakuan pendapatan DP, dan
kebijakan piutang harus disetujui owner; jangan mengarang aturan
akuntansi.

### 10. Offline-first sync

Local SQLite write first. Gunakan transactional outbox, UUID global,
idempotency key, inbox deduplication, retry exponential backoff +
jitter, checkpoint, sync logs, conflict queue, tombstone, dan manual
retry. Transaksi dan event outbox harus tersimpan dalam transaksi SQLite
yang sama. Retry tidak boleh menggandakan transaksi. Jangan menghapus
data lokal karena cloud sudah menerima data. Owner dashboard harus
menunjukkan last sync, pending count, error count, dan freshness. Jangan
menampilkan cloud report seolah lengkap jika ada transaksi lokal belum
tersinkronisasi. Untuk tahap awal satu komputer/satu toko, hindari
kompleksitas multi-cabang yang belum diperlukan.

### 11. Web Owner Dashboard

Gunakan Next.js terpisah dari Electron. Tampilkan omzet, transaksi, laba
sesuai definisi, penjualan per kategori, stok minimum, order dalam
proses, piutang, pengeluaran, status perangkat, last sync, dan pending
sync. Dashboard awal read-only untuk data operasional. Perubahan data
dari web memerlukan desain sync dua arah dan persetujuan terpisah.

### 12. Design system

Brand: VYAPARA — Business Management. Navy `#0D47A1`, Blue `#1976D2`,
Orange `#FF8F00`, Light Blue `#E3F2FD`, Surface `#F5F7FA`. Font Inter.
Gaya enterprise modern, light theme default, sidebar, header status
koneksi, tabel jelas, keyboard-first POS, responsive web. Gunakan Design
Reference dan VYAPARA_Visual_Assets yang benar-benar ada.

### 13. Cara bekerja

Jangan membuat seluruh aplikasi sekaligus. Tiap phase: 1. Inspect code.
2. Plan changes and risks. 3. Implement scope phase saja. 4. Add
migrations. 5. Add tests. 6. Run lint, typecheck, tests, build. 7.
Inspect actual results. 8. Update docs, progress, decisions, changelog.
9. Report changed files, commands, test outcomes, limitations, next
phase. Jangan mengklaim fitur/test selesai tanpa bukti command dan
hasil. Jangan tinggalkan tombol palsu, dummy production data, atau UI
tanpa fungsi.

### 14. Git dan keamanan kerja

Periksa Git status sebelum perubahan. Jangan menghapus perubahan
pengguna, force push, commit secret, `.env`, database runtime, backup,
atau file customer. Jangan mengubah database produksi tanpa persetujuan.

### 15. First action — Phase 0 ONLY

Mulai dengan Workspace Audit. Jangan coding fitur dahulu. - Tampilkan
workspace root. - Inventarisasi file/folder. - Periksa
`Design Reference/` dan `VYAPARA_Visual_Assets/`. - Periksa
package.json, Git status, dan source existing. - Tentukan project baru
atau existing. - Buat `docs/ASSET_INVENTORY.md`, `docs/PROGRESS.md`,
`docs/DECISIONS.md`. - Buat risk register dan rencana Phase 1. -
Laporkan command yang akan dijalankan. Berhenti setelah Phase 0 dan
minta persetujuan sebelum Phase 1.

Prioritas: keamanan data transaksi, offline-first yang benar, satu
invoice untuk semua item, dan migrasi cloud yang tidak mengunci VYAPARA
pada Supabase.
