# Graph Report - VYAPARA POS Windows Desktop hybird  (2026-11-16)

## Corpus Check
- 176 files · ~157,139 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 12 file(s) not represented in the graph (top: .pid 6, (none) 1, .css 1)

## Summary
- 1470 nodes · 2882 edges · 111 communities (74 shown, 37 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9a581bde`
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
- inbound.ts
- app.ts
- main.ts
- outbox.ts
- AppError
- stress-4.5.test.ts
- vyapara.d.ts
- conflict-resolution.test.ts
- src/index.ts
- main/db/open.ts
- schema.ts
- inventory.ts
- schemas.test.ts
- procurement.ts
- reports.ts
- e2e-mgmt-acceptance.cjs
- build
- package.json
- transactions.ts
- VyaparaDatabase
- sql.d.ts
- e2e-debug-pos.cjs
- @neondatabase/serverless@^1.2.0
- postcss@^8.4.33
- e2e-shot-pos.cjs
- applyMigrations
- reports.ts
- e2e-unpacked.cjs
- perf-probe.cjs
- createSyncCoordinator
- acceptance-4.2.test.ts
- AppError
- coordinator.ts
- products.ts
- devices.ts
- services/sync.ts
- sync-server.test.ts
- App.tsx
- db.test.ts
- Products.tsx
- transport.ts
- Reports.tsx
- Procurement.tsx
- ref_path
- e2e-smoke.cjs
- assets.d.ts
- StockAdjustments.tsx
- Settings.tsx
- OfflineSync.tsx
- POS.tsx
- desktop/package.json
- ref_fs
- workspaces
- @vitejs/plugin-react@^1.2.0
- createWindow
- AppDatabase
- tsconfig.electron.json
- tailwindcss@^4.3.5
- admin.ts
- credentials.ts
- steps
- drizzle-kit
- electron-builder@^26.18.0
- eslint@^9.21.2
- globals@^6.1.0
- @playwright/test@^1.65.0
- @tailwindcss/vite@^4.3.5
- @types/node@^22.13.1
- SalesReturns.tsx
- @fontsource/inter@^5.2.2
- e2e-backup-shot.cjs
- vite-tsconfig-paths@^6.1.1
- tailwindcss@^4.3.5
- Supplier.tsx
- vitest.config.ts
- drizzle-orm@^0.45.4
- @fontsource/inter@^5.2.2
- typescript@^5.9.3
- unbuild@^3.0.1

## God Nodes (most connected - your core abstractions)
1. `AppError` - 89 edges
2. `AppDatabase` - 60 edges
3. `useAuth` - 35 edges
4. `setupAdmin()` - 33 edges
5. `createSyncCoordinator()` - 26 edges
6. `createWindow()` - 22 edges
7. `compilerOptions` - 20 edges
8. `createTransaction()` - 19 edges
9. `compilerOptions` - 19 edges
10. `applyInboundEventAtomically()` - 18 edges

## Surprising Connections (you probably didn't know these)
- `runDownloadOnce()` --calls--> `encodeCursor()`  [EXTRACTED]
  apps/desktop/electron/main/sync/download.ts → packages/shared/src/sync.ts
- `createDb()` --calls--> `AppDatabase`  [EXTRACTED]
  apps/desktop/electron/main/services/customer.test.ts → apps/desktop/electron/main/db/open.ts
- `createDb()` --calls--> `AppDatabase`  [EXTRACTED]
  apps/desktop/electron/main/services/finance.test.ts → apps/desktop/electron/main/db/open.ts
- `createDb()` --calls--> `AppDatabase`  [EXTRACTED]
  apps/desktop/electron/main/services/transactions.test.ts → apps/desktop/electron/main/db/open.ts
- `deleteCategory()` --calls--> `AppError`  [EXTRACTED]
  apps/desktop/electron/main/services/catalog.ts → apps/desktop/electron/main/errors.ts

## Import Cycles
- None detected.

## Communities (111 total, 37 thin omitted)

### Community 0 - "useAuth"
Cohesion: 0.13
Nodes (15): AuthState, useAuth, User, UserRole, Customer(), CustomerRecord, DocumentServices(), Finance() (+7 more)

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
Cohesion: 0.08
Nodes (25): devDependencies, autoprefixer@^10.4.16, globals@^6.1.0, @playwright/test@^1.65.0, postcss@^8.4.33, prettier@^3.5.3, @types/babel__core@^7.20.5, @types/better-sqlite3@^9.6.0 (+17 more)

### Community 9 - "desktop/package.json"
Cohesion: 0.18
Nodes (11): dependencies, better-sqlite3@^13.1.1, jsbarcode@^3.11.0, react@^19.3.1, react-dom@^19.3.1, zustand@^5.1.0, better-sqlite3, react (+3 more)

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
Nodes (25): aggregateIdSchema, aggregateTypeSchema, deviceIdSchema, DeviceRegisterRequest, deviceRegisterRequestSchema, deviceRegisterResponseSchema, DeviceRevokeRequest, deviceRevokeRequestSchema (+17 more)

### Community 16 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, module, moduleResolution, noUncheckedIndexedAccess, outDir, resolveJsonModule (+7 more)

### Community 17 - "electron"
Cohesion: 0.40
Nodes (5): api, send(), withToken(), electron@^45.3.1, electron

### Community 18 - "inbound.ts"
Cohesion: 0.20
Nodes (20): applyAutoResolution(), createConflictRecord(), insertConflictHistory(), updateConflictStatus(), applyBusinessEvent(), applyCustomerPayment(), applyInboundEventAtomically(), applyInventoryMovement() (+12 more)

### Community 19 - "app.ts"
Cohesion: 0.33
Nodes (8): handleRequest(), HttpError, readJsonBody(), requireBearerDeviceAuth(), sendError(), sendJson(), sendOk(), SYNC_LIMITS

### Community 20 - "main.ts"
Cohesion: 0.04
Nodes (5): AppInfo, AppInfoSchema, EnvironmentStatus, EnvironmentStatusSchema, gotLock

### Community 21 - "outbox.ts"
Cohesion: 0.05
Nodes (47): createCustomer(), customerCode(), CustomerRecord, CustomerRow, CustomerTransactionRecord, CustomerTxRow, deactivateCustomer(), getCustomer() (+39 more)

### Community 22 - "AppError"
Cohesion: 0.23
Nodes (11): CatalogCategory, CatalogUnit, createCategory(), createUnit(), deleteCategory(), deleteUnit(), normDescription(), normName() (+3 more)

### Community 23 - "stress-4.5.test.ts"
Cohesion: 0.16
Nodes (6): getPendingConflicts(), adminId(), createSale(), makeDb(), seedProduct(), { state }

### Community 24 - "vyapara.d.ts"
Cohesion: 0.40
Nodes (4): *.css, SyncStatusSnapshot, VyaparaIpcResult, Window

### Community 25 - "conflict-resolution.test.ts"
Cohesion: 0.15
Nodes (23): buildConflictRecord(), detectConcurrentUpdate(), detectConflictForEvent(), detectDuplicateEvent(), detectOutOfOrderEvent(), detectStaleVersion(), getEntityVersion(), upsertEntityVersion() (+15 more)

### Community 29 - "src/index.ts"
Cohesion: 0.05
Nodes (71): AuthChangePasswordSchema, AuthTokenSchema, BestSellingQuerySchema, CashDrawerCloseSchema, CashDrawerOpenSchema, CashDrawerQuerySchema, CashierPerformanceQuerySchema, CashMovementsQuerySchema (+63 more)

### Community 30 - "main/db/open.ts"
Cohesion: 0.10
Nodes (10): applyMigrations(), applySql(), AppOrm, countOf(), MIGRATIONS, normalizeLegacySchema(), renameColumnIfNeeded(), seedCatalog() (+2 more)

### Community 31 - "schema.ts"
Cohesion: 0.05
Nodes (37): cashDrawers, cashMovements, categories, customers, customerTransactions, deviceIdentity, expenseRecords, goodsReceiving (+29 more)

### Community 32 - "inventory.ts"
Cohesion: 0.12
Nodes (19): addOpnameItem(), completeStockOpname(), createStockOpname(), generateOpnameNumber(), getCurrentStock(), getOpnameItem(), getProductInventorySettings(), getStockOpname() (+11 more)

### Community 33 - "schemas.test.ts"
Cohesion: 0.17
Nodes (11): AuthLoginSchema, AuthSetupSchema, ipcFail(), ipcOk(), PaymentLineSchema, PERMISSIONS, ProductCreateSchema, ProductUpdateSchema (+3 more)

### Community 34 - "procurement.ts"
Cohesion: 0.10
Nodes (26): recordStockMovement(), cancelPurchaseOrder(), createPurchaseOrder(), createPurchaseReturn(), getGoodsReceiving(), getPurchaseHistory(), getPurchaseOrder(), getPurchaseReturn() (+18 more)

### Community 35 - "reports.ts"
Cohesion: 0.13
Nodes (25): CashDrawerRecord, CashFlow, CashMovementRecord, closeCashDrawer(), drawerNumber(), DrawerRow, ExpenseRecord, ExpenseRow (+17 more)

### Community 36 - "e2e-mgmt-acceptance.cjs"
Cohesion: 0.25
Nodes (6): { _electron: electron }, fs, os, path, results, root

### Community 37 - "build"
Cohesion: 0.12
Nodes (16): build, appId, directories, electronDist, electronVersion, files, npmRebuild, nsis (+8 more)

### Community 38 - "package.json"
Cohesion: 0.11
Nodes (20): dependencies, react@^19.3.1, react-dom@^19.3.1, zustand@^5.1.0, eslint@^9.21.2, eslint-plugin-react@^7.37.4, @tailwindcss/vite@^4.3.5, @vitejs/plugin-react@^1.2.0 (+12 more)

### Community 39 - "transactions.ts"
Cohesion: 0.13
Nodes (22): transact(), getSettings(), readValue(), StoreSettings, updateSettings(), assertQuantity(), createTransaction(), listTransactions() (+14 more)

### Community 43 - "e2e-debug-pos.cjs"
Cohesion: 0.25
Nodes (7): { _electron: electron }, fs, log, os, path, profile, root

### Community 46 - "e2e-shot-pos.cjs"
Cohesion: 0.18
Nodes (8): { chromium }, path, { _electron: electron }, fs, os, path, profile, root

### Community 49 - "reports.ts"
Cohesion: 0.19
Nodes (24): BestSellingRow, CashierPerformanceRow, dateExpression(), ExpenseReportRow, getBestSellingProducts(), getCashierPerformance(), getExpenseReport(), getGrossProfit() (+16 more)

### Community 50 - "e2e-unpacked.cjs"
Cohesion: 0.25
Nodes (6): { _electron: electron }, fs, os, path, results, root

### Community 51 - "perf-probe.cjs"
Cohesion: 0.25
Nodes (7): { _electron: electron }, fs, os, path, profile, root, t0

### Community 52 - "createSyncCoordinator"
Cohesion: 0.20
Nodes (17): createSyncCoordinator(), clearTimer(), ensureToken(), refreshCounts(), runCycle(), schedule(), setPhase(), startPeriodic() (+9 more)

### Community 53 - "acceptance-4.2.test.ts"
Cohesion: 0.13
Nodes (14): SyncServerConfig, applyMigrations(), here, MIGRATIONS, openSyncServerDb(), require, SyncServerDb, createSyncServer() (+6 more)

### Community 54 - "AppError"
Cohesion: 0.22
Nodes (12): AppError, applyStockMovement(), approveStockAdjustment(), createStockAdjustment(), getStockAdjustment(), appendOutboxEvent(), validateOutboxEvent(), createSalesReturn() (+4 more)

### Community 55 - "coordinator.ts"
Cohesion: 0.17
Nodes (22): SyncOutboxStatus, SyncOutboxStatusValue, getSyncState(), listUploadCandidates(), markOutboxAck(), markOutboxRetryable(), markOutboxSyncingBatch(), markOutboxTerminal() (+14 more)

### Community 56 - "products.ts"
Cohesion: 0.19
Nodes (17): listStockMovements(), assertReference(), assertUnique(), createProduct(), deactivateProduct(), listCategories(), listProducts(), listUnits() (+9 more)

### Community 57 - "devices.ts"
Cohesion: 0.34
Nodes (13): addHoursIso(), nowIso(), randomToken(), safeEqualHex(), sha256Hex(), authenticateBearerToken(), AuthenticatedDevice, DeviceAuthResult (+5 more)

### Community 58 - "services/sync.ts"
Cohesion: 0.16
Nodes (14): AuthScope, downloadEvents(), ExistingEventRow, ingestEventsBatch(), UploadEventInput, validateEventBusiness(), decodeCursor(), encodeCursor() (+6 more)

### Community 59 - "sync-server.test.ts"
Cohesion: 0.48
Nodes (6): download(), json(), makeEvent(), register(), salePayload(), upload()

### Community 60 - "App.tsx"
Cohesion: 0.11
Nodes (17): AlertRow, Dashboard(), dayKey(), fmtIDR(), fmtShort(), icons, idr, KpiCard() (+9 more)

### Community 61 - "db.test.ts"
Cohesion: 0.33
Nodes (3): assertIntegrity(), backupDatabase(), restoreDatabase()

### Community 62 - "Products.tsx"
Cohesion: 0.50
Nodes (4): EMPTY_FORM, idr(), Product, ProductsPage()

### Community 63 - "transport.ts"
Cohesion: 0.14
Nodes (21): DownloadRunResult, runDownloadOnce(), InboundEvent, getDownloadCursor(), setDownloadCursor(), makeEnvelope(), salePayload(), classifyHttpError() (+13 more)

### Community 64 - "Reports.tsx"
Cohesion: 0.12
Nodes (12): App(), rootElement, BestSellingRow, CashierRow, ExpenseRow, GrossProfitRow, PurchaseRow, Reports() (+4 more)

### Community 65 - "Procurement.tsx"
Cohesion: 0.40
Nodes (4): PoItem, Procurement(), PurchaseOrder, ReceiveItem

### Community 66 - "ref_path"
Cohesion: 0.40
Nodes (3): { app, BrowserWindow }, fs, path

### Community 67 - "e2e-smoke.cjs"
Cohesion: 0.22
Nodes (7): { _electron: electron }, fs, os, path, profile, results, root

### Community 68 - "assets.d.ts"
Cohesion: 0.29
Nodes (6): *.ico, *.jpeg, *.jpg, *.png, *.svg, *.webp

### Community 69 - "StockAdjustments.tsx"
Cohesion: 0.50
Nodes (3): Adjustment, Product, StockAdjustmentsPage()

### Community 70 - "Settings.tsx"
Cohesion: 0.33
Nodes (5): AdminUser, Permission, Role, Setting, Settings()

### Community 71 - "OfflineSync.tsx"
Cohesion: 0.50
Nodes (3): initial, OfflineSync(), phaseLabel()

### Community 72 - "POS.tsx"
Cohesion: 0.36
Nodes (7): CartItem, hueFromString(), idr(), initials(), PAYMENT_METHODS, PaymentLine, POS()

### Community 73 - "desktop/package.json"
Cohesion: 0.17
Nodes (11): author, description, drizzle-orm@^0.45.4, @types/react-dom@^19.3.0, drizzle-orm, @types/react-dom, main, name (+3 more)

### Community 74 - "ref_fs"
Cohesion: 0.25
Nodes (5): fs, lines, replacement, content, fs

### Community 75 - "workspaces"
Cohesion: 0.67
Nodes (3): workspaces, nohoist, packages

### Community 77 - "createWindow"
Cohesion: 0.20
Nodes (11): openAppDatabase(), createWindow(), getDb(), isOnline(), loadToken(), publicUser(), setActiveToken(), tokenFile() (+3 more)

### Community 78 - "AppDatabase"
Cohesion: 0.07
Nodes (62): AppDatabase, createDb(), assertNotLocked(), assertPasswordPolicy(), assertPermission(), changePassword(), clearFailures(), failures (+54 more)

### Community 81 - "tsconfig.electron.json"
Cohesion: 0.29
Nodes (6): compilerOptions, moduleResolution, exclude, extends, include, ./tsconfig.json

### Community 88 - "admin.ts"
Cohesion: 0.13
Nodes (21): AdminPermissionRecord, AdminRoleRecord, AdminUserRecord, createRole(), createUser(), deactivateRole(), deactivateUser(), listPermissions() (+13 more)

### Community 89 - "credentials.ts"
Cohesion: 0.46
Nodes (6): clearSyncCredentials(), credsEncPath(), credsPath(), loadSyncCredentials(), saveSyncCredentials(), SyncCredentials

### Community 90 - "steps"
Cohesion: 0.12
Nodes (16): jobs, verify, name, on, pull_request, push, branches, branches (+8 more)

### Community 99 - "SalesReturns.tsx"
Cohesion: 0.50
Nodes (4): idr(), ReturnRow, SalesReturnsPage(), TxnRow

### Community 101 - "e2e-backup-shot.cjs"
Cohesion: 0.29
Nodes (5): { _electron: electron }, fs, os, path, root

### Community 104 - "Supplier.tsx"
Cohesion: 0.50
Nodes (3): Supplier(), SupplierRecord, SupplierTransaction

## Knowledge Gaps
- **1 isolated node(s):** `./tsconfig.json`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 623 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **37 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `electron` connect `electron` to `ref_path`, `package.json`, `main.ts`, `createSyncCoordinator`, `credentials.ts`?**
  _High betweenness centrality (0.087) - this node is a cross-community bridge._
- **What connects `./tsconfig.json` to the rest of the system?**
  _1 weakly-connected nodes found - possible missing edges._
- **Should `useAuth` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._
- **Why does `AppError` connect `AppError` to `inventory.ts`, `procurement.ts`, `reports.ts`, `transactions.ts`, `AppDatabase`, `reports.ts`, `inbound.ts`, `outbox.ts`, `AppError`, `admin.ts`, `products.ts`, `db.test.ts`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Should `web/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.06423034330011074 - nodes in this community are weakly interconnected._
- **Why does `devDependencies` connect `devDependencies` to `package.json`, `drizzle-orm@^0.45.4`, `@fontsource/inter@^5.2.2`, `electron-vite`, `typescript@^5.9.3`, `unbuild@^3.0.1`, `electron`, `tailwindcss@^4.3.5`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.08695652173913043 - nodes in this community are weakly interconnected._