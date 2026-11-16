# Graph Report - VYAPARA POS Windows Desktop hybird  (2026-11-16)

## Corpus Check
- 160 files · ~128,490 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 9 file(s) not represented in the graph (top: .pid 3, (none) 1, .css 1)

## Summary
- 1342 nodes · 2689 edges · 99 communities (58 shown, 41 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ddb6af94`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- useAuth
- web/package.json
- e2e-smoke.cjs
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
- pos.ts
- compilerOptions
- AppError
- typescript@^5.9.3
- app.ts
- src/sync.ts
- outbox.ts
- eslint-plugin-react@^7.37.4
- main.ts
- vyapara.d.ts
- conflict-resolution.test.ts
- src/index.ts
- main/db/open.ts
- schema.ts
- inventory.ts
- schemas.test.ts
- procurement.ts
- reports.ts
- auth.ts
- vite-tsconfig-paths@^6.1.1
- dependencies
- credentials.ts
- customer.test.ts
- sql.d.ts
- eslint@^9.21.2
- @neondatabase/serverless@^1.2.0
- postcss@^8.4.33
- better-sqlite3@^13.1.1
- applyMigrations
- reports.ts
- products.ts
- @playwright/test@^1.65.0
- db.test.ts
- acceptance-4.2.test.ts
- AppDatabase
- stress-4.5.test.ts
- customer.ts
- devices.ts
- settings.ts
- sync-server.test.ts
- App.tsx
- createWindow
- typescript-eslint@^8.24.1
- services/sync.ts
- Reports.tsx
- App
- eslint@^9.21.2
- transactions.ts
- assets.d.ts
- ref_react
- Settings.tsx
- OfflineSync.tsx
- POS.tsx
- Procurement.tsx
- vitest.config.ts
- package.json
- globals@^6.1.0
- @playwright/test@^1.65.0
- eslint-plugin-react@^7.37.4
- tsconfig.electron.json
- tailwindcss@^4.3.5
- @tailwindcss/vite@^4.3.5
- @types/react@^19.3.0
- vitest@^5.1.0
- @fontsource/inter@^5.2.2
- tailwindcss@^4.3.5
- @tailwindcss/vite@^4.3.5
- @types/react@^19.3.0
- vitest@^5.1.0
- drizzle-orm@^0.45.4
- vite@^8.3.8

## God Nodes (most connected - your core abstractions)
1. `AppError` - 81 edges
2. `AppDatabase` - 59 edges
3. `setupAdmin()` - 33 edges
4. `useAuth` - 33 edges
5. `createSyncCoordinator()` - 26 edges
6. `createWindow()` - 20 edges
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
  apps/desktop/electron/main/services/admin.test.ts → apps/desktop/electron/main/db/open.ts
- `createDb()` --calls--> `AppDatabase`  [EXTRACTED]
  apps/desktop/electron/main/services/auth.test.ts → apps/desktop/electron/main/db/open.ts

## Import Cycles
- None detected.

## Communities (99 total, 41 thin omitted)

### Community 0 - "useAuth"
Cohesion: 0.15
Nodes (13): AuthState, useAuth, User, UserRole, DocumentServices(), Finance(), NextDashboard(), Performance() (+5 more)

### Community 1 - "web/package.json"
Cohesion: 0.06
Nodes (42): dependencies, react@^19.3.1, react-dom@^19.3.1, devDependencies, autoprefixer@^10.4.16, eslint@^9.21.2, eslint-plugin-react@^7.37.4, globals@^6.7.2 (+34 more)

### Community 2 - "e2e-smoke.cjs"
Cohesion: 0.07
Nodes (19): VyaparaDatabase, { _electron: electron }, fs, os, path, results, root, { _electron: electron } (+11 more)

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
Cohesion: 0.14
Nodes (13): devDependencies, autoprefixer@^10.4.16, drizzle-kit@^0.31.11, globals@^6.1.0, @types/node@^22.13.1, @types/react-dom@^19.3.0, @vitejs/plugin-react@^1.2.0, autoprefixer (+5 more)

### Community 8 - "devDependencies"
Cohesion: 0.11
Nodes (19): devDependencies, autoprefixer@^10.4.16, drizzle-orm@^0.45.4, postcss@^8.4.33, @types/better-sqlite3@^9.6.0, @types/node@^22.13.1, @types/react-dom@^19.3.0, typescript@^5.9.3 (+11 more)

### Community 9 - "desktop/package.json"
Cohesion: 0.19
Nodes (13): dependencies, jsbarcode@^3.11.0, react@^19.3.1, react-dom@^19.3.1, zustand@^5.1.0, react, react-dom, zustand (+5 more)

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

### Community 15 - "pos.ts"
Cohesion: 0.31
Nodes (9): assertMoney(), PAYMENT_METHODS, PaymentLine, PaymentMethod, quoteSale(), SaleQuote, Settlement, settlePayments() (+1 more)

### Community 16 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, module, moduleResolution, noUncheckedIndexedAccess, outDir, resolveJsonModule (+7 more)

### Community 17 - "AppError"
Cohesion: 0.12
Nodes (22): AdminPermissionRecord, AdminRoleRecord, AdminUserRecord, createRole(), createUser(), deactivateRole(), deactivateUser(), listPermissions() (+14 more)

### Community 19 - "app.ts"
Cohesion: 0.33
Nodes (8): handleRequest(), HttpError, readJsonBody(), requireBearerDeviceAuth(), sendError(), sendJson(), sendOk(), SYNC_LIMITS

### Community 20 - "src/sync.ts"
Cohesion: 0.09
Nodes (31): DeviceRegisterResponse, DeviceTokenRenewResponse, SyncDownloadResponse, SyncUploadResponse, TransportError, TransportOptions, aggregateIdSchema, aggregateTypeSchema (+23 more)

### Community 21 - "outbox.ts"
Cohesion: 0.10
Nodes (21): countOutboxEvents(), AppendOutboxInput, eventPayloadSchemas, isoDateSchema, listOutboxEvents(), mapRow(), markOutboxAcknowledged(), markOutboxConflict() (+13 more)

### Community 23 - "main.ts"
Cohesion: 0.04
Nodes (5): AppInfo, AppInfoSchema, EnvironmentStatus, EnvironmentStatusSchema, gotLock

### Community 24 - "vyapara.d.ts"
Cohesion: 0.40
Nodes (4): *.css, SyncStatusSnapshot, VyaparaIpcResult, Window

### Community 25 - "conflict-resolution.test.ts"
Cohesion: 0.11
Nodes (39): buildConflictRecord(), detectConcurrentUpdate(), detectConflictForEvent(), detectDuplicateEvent(), detectOutOfOrderEvent(), detectStaleVersion(), getEntityVersion(), upsertEntityVersion() (+31 more)

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
Cohesion: 0.17
Nodes (11): AuthLoginSchema, AuthSetupSchema, ipcFail(), ipcOk(), PaymentLineSchema, PERMISSIONS, ProductCreateSchema, ProductUpdateSchema (+3 more)

### Community 34 - "procurement.ts"
Cohesion: 0.06
Nodes (50): cancelPurchaseOrder(), createPurchaseOrder(), createPurchaseReturn(), getGoodsReceiving(), getPurchaseHistory(), getPurchaseOrder(), getPurchaseReturn(), GoodsReceivingItemRecord (+42 more)

### Community 35 - "reports.ts"
Cohesion: 0.13
Nodes (25): CashDrawerRecord, CashFlow, CashMovementRecord, closeCashDrawer(), drawerNumber(), DrawerRow, ExpenseRecord, ExpenseRow (+17 more)

### Community 36 - "auth.ts"
Cohesion: 0.18
Nodes (24): assertNotLocked(), assertPasswordPolicy(), assertPermission(), changePassword(), clearFailures(), failures, hashToken(), issueSession() (+16 more)

### Community 38 - "dependencies"
Cohesion: 0.29
Nodes (7): dependencies, react@^19.3.1, react-dom@^19.3.1, zustand@^5.1.0, react, react-dom, zustand

### Community 39 - "credentials.ts"
Cohesion: 0.22
Nodes (11): api, send(), withToken(), clearSyncCredentials(), credsEncPath(), credsPath(), loadSyncCredentials(), saveSyncCredentials() (+3 more)

### Community 40 - "customer.test.ts"
Cohesion: 0.21
Nodes (9): needsSetup(), appendOutboxEventMock, createCustomerRecord(), createCustomerWithDebit(), createDb(), createTestDb(), getAdminUserId(), realAppendOutboxEvent (+1 more)

### Community 47 - "applyMigrations"
Cohesion: 0.38
Nodes (5): applyMigrations(), applySql(), connect(), splitSql(), remediateKnownPassword()

### Community 49 - "reports.ts"
Cohesion: 0.19
Nodes (24): BestSellingRow, CashierPerformanceRow, dateExpression(), ExpenseReportRow, getBestSellingProducts(), getCashierPerformance(), getExpenseReport(), getGrossProfit() (+16 more)

### Community 50 - "products.ts"
Cohesion: 0.17
Nodes (20): applyStockMovement(), listStockMovements(), assertReference(), assertUnique(), createProduct(), deactivateProduct(), listCategories(), listProducts() (+12 more)

### Community 52 - "db.test.ts"
Cohesion: 0.36
Nodes (3): assertIntegrity(), backupDatabase(), restoreDatabase()

### Community 53 - "acceptance-4.2.test.ts"
Cohesion: 0.15
Nodes (14): SyncServerConfig, applyMigrations(), here, MIGRATIONS, openSyncServerDb(), require, SyncServerDb, createSyncServer() (+6 more)

### Community 54 - "AppDatabase"
Cohesion: 0.19
Nodes (10): AppDatabase, createDb(), seedContext(), createDb(), createAndLoginAdmin(), createDb(), seedAdminIfNeeded(), makeDb() (+2 more)

### Community 55 - "stress-4.5.test.ts"
Cohesion: 0.06
Nodes (62): DeviceIdentity, getOrCreateDeviceIdentity(), identityFilePath(), persist(), readPersisted(), SyncOutboxStatus, createSyncCoordinator(), clearTimer() (+54 more)

### Community 56 - "customer.ts"
Cohesion: 0.15
Nodes (25): AppError, createCustomer(), customerCode(), CustomerRecord, CustomerRow, CustomerTransactionRecord, CustomerTxRow, deactivateCustomer() (+17 more)

### Community 57 - "devices.ts"
Cohesion: 0.34
Nodes (13): addHoursIso(), nowIso(), randomToken(), safeEqualHex(), sha256Hex(), authenticateBearerToken(), AuthenticatedDevice, DeviceAuthResult (+5 more)

### Community 58 - "settings.ts"
Cohesion: 0.60
Nodes (4): getSettings(), readValue(), StoreSettings, updateSettings()

### Community 59 - "sync-server.test.ts"
Cohesion: 0.48
Nodes (6): download(), json(), makeEvent(), register(), salePayload(), upload()

### Community 60 - "App.tsx"
Cohesion: 0.13
Nodes (14): AlertRow, Dashboard(), dayKey(), fmtIDR(), fmtShort(), icons, idr, KpiCard() (+6 more)

### Community 61 - "createWindow"
Cohesion: 0.20
Nodes (11): openAppDatabase(), createWindow(), getDb(), isOnline(), loadToken(), publicUser(), setActiveToken(), tokenFile() (+3 more)

### Community 63 - "services/sync.ts"
Cohesion: 0.16
Nodes (13): AuthScope, downloadEvents(), ExistingEventRow, ingestEventsBatch(), UploadEventInput, validateEventBusiness(), decodeCursor(), PerEventAck (+5 more)

### Community 64 - "Reports.tsx"
Cohesion: 0.20
Nodes (9): BestSellingRow, CashierRow, ExpenseRow, GrossProfitRow, PurchaseRow, SalesRow, SlowMovingRow, TransactionRow (+1 more)

### Community 65 - "App"
Cohesion: 0.20
Nodes (6): App(), rootElement, Reports(), Supplier(), SupplierRecord, SupplierTransaction

### Community 67 - "transactions.ts"
Cohesion: 0.15
Nodes (13): recordStockMovement(), SalesReturnItemRecord, SalesReturnRecord, TiRow, TrRow, assertQuantity(), createTransaction(), listTransactions() (+5 more)

### Community 68 - "assets.d.ts"
Cohesion: 0.29
Nodes (6): *.ico, *.jpeg, *.jpg, *.png, *.svg, *.webp

### Community 70 - "Settings.tsx"
Cohesion: 0.33
Nodes (5): AdminUser, Permission, Role, Setting, Settings()

### Community 71 - "OfflineSync.tsx"
Cohesion: 0.50
Nodes (3): initial, OfflineSync(), phaseLabel()

### Community 72 - "POS.tsx"
Cohesion: 0.40
Nodes (4): CartItem, PAYMENT_METHODS, PaymentLine, POS()

### Community 73 - "Procurement.tsx"
Cohesion: 0.40
Nodes (4): PoItem, Procurement(), PurchaseOrder, ReceiveItem

### Community 75 - "package.json"
Cohesion: 0.12
Nodes (16): @fontsource/inter@^5.2.2, prettier@^3.5.3, @types/babel__core@^7.20.5, typescript-eslint@^8.24.1, vite@^8.3.8, @fontsource/inter, prettier, typescript-eslint (+8 more)

### Community 81 - "tsconfig.electron.json"
Cohesion: 0.29
Nodes (6): compilerOptions, moduleResolution, exclude, extends, include, ./tsconfig.json

## Knowledge Gaps
- **1 isolated node(s):** `./tsconfig.json`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 541 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **41 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `electron` connect `credentials.ts` to `package.json`, `stress-4.5.test.ts`, `main.ts`?**
  _High betweenness centrality (0.082) - this node is a cross-community bridge._
- **What connects `./tsconfig.json` to the rest of the system?**
  _1 weakly-connected nodes found - possible missing edges._
- **Should `useAuth` be split into smaller, more focused modules?**
  _Cohesion score 0.14855072463768115 - nodes in this community are weakly interconnected._
- **Why does `AppDatabase` connect `AppDatabase` to `inventory.ts`, `procurement.ts`, `reports.ts`, `auth.ts`, `transactions.ts`, `customer.test.ts`, `applyMigrations`, `AppError`, `products.ts`, `reports.ts`, `db.test.ts`, `outbox.ts`, `stress-4.5.test.ts`, `customer.ts`, `conflict-resolution.test.ts`, `settings.ts`, `createWindow`, `main/db/open.ts`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Should `web/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.06423034330011074 - nodes in this community are weakly interconnected._
- **Why does `AppError` connect `customer.ts` to `inventory.ts`, `procurement.ts`, `transactions.ts`, `auth.ts`, `reports.ts`, `AppError`, `products.ts`, `reports.ts`, `db.test.ts`, `outbox.ts`, `conflict-resolution.test.ts`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Should `e2e-smoke.cjs` be split into smaller, more focused modules?**
  _Cohesion score 0.06507936507936508 - nodes in this community are weakly interconnected._