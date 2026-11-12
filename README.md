# VYAPARA — Business Management

Dokumentasi pembangunan aplikasi Windows untuk toko ATK, percetakan,
fotokopi, laminating, dan jilid.

## Target

- VYAPARA Desktop: Electron + React + TypeScript.
- Database lokal: SQLite + Drizzle ORM.
- Cloud tahap awal: Supabase PostgreSQL.
- Owner Dashboard: Next.js web.
- Masa depan: Node.js API + PostgreSQL pada VPS.
- Offline-first: transaksi tetap berjalan tanpa internet.
- Unified order: satu invoice dapat berisi ATK, banner, fotokopi,
  laminating, dan jilid.

## Workspace VS Code

Pertahankan folder referensi yang sudah ada: - `Design Reference/` -
`VYAPARA_Visual_Assets/`

Claude Code wajib memeriksa isi kedua folder secara read-only sebelum
membuat desain atau mengubah aset.

## Cara pakai

1.  Ekstrak ZIP.
2.  Salin seluruh file Markdown ke root workspace VS Code.
3.  Buka `MASTER_PROMPT_CLAUDE_CODE.md`.
4.  Kirim prompt ke Claude Code.
5.  Minta Claude menjalankan Phase 0 (audit) saja.
6.  Tinjau hasil audit sebelum menyetujui Phase 1.

## Dokumen

- MASTER_PROMPT_CLAUDE_CODE.md — instruksi utama.
- PROJECT_PLAN.md — tujuan dan ruang lingkup.
- ARCHITECTURE.md — arsitektur teknis.
- DATABASE_DESIGN.md — desain data.
- ROADMAP.md — urutan implementasi.
- DESIGN_SYSTEM.md — identitas dan UI.
- MODULE_SPECIFICATION.md — spesifikasi modul.
- SYNC_ARCHITECTURE.md — offline dan sinkronisasi.
- SECURITY_AND_PRIVACY.md — keamanan.
- TESTING_AND_QA.md — pengujian.
- RELEASE_AND_MIGRATION.md — rilis dan migrasi VPS.
- DECISIONS.md — keputusan yang perlu disetujui.
- PROGRESS.md — progres.
- ASSET_INVENTORY.md — inventaris aset.
- CHANGELOG.md — catatan perubahan.
