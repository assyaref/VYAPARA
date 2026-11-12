# Asset Inventory — VYAPARA

Tanggal audit: 2026-11-12 (Phase 0). Metode: inspeksi **read-only**. Tidak ada
file aset yang dihapus, dipindah, diganti nama, atau ditimpa.

Cara pemeriksaan: setiap PNG dibaca oleh decoder PNG berbasis Python
standard library (Pillow tidak terpasang) untuk mendapatkan dimensi, color
type, chunk, histogram alpha, dan hash SHA-256 (16 karakter pertama). Setiap
gambar juga diperiksa secara visual.

## Ringkasan

| Folder | Jumlah file | Format |
|---|---|---|
| `Design Reference/` | 1 | PNG (RGB) |
| `VYAPARA_Visual_Assets/` | 36 | 35 PNG (RGBA) + 1 `README.txt` |

Temuan utama:

1. **Tidak ada master vektor.** Tidak ada SVG, AI, PDF, EPS, ICO, atau ICNS.
   Semua aset adalah crop raster dari brand sheet/mockup buatan AI. Hal ini
   sesuai dengan `VYAPARA_Visual_Assets/README.txt`.
2. **Alpha logo tidak bersih.** Logo, platform mark, layar login/splash, dan
   brand sheet **tidak pernah mencapai alpha 255**. Nilai maksimumnya 254, dan
   sebagian besar piksel "opak" berada di alpha 192–253. Akibatnya logo akan
   tampak sedikit tembus pandang dan pudar di atas latar berwarna. Aset ini
   tidak layak dipakai langsung di produksi.
3. **Ikon modul, ikon aplikasi, dan mockup UI memiliki alpha bersih.** Alpha
   hanya bernilai 0 atau 255 (0% semi-transparan), dengan sudut rounded-square
   transparan.
4. **Resolusi rendah.** Ikon aplikasi terbesar berukuran 287×272 dan tidak
   persegi. Windows `.ico` membutuhkan layer persegi 16–256 px, dan installer
   idealnya memakai sumber ≥512 px. Logo utama berukuran 700×280.
5. **Logo varian Light/Dark menyertakan kartu latar.** `Logo_Light.png`
   memiliki kartu putih rounded, `Logo_Dark.png` memiliki kartu navy rounded,
   dan varian monokrom juga memiliki kartu. Hanya `Logo_Primary_Concept.png`
   yang tampil tanpa kartu.
6. **Swatch warna tidak sama dengan token dokumentasi.** Swatch dirender
   dengan shading. Sampel piksel tengah:

   | File | Sampel piksel | Token `DESIGN_SYSTEM.md` |
   |---|---|---|
   | `Primary_Navy.png` | `#003389` | Navy `#0D47A1` |
   | `Technology_Blue.png` | `#0160D4` | Blue `#1976D2` |
   | `Accent_Orange.png` | `#FD8300` | Orange `#FF8F00` |
   | `Light_Blue.png` | `#C6E3FA` | Light Blue `#E3F2FD` |
   | `Surface_Gray.png` | `#E4E7EB` | Surface `#F5F7FA` |

   **Usulan:** hex di `DESIGN_SYSTEM.md` menjadi sumber kebenaran (lihat Q-012).
7. **Artefak teks AI di mockup.** Contoh: nomor invoice tertulis
   "INV-2026Ⅎ111-0001" di POS mockup. `Desktop_Dashboard.png` memiliki garis
   tepi hitam hasil crop. Mockup hanya boleh menjadi acuan tata letak, bukan
   sumber teks atau data.
8. **Provenance AI.** `Design Reference/…png` memiliki chunk `caBX` (C2PA
   Content Credentials). Gambar ini dihasilkan oleh AI.
9. **Kemungkinan duplikat.** `Design Reference/Infografis UI Manajemen Bisnis
   VYAPARA.png` (RGB) dan `00_Previews/Overall_Implementation_Overview.png`
   (RGBA) memiliki dimensi 1672×941 dan piksel sudut yang identik. Kemungkinan
   keduanya gambar yang sama dengan format simpan berbeda. Hash berbeda karena
   format berbeda.
10. **Merek pihak ketiga.** `Windows_Platform_Mark`, `Apple_Mark` (glyph App
    Store), dan `Android_Mark` adalah merek dagang Microsoft, Apple, dan
    Google. Ketiganya tidak boleh dipakai sebagai ikon aplikasi VYAPARA.
11. **Simbol ®.** Semua lockup logo memuat "®". Simbol ini hanya boleh dipakai
    jika merek VYAPARA sudah terdaftar (lihat Q-013).

## Inventaris detail

Kolom alpha: **Bersih** berarti alpha hanya 0/255. **Translusen** berarti
piksel opak berada di alpha 192–254 dan tidak ada yang 255. **Tidak ada**
berarti gambar RGB.

### Design Reference/

| Path | Dimensi | Ukuran | Alpha | Isi | Kegunaan |
|---|---|---|---|---|---|
| `Design Reference/Infografis UI Manajemen Bisnis VYAPARA.png` | 1672×941 | 2,18 MB | Tidak ada (RGB) | Infografis: logo, palet, tipografi, dashboard, POS terpadu, splash, login, owner mobile, struk, fitur, alur transaksi, platform | Acuan visual utama (layout, hierarki, gaya). Bukan aset produksi. |

### VYAPARA_Visual_Assets/00_Previews/

| Path | Dimensi | Ukuran | Alpha | Kegunaan |
|---|---|---|---|---|
| `00_Previews/Brand_Asset_Sheet.png` | 1536×1024 | 1,70 MB | Tidak konsisten (38% alpha 0; sisanya translusen, latar blur) | Referensi saja. Jangan dipakai di UI. |
| `00_Previews/Overall_Implementation_Overview.png` | 1672×941 | 2,24 MB | Opak penuh (RGBA, alpha 255) | Kemungkinan duplikat Design Reference. Referensi saja. |

### 01_Logo/

| Path | Dimensi | Ukuran | Alpha | Catatan |
|---|---|---|---|---|
| `01_Logo/Logo_Primary_Concept.png` | 700×280 | 137 KB | Translusen (63% transparan) | Logo terbaik tanpa kartu. Sumber utama untuk **redraw SVG**. |
| `01_Logo/Logo_Light.png` | 390×144 | 58 KB | Translusen | Ada kartu putih rounded yang tertanam. |
| `01_Logo/Logo_Dark.png` | 370×144 | 61 KB | Translusen | Ada kartu navy rounded. Teks putih untuk latar gelap. |
| `01_Logo/Logo_Monochrome_Light.png` | 390×138 | 56 KB | Translusen | Monokrom gelap di atas kartu terang. Acuan versi struk/thermal. |
| `01_Logo/Logo_Monochrome_Dark.png` | 370×138 | 57 KB | Translusen | Monokrom putih di atas kartu hitam. |

### 02_App_Icons/

| Path | Dimensi | Ukuran | Alpha | Catatan |
|---|---|---|---|---|
| `02_App_Icons/Windows_App_Icon.png` | 287×272 | 72 KB | Bersih | Ikon "V" di rounded-square navy. **Tidak persegi.** Perlu redraw untuk `.ico`. |
| `02_App_Icons/VYAPARA_Square_Icon.png` | 182×182 | 29 KB | Bersih | Persegi tetapi kecil. Cukup untuk favicon/sementara, tidak cukup untuk installer. |
| `02_App_Icons/Windows_Platform_Mark.png` | 159×169 | 15 KB | Translusen | Logo Microsoft Windows (merek pihak ketiga). Jangan dipakai. |
| `02_App_Icons/Apple_Mark.png` | 159×169 | 22 KB | Translusen | Glyph App Store (merek Apple). Jangan dipakai. |
| `02_App_Icons/Android_Mark.png` | 154×169 | 17 KB | Translusen | Android robot (merek Google). Jangan dipakai. |
| `02_App_Icons/Web_Mark.png` | 164×169 | 26 KB | Translusen | Ikon globe generik. Bisa diganti ikon library. |

### 03_Module_Icons/

Semua file berukuran 150×135, alpha bersih (28,52% transparan, yaitu sudut
rounded-square), dan berukuran 15–19 KB. Bentuknya tile berwarna dengan
glyph putih.

| Path | Modul |
|---|---|
| `03_Module_Icons/POS.png` | POS / Penjualan |
| `03_Module_Icons/Products.png` | ATK / Barang |
| `03_Module_Icons/Printing.png` | Percetakan |
| `03_Module_Icons/Documents.png` | Layanan Dokumen |
| `03_Module_Icons/Inventory.png` | Stok & Inventory |
| `03_Module_Icons/Purchasing.png` | Pembelian |
| `03_Module_Icons/Customers.png` | Pelanggan |
| `03_Module_Icons/Finance.png` | Keuangan |
| `03_Module_Icons/Reports.png` | Laporan |
| `03_Module_Icons/Settings.png` | Pengaturan |

Catatan: ukurannya 150×135 dan tidak persegi. Untuk sidebar, ikon garis
vektor (misalnya library ikon open-source yang setara) lebih tajam dan dapat
diberi warna sesuai tema. Tile PNG cocok untuk kartu "Fitur" atau
launcher/dashboard.

### 04_Brand_Colors/

5 file berukuran 130×85 dengan alpha bersih: `Primary_Navy.png`,
`Technology_Blue.png`, `Accent_Orange.png`, `Light_Blue.png`,
`Surface_Gray.png`. File ini hanya ilustrasi. Warna sampelnya tidak sama
dengan hex resmi (lihat tabel di atas).

### 05_Desktop_Branding/

| Path | Dimensi | Ukuran | Alpha | Catatan |
|---|---|---|---|---|
| `05_Desktop_Branding/Splash_Screen.png` | 696×296 | 205 KB | Translusen | Konsep splash. Diimplementasikan ulang sebagai HTML/CSS. |
| `05_Desktop_Branding/Login_Screen.png` | 826×301 | 258 KB | Translusen | Konsep login dengan tagline. Diimplementasikan ulang dalam React. |

### 06_UI_Mockups/

Semua file memiliki alpha bersih (sudut transparan).

| Path | Dimensi | Ukuran | Catatan |
|---|---|---|---|
| `06_UI_Mockups/Desktop_Dashboard.png` | 811×491 | 547 KB | Sidebar navy, 4 KPI card, grafik 7 hari, donut komposisi, pesanan terbaru, stok menipis. Ada garis tepi hitam hasil crop. |
| `06_UI_Mockups/Unified_Order_POS.png` | 636×491 | 405 KB | Tab ATK/Percetakan/Layanan Dokumen/Paket Layanan, katalog, keranjang, Simpan Draft/Cetak Nota/Bayar (F10). Teks invoice rusak. |
| `06_UI_Mockups/Feature_Modules.png` | 641×296 | 275 KB | Contoh struk (Total/Dibayar/Sisa) dan grid fitur. Menampilkan "Multi Outlet (Cabang)" yang **di luar scope awal**. |
| `06_UI_Mockups/Mobile_Owner_Dashboard.png` | 216×296 | 83 KB | Owner dashboard mobile. Resolusi sangat kecil. |
| `06_UI_Mockups/Owner_Report_Preview.png` | 156×296 | 61 KB | Pratinjau laporan. Resolusi sangat kecil, teks tidak terbaca. |

### Lainnya

| Path | Catatan |
|---|---|
| `VYAPARA_Visual_Assets/README.txt` | Menjelaskan struktur folder dan menyatakan bahwa aset adalah crop konsep, bukan master vektor. |

## Rekomendasi penggunaan

| Kebutuhan | Rekomendasi |
|---|---|
| Logo aplikasi/UI | Redraw sebagai SVG (`assets/brand/vyapara-logo.svg`, `-mark.svg`, `-mono.svg`) dengan acuan `Logo_Primary_Concept.png`. Sampai SVG tersedia, PNG boleh dipakai sementara dengan label "placeholder". |
| Ikon Windows (`.ico`) dan installer | Redraw mark "V" menjadi SVG persegi, lalu generate PNG 16/24/32/48/64/128/256 dan `.ico`. Jangan upscale PNG 287×272. |
| Warna | Token hex dari `DESIGN_SYSTEM.md`. |
| Ikon sidebar | Library ikon garis vektor. Tile PNG modul hanya untuk kartu fitur. |
| Splash/Login | Implementasi HTML/CSS/React mengikuti konsep. Jangan memasang gambar mockup. |
| Mockup | Hanya acuan tata letak dan hierarki. |
| Merek pihak ketiga | Jangan dipakai di aplikasi/installer. |

Aset turunan apa pun (SVG, ICO, PNG berbagai ukuran) akan dibuat di folder
**baru** (misalnya `apps/desktop/resources/` atau `assets/brand/`). Folder
sumber tidak akan diubah.
