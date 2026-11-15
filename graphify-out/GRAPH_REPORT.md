# Graph Report - VYAPARA POS Windows Desktop hybird  (2026-11-15)

## Corpus Check
- 159 files · ~119,887 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 9 file(s) not represented in the graph (top: .pid 3, (none) 1, .css 1)

## Summary
- 1295 nodes · 2700 edges · 101 communities (62 shown, 39 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b00c31af`
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
- store.ts
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
- coordinator.ts
- reports.ts
- products.ts
- @playwright/test@^1.65.0
- db.test.ts
- acceptance-4.2.test.ts
- AppDatabase
- device-identity.ts
- customer.ts
- devices.ts
- services/sync.ts
- sync-server.test.ts
- App.tsx
- main.ts
- typescript-eslint@^8.24.1
- stress-4.5.test.ts
- Reports.tsx
- App
- createSyncCoordinator
- AppError
- assets.d.ts
- Supplier.tsx
- Settings.tsx
- OfflineSync.tsx
- POS.tsx
- Procurement.tsx
- src/db/open.ts
- package.json
- requestJson
- eslint@^9.21.2
- eslint-plugin-react@^7.37.4
- tsconfig.electron.json
- globals@^6.1.0
- @playwright/test@^1.65.0
- postcss@^8.4.33
- @tailwindcss/vite@^4.3.5
- @types/node@^22.13.1
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
2. `AppDatabase` - 61 edges
3. `setupAdmin()` - 35 edges
4. `useAuth` - 34 edges
5. `createSyncCoordinator()` - 26 edges
6. `createTransaction()` - 20 edges
7. `createWindow()` - 20 edges
8. `compilerOptions` - 20 edges
9. `createProduct()` - 19 edges
10. `compilerOptions` - 19 edges

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

## Communities (101 total, 39 thin omitted)

### Community 0 - "useAuth"
Cohesion: 0.15
Nodes (13): AuthState, useAuth, User, UserRole, DocumentServices(), Finance(), NextDashboard(), Performance() (+5 more)

### Community 1 - "web/package.json"
Cohesion: 0.06
Nodes (42): dependencies, react@^19.3.1, react-dom@^19.3.1, devDependencies, autoprefixer@^10.4.16, eslint@^9.21.2, eslint-plugin-react@^7.37.4, globals@^6.7.2 (+34 more)

### Community 2 - "e2e-smoke.cjs"
Cohesion: 0.08
Nodes (13): VyaparaDatabase, { _electron: electron }, fs, os, path, profile, results, root (+5 more)

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
Nodes (19): devDependencies, autoprefixer@^10.4.16, drizzle-orm@^0.45.4, prettier@^3.5.3, tailwindcss@^4.3.5, @types/babel__core@^7.20.5, @types/react@^19.3.0, typescript-eslint@^8.24.1 (+11 more)

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
Cohesion: 0.13
Nodes (20): AdminPermissionRecord, AdminRoleRecord, AdminUserRecord, createRole(), createUser(), deactivateRole(), deactivateUser(), listPermissions() (+12 more)

### Community 19 - "app.ts"
Cohesion: 0.36
Nodes (10): handleRequest(), SyncServerConfig, HttpError, readJsonBody(), requireBearerDeviceAuth(), sendError(), sendJson(), sendOk() (+2 more)

### Community 20 - "src/sync.ts"
Cohesion: 0.08
Nodes (31): DeviceRegisterResponse, DeviceTokenRenewResponse, SyncDownloadResponse, SyncUploadResponse, TransportError, TransportOptions, aggregateIdSchema, aggregateTypeSchema (+23 more)

### Community 21 - "outbox.ts"
Cohesion: 0.10
Nodes (21): countOutboxEvents(), AppendOutboxInput, eventPayloadSchemas, isoDateSchema, listOutboxEvents(), mapRow(), markOutboxAcknowledged(), markOutboxConflict() (+13 more)

### Community 23 - "store.ts"
Cohesion: 0.28
Nodes (12): listUploadCandidates(), markOutboxAck(), markOutboxRetryable(), markOutboxSyncingBatch(), markOutboxTerminal(), revertSyncingToPending(), UploadCandidate, uploadEventsTransport() (+4 more)

### Community 24 - "vyapara.d.ts"
Cohesion: 0.40
Nodes (4): *.css, SyncStatusSnapshot, VyaparaIpcResult, Window

### Community 25 - "conflict-resolution.test.ts"
Cohesion: 0.10
Nodes (45): buildConflictRecord(), detectConcurrentUpdate(), detectConflictForEvent(), detectDuplicateEvent(), detectOutOfOrderEvent(), detectStaleVersion(), getEntityVersion(), upsertEntityVersion() (+37 more)

### Community 29 - "src/index.ts"
Cohesion: 0.07
Nodes (49): AuthChangePasswordSchema, AuthTokenSchema, CashMovementsQuerySchema, CustomerQuerySchema, CustomerTransactionsQuerySchema, emailSchema, idSchema, IncomeCreateSchema (+41 more)

### Community 30 - "main/db/open.ts"
Cohesion: 0.10
Nodes (13): applyMigrations(), applySql(), AppOrm, connect(), countOf(), MIGRATIONS, normalizeLegacySchema(), renameColumnIfNeeded() (+5 more)

### Community 31 - "schema.ts"
Cohesion: 0.05
Nodes (37): cashDrawers, cashMovements, categories, customers, customerTransactions, deviceIdentity, expenseRecords, goodsReceiving (+29 more)

### Community 32 - "inventory.ts"
Cohesion: 0.12
Nodes (18): addOpnameItem(), completeStockOpname(), createStockOpname(), generateOpnameNumber(), getOpnameItem(), getProductInventorySettings(), getStockOpname(), listOpnameItems() (+10 more)

### Community 33 - "schemas.test.ts"
Cohesion: 0.15
Nodes (11): AuthLoginSchema, AuthSetupSchema, ipcFail(), ipcOk(), PaymentLineSchema, PERMISSIONS, ProductCreateSchema, ProductUpdateSchema (+3 more)

### Community 34 - "procurement.ts"
Cohesion: 0.06
Nodes (50): cancelPurchaseOrder(), createPurchaseOrder(), createPurchaseReturn(), getGoodsReceiving(), getPurchaseHistory(), getPurchaseOrder(), getPurchaseReturn(), GoodsReceivingItemRecord (+42 more)

### Community 35 - "reports.ts"
Cohesion: 0.13
Nodes (25): CashDrawerRecord, CashFlow, CashMovementRecord, closeCashDrawer(), drawerNumber(), DrawerRow, ExpenseRecord, ExpenseRow (+17 more)

### Community 36 - "auth.ts"
Cohesion: 0.16
Nodes (24): assertNotLocked(), assertPasswordPolicy(), assertPermission(), changePassword(), clearFailures(), failures, hashToken(), issueSession() (+16 more)

### Community 38 - "dependencies"
Cohesion: 0.29
Nodes (7): dependencies, react@^19.3.1, react-dom@^19.3.1, zustand@^5.1.0, react, react-dom, zustand

### Community 39 - "credentials.ts"
Cohesion: 0.22
Nodes (11): api, send(), withToken(), clearSyncCredentials(), credsEncPath(), credsPath(), loadSyncCredentials(), saveSyncCredentials() (+3 more)

### Community 40 - "customer.test.ts"
Cohesion: 0.17
Nodes (11): needsSetup(), CustomerRecord, listCustomerTransactions(), appendOutboxEventMock, createCustomerRecord(), createCustomerWithDebit(), createDb(), createTestDb() (+3 more)

### Community 47 - "coordinator.ts"
Cohesion: 0.27
Nodes (12): DownloadRunResult, runDownloadOnce(), getDownloadCursor(), getSyncState(), setDownloadCursor(), downloadEventsTransport(), DEFAULT_SYNC_CONFIG, safeErrorSummary() (+4 more)

### Community 49 - "reports.ts"
Cohesion: 0.11
Nodes (36): BestSellingRow, CashierPerformanceRow, dateExpression(), ExpenseReportRow, getBestSellingProducts(), getCashierPerformance(), getExpenseReport(), getGrossProfit() (+28 more)

### Community 50 - "products.ts"
Cohesion: 0.18
Nodes (18): listStockMovements(), assertReference(), assertUnique(), createProduct(), deactivateProduct(), listCategories(), listProducts(), listUnits() (+10 more)

### Community 52 - "db.test.ts"
Cohesion: 0.36
Nodes (3): assertIntegrity(), backupDatabase(), restoreDatabase()

### Community 53 - "acceptance-4.2.test.ts"
Cohesion: 0.17
Nodes (12): SyncOutboxStatus, recoverStaleSyncingOutbox(), makeEnvelope(), salePayload(), openSyncServerDb(), createSyncServer(), json(), makeEvent() (+4 more)

### Community 54 - "AppDatabase"
Cohesion: 0.19
Nodes (11): AppDatabase, setupAdmin(), createDb(), createDb(), seedContext(), createDb(), createDb(), makeDb() (+3 more)

### Community 55 - "device-identity.ts"
Cohesion: 0.19
Nodes (12): DeviceIdentity, getOrCreateDeviceIdentity(), identityFilePath(), persist(), readPersisted(), ensureToken(), clearSyncCredentials(), credsPath() (+4 more)

### Community 56 - "customer.ts"
Cohesion: 0.23
Nodes (13): createCustomer(), customerCode(), CustomerRow, CustomerTransactionRecord, CustomerTxRow, deactivateCustomer(), getCustomer(), getCustomerReceivables() (+5 more)

### Community 57 - "devices.ts"
Cohesion: 0.37
Nodes (12): addHoursIso(), nowIso(), randomToken(), safeEqualHex(), sha256Hex(), authenticateBearerToken(), AuthenticatedDevice, DeviceAuthResult (+4 more)

### Community 58 - "services/sync.ts"
Cohesion: 0.16
Nodes (13): AuthScope, downloadEvents(), ExistingEventRow, ingestEventsBatch(), UploadEventInput, validateEventBusiness(), decodeCursor(), PerEventAck (+5 more)

### Community 59 - "sync-server.test.ts"
Cohesion: 0.39
Nodes (6): download(), json(), makeEvent(), register(), salePayload(), upload()

### Community 60 - "App.tsx"
Cohesion: 0.14
Nodes (14): AlertRow, Dashboard(), dayKey(), fmtIDR(), fmtShort(), icons, idr, KpiCard() (+6 more)

### Community 61 - "main.ts"
Cohesion: 0.07
Nodes (38): openAppDatabase(), AppInfo, AppInfoSchema, createWindow(), EnvironmentStatus, EnvironmentStatusSchema, getDb(), gotLock (+30 more)

### Community 63 - "stress-4.5.test.ts"
Cohesion: 0.20
Nodes (4): adminId(), createSale(), seedProduct(), { state }

### Community 64 - "Reports.tsx"
Cohesion: 0.20
Nodes (9): BestSellingRow, CashierRow, ExpenseRow, GrossProfitRow, PurchaseRow, SalesRow, SlowMovingRow, TransactionRow (+1 more)

### Community 65 - "App"
Cohesion: 0.22
Nodes (5): App(), Customer(), CustomerRecord, rootElement, Reports()

### Community 66 - "createSyncCoordinator"
Cohesion: 0.38
Nodes (11): createSyncCoordinator(), clearTimer(), refreshCounts(), runCycle(), schedule(), setPhase(), startPeriodic(), isOnline() (+3 more)

### Community 67 - "AppError"
Cohesion: 0.18
Nodes (16): AppError, listRolePermissions(), setRolePermissions(), applyStockMovement(), approveStockAdjustment(), createStockAdjustment(), getCurrentStock(), getStockAdjustment() (+8 more)

### Community 68 - "assets.d.ts"
Cohesion: 0.29
Nodes (6): *.ico, *.jpeg, *.jpg, *.png, *.svg, *.webp

### Community 69 - "Supplier.tsx"
Cohesion: 0.24
Nodes (3): Supplier(), SupplierRecord, SupplierTransaction

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

### Community 74 - "src/db/open.ts"
Cohesion: 0.18
Nodes (7): applyMigrations(), here, MIGRATIONS, require, SyncServerDb, desktopSrc, sharedSrc

### Community 75 - "package.json"
Cohesion: 0.12
Nodes (16): @fontsource/inter@^5.2.2, @types/better-sqlite3@^9.6.0, @types/react-dom@^19.3.0, typescript@^5.9.3, vite@^8.3.8, @fontsource/inter, @types/better-sqlite3, @types/react-dom (+8 more)

### Community 76 - "requestJson"
Cohesion: 0.32
Nodes (7): classifyHttpError(), joinUrl(), readJsonLimited(), registerDeviceTransport(), renewDeviceTokenTransport(), requestJson(), SyncTransportError

### Community 81 - "tsconfig.electron.json"
Cohesion: 0.29
Nodes (6): compilerOptions, moduleResolution, exclude, extends, include, ./tsconfig.json

## Knowledge Gaps
- **1 isolated node(s):** `./tsconfig.json`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 494 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **39 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `electron` connect `credentials.ts` to `package.json`, `main.ts`, `device-identity.ts`?**
  _High betweenness centrality (0.079) - this node is a cross-community bridge._
- **What connects `./tsconfig.json` to the rest of the system?**
  _1 weakly-connected nodes found - possible missing edges._
- **Should `useAuth` be split into smaller, more focused modules?**
  _Cohesion score 0.14814814814814814 - nodes in this community are weakly interconnected._
- **Why does `AppDatabase` connect `AppDatabase` to `AppError`, `outbox.ts`, `store.ts`, `conflict-resolution.test.ts`, `main/db/open.ts`, `inventory.ts`, `procurement.ts`, `reports.ts`, `auth.ts`, `customer.test.ts`, `coordinator.ts`, `reports.ts`, `products.ts`, `db.test.ts`, `acceptance-4.2.test.ts`, `device-identity.ts`, `customer.ts`, `main.ts`, `stress-4.5.test.ts`, `AppError`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Should `web/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.06423034330011074 - nodes in this community are weakly interconnected._
- **Why does `AppError` connect `AppError` to `inventory.ts`, `procurement.ts`, `reports.ts`, `auth.ts`, `AppError`, `products.ts`, `reports.ts`, `db.test.ts`, `outbox.ts`, `AppDatabase`, `customer.ts`, `conflict-resolution.test.ts`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Should `e2e-smoke.cjs` be split into smaller, more focused modules?**
  _Cohesion score 0.07936507936507936 - nodes in this community are weakly interconnected._