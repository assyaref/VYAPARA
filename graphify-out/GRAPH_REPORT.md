# Graph Report - VYAPARA POS Windows Desktop hybird  (2026-11-16)

## Corpus Check
- 182 files · ~162,824 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 12 file(s) not represented in the graph (top: .pid 6, (none) 1, .css 1)

## Summary
- 1517 nodes · 2956 edges · 112 communities (81 shown, 31 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `63388f67`
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
- transport.ts
- app.ts
- main.ts
- outbox.ts
- AppError
- procurement.ts
- vyapara.d.ts
- conflict-detector.ts
- src/index.ts
- main/db/open.ts
- schema.ts
- inventory.ts
- schemas.test.ts
- procurement.ts
- reports.ts
- e2e-mgmt-acceptance.cjs
- build
- customer.ts
- pos.ts
- VyaparaDatabase
- ref_vitest
- sql.d.ts
- e2e-debug-pos.cjs
- @neondatabase/serverless@^1.2.0
- postcss@^8.4.33
- e2e-shot-pos.cjs
- AppDatabase
- reports.ts
- e2e-unpacked.cjs
- perf-probe.cjs
- StockOpname.tsx
- acceptance-4.2.test.ts
- inbound.ts
- stress-4.5.test.ts
- products.ts
- devices.ts
- transactions.ts
- SupplierInvoices.tsx
- App.tsx
- db.test.ts
- Products.tsx
- e2e-supplier-invoice.cjs
- Reports.tsx
- App
- ref_path
- e2e-smoke.cjs
- assets.d.ts
- Catalog.tsx
- Settings.tsx
- e2e-purchase-return.cjs
- POS.tsx
- drizzle-orm@^0.45.4
- ref_fs
- package.json
- @vitejs/plugin-react@^1.2.0
- createWindow
- auth.ts
- tsconfig.electron.json
- e2e-stock-opname.cjs
- admin.ts
- credentials.ts
- steps
- applyMigrations
- sync-server.test.ts
- StockAdjustments.tsx
- eslint-plugin-react@^7.37.4
- @types/react-dom@^19.3.0
- typescript@^5.9.3
- vite@^8.3.8
- SalesReturns.tsx
- vitest@^5.1.0
- e2e-backup-shot.cjs
- drizzle-orm@^0.45.4
- tailwindcss@^4.3.5
- PurchaseReturns.tsx
- @fontsource/inter@^5.2.2
- typescript@^5.9.3
- unbuild@^3.0.1
- settings.ts
- workspaces
- tailwindcss@^4.3.5

## God Nodes (most connected - your core abstractions)
1. `AppError` - 89 edges
2. `AppDatabase` - 60 edges
3. `useAuth` - 38 edges
4. `setupAdmin()` - 33 edges
5. `createSyncCoordinator()` - 26 edges
6. `createWindow()` - 22 edges
7. `compilerOptions` - 20 edges
8. `createTransaction()` - 19 edges
9. `compilerOptions` - 19 edges
10. `applyInboundEventAtomically()` - 18 edges

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

## Communities (112 total, 31 thin omitted)

### Community 0 - "useAuth"
Cohesion: 0.12
Nodes (18): AuthState, useAuth, User, UserRole, Customer(), CustomerRecord, DocumentServices(), Finance() (+10 more)

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
Cohesion: 0.08
Nodes (23): devDependencies, autoprefixer@^10.4.16, drizzle-kit@^0.31.11, electron-builder@^26.18.0, eslint@^9.21.2, globals@^6.1.0, @playwright/test@^1.65.0, @tailwindcss/vite@^4.3.5 (+15 more)

### Community 8 - "devDependencies"
Cohesion: 0.08
Nodes (25): devDependencies, autoprefixer@^10.4.16, globals@^6.1.0, @playwright/test@^1.65.0, postcss@^8.4.33, prettier@^3.5.3, @types/babel__core@^7.20.5, @types/better-sqlite3@^9.6.0 (+17 more)

### Community 9 - "desktop/package.json"
Cohesion: 0.13
Nodes (18): author, dependencies, better-sqlite3@^13.1.1, jsbarcode@^3.11.0, react@^19.3.1, react-dom@^19.3.1, zustand@^5.1.0, description (+10 more)

### Community 10 - "scripts"
Cohesion: 0.12
Nodes (17): scripts, build, build:electron, build:installer, build:web, dev, electron:build, electron:dev (+9 more)

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
Nodes (26): AuthScope, downloadEvents(), ExistingEventRow, ingestEventsBatch(), UploadEventInput, validateEventBusiness(), aggregateIdSchema, aggregateTypeSchema (+18 more)

### Community 16 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, module, moduleResolution, noUncheckedIndexedAccess, outDir, resolveJsonModule (+7 more)

### Community 17 - "electron"
Cohesion: 0.40
Nodes (5): api, send(), withToken(), electron@^45.3.1, electron

### Community 18 - "transport.ts"
Cohesion: 0.13
Nodes (19): classifyHttpError(), DeviceRegisterResponse, DeviceTokenRenewResponse, joinUrl(), readJsonLimited(), registerDeviceTransport(), requestJson(), SyncDownloadResponse (+11 more)

### Community 19 - "app.ts"
Cohesion: 0.23
Nodes (14): handleRequest(), HttpError, readJsonBody(), requireBearerDeviceAuth(), sendError(), sendJson(), sendOk(), deviceRegisterRequestSchema (+6 more)

### Community 20 - "main.ts"
Cohesion: 0.04
Nodes (5): AppInfo, AppInfoSchema, EnvironmentStatus, EnvironmentStatusSchema, gotLock

### Community 21 - "outbox.ts"
Cohesion: 0.09
Nodes (23): countOutboxEvents(), appendOutboxEvent(), AppendOutboxInput, eventPayloadSchemas, isoDateSchema, listOutboxEvents(), mapRow(), markOutboxAcknowledged() (+15 more)

### Community 22 - "AppError"
Cohesion: 0.25
Nodes (12): AppError, CatalogCategory, CatalogUnit, createCategory(), createUnit(), deleteCategory(), deleteUnit(), normDescription() (+4 more)

### Community 23 - "procurement.ts"
Cohesion: 0.10
Nodes (25): cancelPurchaseOrder(), createPurchaseOrder(), createPurchaseReturn(), getGoodsReceiving(), getPurchaseHistory(), getPurchaseOrder(), getPurchaseReturn(), GoodsReceivingItemRecord (+17 more)

### Community 24 - "vyapara.d.ts"
Cohesion: 0.40
Nodes (4): *.css, SyncStatusSnapshot, VyaparaIpcResult, Window

### Community 25 - "conflict-detector.ts"
Cohesion: 0.12
Nodes (31): buildConflictRecord(), detectConcurrentUpdate(), detectConflictForEvent(), detectDuplicateEvent(), detectOutOfOrderEvent(), detectStaleVersion(), getEntityVersion(), upsertEntityVersion() (+23 more)

### Community 29 - "src/index.ts"
Cohesion: 0.05
Nodes (71): AuthChangePasswordSchema, AuthTokenSchema, BestSellingQuerySchema, CashDrawerCloseSchema, CashDrawerOpenSchema, CashDrawerQuerySchema, CashierPerformanceQuerySchema, CashMovementsQuerySchema (+63 more)

### Community 30 - "main/db/open.ts"
Cohesion: 0.10
Nodes (7): AppOrm, countOf(), MIGRATIONS, normalizeLegacySchema(), renameColumnIfNeeded(), seedCatalog(), tableColumns()

### Community 31 - "schema.ts"
Cohesion: 0.05
Nodes (37): cashDrawers, cashMovements, categories, customers, customerTransactions, deviceIdentity, expenseRecords, goodsReceiving (+29 more)

### Community 32 - "inventory.ts"
Cohesion: 0.11
Nodes (22): addOpnameItem(), approveStockAdjustment(), completeStockOpname(), createStockAdjustment(), createStockOpname(), generateOpnameNumber(), getCurrentStock(), getOpnameItem() (+14 more)

### Community 33 - "schemas.test.ts"
Cohesion: 0.15
Nodes (11): AuthLoginSchema, AuthSetupSchema, ipcFail(), ipcOk(), PaymentLineSchema, PERMISSIONS, ProductCreateSchema, ProductUpdateSchema (+3 more)

### Community 34 - "procurement.ts"
Cohesion: 0.13
Nodes (27): createSupplier(), createSupplierInvoice(), deactivateSupplier(), generateSupplierCode(), getPayablesSummary(), getSupplier(), getSupplierBalance(), getSupplierInvoice() (+19 more)

### Community 35 - "reports.ts"
Cohesion: 0.13
Nodes (25): CashDrawerRecord, CashFlow, CashMovementRecord, closeCashDrawer(), drawerNumber(), DrawerRow, ExpenseRecord, ExpenseRow (+17 more)

### Community 36 - "e2e-mgmt-acceptance.cjs"
Cohesion: 0.25
Nodes (6): { _electron: electron }, fs, os, path, results, root

### Community 37 - "build"
Cohesion: 0.12
Nodes (16): build, appId, directories, electronDist, electronVersion, files, npmRebuild, nsis (+8 more)

### Community 38 - "customer.ts"
Cohesion: 0.23
Nodes (13): createCustomer(), customerCode(), CustomerRow, CustomerTransactionRecord, CustomerTxRow, deactivateCustomer(), getCustomer(), getCustomerReceivables() (+5 more)

### Community 39 - "pos.ts"
Cohesion: 0.31
Nodes (9): assertMoney(), PAYMENT_METHODS, PaymentLine, PaymentMethod, quoteSale(), SaleQuote, Settlement, settlePayments() (+1 more)

### Community 43 - "e2e-debug-pos.cjs"
Cohesion: 0.25
Nodes (7): { _electron: electron }, fs, log, os, path, profile, root

### Community 46 - "e2e-shot-pos.cjs"
Cohesion: 0.18
Nodes (8): { chromium }, path, { _electron: electron }, fs, os, path, profile, root

### Community 47 - "AppDatabase"
Cohesion: 0.11
Nodes (21): AppDatabase, createDb(), needsSetup(), setupAdmin(), CustomerRecord, listCustomerTransactions(), appendOutboxEventMock, createCustomerRecord() (+13 more)

### Community 49 - "reports.ts"
Cohesion: 0.21
Nodes (23): BestSellingRow, CashierPerformanceRow, dateExpression(), ExpenseReportRow, getBestSellingProducts(), getCashierPerformance(), getExpenseReport(), getGrossProfit() (+15 more)

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
Nodes (14): SyncServerConfig, applyMigrations(), here, MIGRATIONS, openSyncServerDb(), require, SyncServerDb, createSyncServer() (+6 more)

### Community 54 - "inbound.ts"
Cohesion: 0.16
Nodes (20): recordStockMovement(), createSalesReturn(), SalesReturnItemRecord, SalesReturnRecord, TiRow, TrRow, applyBusinessEvent(), applyCustomerPayment() (+12 more)

### Community 55 - "stress-4.5.test.ts"
Cohesion: 0.07
Nodes (56): DeviceIdentity, getOrCreateDeviceIdentity(), identityFilePath(), persist(), readPersisted(), SyncOutboxStatus, createSyncCoordinator(), clearTimer() (+48 more)

### Community 56 - "products.ts"
Cohesion: 0.18
Nodes (19): applyStockMovement(), listStockMovements(), assertReference(), assertUnique(), createProduct(), deactivateProduct(), listCategories(), listProducts() (+11 more)

### Community 57 - "devices.ts"
Cohesion: 0.34
Nodes (13): addHoursIso(), nowIso(), randomToken(), safeEqualHex(), sha256Hex(), authenticateBearerToken(), AuthenticatedDevice, DeviceAuthResult (+5 more)

### Community 58 - "transactions.ts"
Cohesion: 0.24
Nodes (9): transact(), assertQuantity(), createTransaction(), listTransactions(), readTransaction(), TransactionInput, TransactionItemRecord, TransactionRecord (+1 more)

### Community 59 - "SupplierInvoices.tsx"
Cohesion: 0.36
Nodes (7): idr(), Invoice, Payables, statusCls(), statusLabel(), Supplier, SupplierInvoices()

### Community 60 - "App.tsx"
Cohesion: 0.13
Nodes (14): AlertRow, Dashboard(), dayKey(), fmtIDR(), fmtShort(), icons, idr, KpiCard() (+6 more)

### Community 61 - "db.test.ts"
Cohesion: 0.33
Nodes (3): assertIntegrity(), backupDatabase(), restoreDatabase()

### Community 62 - "Products.tsx"
Cohesion: 0.50
Nodes (4): EMPTY_FORM, idr(), Product, ProductsPage()

### Community 63 - "e2e-supplier-invoice.cjs"
Cohesion: 0.25
Nodes (6): { _electron: electron }, fs, os, path, results, root

### Community 64 - "Reports.tsx"
Cohesion: 0.20
Nodes (9): BestSellingRow, CashierRow, ExpenseRow, GrossProfitRow, PurchaseRow, SalesRow, SlowMovingRow, TransactionRow (+1 more)

### Community 65 - "App"
Cohesion: 0.13
Nodes (10): App(), rootElement, initial, OfflineSync(), phaseLabel(), PoItem, Procurement(), PurchaseOrder (+2 more)

### Community 66 - "ref_path"
Cohesion: 0.40
Nodes (3): { app, BrowserWindow }, fs, path

### Community 67 - "e2e-smoke.cjs"
Cohesion: 0.22
Nodes (7): { _electron: electron }, fs, os, path, profile, results, root

### Community 68 - "assets.d.ts"
Cohesion: 0.29
Nodes (6): *.ico, *.jpeg, *.jpg, *.png, *.svg, *.webp

### Community 69 - "Catalog.tsx"
Cohesion: 0.50
Nodes (3): CatalogPage(), Category, Unit

### Community 70 - "Settings.tsx"
Cohesion: 0.33
Nodes (5): AdminUser, Permission, Role, Setting, Settings()

### Community 71 - "e2e-purchase-return.cjs"
Cohesion: 0.25
Nodes (6): { _electron: electron }, fs, os, path, results, root

### Community 72 - "POS.tsx"
Cohesion: 0.36
Nodes (7): CartItem, hueFromString(), idr(), initials(), PAYMENT_METHODS, PaymentLine, POS()

### Community 73 - "drizzle-orm@^0.45.4"
Cohesion: 0.33
Nodes (4): drizzle-orm@^0.45.4, @fontsource/inter@^5.2.2, drizzle-orm, @fontsource/inter

### Community 74 - "ref_fs"
Cohesion: 0.25
Nodes (5): fs, lines, replacement, content, fs

### Community 75 - "package.json"
Cohesion: 0.11
Nodes (20): dependencies, react@^19.3.1, react-dom@^19.3.1, zustand@^5.1.0, eslint@^9.21.2, eslint-plugin-react@^7.37.4, @tailwindcss/vite@^4.3.5, @vitejs/plugin-react@^1.2.0 (+12 more)

### Community 77 - "createWindow"
Cohesion: 0.20
Nodes (11): openAppDatabase(), createWindow(), getDb(), isOnline(), loadToken(), publicUser(), setActiveToken(), tokenFile() (+3 more)

### Community 78 - "auth.ts"
Cohesion: 0.17
Nodes (23): assertNotLocked(), assertPasswordPolicy(), assertPermission(), changePassword(), clearFailures(), failures, hashToken(), issueSession() (+15 more)

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

### Community 91 - "applyMigrations"
Cohesion: 0.38
Nodes (5): applyMigrations(), applySql(), connect(), splitSql(), remediateKnownPassword()

### Community 92 - "sync-server.test.ts"
Cohesion: 0.48
Nodes (6): download(), json(), makeEvent(), register(), salePayload(), upload()

### Community 94 - "StockAdjustments.tsx"
Cohesion: 0.50
Nodes (3): Adjustment, Product, StockAdjustmentsPage()

### Community 99 - "SalesReturns.tsx"
Cohesion: 0.50
Nodes (4): idr(), ReturnRow, SalesReturnsPage(), TxnRow

### Community 101 - "e2e-backup-shot.cjs"
Cohesion: 0.29
Nodes (5): { _electron: electron }, fs, os, path, root

### Community 104 - "PurchaseReturns.tsx"
Cohesion: 0.38
Nodes (6): fmtDate(), idr(), PoDetail, PurchaseOrder, PurchaseReturn, PurchaseReturns()

### Community 111 - "settings.ts"
Cohesion: 0.60
Nodes (4): getSettings(), readValue(), StoreSettings, updateSettings()

### Community 114 - "workspaces"
Cohesion: 0.67
Nodes (3): workspaces, nohoist, packages

## Knowledge Gaps
- **1 isolated node(s):** `./tsconfig.json`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 654 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **31 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `electron` connect `electron` to `ref_path`, `package.json`, `main.ts`, `stress-4.5.test.ts`, `credentials.ts`?**
  _High betweenness centrality (0.071) - this node is a cross-community bridge._
- **What connects `./tsconfig.json` to the rest of the system?**
  _1 weakly-connected nodes found - possible missing edges._
- **Should `useAuth` be split into smaller, more focused modules?**
  _Cohesion score 0.11586452762923351 - nodes in this community are weakly interconnected._
- **Why does `AppError` connect `AppError` to `inventory.ts`, `procurement.ts`, `reports.ts`, `transactions.ts`, `customer.ts`, `auth.ts`, `AppDatabase`, `reports.ts`, `outbox.ts`, `inbound.ts`, `procurement.ts`, `admin.ts`, `products.ts`, `db.test.ts`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Should `web/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.06423034330011074 - nodes in this community are weakly interconnected._
- **Why does `AppDatabase` connect `AppDatabase` to `outbox.ts`, `AppError`, `procurement.ts`, `conflict-detector.ts`, `main/db/open.ts`, `inventory.ts`, `procurement.ts`, `reports.ts`, `customer.ts`, `reports.ts`, `inbound.ts`, `stress-4.5.test.ts`, `products.ts`, `transactions.ts`, `db.test.ts`, `createWindow`, `auth.ts`, `admin.ts`, `applyMigrations`, `settings.ts`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.08695652173913043 - nodes in this community are weakly interconnected._