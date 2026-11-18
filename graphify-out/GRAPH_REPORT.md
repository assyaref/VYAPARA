# Graph Report - VYAPARA POS Windows Desktop hybird  (2026-11-18)

## Corpus Check
- 194 files · ~186,340 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 18 file(s) not represented in the graph (top: .pid 8, (none) 3, .css 1)

## Summary
- 1674 nodes · 3273 edges · 129 communities (93 shown, 36 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b2a28ee9`
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
- coordinator.ts
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
- main.ts
- createWindow
- transactions.ts
- App
- pos.ts
- transport.ts
- App.tsx
- db.test.ts
- Products.tsx
- e2e-supplier-invoice.cjs
- Reports.tsx
- src/db/open.ts
- printer.ts
- e2e-smoke.cjs
- assets.d.ts
- ref_node_fs
- Settings.tsx
- e2e-purchase-return.cjs
- POS.tsx
- desktop/package.json
- ref_fs
- dependencies
- e2e-superadmin.cjs
- ref_node_crypto
- schemas.test.ts
- tsconfig.electron.json
- e2e-stock-opname.cjs
- admin.ts
- createSyncCoordinator
- steps
- app.ts
- device-identity.ts
- ref_react
- drizzle-kit
- eslint-plugin-react@^7.37.4
- eslint-plugin-react@^7.37.4
- @fontsource/inter@^5.2.2
- SupplierInvoices.tsx
- credentials.ts
- e2e-backup-shot.cjs
- e2e-piutang.cjs
- tailwindcss@^4.3.5
- electron
- @tailwindcss/vite@^4.3.5
- @types/node@^22.13.1
- SalesReturns.tsx
- sync-server.test.ts
- ref_path
- typescript-eslint@^8.24.1
- audit.ts
- devices.ts
- import-export.ts
- workspaces
- vite@^8.3.8
- sync/index.ts
- AppDatabase
- drizzle-orm@^0.45.4
- @fontsource/inter@^5.2.2
- postcss@^8.4.33
- @types/react@^19.3.0
- @types/react-dom@^19.3.0
- vite-tsconfig-paths@^6.1.1
- vitest@^5.1.0
- @playwright/test@^1.65.0
- @tailwindcss/vite@^4.3.5
- @types/better-sqlite3@^9.6.0
- vitest@^5.1.0

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
10. `createProduct()` - 18 edges

## Surprising Connections (you probably didn't know these)
- `runDownloadOnce()` --calls--> `encodeCursor()`  [EXTRACTED]
  apps/desktop/electron/main/sync/download.ts → packages/shared/src/sync.ts
- `createDb()` --calls--> `AppDatabase`  [EXTRACTED]
  apps/desktop/electron/main/services/admin.test.ts → apps/desktop/electron/main/db/open.ts
- `createDb()` --calls--> `AppDatabase`  [EXTRACTED]
  apps/desktop/electron/main/services/customer.test.ts → apps/desktop/electron/main/db/open.ts
- `createDb()` --calls--> `AppDatabase`  [EXTRACTED]
  apps/desktop/electron/main/services/finance.test.ts → apps/desktop/electron/main/db/open.ts
- `deleteCategory()` --calls--> `AppError`  [EXTRACTED]
  apps/desktop/electron/main/services/catalog.ts → apps/desktop/electron/main/errors.ts

## Import Cycles
- None detected.

## Communities (129 total, 36 thin omitted)

### Community 0 - "useAuth"
Cohesion: 0.11
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
Nodes (34): devDependencies, autoprefixer@^10.4.16, drizzle-orm@^0.45.4, eslint@^9.21.2, globals@^6.1.0, postcss@^8.4.33, prettier@^3.5.3, tailwindcss@^4.3.5 (+26 more)

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
Cohesion: 0.09
Nodes (27): AuthScope, downloadEvents(), ExistingEventRow, ingestEventsBatch(), UploadEventInput, validateEventBusiness(), aggregateIdSchema, aggregateTypeSchema (+19 more)

### Community 16 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, module, moduleResolution, noUncheckedIndexedAccess, outDir, resolveJsonModule (+7 more)

### Community 17 - "stress-4.5.test.ts"
Cohesion: 0.12
Nodes (15): SyncOutboxStatus, DownloadRunResult, runDownloadOnce(), getDownloadCursor(), recoverStaleSyncingOutbox(), setDownloadCursor(), adminId(), createSale() (+7 more)

### Community 18 - "procurement.ts"
Cohesion: 0.10
Nodes (25): cancelPurchaseOrder(), createPurchaseOrder(), createPurchaseReturn(), getGoodsReceiving(), getPurchaseHistory(), getPurchaseOrder(), getPurchaseReturn(), GoodsReceivingItemRecord (+17 more)

### Community 19 - "procurement.ts"
Cohesion: 0.15
Nodes (25): createSupplier(), createSupplierInvoice(), deactivateSupplier(), generateSupplierCode(), getPayablesSummary(), getSupplier(), getSupplierBalance(), getSupplierInvoice() (+17 more)

### Community 20 - "sync"
Cohesion: 0.10
Nodes (19): context, dockerfile, interval, retries, start_period, test, timeout, services (+11 more)

### Community 21 - "outbox.ts"
Cohesion: 0.08
Nodes (29): countOutboxEvents(), recordStockMovement(), appendOutboxEvent(), AppendOutboxInput, eventPayloadSchemas, isoDateSchema, listOutboxEvents(), mapRow() (+21 more)

### Community 22 - "AppError"
Cohesion: 0.11
Nodes (23): AppError, createCustomer(), customerCode(), CustomerRecord, CustomerRow, CustomerTransactionRecord, CustomerTxRow, deactivateCustomer() (+15 more)

### Community 23 - "coordinator.ts"
Cohesion: 0.20
Nodes (19): getSyncState(), listUploadCandidates(), markOutboxAck(), markOutboxRetryable(), markOutboxSyncingBatch(), markOutboxTerminal(), revertSyncingToPending(), UploadCandidate (+11 more)

### Community 24 - "vyapara.d.ts"
Cohesion: 0.40
Nodes (4): *.css, SyncStatusSnapshot, VyaparaIpcResult, Window

### Community 25 - "conflict-detector.ts"
Cohesion: 0.10
Nodes (45): buildConflictRecord(), detectConcurrentUpdate(), detectConflictForEvent(), detectDuplicateEvent(), detectOutOfOrderEvent(), detectStaleVersion(), getEntityVersion(), upsertEntityVersion() (+37 more)

### Community 29 - "createWindow"
Cohesion: 0.22
Nodes (11): checkForUpdates(), downloadUpdate(), getUpdateStatus(), installUpdate(), loadAutoUpdater(), onUpdateStatus(), setStatus(), status (+3 more)

### Community 30 - "main/db/open.ts"
Cohesion: 0.09
Nodes (5): AppOrm, MIGRATIONS, normalizeLegacySchema(), renameColumnIfNeeded(), tableColumns()

### Community 31 - "schema.ts"
Cohesion: 0.05
Nodes (37): cashDrawers, cashMovements, categories, customers, customerTransactions, deviceIdentity, expenseRecords, goodsReceiving (+29 more)

### Community 32 - "inventory.ts"
Cohesion: 0.11
Nodes (23): addOpnameItem(), applyStockMovement(), approveStockAdjustment(), completeStockOpname(), createStockAdjustment(), createStockOpname(), generateOpnameNumber(), getCurrentStock() (+15 more)

### Community 33 - "schemas.ts"
Cohesion: 0.05
Nodes (72): AuthChangePasswordSchema, AuthTokenSchema, BestSellingQuerySchema, CashDrawerCloseSchema, CashDrawerOpenSchema, CashDrawerQuerySchema, CashierPerformanceQuerySchema, CashMovementsQuerySchema (+64 more)

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
Cohesion: 0.13
Nodes (31): assertNotLocked(), assertPasswordPolicy(), assertPermission(), changePassword(), clearFailures(), failures, hashToken(), issueSession() (+23 more)

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
Cohesion: 0.18
Nodes (8): { chromium }, path, { _electron: electron }, fs, os, path, profile, root

### Community 47 - "e2e-procurement.cjs"
Cohesion: 0.25
Nodes (6): { _electron: electron }, fs, os, path, results, root

### Community 49 - "reports.ts"
Cohesion: 0.17
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
Cohesion: 0.16
Nodes (9): app, port, createSyncServer(), json(), makeEvent(), register(), require, salePayload() (+1 more)

### Community 54 - "main.ts"
Cohesion: 0.04
Nodes (7): openAppDatabase(), AppInfo, AppInfoSchema, EnvironmentStatus, EnvironmentStatusSchema, getDb(), gotLock

### Community 55 - "createWindow"
Cohesion: 0.16
Nodes (18): createWindow(), getSettingsRow(), isOnline(), loadToken(), publicUser(), setActiveToken(), tokenFile(), ALL_PERMISSIONS (+10 more)

### Community 56 - "transactions.ts"
Cohesion: 0.15
Nodes (13): transact(), getSettings(), readValue(), StoreSettings, updateSettings(), assertQuantity(), createTransaction(), listTransactions() (+5 more)

### Community 57 - "App"
Cohesion: 0.24
Nodes (13): App(), applyToDocument(), Branding, cache, DEFAULTS, getBranding(), listeners, loadBranding() (+5 more)

### Community 58 - "pos.ts"
Cohesion: 0.31
Nodes (9): assertMoney(), PAYMENT_METHODS, PaymentLine, PaymentMethod, quoteSale(), SaleQuote, Settlement, settlePayments() (+1 more)

### Community 59 - "transport.ts"
Cohesion: 0.12
Nodes (19): classifyHttpError(), DeviceRegisterResponse, DeviceTokenRenewResponse, joinUrl(), readJsonLimited(), registerDeviceTransport(), requestJson(), SyncDownloadResponse (+11 more)

### Community 60 - "App.tsx"
Cohesion: 0.15
Nodes (14): AlertRow, Dashboard(), dayKey(), fmtIDR(), fmtShort(), icons, idr, KpiCard() (+6 more)

### Community 61 - "db.test.ts"
Cohesion: 0.31
Nodes (3): assertIntegrity(), backupDatabase(), restoreDatabase()

### Community 62 - "Products.tsx"
Cohesion: 0.47
Nodes (5): BarcodeSvg(), EMPTY_FORM, idr(), Product, ProductsPage()

### Community 63 - "e2e-supplier-invoice.cjs"
Cohesion: 0.25
Nodes (6): { _electron: electron }, fs, os, path, results, root

### Community 64 - "Reports.tsx"
Cohesion: 0.15
Nodes (12): BestSellingRow, CashierRow, ExpenseRow, GrossProfitRow, PurchaseRow, ReceivablesRow, Reports(), SalesRow (+4 more)

### Community 65 - "src/db/open.ts"
Cohesion: 0.20
Nodes (7): applyMigrations(), here, MIGRATIONS, openSyncServerDb(), require, desktopSrc, sharedSrc

### Community 66 - "printer.ts"
Cohesion: 0.22
Nodes (16): buildDeliveryOrderDotMatrixHtml(), buildInvoiceHtml(), buildReceiptHtml(), DEFAULT_CONFIG, DeliveryOrderPayload, escapeHtml(), getPrinterConfig(), listPrinters() (+8 more)

### Community 67 - "e2e-smoke.cjs"
Cohesion: 0.22
Nodes (7): { _electron: electron }, fs, os, path, profile, results, root

### Community 68 - "assets.d.ts"
Cohesion: 0.29
Nodes (6): *.ico, *.jpeg, *.jpg, *.png, *.svg, *.webp

### Community 69 - "ref_node_fs"
Cohesion: 0.20
Nodes (10): ensureToken(), clearSyncCredentials(), credsPath(), loadSyncCredentials(), saveSyncCredentials(), SyncCredentials, userDataDir, desktopDir (+2 more)

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

### Community 75 - "dependencies"
Cohesion: 0.29
Nodes (7): dependencies, react@^19.3.1, react-dom@^19.3.1, zustand@^5.1.0, react, react-dom, zustand

### Community 76 - "e2e-superadmin.cjs"
Cohesion: 0.25
Nodes (6): { _electron: electron }, fs, os, path, results, root

### Community 77 - "ref_node_crypto"
Cohesion: 0.21
Nodes (11): CatalogCategory, CatalogUnit, createCategory(), createUnit(), deleteCategory(), deleteUnit(), normDescription(), normName() (+3 more)

### Community 78 - "schemas.test.ts"
Cohesion: 0.17
Nodes (11): AuthLoginSchema, AuthSetupSchema, ipcFail(), ipcOk(), PaymentLineSchema, PERMISSIONS, ProductCreateSchema, ProductUpdateSchema (+3 more)

### Community 81 - "tsconfig.electron.json"
Cohesion: 0.29
Nodes (6): compilerOptions, moduleResolution, exclude, extends, include, ./tsconfig.json

### Community 87 - "e2e-stock-opname.cjs"
Cohesion: 0.25
Nodes (6): { _electron: electron }, fs, os, path, results, root

### Community 88 - "admin.ts"
Cohesion: 0.12
Nodes (22): AdminPermissionRecord, AdminRoleRecord, AdminUserRecord, createRole(), createUser(), deactivateRole(), deactivateUser(), listPermissions() (+14 more)

### Community 89 - "createSyncCoordinator"
Cohesion: 0.42
Nodes (10): createSyncCoordinator(), clearTimer(), refreshCounts(), runCycle(), schedule(), setPhase(), startPeriodic(), isOnline() (+2 more)

### Community 90 - "steps"
Cohesion: 0.12
Nodes (16): jobs, verify, name, on, pull_request, push, branches, branches (+8 more)

### Community 91 - "app.ts"
Cohesion: 0.16
Nodes (19): ADMIN_DASHBOARD_HTML, handleRequest(), requireAdminToken(), sendHtml(), SyncServerConfig, SyncServerDb, HttpError, readJsonBody() (+11 more)

### Community 92 - "device-identity.ts"
Cohesion: 0.36
Nodes (5): DeviceIdentity, getOrCreateDeviceIdentity(), identityFilePath(), persist(), readPersisted()

### Community 94 - "ref_react"
Cohesion: 0.22
Nodes (4): rootElement, initial, OfflineSync(), phaseLabel()

### Community 99 - "SupplierInvoices.tsx"
Cohesion: 0.36
Nodes (7): idr(), Invoice, Payables, statusCls(), statusLabel(), Supplier, SupplierInvoices()

### Community 100 - "credentials.ts"
Cohesion: 0.46
Nodes (6): clearSyncCredentials(), credsEncPath(), credsPath(), loadSyncCredentials(), saveSyncCredentials(), SyncCredentials

### Community 101 - "e2e-backup-shot.cjs"
Cohesion: 0.15
Nodes (10): { _electron: electron }, fs, os, path, root, { _electron: electron }, fs, os (+2 more)

### Community 102 - "e2e-piutang.cjs"
Cohesion: 0.25
Nodes (6): { _electron: electron }, fs, os, path, results, root

### Community 104 - "electron"
Cohesion: 0.40
Nodes (5): api, send(), withToken(), electron@^45.3.1, electron

### Community 107 - "SalesReturns.tsx"
Cohesion: 0.50
Nodes (4): idr(), ReturnRow, SalesReturnsPage(), TxnRow

### Community 108 - "sync-server.test.ts"
Cohesion: 0.48
Nodes (6): download(), json(), makeEvent(), register(), salePayload(), upload()

### Community 109 - "ref_path"
Cohesion: 0.22
Nodes (6): { app, BrowserWindow }, fs, path, { _electron: electron }, path, root

### Community 111 - "audit.ts"
Cohesion: 0.50
Nodes (3): AuditRecord, listAuditLogs(), logAudit()

### Community 112 - "devices.ts"
Cohesion: 0.34
Nodes (13): addHoursIso(), nowIso(), randomToken(), safeEqualHex(), sha256Hex(), authenticateBearerToken(), AuthenticatedDevice, DeviceAuthResult (+5 more)

### Community 113 - "import-export.ts"
Cohesion: 0.36
Nodes (8): headerIndex(), importCustomersCsv(), importProductsCsv(), ImportReport, ImportRowError, parseCsv(), toNum(), RFC-4180

### Community 114 - "workspaces"
Cohesion: 0.67
Nodes (3): workspaces, nohoist, packages

### Community 116 - "sync/index.ts"
Cohesion: 0.50
Nodes (3): SyncCoordinator, getSyncCoordinator(), initSyncCoordinator()

### Community 117 - "AppDatabase"
Cohesion: 0.12
Nodes (25): AppDatabase, createDb(), listStockMovements(), assertReference(), assertUnique(), createProduct(), deactivateProduct(), listCategories() (+17 more)

## Knowledge Gaps
- **2 isolated node(s):** `RFC-4180`, `./tsconfig.json`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 748 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **36 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `electron-updater` connect `createWindow` to `desktop/package.json`?**
  _High betweenness centrality (0.178) - this node is a cross-community bridge._
- **What connects `RFC-4180`, `./tsconfig.json` to the rest of the system?**
  _2 weakly-connected nodes found - possible missing edges._
- **Should `useAuth` be split into smaller, more focused modules?**
  _Cohesion score 0.11333333333333333 - nodes in this community are weakly interconnected._
- **Why does `installUpdate()` connect `createWindow` to `main.ts`, `createWindow`?**
  _High betweenness centrality (0.171) - this node is a cross-community bridge._
- **Should `web/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.06423034330011074 - nodes in this community are weakly interconnected._
- **Why does `jsbarcode` connect `desktop/package.json` to `desktop/package.json`, `Products.tsx`?**
  _High betweenness centrality (0.126) - this node is a cross-community bridge._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.08695652173913043 - nodes in this community are weakly interconnected._