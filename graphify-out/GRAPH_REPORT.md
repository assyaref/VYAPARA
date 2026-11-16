# Graph Report - VYAPARA POS Windows Desktop hybird  (2026-11-16)

## Corpus Check
- 164 files · ~132,927 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 9 file(s) not represented in the graph (top: .pid 3, (none) 1, .css 1)

## Summary
- 1379 nodes · 2722 edges · 99 communities (61 shown, 38 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8b4de244`
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
- services/sync.ts
- compilerOptions
- electron
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
- package.json
- credentials.ts
- VyaparaDatabase
- sql.d.ts
- eslint@^9.21.2
- @neondatabase/serverless@^1.2.0
- postcss@^8.4.33
- better-sqlite3@^13.1.1
- applyMigrations
- reports.ts
- drizzle-orm@^0.45.4
- @playwright/test@^1.65.0
- db.test.ts
- src/db/open.ts
- AppDatabase
- stress-4.5.test.ts
- customer.ts
- devices.ts
- @fontsource/inter@^5.2.2
- sync-server.test.ts
- App.tsx
- createWindow
- typescript-eslint@^8.24.1
- src/sync.ts
- Reports.tsx
- App
- typescript@^5.9.3
- e2e-smoke.cjs
- assets.d.ts
- ref_react
- Settings.tsx
- OfflineSync.tsx
- POS.tsx
- Procurement.tsx
- ref_fs
- workspaces
- unbuild@^3.0.1
- src/index.ts
- supplier.ts
- tsconfig.electron.json
- tailwindcss@^4.3.5
- admin.ts
- products.ts
- steps
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
10. `applyInboundEventAtomically()` - 18 edges

## Surprising Connections (you probably didn't know these)
- `createDb()` --calls--> `AppDatabase`  [EXTRACTED]
  apps/desktop/electron/main/services/auth.test.ts → apps/desktop/electron/main/db/open.ts
- `createDb()` --calls--> `AppDatabase`  [EXTRACTED]
  apps/desktop/electron/main/services/finance.test.ts → apps/desktop/electron/main/db/open.ts
- `createDb()` --calls--> `AppDatabase`  [EXTRACTED]
  apps/desktop/electron/main/services/supplier.payment.test.ts → apps/desktop/electron/main/db/open.ts
- `createDb()` --calls--> `AppDatabase`  [EXTRACTED]
  apps/desktop/electron/main/services/supplier.test.ts → apps/desktop/electron/main/db/open.ts
- `createTransaction()` --calls--> `quoteSale()`  [EXTRACTED]
  apps/desktop/electron/main/services/transactions.ts → packages/shared/src/pos.ts

## Import Cycles
- None detected.

## Communities (99 total, 38 thin omitted)

### Community 0 - "useAuth"
Cohesion: 0.15
Nodes (13): AuthState, useAuth, User, UserRole, DocumentServices(), Finance(), NextDashboard(), Performance() (+5 more)

### Community 1 - "web/package.json"
Cohesion: 0.06
Nodes (42): dependencies, react@^19.3.1, react-dom@^19.3.1, devDependencies, autoprefixer@^10.4.16, eslint@^9.21.2, eslint-plugin-react@^7.37.4, globals@^6.7.2 (+34 more)

### Community 2 - "e2e-acceptance.cjs"
Cohesion: 0.12
Nodes (13): { _electron: electron }, fs, os, path, results, root, { _electron: electron }, fs (+5 more)

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
Cohesion: 0.08
Nodes (25): devDependencies, autoprefixer@^10.4.16, globals@^6.1.0, @playwright/test@^1.65.0, postcss@^8.4.33, prettier@^3.5.3, @types/babel__core@^7.20.5, @types/better-sqlite3@^9.6.0 (+17 more)

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

### Community 15 - "services/sync.ts"
Cohesion: 0.13
Nodes (6): AuthScope, downloadEvents(), ExistingEventRow, ingestEventsBatch(), UploadEventInput, validateEventBusiness()

### Community 16 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, module, moduleResolution, noUncheckedIndexedAccess, outDir, resolveJsonModule (+7 more)

### Community 17 - "electron"
Cohesion: 0.40
Nodes (5): api, send(), withToken(), electron@^45.3.1, electron

### Community 19 - "app.ts"
Cohesion: 0.44
Nodes (7): handleRequest(), HttpError, readJsonBody(), requireBearerDeviceAuth(), sendError(), sendJson(), sendOk()

### Community 20 - "src/sync.ts"
Cohesion: 0.10
Nodes (23): DeviceRegisterResponse, DeviceTokenRenewResponse, joinUrl(), registerDeviceTransport(), SyncDownloadResponse, SyncUploadResponse, TransportError, TransportOptions (+15 more)

### Community 21 - "outbox.ts"
Cohesion: 0.05
Nodes (51): countOutboxEvents(), recordStockMovement(), appendOutboxEvent(), AppendOutboxInput, eventPayloadSchemas, isoDateSchema, listOutboxEvents(), mapRow() (+43 more)

### Community 23 - "main.ts"
Cohesion: 0.04
Nodes (5): AppInfo, AppInfoSchema, EnvironmentStatus, EnvironmentStatusSchema, gotLock

### Community 24 - "vyapara.d.ts"
Cohesion: 0.40
Nodes (4): *.css, SyncStatusSnapshot, VyaparaIpcResult, Window

### Community 25 - "conflict-resolution.test.ts"
Cohesion: 0.10
Nodes (45): buildConflictRecord(), detectConcurrentUpdate(), detectConflictForEvent(), detectDuplicateEvent(), detectOutOfOrderEvent(), detectStaleVersion(), getEntityVersion(), upsertEntityVersion() (+37 more)

### Community 29 - "src/index.ts"
Cohesion: 0.06
Nodes (35): AuthChangePasswordSchema, BestSellingQuerySchema, CashDrawerCloseSchema, CashDrawerQuerySchema, CustomerUpdateSchema, emailSchema, idSchema, IncomeCreateSchema (+27 more)

### Community 30 - "main/db/open.ts"
Cohesion: 0.10
Nodes (7): AppOrm, countOf(), MIGRATIONS, normalizeLegacySchema(), renameColumnIfNeeded(), seedCatalog(), tableColumns()

### Community 31 - "schema.ts"
Cohesion: 0.05
Nodes (37): cashDrawers, cashMovements, categories, customers, customerTransactions, deviceIdentity, expenseRecords, goodsReceiving (+29 more)

### Community 32 - "inventory.ts"
Cohesion: 0.11
Nodes (23): addOpnameItem(), applyStockMovement(), approveStockAdjustment(), completeStockOpname(), createStockAdjustment(), createStockOpname(), generateOpnameNumber(), getCurrentStock() (+15 more)

### Community 33 - "schemas.test.ts"
Cohesion: 0.17
Nodes (11): AuthLoginSchema, AuthSetupSchema, ipcFail(), ipcOk(), PaymentLineSchema, PERMISSIONS, ProductCreateSchema, ProductUpdateSchema (+3 more)

### Community 34 - "procurement.ts"
Cohesion: 0.10
Nodes (25): cancelPurchaseOrder(), createPurchaseOrder(), createPurchaseReturn(), getGoodsReceiving(), getPurchaseHistory(), getPurchaseOrder(), getPurchaseReturn(), GoodsReceivingItemRecord (+17 more)

### Community 35 - "reports.ts"
Cohesion: 0.13
Nodes (25): CashDrawerRecord, CashFlow, CashMovementRecord, closeCashDrawer(), drawerNumber(), DrawerRow, ExpenseRecord, ExpenseRow (+17 more)

### Community 36 - "auth.ts"
Cohesion: 0.17
Nodes (23): assertNotLocked(), assertPasswordPolicy(), assertPermission(), changePassword(), clearFailures(), failures, hashToken(), issueSession() (+15 more)

### Community 38 - "package.json"
Cohesion: 0.11
Nodes (20): dependencies, react@^19.3.1, react-dom@^19.3.1, zustand@^5.1.0, eslint@^9.21.2, eslint-plugin-react@^7.37.4, @tailwindcss/vite@^4.3.5, @vitejs/plugin-react@^1.2.0 (+12 more)

### Community 39 - "credentials.ts"
Cohesion: 0.46
Nodes (6): clearSyncCredentials(), credsEncPath(), credsPath(), loadSyncCredentials(), saveSyncCredentials(), SyncCredentials

### Community 47 - "applyMigrations"
Cohesion: 0.38
Nodes (5): applyMigrations(), applySql(), connect(), splitSql(), remediateKnownPassword()

### Community 49 - "reports.ts"
Cohesion: 0.19
Nodes (24): BestSellingRow, CashierPerformanceRow, dateExpression(), ExpenseReportRow, getBestSellingProducts(), getCashierPerformance(), getExpenseReport(), getGrossProfit() (+16 more)

### Community 52 - "db.test.ts"
Cohesion: 0.33
Nodes (3): assertIntegrity(), backupDatabase(), restoreDatabase()

### Community 53 - "src/db/open.ts"
Cohesion: 0.18
Nodes (8): applyMigrations(), here, MIGRATIONS, openSyncServerDb(), require, SyncServerDb, desktopSrc, sharedSrc

### Community 54 - "AppDatabase"
Cohesion: 0.19
Nodes (12): AppDatabase, createDb(), setupAdmin(), createDb(), createTestDb(), createDb(), createDb(), createDb() (+4 more)

### Community 55 - "stress-4.5.test.ts"
Cohesion: 0.05
Nodes (67): DeviceIdentity, getOrCreateDeviceIdentity(), identityFilePath(), persist(), readPersisted(), SyncOutboxStatus, createSyncCoordinator(), clearTimer() (+59 more)

### Community 56 - "customer.ts"
Cohesion: 0.13
Nodes (22): needsSetup(), createCustomer(), customerCode(), CustomerRecord, CustomerRow, CustomerTransactionRecord, CustomerTxRow, deactivateCustomer() (+14 more)

### Community 57 - "devices.ts"
Cohesion: 0.34
Nodes (13): addHoursIso(), nowIso(), randomToken(), safeEqualHex(), sha256Hex(), authenticateBearerToken(), AuthenticatedDevice, DeviceAuthResult (+5 more)

### Community 59 - "sync-server.test.ts"
Cohesion: 0.48
Nodes (6): download(), json(), makeEvent(), register(), salePayload(), upload()

### Community 60 - "App.tsx"
Cohesion: 0.13
Nodes (14): AlertRow, Dashboard(), dayKey(), fmtIDR(), fmtShort(), icons, idr, KpiCard() (+6 more)

### Community 61 - "createWindow"
Cohesion: 0.20
Nodes (11): openAppDatabase(), createWindow(), getDb(), isOnline(), loadToken(), publicUser(), setActiveToken(), tokenFile() (+3 more)

### Community 63 - "src/sync.ts"
Cohesion: 0.10
Nodes (18): aggregateIdSchema, aggregateTypeSchema, deviceIdSchema, DeviceRevokeRequest, DeviceTokenRenewRequest, eventIdSchema, idempotencyKeySchema, organizationIdSchema (+10 more)

### Community 64 - "Reports.tsx"
Cohesion: 0.20
Nodes (9): BestSellingRow, CashierRow, ExpenseRow, GrossProfitRow, PurchaseRow, SalesRow, SlowMovingRow, TransactionRow (+1 more)

### Community 65 - "App"
Cohesion: 0.20
Nodes (6): App(), rootElement, Reports(), Supplier(), SupplierRecord, SupplierTransaction

### Community 67 - "e2e-smoke.cjs"
Cohesion: 0.22
Nodes (7): { _electron: electron }, fs, os, path, profile, results, root

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

### Community 74 - "ref_fs"
Cohesion: 0.25
Nodes (5): fs, lines, replacement, content, fs

### Community 75 - "workspaces"
Cohesion: 0.67
Nodes (3): workspaces, nohoist, packages

### Community 77 - "src/index.ts"
Cohesion: 0.05
Nodes (36): AuthTokenSchema, CashDrawerOpenSchema, CashierPerformanceQuerySchema, CashMovementsQuerySchema, CustomerCreateSchema, CustomerIdSchema, CustomerPaymentSchema, CustomerQuerySchema (+28 more)

### Community 78 - "supplier.ts"
Cohesion: 0.13
Nodes (28): createSupplier(), createSupplierInvoice(), deactivateSupplier(), generateSupplierCode(), getPayablesSummary(), getSupplier(), getSupplierBalance(), getSupplierInvoice() (+20 more)

### Community 81 - "tsconfig.electron.json"
Cohesion: 0.29
Nodes (6): compilerOptions, moduleResolution, exclude, extends, include, ./tsconfig.json

### Community 88 - "admin.ts"
Cohesion: 0.14
Nodes (22): AppError, AdminPermissionRecord, AdminRoleRecord, AdminUserRecord, createRole(), createUser(), deactivateRole(), deactivateUser() (+14 more)

### Community 89 - "products.ts"
Cohesion: 0.19
Nodes (17): listStockMovements(), assertReference(), assertUnique(), createProduct(), deactivateProduct(), listCategories(), listProducts(), listUnits() (+9 more)

### Community 90 - "steps"
Cohesion: 0.12
Nodes (16): jobs, verify, name, on, pull_request, push, branches, branches (+8 more)

## Knowledge Gaps
- **1 isolated node(s):** `./tsconfig.json`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 571 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **38 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `electron` connect `electron` to `credentials.ts`, `stress-4.5.test.ts`, `package.json`, `main.ts`?**
  _High betweenness centrality (0.088) - this node is a cross-community bridge._
- **What connects `./tsconfig.json` to the rest of the system?**
  _1 weakly-connected nodes found - possible missing edges._
- **Should `useAuth` be split into smaller, more focused modules?**
  _Cohesion score 0.14855072463768115 - nodes in this community are weakly interconnected._
- **Why does `AppDatabase` connect `AppDatabase` to `inventory.ts`, `procurement.ts`, `reports.ts`, `auth.ts`, `supplier.ts`, `applyMigrations`, `reports.ts`, `db.test.ts`, `outbox.ts`, `conflict-resolution.test.ts`, `stress-4.5.test.ts`, `admin.ts`, `products.ts`, `customer.ts`, `createWindow`, `main/db/open.ts`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Should `web/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.06423034330011074 - nodes in this community are weakly interconnected._
- **Why does `AppError` connect `admin.ts` to `inventory.ts`, `procurement.ts`, `reports.ts`, `auth.ts`, `supplier.ts`, `reports.ts`, `db.test.ts`, `outbox.ts`, `AppDatabase`, `customer.ts`, `products.ts`, `conflict-resolution.test.ts`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Should `e2e-acceptance.cjs` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._