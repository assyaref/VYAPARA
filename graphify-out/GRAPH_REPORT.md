# Graph Report - VYAPARA POS Windows Desktop hybird  (2026-11-18)

## Corpus Check
- 191 files · ~183,920 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 18 file(s) not represented in the graph (top: .pid 8, (none) 3, .css 1)

## Summary
- 1607 nodes · 3250 edges · 118 communities (83 shown, 35 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `fb8bc2c0`
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
- electron
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
- AppDatabase
- VyaparaDatabase
- sql.d.ts
- e2e-debug-pos.cjs
- PurchaseReturns.tsx
- postcss@^8.4.33
- e2e-shot-pos.cjs
- e2e-procurement.cjs
- reports.ts
- e2e-unpacked.cjs
- perf-probe.cjs
- StockOpname.tsx
- acceptance-4.2.test.ts
- AppError
- createWindow
- transactions.ts
- App
- pos.ts
- Procurement.tsx
- App.tsx
- db.test.ts
- Products.tsx
- e2e-supplier-invoice.cjs
- Reports.tsx
- vitest.config.ts
- printer.ts
- e2e-smoke.cjs
- assets.d.ts
- globals@^6.1.0
- Settings.tsx
- e2e-purchase-return.cjs
- POS.tsx
- desktop/package.json
- ref_fs
- package.json
- e2e-superadmin.cjs
- drizzle-orm@^0.45.4
- ref_playwright
- tsconfig.electron.json
- e2e-stock-opname.cjs
- admin.ts
- credentials.ts
- steps
- app.ts
- schemas.test.ts
- ref_react
- drizzle-kit
- drizzle-orm@^0.45.4
- eslint-plugin-react@^7.37.4
- @fontsource/inter@^5.2.2
- prettier@^3.5.3
- @types/react@^19.3.0
- e2e-backup-shot.cjs
- @types/react-dom@^19.3.0
- tailwindcss@^4.3.5
- unbuild@^3.0.1
- @tailwindcss/vite@^4.3.5
- @types/node@^22.13.1
- vite-tsconfig-paths@^6.1.1
- sync-server.test.ts
- ref_path
- typescript-eslint@^8.24.1
- vitest@^5.1.0
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
8. `createTransaction()` - 19 edges
9. `App()` - 19 edges
10. `compilerOptions` - 19 edges

## Surprising Connections (you probably didn't know these)
- `createTransaction()` --calls--> `quoteSale()`  [EXTRACTED]
  apps/desktop/electron/main/services/transactions.ts → packages/shared/src/pos.ts
- `createTransaction()` --calls--> `settlePayments()`  [EXTRACTED]
  apps/desktop/electron/main/services/transactions.ts → packages/shared/src/pos.ts
- `runDownloadOnce()` --calls--> `encodeCursor()`  [EXTRACTED]
  apps/desktop/electron/main/sync/download.ts → packages/shared/src/sync.ts
- `createDb()` --calls--> `AppDatabase`  [EXTRACTED]
  apps/desktop/electron/main/services/auth.test.ts → apps/desktop/electron/main/db/open.ts
- `createDb()` --calls--> `AppDatabase`  [EXTRACTED]
  apps/desktop/electron/main/services/finance.test.ts → apps/desktop/electron/main/db/open.ts

## Import Cycles
- None detected.

## Communities (118 total, 35 thin omitted)

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
Cohesion: 0.13
Nodes (15): devDependencies, autoprefixer@^10.4.16, electron-builder@^26.18.0, globals@^6.1.0, @neondatabase/serverless@^1.2.0, @playwright/test@^1.65.0, typescript@^5.9.3, vite@^8.3.8 (+7 more)

### Community 8 - "devDependencies"
Cohesion: 0.08
Nodes (25): devDependencies, autoprefixer@^10.4.16, eslint-plugin-react@^7.37.4, @playwright/test@^1.65.0, postcss@^8.4.33, tailwindcss@^4.3.5, @tailwindcss/vite@^4.3.5, @types/better-sqlite3@^9.6.0 (+17 more)

### Community 9 - "desktop/package.json"
Cohesion: 0.15
Nodes (13): dependencies, better-sqlite3@^13.1.1, electron-pos-printer@^1.4.0, jsbarcode@^3.11.0, react@^19.3.1, react-dom@^19.3.1, zustand@^5.1.0, better-sqlite3 (+5 more)

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
Cohesion: 0.07
Nodes (38): classifyHttpError(), DeviceRegisterResponse, DeviceTokenRenewResponse, joinUrl(), readJsonLimited(), registerDeviceTransport(), renewDeviceTokenTransport(), requestJson() (+30 more)

### Community 16 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, module, moduleResolution, noUncheckedIndexedAccess, outDir, resolveJsonModule (+7 more)

### Community 17 - "electron"
Cohesion: 0.40
Nodes (5): api, send(), withToken(), electron@^45.3.1, electron

### Community 18 - "procurement.ts"
Cohesion: 0.10
Nodes (26): recordStockMovement(), cancelPurchaseOrder(), createPurchaseOrder(), createPurchaseReturn(), getGoodsReceiving(), getPurchaseHistory(), getPurchaseOrder(), getPurchaseReturn() (+18 more)

### Community 19 - "procurement.ts"
Cohesion: 0.13
Nodes (28): createSupplier(), createSupplierInvoice(), deactivateSupplier(), generateSupplierCode(), getPayablesSummary(), getSupplier(), getSupplierBalance(), getSupplierInvoice() (+20 more)

### Community 20 - "sync"
Cohesion: 0.10
Nodes (19): context, dockerfile, interval, retries, start_period, test, timeout, services (+11 more)

### Community 21 - "outbox.ts"
Cohesion: 0.08
Nodes (28): countOutboxEvents(), appendOutboxEvent(), AppendOutboxInput, eventPayloadSchemas, isoDateSchema, listOutboxEvents(), mapRow(), markOutboxAcknowledged() (+20 more)

### Community 22 - "AppError"
Cohesion: 0.18
Nodes (19): AppError, CatalogCategory, CatalogUnit, createCategory(), createUnit(), deleteCategory(), deleteUnit(), normDescription() (+11 more)

### Community 23 - "stress-4.5.test.ts"
Cohesion: 0.06
Nodes (62): DeviceIdentity, getOrCreateDeviceIdentity(), identityFilePath(), persist(), readPersisted(), createSyncCoordinator(), clearTimer(), ensureToken() (+54 more)

### Community 24 - "vyapara.d.ts"
Cohesion: 0.40
Nodes (4): *.css, SyncStatusSnapshot, VyaparaIpcResult, Window

### Community 25 - "conflict-detector.ts"
Cohesion: 0.11
Nodes (39): TransactionInput, buildConflictRecord(), detectConcurrentUpdate(), detectConflictForEvent(), detectDuplicateEvent(), detectOutOfOrderEvent(), detectStaleVersion(), getEntityVersion() (+31 more)

### Community 29 - "createWindow"
Cohesion: 0.22
Nodes (11): checkForUpdates(), downloadUpdate(), getUpdateStatus(), installUpdate(), loadAutoUpdater(), onUpdateStatus(), setStatus(), status (+3 more)

### Community 30 - "main/db/open.ts"
Cohesion: 0.09
Nodes (12): applyMigrations(), applySql(), AppOrm, connect(), countOf(), MIGRATIONS, normalizeLegacySchema(), renameColumnIfNeeded() (+4 more)

### Community 31 - "schema.ts"
Cohesion: 0.05
Nodes (37): cashDrawers, cashMovements, categories, customers, customerTransactions, deviceIdentity, expenseRecords, goodsReceiving (+29 more)

### Community 32 - "inventory.ts"
Cohesion: 0.11
Nodes (23): addOpnameItem(), applyStockMovement(), approveStockAdjustment(), completeStockOpname(), createStockAdjustment(), createStockOpname(), generateOpnameNumber(), getCurrentStock() (+15 more)

### Community 33 - "schemas.ts"
Cohesion: 0.06
Nodes (77): AppInfo, AppInfoSchema, EnvironmentStatus, EnvironmentStatusSchema, gotLock, AuthChangePasswordSchema, AuthTokenSchema, BestSellingQuerySchema (+69 more)

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
Cohesion: 0.17
Nodes (23): assertNotLocked(), assertPasswordPolicy(), assertPermission(), changePassword(), clearFailures(), failures, hashToken(), issueSession() (+15 more)

### Community 39 - "AppDatabase"
Cohesion: 0.18
Nodes (18): listStockMovements(), assertReference(), assertUnique(), createProduct(), deactivateProduct(), listCategories(), listProducts(), listUnits() (+10 more)

### Community 43 - "e2e-debug-pos.cjs"
Cohesion: 0.25
Nodes (7): { _electron: electron }, fs, log, os, path, profile, root

### Community 44 - "PurchaseReturns.tsx"
Cohesion: 0.38
Nodes (6): fmtDate(), idr(), PoDetail, PurchaseOrder, PurchaseReturn, PurchaseReturns()

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
Cohesion: 0.12
Nodes (15): SyncServerConfig, app, port, applyMigrations(), here, MIGRATIONS, openSyncServerDb(), require (+7 more)

### Community 54 - "AppError"
Cohesion: 0.19
Nodes (15): createCustomer(), customerCode(), CustomerRecord, CustomerRow, CustomerTransactionRecord, CustomerTxRow, deactivateCustomer(), getCustomer() (+7 more)

### Community 55 - "createWindow"
Cohesion: 0.12
Nodes (22): createWindow(), getSettingsRow(), isOnline(), loadToken(), publicUser(), setActiveToken(), tokenFile(), AuditRecord (+14 more)

### Community 56 - "transactions.ts"
Cohesion: 0.17
Nodes (11): getSettings(), readValue(), StoreSettings, updateSettings(), assertQuantity(), createTransaction(), listTransactions(), readTransaction() (+3 more)

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
Cohesion: 0.27
Nodes (5): openAppDatabase(), getDb(), assertIntegrity(), backupDatabase(), restoreDatabase()

### Community 62 - "Products.tsx"
Cohesion: 0.47
Nodes (5): BarcodeSvg(), EMPTY_FORM, idr(), Product, ProductsPage()

### Community 63 - "e2e-supplier-invoice.cjs"
Cohesion: 0.25
Nodes (6): { _electron: electron }, fs, os, path, results, root

### Community 64 - "Reports.tsx"
Cohesion: 0.17
Nodes (11): BestSellingRow, CashierRow, ExpenseRow, GrossProfitRow, PurchaseRow, Reports(), SalesRow, ShiftRecapRow (+3 more)

### Community 66 - "printer.ts"
Cohesion: 0.24
Nodes (15): buildDeliveryOrderDotMatrixHtml(), buildInvoiceHtml(), buildReceiptHtml(), DEFAULT_CONFIG, DeliveryOrderPayload, escapeHtml(), getPrinterConfig(), printDeliveryOrder() (+7 more)

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
Cohesion: 0.17
Nodes (11): author, description, eslint@^9.21.2, @vitejs/plugin-react@^1.2.0, eslint, @vitejs/plugin-react, main, name (+3 more)

### Community 74 - "ref_fs"
Cohesion: 0.25
Nodes (5): fs, lines, replacement, content, fs

### Community 75 - "package.json"
Cohesion: 0.11
Nodes (20): dependencies, react@^19.3.1, react-dom@^19.3.1, zustand@^5.1.0, eslint@^9.21.2, @fontsource/inter@^5.2.2, @types/babel__core@^7.20.5, typescript-eslint@^8.24.1 (+12 more)

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

### Community 89 - "credentials.ts"
Cohesion: 0.46
Nodes (6): clearSyncCredentials(), credsEncPath(), credsPath(), loadSyncCredentials(), saveSyncCredentials(), SyncCredentials

### Community 90 - "steps"
Cohesion: 0.12
Nodes (16): jobs, verify, name, on, pull_request, push, branches, branches (+8 more)

### Community 91 - "app.ts"
Cohesion: 0.23
Nodes (14): ADMIN_DASHBOARD_HTML, handleRequest(), requireAdminToken(), sendHtml(), SyncServerDb, HttpError, readJsonBody(), requireBearerDeviceAuth() (+6 more)

### Community 92 - "schemas.test.ts"
Cohesion: 0.15
Nodes (11): AuthLoginSchema, AuthSetupSchema, ipcFail(), ipcOk(), PaymentLineSchema, PERMISSIONS, ProductCreateSchema, ProductUpdateSchema (+3 more)

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
Cohesion: 0.14
Nodes (17): AppDatabase, createDb(), needsSetup(), setupAdmin(), appendOutboxEventMock, createCustomerRecord(), createCustomerWithDebit(), createDb() (+9 more)

## Knowledge Gaps
- **2 isolated node(s):** `RFC-4180`, `./tsconfig.json`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 683 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **35 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `electron-updater` connect `createWindow` to `desktop/package.json`?**
  _High betweenness centrality (0.201) - this node is a cross-community bridge._
- **What connects `RFC-4180`, `./tsconfig.json` to the rest of the system?**
  _2 weakly-connected nodes found - possible missing edges._
- **Should `useAuth` be split into smaller, more focused modules?**
  _Cohesion score 0.11666666666666667 - nodes in this community are weakly interconnected._
- **Why does `installUpdate()` connect `createWindow` to `schemas.ts`, `createWindow`?**
  _High betweenness centrality (0.197) - this node is a cross-community bridge._
- **Should `web/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.06423034330011074 - nodes in this community are weakly interconnected._
- **Why does `jsbarcode` connect `desktop/package.json` to `desktop/package.json`, `Products.tsx`?**
  _High betweenness centrality (0.119) - this node is a cross-community bridge._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.08695652173913043 - nodes in this community are weakly interconnected._