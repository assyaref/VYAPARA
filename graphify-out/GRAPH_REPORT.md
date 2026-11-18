# Graph Report - VYAPARA POS Windows Desktop hybird  (2026-11-18)

## Corpus Check
- 193 files · ~185,438 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 18 file(s) not represented in the graph (top: .pid 8, (none) 3, .css 1)

## Summary
- 1619 nodes · 3259 edges · 114 communities (83 shown, 31 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `59f4781b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- useAuth
- web/package.json
- e2e-acceptance.cjs
- compilerOptions
- compilerOptions
- compilerOptions
- compilerOptions
- devDependencies
- devDependencies
- desktop/package.json
- scripts
- shared/package.json
- scripts
- electron-vite
- sync-server/package.json
- src/sync.ts
- compilerOptions
- stress-4.5.test.ts
- procurement.ts
- procurement.ts
- sync
- outbox.ts
- AppError
- stress-4.5.test.ts
- vyapara.d.ts
- conflict-detector.ts
- createWindow
- main/db/open.ts
- schema.ts
- inventory.ts
- schemas.ts
- e2e-f7-prelogin.cjs
- reports.ts
- e2e-mgmt-acceptance.cjs
- build
- auth.ts
- applyMigrations
- VyaparaDatabase
- sql.d.ts
- e2e-debug-pos.cjs
- PurchaseReturns.tsx
- e2e-loyalty.cjs
- e2e-shot-pos.cjs
- e2e-procurement.cjs
- reports.ts
- e2e-unpacked.cjs
- perf-probe.cjs
- StockOpname.tsx
- acceptance-4.2.test.ts
- inbound.ts
- main.ts
- transactions.ts
- App
- pos.ts
- Procurement.tsx
- App.tsx
- db.test.ts
- Products.tsx
- e2e-supplier-invoice.cjs
- Reports.tsx
- src/db/open.ts
- printer.ts
- e2e-smoke.cjs
- assets.d.ts
- eslint@^9.21.2
- Settings.tsx
- e2e-purchase-return.cjs
- POS.tsx
- desktop/package.json
- ref_fs
- dependencies
- e2e-superadmin.cjs
- @neondatabase/serverless@^1.2.0
- ref_playwright
- tsconfig.electron.json
- e2e-stock-opname.cjs
- admin.ts
- autoprefixer@^10.4.16
- steps
- app.ts
- eslint@^9.21.2
- ref_react
- drizzle-kit
- eslint-plugin-react@^7.37.4
- eslint-plugin-react@^7.37.4
- @fontsource/inter@^5.2.2
- tailwindcss@^4.3.5
- typescript-eslint@^8.24.1
- e2e-backup-shot.cjs
- tailwindcss@^4.3.5
- @tailwindcss/vite@^4.3.5
- @types/node@^22.13.1
- sync-server.test.ts
- ref_path
- typescript-eslint@^8.24.1
- devices.ts
- import-export.ts
- workspaces
- vite@^8.3.8
- services/sync.ts
- AppDatabase

## God Nodes (most connected - your core abstractions)
1. `AppError` - 97 edges
2. `AppDatabase` - 64 edges
3. `createWindow()` - 45 edges
4. `setupAdmin()` - 33 edges
5. `useAuth` - 29 edges
6. `createSyncCoordinator()` - 26 edges
7. `compilerOptions` - 20 edges
8. `App()` - 19 edges
9. `compilerOptions` - 19 edges
10. `applyInboundEventAtomically()` - 18 edges

## Surprising Connections (you probably didn't know these)
- `runDownloadOnce()` --calls--> `encodeCursor()`  [EXTRACTED]
  apps/desktop/electron/main/sync/download.ts → packages/shared/src/sync.ts
- `createDb()` --calls--> `AppDatabase`  [EXTRACTED]
  apps/desktop/electron/main/services/auth.test.ts → apps/desktop/electron/main/db/open.ts
- `createDb()` --calls--> `AppDatabase`  [EXTRACTED]
  apps/desktop/electron/main/services/finance.test.ts → apps/desktop/electron/main/db/open.ts
- `createDb()` --calls--> `AppDatabase`  [EXTRACTED]
  apps/desktop/electron/main/services/supplier.payment.test.ts → apps/desktop/electron/main/db/open.ts
- `createDb()` --calls--> `AppDatabase`  [EXTRACTED]
  apps/desktop/electron/main/services/supplier.test.ts → apps/desktop/electron/main/db/open.ts

## Import Cycles
- None detected.

## Communities (114 total, 31 thin omitted)

### Community 0 - "useAuth"
Cohesion: 0.12
Nodes (18): AuthState, useAuth, User, UserRole, CatalogPage(), Category, Unit, Finance() (+10 more)

### Community 1 - "web/package.json"
Cohesion: 0.06
Nodes (42): dependencies, react@^19.3.1, react-dom@^19.3.1, devDependencies, autoprefixer@^10.4.16, eslint@^9.21.2, eslint-plugin-react@^7.37.4, globals@^6.7.2 (+34 more)

### Community 2 - "e2e-acceptance.cjs"
Cohesion: 0.25
Nodes (6): { _electron: electron }, fs, os, path, results, root

### Community 3 - "compilerOptions"
Cohesion: 0.09
Nodes (22): compilerOptions, allowSyntheticDefaultImports, downlevelIteration, esModuleInterop, exactOptionalPropertyTypes, forceConsistentCasingInFileNames, isolatedModules, lib (+14 more)

### Community 4 - "compilerOptions"
Cohesion: 0.10
Nodes (20): compilerOptions, allowSyntheticDefaultImports, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, jsx, lib, module (+12 more)

### Community 5 - "compilerOptions"
Cohesion: 0.10
Nodes (20): compilerOptions, allowSyntheticDefaultImports, downlevelIteration, esModuleInterop, exactOptionalPropertyTypes, forceConsistentCasingInFileNames, isolatedModules, lib (+12 more)

### Community 6 - "compilerOptions"
Cohesion: 0.09
Nodes (22): compilerOptions, allowSyntheticDefaultImports, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, jsx, lib, module (+14 more)

### Community 7 - "devDependencies"
Cohesion: 0.10
Nodes (21): devDependencies, autoprefixer@^10.4.16, drizzle-orm@^0.45.4, electron-builder@^26.18.0, @fontsource/inter@^5.2.2, globals@^6.1.0, postcss@^8.4.33, @types/react-dom@^19.3.0 (+13 more)

### Community 8 - "devDependencies"
Cohesion: 0.08
Nodes (35): devDependencies, drizzle-orm@^0.45.4, electron@^45.3.1, globals@^6.1.0, @playwright/test@^1.65.0, postcss@^8.4.33, prettier@^3.5.3, @tailwindcss/vite@^4.3.5 (+27 more)

### Community 9 - "desktop/package.json"
Cohesion: 0.14
Nodes (14): dependencies, better-sqlite3@^13.1.1, electron-pos-printer@^1.4.0, electron-updater@^6.8.11, jsbarcode@^3.11.0, react@^19.3.1, react-dom@^19.3.1, zustand@^5.1.0 (+6 more)

### Community 10 - "scripts"
Cohesion: 0.11
Nodes (18): scripts, build, build:electron, build:installer, build:web, dev, electron:build, electron:dev (+10 more)

### Community 11 - "shared/package.json"
Cohesion: 0.20
Nodes (10): dependencies, zod@^4.6.7, zod, main, name, private, scripts, build (+2 more)

### Community 12 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, build, dev, electron:build, electron:dev, lint, preview, typecheck

### Community 14 - "sync-server/package.json"
Cohesion: 0.09
Nodes (27): dependencies, better-sqlite3@^12.8.0, vyapara-shared@workspace:*, zod@^4.3.6, devDependencies, tsx@^4.20.6, @types/better-sqlite3@^7.6.13, @types/node@^25.5.2 (+19 more)

### Community 15 - "src/sync.ts"
Cohesion: 0.08
Nodes (31): DeviceRegisterResponse, DeviceTokenRenewResponse, SyncDownloadResponse, SyncUploadResponse, TransportError, TransportOptions, aggregateIdSchema, aggregateTypeSchema (+23 more)

### Community 16 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, module, moduleResolution, noUncheckedIndexedAccess, outDir, resolveJsonModule (+7 more)

### Community 17 - "stress-4.5.test.ts"
Cohesion: 0.18
Nodes (5): getPendingConflicts(), adminId(), createSale(), seedProduct(), { state }

### Community 18 - "procurement.ts"
Cohesion: 0.10
Nodes (25): cancelPurchaseOrder(), createPurchaseOrder(), createPurchaseReturn(), getGoodsReceiving(), getPurchaseHistory(), getPurchaseOrder(), getPurchaseReturn(), GoodsReceivingItemRecord (+17 more)

### Community 19 - "procurement.ts"
Cohesion: 0.13
Nodes (27): createSupplier(), createSupplierInvoice(), deactivateSupplier(), generateSupplierCode(), getPayablesSummary(), getSupplier(), getSupplierBalance(), getSupplierInvoice() (+19 more)

### Community 20 - "sync"
Cohesion: 0.10
Nodes (19): context, dockerfile, interval, retries, start_period, test, timeout, services (+11 more)

### Community 21 - "outbox.ts"
Cohesion: 0.08
Nodes (27): countOutboxEvents(), appendOutboxEvent(), AppendOutboxInput, eventPayloadSchemas, isoDateSchema, listOutboxEvents(), mapRow(), markOutboxAcknowledged() (+19 more)

### Community 22 - "AppError"
Cohesion: 0.11
Nodes (25): AppError, CatalogCategory, CatalogUnit, createCategory(), createUnit(), deleteCategory(), deleteUnit(), normDescription() (+17 more)

### Community 23 - "stress-4.5.test.ts"
Cohesion: 0.05
Nodes (71): DeviceIdentity, getOrCreateDeviceIdentity(), identityFilePath(), persist(), readPersisted(), SyncOutboxStatus, createSyncCoordinator(), clearTimer() (+63 more)

### Community 24 - "vyapara.d.ts"
Cohesion: 0.40
Nodes (4): *.css, SyncStatusSnapshot, VyaparaIpcResult, Window

### Community 25 - "conflict-detector.ts"
Cohesion: 0.16
Nodes (22): buildConflictRecord(), detectConcurrentUpdate(), detectConflictForEvent(), detectDuplicateEvent(), detectOutOfOrderEvent(), detectStaleVersion(), getEntityVersion(), upsertEntityVersion() (+14 more)

### Community 29 - "createWindow"
Cohesion: 0.16
Nodes (14): checkForUpdates(), downloadUpdate(), getUpdateStatus(), installUpdate(), loadAutoUpdater(), onUpdateStatus(), setStatus(), status (+6 more)

### Community 30 - "main/db/open.ts"
Cohesion: 0.09
Nodes (5): AppOrm, MIGRATIONS, normalizeLegacySchema(), renameColumnIfNeeded(), tableColumns()

### Community 31 - "schema.ts"
Cohesion: 0.05
Nodes (37): cashDrawers, cashMovements, categories, customers, customerTransactions, deviceIdentity, expenseRecords, goodsReceiving (+29 more)

### Community 32 - "inventory.ts"
Cohesion: 0.08
Nodes (38): addOpnameItem(), applyStockMovement(), approveStockAdjustment(), completeStockOpname(), createStockAdjustment(), createStockOpname(), generateOpnameNumber(), getCurrentStock() (+30 more)

### Community 33 - "schemas.ts"
Cohesion: 0.05
Nodes (67): AuthChangePasswordSchema, AuthLoginSchema, AuthSetupSchema, AuthTokenSchema, BestSellingQuerySchema, CashDrawerCloseSchema, CashDrawerOpenSchema, CashDrawerQuerySchema (+59 more)

### Community 34 - "e2e-f7-prelogin.cjs"
Cohesion: 0.25
Nodes (6): { _electron: electron }, fs, os, path, results, root

### Community 35 - "reports.ts"
Cohesion: 0.13
Nodes (25): CashDrawerRecord, CashFlow, CashMovementRecord, closeCashDrawer(), drawerNumber(), DrawerRow, ExpenseRecord, ExpenseRow (+17 more)

### Community 36 - "e2e-mgmt-acceptance.cjs"
Cohesion: 0.25
Nodes (6): { _electron: electron }, fs, os, path, results, root

### Community 37 - "build"
Cohesion: 0.11
Nodes (18): build, appId, directories, electronDist, electronVersion, files, npmRebuild, nsis (+10 more)

### Community 38 - "auth.ts"
Cohesion: 0.15
Nodes (24): assertNotLocked(), assertPasswordPolicy(), assertPermission(), changePassword(), clearFailures(), failures, hashToken(), issueSession() (+16 more)

### Community 39 - "applyMigrations"
Cohesion: 0.29
Nodes (6): applyMigrations(), applySql(), connect(), countOf(), seedCatalog(), splitSql()

### Community 43 - "e2e-debug-pos.cjs"
Cohesion: 0.25
Nodes (7): { _electron: electron }, fs, log, os, path, profile, root

### Community 44 - "PurchaseReturns.tsx"
Cohesion: 0.38
Nodes (6): fmtDate(), idr(), PoDetail, PurchaseOrder, PurchaseReturn, PurchaseReturns()

### Community 45 - "e2e-loyalty.cjs"
Cohesion: 0.25
Nodes (6): { _electron: electron }, fs, os, path, results, root

### Community 46 - "e2e-shot-pos.cjs"
Cohesion: 0.29
Nodes (6): { _electron: electron }, fs, os, path, profile, root

### Community 47 - "e2e-procurement.cjs"
Cohesion: 0.25
Nodes (6): { _electron: electron }, fs, os, path, results, root

### Community 49 - "reports.ts"
Cohesion: 0.18
Nodes (26): BestSellingRow, CashierPerformanceRow, dateExpression(), ExpenseReportRow, getBestSellingProducts(), getCashierPerformance(), getExpenseReport(), getGrossProfit() (+18 more)

### Community 50 - "e2e-unpacked.cjs"
Cohesion: 0.25
Nodes (6): { _electron: electron }, fs, os, path, results, root

### Community 51 - "perf-probe.cjs"
Cohesion: 0.25
Nodes (7): { _electron: electron }, fs, os, path, profile, root, t0

### Community 52 - "StockOpname.tsx"
Cohesion: 0.32
Nodes (7): fmtDate(), idr(), Opname, OpnameItem, Product, StockOpname(), Valuation

### Community 53 - "acceptance-4.2.test.ts"
Cohesion: 0.15
Nodes (12): SyncServerConfig, app, port, applyMigrations(), openSyncServerDb(), createSyncServer(), json(), makeEvent() (+4 more)

### Community 54 - "inbound.ts"
Cohesion: 0.17
Nodes (24): recordCustomerTransaction(), recordStockMovement(), createSalesReturn(), applyAutoResolution(), createConflictRecord(), insertConflictHistory(), updateConflictStatus(), EntityType (+16 more)

### Community 55 - "main.ts"
Cohesion: 0.07
Nodes (44): openAppDatabase(), AppInfo, AppInfoSchema, createWindow(), EnvironmentStatus, EnvironmentStatusSchema, getDb(), getSettingsRow() (+36 more)

### Community 56 - "transactions.ts"
Cohesion: 0.16
Nodes (12): getSettings(), readValue(), StoreSettings, updateSettings(), assertQuantity(), createTransaction(), listTransactions(), readTransaction() (+4 more)

### Community 57 - "App"
Cohesion: 0.24
Nodes (13): App(), applyToDocument(), Branding, cache, DEFAULTS, getBranding(), listeners, loadBranding() (+5 more)

### Community 58 - "pos.ts"
Cohesion: 0.31
Nodes (9): assertMoney(), PAYMENT_METHODS, PaymentLine, PaymentMethod, quoteSale(), SaleQuote, Settlement, settlePayments() (+1 more)

### Community 59 - "Procurement.tsx"
Cohesion: 0.40
Nodes (4): PoItem, Procurement(), PurchaseOrder, ReceiveItem

### Community 60 - "App.tsx"
Cohesion: 0.15
Nodes (14): AlertRow, Dashboard(), dayKey(), fmtIDR(), fmtShort(), icons, idr, KpiCard() (+6 more)

### Community 61 - "db.test.ts"
Cohesion: 0.39
Nodes (3): assertIntegrity(), backupDatabase(), restoreDatabase()

### Community 62 - "Products.tsx"
Cohesion: 0.47
Nodes (5): BarcodeSvg(), EMPTY_FORM, idr(), Product, ProductsPage()

### Community 63 - "e2e-supplier-invoice.cjs"
Cohesion: 0.25
Nodes (6): { _electron: electron }, fs, os, path, results, root

### Community 64 - "Reports.tsx"
Cohesion: 0.17
Nodes (11): BestSellingRow, CashierRow, ExpenseRow, GrossProfitRow, PurchaseRow, Reports(), SalesRow, ShiftRecapRow (+3 more)

### Community 65 - "src/db/open.ts"
Cohesion: 0.18
Nodes (7): here, MIGRATIONS, require, SyncServerDb, AdminOverview, desktopSrc, sharedSrc

### Community 66 - "printer.ts"
Cohesion: 0.22
Nodes (16): buildDeliveryOrderDotMatrixHtml(), buildInvoiceHtml(), buildReceiptHtml(), DEFAULT_CONFIG, DeliveryOrderPayload, escapeHtml(), getPrinterConfig(), listPrinters() (+8 more)

### Community 67 - "e2e-smoke.cjs"
Cohesion: 0.22
Nodes (7): { _electron: electron }, fs, os, path, profile, results, root

### Community 68 - "assets.d.ts"
Cohesion: 0.29
Nodes (6): *.ico, *.jpeg, *.jpg, *.png, *.svg, *.webp

### Community 70 - "Settings.tsx"
Cohesion: 0.33
Nodes (5): AdminUser, Permission, Role, Setting, Settings()

### Community 71 - "e2e-purchase-return.cjs"
Cohesion: 0.25
Nodes (6): { _electron: electron }, fs, os, path, results, root

### Community 72 - "POS.tsx"
Cohesion: 0.33
Nodes (8): CartItem, effectiveUnitPrice(), hueFromString(), idr(), initials(), PAYMENT_METHODS, PaymentLine, POS()

### Community 73 - "desktop/package.json"
Cohesion: 0.12
Nodes (15): author, description, @playwright/test@^1.65.0, @types/react@^19.3.0, vite@^8.3.8, @vitejs/plugin-react@^1.2.0, @playwright/test, @types/react (+7 more)

### Community 74 - "ref_fs"
Cohesion: 0.25
Nodes (5): fs, lines, replacement, content, fs

### Community 75 - "dependencies"
Cohesion: 0.29
Nodes (7): dependencies, react@^19.3.1, react-dom@^19.3.1, zustand@^5.1.0, react, react-dom, zustand

### Community 76 - "e2e-superadmin.cjs"
Cohesion: 0.25
Nodes (6): { _electron: electron }, fs, os, path, results, root

### Community 78 - "ref_playwright"
Cohesion: 0.20
Nodes (7): { chromium }, path, { _electron: electron }, fs, os, path, root

### Community 81 - "tsconfig.electron.json"
Cohesion: 0.29
Nodes (6): compilerOptions, moduleResolution, exclude, extends, include, ./tsconfig.json

### Community 87 - "e2e-stock-opname.cjs"
Cohesion: 0.25
Nodes (6): { _electron: electron }, fs, os, path, results, root

### Community 88 - "admin.ts"
Cohesion: 0.13
Nodes (21): AdminPermissionRecord, AdminRoleRecord, AdminUserRecord, createRole(), createUser(), deactivateRole(), deactivateUser(), listPermissions() (+13 more)

### Community 90 - "steps"
Cohesion: 0.12
Nodes (16): jobs, verify, name, on, pull_request, push, branches, branches (+8 more)

### Community 91 - "app.ts"
Cohesion: 0.28
Nodes (12): ADMIN_DASHBOARD_HTML, handleRequest(), requireAdminToken(), sendHtml(), HttpError, readJsonBody(), requireBearerDeviceAuth(), sendError() (+4 more)

### Community 94 - "ref_react"
Cohesion: 0.14
Nodes (11): rootElement, initial, OfflineSync(), phaseLabel(), idr(), Invoice, Payables, statusCls() (+3 more)

### Community 101 - "e2e-backup-shot.cjs"
Cohesion: 0.29
Nodes (5): { _electron: electron }, fs, os, path, root

### Community 108 - "sync-server.test.ts"
Cohesion: 0.48
Nodes (6): download(), json(), makeEvent(), register(), salePayload(), upload()

### Community 109 - "ref_path"
Cohesion: 0.22
Nodes (6): { app, BrowserWindow }, fs, path, { _electron: electron }, path, root

### Community 112 - "devices.ts"
Cohesion: 0.34
Nodes (13): addHoursIso(), nowIso(), randomToken(), safeEqualHex(), sha256Hex(), authenticateBearerToken(), AuthenticatedDevice, DeviceAuthResult (+5 more)

### Community 113 - "import-export.ts"
Cohesion: 0.36
Nodes (8): headerIndex(), importCustomersCsv(), importProductsCsv(), ImportReport, ImportRowError, parseCsv(), toNum(), RFC-4180

### Community 114 - "workspaces"
Cohesion: 0.67
Nodes (3): workspaces, nohoist, packages

### Community 116 - "services/sync.ts"
Cohesion: 0.16
Nodes (14): AuthScope, downloadEvents(), ExistingEventRow, ingestEventsBatch(), UploadEventInput, validateEventBusiness(), decodeCursor(), encodeCursor() (+6 more)

### Community 117 - "AppDatabase"
Cohesion: 0.10
Nodes (23): AppDatabase, createDb(), needsSetup(), setupAdmin(), CustomerRecord, appendOutboxEventMock, createCustomerRecord(), createCustomerWithDebit() (+15 more)

## Knowledge Gaps
- **2 isolated node(s):** `RFC-4180`, `./tsconfig.json`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 694 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **31 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `electron-updater` connect `createWindow` to `desktop/package.json`, `desktop/package.json`?**
  _High betweenness centrality (0.221) - this node is a cross-community bridge._
- **What connects `RFC-4180`, `./tsconfig.json` to the rest of the system?**
  _2 weakly-connected nodes found - possible missing edges._
- **Should `useAuth` be split into smaller, more focused modules?**
  _Cohesion score 0.11666666666666667 - nodes in this community are weakly interconnected._
- **Why does `installUpdate()` connect `createWindow` to `main.ts`?**
  _High betweenness centrality (0.213) - this node is a cross-community bridge._
- **Should `web/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.06423034330011074 - nodes in this community are weakly interconnected._
- **Why does `jsbarcode` connect `desktop/package.json` to `desktop/package.json`, `Products.tsx`?**
  _High betweenness centrality (0.141) - this node is a cross-community bridge._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.08695652173913043 - nodes in this community are weakly interconnected._