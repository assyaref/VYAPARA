# Graph Report - VYAPARA POS Windows Desktop hybird  (2026-11-17)

## Corpus Check
- 179 files · ~167,778 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 16 file(s) not represented in the graph (top: .pid 6, (none) 3, .css 1)

## Summary
- 1502 nodes · 3008 edges · 118 communities (80 shown, 38 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c8d93d6f`
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
- app.ts
- compilerOptions
- electron
- schemas.ts
- coordinator.ts
- sync
- outbox.ts
- AppError
- device-identity.ts
- vyapara.d.ts
- conflict-detector.ts
- main.ts
- main/db/open.ts
- schema.ts
- inventory.ts
- schemas.test.ts
- supplier.ts
- reports.ts
- e2e-mgmt-acceptance.cjs
- build
- auth.ts
- AppDatabase
- VyaparaDatabase
- sql.d.ts
- e2e-debug-pos.cjs
- @neondatabase/serverless@^1.2.0
- postcss@^8.4.33
- e2e-shot-pos.cjs
- e2e-procurement.cjs
- reports.ts
- e2e-unpacked.cjs
- perf-probe.cjs
- StockOpname.tsx
- acceptance-4.2.test.ts
- AppError
- stress-4.5.test.ts
- .reopen
- transport.ts
- transactions.ts
- SupplierInvoices.tsx
- App.tsx
- db.test.ts
- Products.tsx
- e2e-supplier-invoice.cjs
- Reports.tsx
- App
- createSyncCoordinator
- e2e-smoke.cjs
- assets.d.ts
- authStore.ts
- Settings.tsx
- e2e-purchase-return.cjs
- POS.tsx
- desktop/package.json
- ref_fs
- package.json
- @vitejs/plugin-react@^1.2.0
- pos.ts
- ref_playwright
- tsconfig.electron.json
- e2e-stock-opname.cjs
- admin.ts
- credentials.ts
- steps
- typescript@^5.9.3
- unbuild@^3.0.1
- src/db/open.ts
- drizzle-kit
- electron-builder@^26.18.0
- eslint@^9.21.2
- @fontsource/inter@^5.2.2
- SalesReturns.tsx
- globals@^6.1.0
- e2e-backup-shot.cjs
- @playwright/test@^1.65.0
- tailwindcss@^4.3.5
- PurchaseReturns.tsx
- @tailwindcss/vite@^4.3.5
- @types/node@^22.13.1
- vite-tsconfig-paths@^6.1.1
- sync-server.test.ts
- ref_path
- build-installer.mjs
- eslint@^9.21.2
- eslint-plugin-react@^7.37.4
- globals@^6.1.0
- workspaces
- prettier@^3.5.3
- @tailwindcss/vite@^4.3.5
- @types/react-dom@^19.3.0

## God Nodes (most connected - your core abstractions)
1. `AppError` - 89 edges
2. `AppDatabase` - 60 edges
3. `setupAdmin()` - 33 edges
4. `useAuth` - 33 edges
5. `createSyncCoordinator()` - 26 edges
6. `createWindow()` - 22 edges
7. `compilerOptions` - 20 edges
8. `createTransaction()` - 19 edges
9. `compilerOptions` - 19 edges
10. `createProduct()` - 18 edges

## Surprising Connections (you probably didn't know these)
- `createTransaction()` --calls--> `quoteSale()`  [EXTRACTED]
  apps/desktop/electron/main/services/transactions.ts → packages/shared/src/pos.ts
- `createTransaction()` --calls--> `settlePayments()`  [EXTRACTED]
  apps/desktop/electron/main/services/transactions.ts → packages/shared/src/pos.ts
- `downloadEvents()` --calls--> `encodeCursor()`  [EXTRACTED]
  apps/sync-server/src/services/sync.ts → packages/shared/src/sync.ts
- `createDb()` --calls--> `AppDatabase`  [EXTRACTED]
  apps/desktop/electron/main/services/customer.test.ts → apps/desktop/electron/main/db/open.ts
- `createDb()` --calls--> `AppDatabase`  [EXTRACTED]
  apps/desktop/electron/main/services/finance.test.ts → apps/desktop/electron/main/db/open.ts

## Import Cycles
- None detected.

## Communities (118 total, 38 thin omitted)

### Community 0 - "useAuth"
Cohesion: 0.18
Nodes (13): App(), useAuth, Customer(), CustomerRecord, Finance(), PoItem, Procurement(), PurchaseOrder (+5 more)

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
Nodes (15): devDependencies, autoprefixer@^10.4.16, eslint-plugin-react@^7.37.4, @types/react@^19.3.0, typescript@^5.9.3, typescript-eslint@^8.24.1, vite@^8.3.8, vitest@^5.1.0 (+7 more)

### Community 8 - "devDependencies"
Cohesion: 0.10
Nodes (21): devDependencies, autoprefixer@^10.4.16, drizzle-orm@^0.45.4, @fontsource/inter@^5.2.2, postcss@^8.4.33, @types/node@^22.13.1, @types/react@^19.3.0, typescript-eslint@^8.24.1 (+13 more)

### Community 9 - "desktop/package.json"
Cohesion: 0.18
Nodes (11): dependencies, better-sqlite3@^13.1.1, jsbarcode@^3.11.0, react@^19.3.1, react-dom@^19.3.1, zustand@^5.1.0, better-sqlite3, react (+3 more)

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

### Community 15 - "app.ts"
Cohesion: 0.06
Nodes (66): ADMIN_DASHBOARD_HTML, handleRequest(), requireAdminToken(), sendHtml(), SyncServerConfig, SyncServerDb, HttpError, readJsonBody() (+58 more)

### Community 16 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, module, moduleResolution, noUncheckedIndexedAccess, outDir, resolveJsonModule (+7 more)

### Community 17 - "electron"
Cohesion: 0.40
Nodes (5): api, send(), withToken(), electron@^45.3.1, electron

### Community 18 - "schemas.ts"
Cohesion: 0.07
Nodes (49): AuthChangePasswordSchema, AuthTokenSchema, CashMovementsQuerySchema, CustomerQuerySchema, CustomerTransactionsQuerySchema, emailSchema, idSchema, IncomeCreateSchema (+41 more)

### Community 19 - "coordinator.ts"
Cohesion: 0.20
Nodes (18): getSyncState(), listUploadCandidates(), markOutboxAck(), markOutboxRetryable(), markOutboxSyncingBatch(), markOutboxTerminal(), revertSyncingToPending(), UploadCandidate (+10 more)

### Community 20 - "sync"
Cohesion: 0.10
Nodes (19): context, dockerfile, interval, retries, start_period, test, timeout, services (+11 more)

### Community 21 - "outbox.ts"
Cohesion: 0.10
Nodes (21): countOutboxEvents(), AppendOutboxInput, eventPayloadSchemas, isoDateSchema, listOutboxEvents(), mapRow(), markOutboxAcknowledged(), markOutboxConflict() (+13 more)

### Community 22 - "AppError"
Cohesion: 0.23
Nodes (11): CatalogCategory, CatalogUnit, createCategory(), createUnit(), deleteCategory(), deleteUnit(), normDescription(), normName() (+3 more)

### Community 23 - "device-identity.ts"
Cohesion: 0.19
Nodes (11): DeviceIdentity, getOrCreateDeviceIdentity(), identityFilePath(), persist(), readPersisted(), clearSyncCredentials(), credsPath(), loadSyncCredentials() (+3 more)

### Community 24 - "vyapara.d.ts"
Cohesion: 0.40
Nodes (4): *.css, SyncStatusSnapshot, VyaparaIpcResult, Window

### Community 25 - "conflict-detector.ts"
Cohesion: 0.11
Nodes (38): buildConflictRecord(), detectConcurrentUpdate(), detectConflictForEvent(), detectDuplicateEvent(), detectOutOfOrderEvent(), detectStaleVersion(), getEntityVersion(), upsertEntityVersion() (+30 more)

### Community 29 - "main.ts"
Cohesion: 0.07
Nodes (38): openAppDatabase(), AppInfo, AppInfoSchema, createWindow(), EnvironmentStatus, EnvironmentStatusSchema, getDb(), gotLock (+30 more)

### Community 30 - "main/db/open.ts"
Cohesion: 0.10
Nodes (10): applyMigrations(), applySql(), AppOrm, countOf(), MIGRATIONS, normalizeLegacySchema(), renameColumnIfNeeded(), seedCatalog() (+2 more)

### Community 31 - "schema.ts"
Cohesion: 0.05
Nodes (37): cashDrawers, cashMovements, categories, customers, customerTransactions, deviceIdentity, expenseRecords, goodsReceiving (+29 more)

### Community 32 - "inventory.ts"
Cohesion: 0.08
Nodes (43): AppError, payCustomerCredit(), recordCustomerTransaction(), addOpnameItem(), applyStockMovement(), approveStockAdjustment(), completeStockOpname(), createStockAdjustment() (+35 more)

### Community 33 - "schemas.test.ts"
Cohesion: 0.15
Nodes (11): AuthLoginSchema, AuthSetupSchema, ipcFail(), ipcOk(), PaymentLineSchema, PERMISSIONS, ProductCreateSchema, ProductUpdateSchema (+3 more)

### Community 34 - "supplier.ts"
Cohesion: 0.06
Nodes (52): cancelPurchaseOrder(), createPurchaseOrder(), createPurchaseReturn(), getGoodsReceiving(), getPurchaseHistory(), getPurchaseOrder(), getPurchaseReturn(), GoodsReceivingItemRecord (+44 more)

### Community 35 - "reports.ts"
Cohesion: 0.13
Nodes (25): CashDrawerRecord, CashFlow, CashMovementRecord, closeCashDrawer(), drawerNumber(), DrawerRow, ExpenseRecord, ExpenseRow (+17 more)

### Community 36 - "e2e-mgmt-acceptance.cjs"
Cohesion: 0.25
Nodes (6): { _electron: electron }, fs, os, path, results, root

### Community 37 - "build"
Cohesion: 0.12
Nodes (17): build, appId, directories, electronDist, electronVersion, files, npmRebuild, nsis (+9 more)

### Community 38 - "auth.ts"
Cohesion: 0.18
Nodes (25): assertNotLocked(), assertPasswordPolicy(), assertPermission(), changePassword(), clearFailures(), failures, hashToken(), issueSession() (+17 more)

### Community 39 - "AppDatabase"
Cohesion: 0.10
Nodes (29): AppDatabase, createDb(), createDb(), listStockMovements(), assertReference(), assertUnique(), createProduct(), deactivateProduct() (+21 more)

### Community 43 - "e2e-debug-pos.cjs"
Cohesion: 0.25
Nodes (7): { _electron: electron }, fs, log, os, path, profile, root

### Community 46 - "e2e-shot-pos.cjs"
Cohesion: 0.29
Nodes (6): { _electron: electron }, fs, os, path, profile, root

### Community 47 - "e2e-procurement.cjs"
Cohesion: 0.25
Nodes (6): { _electron: electron }, fs, os, path, results, root

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
Cohesion: 0.18
Nodes (9): app, port, createSyncServer(), json(), makeEvent(), register(), require, salePayload() (+1 more)

### Community 54 - "AppError"
Cohesion: 0.12
Nodes (20): createCustomer(), customerCode(), CustomerRecord, CustomerRow, CustomerTransactionRecord, CustomerTxRow, deactivateCustomer(), getCustomer() (+12 more)

### Community 55 - "stress-4.5.test.ts"
Cohesion: 0.11
Nodes (16): SyncOutboxStatus, DownloadRunResult, runDownloadOnce(), InboundEvent, getDownloadCursor(), recoverStaleSyncingOutbox(), setDownloadCursor(), adminId() (+8 more)

### Community 57 - "transport.ts"
Cohesion: 0.22
Nodes (12): classifyHttpError(), DeviceRegisterResponse, DeviceTokenRenewResponse, joinUrl(), readJsonLimited(), registerDeviceTransport(), requestJson(), SyncDownloadResponse (+4 more)

### Community 58 - "transactions.ts"
Cohesion: 0.21
Nodes (10): getSettings(), readValue(), StoreSettings, updateSettings(), listTransactions(), readTransaction(), TransactionInput, TransactionItemRecord (+2 more)

### Community 59 - "SupplierInvoices.tsx"
Cohesion: 0.36
Nodes (7): idr(), Invoice, Payables, statusCls(), statusLabel(), Supplier, SupplierInvoices()

### Community 60 - "App.tsx"
Cohesion: 0.14
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
Cohesion: 0.22
Nodes (4): rootElement, initial, OfflineSync(), phaseLabel()

### Community 66 - "createSyncCoordinator"
Cohesion: 0.35
Nodes (12): createSyncCoordinator(), clearTimer(), ensureToken(), refreshCounts(), runCycle(), schedule(), setPhase(), startPeriodic() (+4 more)

### Community 67 - "e2e-smoke.cjs"
Cohesion: 0.22
Nodes (7): { _electron: electron }, fs, os, path, profile, results, root

### Community 68 - "assets.d.ts"
Cohesion: 0.29
Nodes (6): *.ico, *.jpeg, *.jpg, *.png, *.svg, *.webp

### Community 69 - "authStore.ts"
Cohesion: 0.15
Nodes (9): AuthState, User, UserRole, CatalogPage(), Category, Unit, Adjustment, Product (+1 more)

### Community 70 - "Settings.tsx"
Cohesion: 0.33
Nodes (5): AdminUser, Permission, Role, Setting, Settings()

### Community 71 - "e2e-purchase-return.cjs"
Cohesion: 0.25
Nodes (6): { _electron: electron }, fs, os, path, results, root

### Community 72 - "POS.tsx"
Cohesion: 0.36
Nodes (7): CartItem, hueFromString(), idr(), initials(), PAYMENT_METHODS, PaymentLine, POS()

### Community 73 - "desktop/package.json"
Cohesion: 0.17
Nodes (11): author, description, drizzle-orm@^0.45.4, @types/react-dom@^19.3.0, drizzle-orm, @types/react-dom, main, name (+3 more)

### Community 74 - "ref_fs"
Cohesion: 0.25
Nodes (5): fs, lines, replacement, content, fs

### Community 75 - "package.json"
Cohesion: 0.12
Nodes (18): dependencies, react@^19.3.1, react-dom@^19.3.1, zustand@^5.1.0, @playwright/test@^1.65.0, tailwindcss@^4.3.5, @types/babel__core@^7.20.5, @types/better-sqlite3@^9.6.0 (+10 more)

### Community 77 - "pos.ts"
Cohesion: 0.31
Nodes (9): assertMoney(), PAYMENT_METHODS, PaymentLine, PaymentMethod, quoteSale(), SaleQuote, Settlement, settlePayments() (+1 more)

### Community 78 - "ref_playwright"
Cohesion: 0.25
Nodes (5): { chromium }, path, { _electron: electron }, path, root

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

### Community 94 - "src/db/open.ts"
Cohesion: 0.20
Nodes (7): applyMigrations(), here, MIGRATIONS, openSyncServerDb(), require, desktopSrc, sharedSrc

### Community 99 - "SalesReturns.tsx"
Cohesion: 0.50
Nodes (4): idr(), ReturnRow, SalesReturnsPage(), TxnRow

### Community 101 - "e2e-backup-shot.cjs"
Cohesion: 0.29
Nodes (5): { _electron: electron }, fs, os, path, root

### Community 104 - "PurchaseReturns.tsx"
Cohesion: 0.38
Nodes (6): fmtDate(), idr(), PoDetail, PurchaseOrder, PurchaseReturn, PurchaseReturns()

### Community 108 - "sync-server.test.ts"
Cohesion: 0.48
Nodes (6): download(), json(), makeEvent(), register(), salePayload(), upload()

### Community 109 - "ref_path"
Cohesion: 0.40
Nodes (3): { app, BrowserWindow }, fs, path

### Community 110 - "build-installer.mjs"
Cohesion: 0.40
Nodes (3): desktopDir, releaseDir, root

### Community 114 - "workspaces"
Cohesion: 0.67
Nodes (3): workspaces, nohoist, packages

## Knowledge Gaps
- **1 isolated node(s):** `./tsconfig.json`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 640 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **38 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `electron` connect `electron` to `package.json`, `ref_path`, `device-identity.ts`, `credentials.ts`, `main.ts`?**
  _High betweenness centrality (0.078) - this node is a cross-community bridge._
- **What connects `./tsconfig.json` to the rest of the system?**
  _1 weakly-connected nodes found - possible missing edges._
- **Should `web/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.06423034330011074 - nodes in this community are weakly interconnected._
- **Why does `AppDatabase` connect `AppDatabase` to `inventory.ts`, `supplier.ts`, `reports.ts`, `auth.ts`, `reports.ts`, `main.ts`, `coordinator.ts`, `device-identity.ts`, `outbox.ts`, `AppError`, `AppError`, `.reopen`, `conflict-detector.ts`, `transactions.ts`, `admin.ts`, `stress-4.5.test.ts`, `db.test.ts`, `main/db/open.ts`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.08695652173913043 - nodes in this community are weakly interconnected._
- **Why does `AppError` connect `inventory.ts` to `supplier.ts`, `reports.ts`, `auth.ts`, `AppDatabase`, `reports.ts`, `outbox.ts`, `AppError`, `AppError`, `admin.ts`, `conflict-detector.ts`, `transactions.ts`, `db.test.ts`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._