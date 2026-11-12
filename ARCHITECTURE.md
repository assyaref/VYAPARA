# Architecture — VYAPARA

## High-level

``` mermaid
flowchart TB
  UI[Electron React Renderer]
  PRE[Secure Preload IPC]
  MAIN[Electron Main + Use Cases]
  DB[(SQLite Local)]
  SYNC[Transactional Outbox + Sync]
  SUPA[(Supabase PostgreSQL)]
  WEB[Next.js Owner Dashboard]
  VPS[Future Node.js API + PostgreSQL]
  UI --> PRE --> MAIN
  MAIN --> DB
  MAIN --> SYNC --> SUPA
  WEB --> SUPA
  SYNC -. future provider .-> VPS
  WEB -. future API .-> VPS
```

## Process boundaries

Renderer hanya UI. Preload menyediakan API typed dan allowlist. Main
process menjalankan use cases, database, printing, file access
tervalidasi, dan sync.

## Suggested structure

``` text
electron/main/{ipc,services,database,sync,printing}
electron/preload
src/{app,components,features,domain,application,shared}
web/{app,components,features}
shared/{contracts,schemas,types}
db/{sqlite,postgres,migrations}
tests/{unit,integration,e2e}
docs
```

Sesuaikan dengan konvensi project existing; jangan refactor besar tanpa
alasan.

## Domain boundaries

Catalog, Sales, Fulfillment, Inventory, Procurement, Finance, Identity,
Reporting, Sync, Settings.

## Provider interfaces

`CloudSyncProvider`, `CloudAuthProvider`, `CloudFileStorageProvider`,
`ReportDataProvider`. Domain entities tidak boleh bergantung pada
Supabase SDK.

## Data ownership

SQLite authoritative untuk operasi desktop langsung. Cloud berisi data
yang sudah diterima. Dashboard menunjukkan freshness. Jangan gunakan
last-write-wins untuk pembayaran, stok, atau invoice.

## Security Electron

`contextIsolation: true`, `nodeIntegration: false`, typed IPC, Zod
validation, CSP, navigation restrictions. Tidak ada arbitrary
shell/filesystem bridge.

## Reporting

Setiap laporan menyertakan periode, timezone, last sync, pending count,
dan status kelengkapan.
