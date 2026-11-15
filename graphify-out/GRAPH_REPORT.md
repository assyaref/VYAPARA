# Graph Report - VYAPARA POS Windows Desktop hybird  (2026-11-15)

## Corpus Check
- 126 files · ~85,456 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 2 file(s) not represented in the graph (top: (none) 1, .css 1)

## Summary
- 1102 nodes · 2089 edges · 77 communities (43 shown, 34 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e4a58b72`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- useAuth
- web/package.json
- VyaparaDatabase
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
- index.ts
- compilerOptions
- schemas.test.ts
- typescript@^5.9.3
- app.ts
- src/sync.ts
- outbox.test.ts
- eslint-plugin-react@^7.37.4
- @types/node@^22.13.1
- vyapara.d.ts
- package.json
- main.ts
- main/db/open.ts
- schema.ts
- inventory.ts
- schemas.ts
- procurement.ts
- reports.ts
- AppError
- vite-tsconfig-paths@^6.1.1
- dependencies
- electron
- transactions.ts
- sql.d.ts
- eslint@^9.21.2
- @neondatabase/serverless@^1.2.0
- postcss@^8.4.33
- @vitejs/plugin-react@^1.2.0
- @fontsource/inter@^5.2.2
- reports.ts
- products.ts
- @types/babel__core@^7.20.5
- AppDatabase
- acceptance-4.2.test.ts
- customer.test.ts
- outbox.ts
- customer.ts
- devices.ts
- services/sync.ts
- sync-server.test.ts
- device-identity.ts
- vitest.config.ts
- @playwright/test@^1.65.0
- tailwindcss@^4.3.5
- @types/react@^19.3.0
- typescript-eslint@^8.24.1
- vite@^8.3.8
- @vitejs/plugin-react@^1.2.0
- tsconfig.electron.json
- @fontsource/inter@^5.2.2
- globals@^6.1.0
- tailwindcss@^4.3.5
- @tailwindcss/vite@^4.3.5
- @types/react@^19.3.0
- vitest@^5.1.0
- drizzle-orm@^0.45.4
- vite@^8.3.8

## God Nodes (most connected - your core abstractions)
1. `AppError` - 74 edges
2. `AppDatabase` - 45 edges
3. `useAuth` - 37 edges
4. `setupAdmin()` - 27 edges
5. `compilerOptions` - 20 edges
6. `compilerOptions` - 19 edges
7. `createWindow()` - 18 edges
8. `compilerOptions` - 18 edges
9. `compilerOptions` - 18 edges
10. `scripts` - 17 edges

## Surprising Connections (you probably didn't know these)
- `createDb()` --calls--> `AppDatabase`  [EXTRACTED]
  apps/desktop/electron/main/services/customer.test.ts → apps/desktop/electron/main/db/open.ts
- `createDb()` --calls--> `AppDatabase`  [EXTRACTED]
  apps/desktop/electron/main/services/finance.test.ts → apps/desktop/electron/main/db/open.ts
- `createDb()` --calls--> `AppDatabase`  [EXTRACTED]
  apps/desktop/electron/main/services/products.test.ts → apps/desktop/electron/main/db/open.ts
- `createDb()` --calls--> `AppDatabase`  [EXTRACTED]
  apps/desktop/electron/main/services/transactions.test.ts → apps/desktop/electron/main/db/open.ts
- `seedContext()` --calls--> `setupAdmin()`  [EXTRACTED]
  apps/desktop/electron/main/services/finance.test.ts → apps/desktop/electron/main/services/auth.ts

## Import Cycles
- None detected.

## Communities (77 total, 34 thin omitted)

### Community 0 - "useAuth"
Cohesion: 0.06
Nodes (46): App(), View, AuthState, useAuth, User, UserRole, Customer(), CustomerRecord (+38 more)

### Community 1 - "web/package.json"
Cohesion: 0.06
Nodes (42): dependencies, react@^19.3.1, react-dom@^19.3.1, devDependencies, autoprefixer@^10.4.16, eslint@^9.21.2, eslint-plugin-react@^7.37.4, globals@^6.7.2 (+34 more)

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
Nodes (13): devDependencies, autoprefixer@^10.4.16, better-sqlite3@^13.1.1, drizzle-kit@^0.31.11, @playwright/test@^1.65.0, @types/react-dom@^19.3.0, typescript-eslint@^8.24.1, autoprefixer (+5 more)

### Community 8 - "devDependencies"
Cohesion: 0.11
Nodes (19): devDependencies, drizzle-orm@^0.45.4, globals@^6.1.0, postcss@^8.4.33, prettier@^3.5.3, @types/better-sqlite3@^9.6.0, @types/react-dom@^19.3.0, typescript@^5.9.3 (+11 more)

### Community 9 - "desktop/package.json"
Cohesion: 0.21
Nodes (12): dependencies, jsbarcode@^3.11.0, react@^19.3.1, react-dom@^19.3.1, zustand@^5.1.0, react, react-dom, zustand (+4 more)

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

### Community 15 - "index.ts"
Cohesion: 0.08
Nodes (25): PAYMENT_METHODS, AuthChangePasswordSchema, AuthTokenSchema, CustomerCreateSchema, CustomerIdSchema, IpcChannel, IpcChannelName, IpcResult (+17 more)

### Community 16 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, module, moduleResolution, noUncheckedIndexedAccess, outDir, resolveJsonModule (+7 more)

### Community 17 - "schemas.test.ts"
Cohesion: 0.15
Nodes (11): AuthLoginSchema, AuthSetupSchema, ipcFail(), ipcOk(), PaymentLineSchema, PERMISSIONS, ProductCreateSchema, ProductUpdateSchema (+3 more)

### Community 19 - "app.ts"
Cohesion: 0.17
Nodes (9): handleRequest(), HttpError, readJsonBody(), requireBearerDeviceAuth(), sendError(), sendJson(), sendOk(), downloadEvents() (+1 more)

### Community 20 - "src/sync.ts"
Cohesion: 0.06
Nodes (31): aggregateIdSchema, aggregateTypeSchema, deviceIdSchema, DeviceRegisterRequest, deviceRegisterRequestSchema, deviceRegisterResponseSchema, DeviceRevokeRequest, deviceRevokeRequestSchema (+23 more)

### Community 21 - "outbox.test.ts"
Cohesion: 0.15
Nodes (13): recordStockMovement(), appendOutboxEvent(), markOutboxAcknowledged(), markOutboxConflict(), markOutboxFailed(), SYNC_SCHEMA_VERSION, createDb(), validateOutboxEvent() (+5 more)

### Community 25 - "package.json"
Cohesion: 0.12
Nodes (16): autoprefixer@^10.4.16, eslint@^9.21.2, eslint-plugin-react@^7.37.4, @tailwindcss/vite@^4.3.5, @types/node@^22.13.1, autoprefixer, eslint, eslint-plugin-react (+8 more)

### Community 29 - "main.ts"
Cohesion: 0.06
Nodes (34): openAppDatabase(), AppInfo, AppInfoSchema, createWindow(), EnvironmentStatus, EnvironmentStatusSchema, getDb(), gotLock (+26 more)

### Community 30 - "main/db/open.ts"
Cohesion: 0.08
Nodes (15): applyMigrations(), applySql(), AppOrm, connect(), countOf(), MIGRATIONS, normalizeLegacySchema(), renameColumnIfNeeded() (+7 more)

### Community 31 - "schema.ts"
Cohesion: 0.05
Nodes (37): cashDrawers, cashMovements, categories, customers, customerTransactions, deviceIdentity, expenseRecords, goodsReceiving (+29 more)

### Community 32 - "inventory.ts"
Cohesion: 0.11
Nodes (22): addOpnameItem(), approveStockAdjustment(), completeStockOpname(), createStockAdjustment(), createStockOpname(), generateOpnameNumber(), getCurrentStock(), getOpnameItem() (+14 more)

### Community 33 - "schemas.ts"
Cohesion: 0.07
Nodes (26): BestSellingQuerySchema, CashDrawerQuerySchema, CashMovementsQuerySchema, CustomerQuerySchema, emailSchema, idSchema, IncomeCreateSchema, InventoryGetSettingsSchema (+18 more)

### Community 34 - "procurement.ts"
Cohesion: 0.10
Nodes (25): cancelPurchaseOrder(), createPurchaseOrder(), createPurchaseReturn(), getGoodsReceiving(), getPurchaseHistory(), getPurchaseOrder(), getPurchaseReturn(), GoodsReceivingItemRecord (+17 more)

### Community 35 - "reports.ts"
Cohesion: 0.13
Nodes (25): CashDrawerRecord, CashFlow, CashMovementRecord, closeCashDrawer(), drawerNumber(), DrawerRow, ExpenseRecord, ExpenseRow (+17 more)

### Community 36 - "AppError"
Cohesion: 0.06
Nodes (73): AppError, AdminPermissionRecord, AdminRoleRecord, AdminUserRecord, createRole(), createUser(), deactivateRole(), deactivateUser() (+65 more)

### Community 38 - "dependencies"
Cohesion: 0.29
Nodes (7): dependencies, react@^19.3.1, react-dom@^19.3.1, zustand@^5.1.0, react, react-dom, zustand

### Community 39 - "electron"
Cohesion: 0.40
Nodes (5): api, send(), withToken(), electron@^45.3.1, electron

### Community 40 - "transactions.ts"
Cohesion: 0.13
Nodes (21): transact(), getSettings(), readValue(), StoreSettings, updateSettings(), assertQuantity(), createTransaction(), listTransactions() (+13 more)

### Community 49 - "reports.ts"
Cohesion: 0.21
Nodes (23): BestSellingRow, CashierPerformanceRow, dateExpression(), ExpenseReportRow, getBestSellingProducts(), getCashierPerformance(), getExpenseReport(), getGrossProfit() (+15 more)

### Community 50 - "products.ts"
Cohesion: 0.17
Nodes (20): applyStockMovement(), listStockMovements(), assertReference(), assertUnique(), createProduct(), deactivateProduct(), listCategories(), listProducts() (+12 more)

### Community 52 - "AppDatabase"
Cohesion: 0.22
Nodes (8): AppDatabase, createDb(), createDb(), createDb(), seedContext(), createDb(), createDb(), createDb()

### Community 53 - "acceptance-4.2.test.ts"
Cohesion: 0.15
Nodes (14): SyncServerConfig, applyMigrations(), here, MIGRATIONS, openSyncServerDb(), require, SyncServerDb, createSyncServer() (+6 more)

### Community 54 - "customer.test.ts"
Cohesion: 0.15
Nodes (12): CustomerRecord, listCustomerTransactions(), appendOutboxEventMock, countOutboxEvents(), createCustomerRecord(), createCustomerWithDebit(), createDb(), createTestDb() (+4 more)

### Community 55 - "outbox.ts"
Cohesion: 0.12
Nodes (14): AppendOutboxInput, eventPayloadSchemas, isoDateSchema, OutboxEvent, outboxEventEnvelopeSchema, outboxPayloadSchema, OutboxRow, paymentMethodSchema (+6 more)

### Community 56 - "customer.ts"
Cohesion: 0.23
Nodes (13): createCustomer(), customerCode(), CustomerRow, CustomerTransactionRecord, CustomerTxRow, deactivateCustomer(), getCustomer(), getCustomerReceivables() (+5 more)

### Community 57 - "devices.ts"
Cohesion: 0.34
Nodes (13): addHoursIso(), nowIso(), randomToken(), safeEqualHex(), sha256Hex(), authenticateBearerToken(), AuthenticatedDevice, DeviceAuthResult (+5 more)

### Community 58 - "services/sync.ts"
Cohesion: 0.15
Nodes (5): AuthScope, ExistingEventRow, ingestEventsBatch(), UploadEventInput, validateEventBusiness()

### Community 59 - "sync-server.test.ts"
Cohesion: 0.39
Nodes (6): download(), json(), makeEvent(), register(), salePayload(), upload()

### Community 60 - "device-identity.ts"
Cohesion: 0.53
Nodes (5): DeviceIdentity, getOrCreateDeviceIdentity(), identityFilePath(), persist(), readPersisted()

### Community 81 - "tsconfig.electron.json"
Cohesion: 0.29
Nodes (6): compilerOptions, moduleResolution, exclude, extends, include, ./tsconfig.json

## Knowledge Gaps
- **1 isolated node(s):** `./tsconfig.json`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 460 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **34 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `electron` connect `electron` to `package.json`, `main.ts`?**
  _High betweenness centrality (0.096) - this node is a cross-community bridge._
- **What connects `./tsconfig.json` to the rest of the system?**
  _1 weakly-connected nodes found - possible missing edges._
- **Should `useAuth` be split into smaller, more focused modules?**
  _Cohesion score 0.055135135135135134 - nodes in this community are weakly interconnected._
- **Why does `AppDatabase` connect `AppDatabase` to `inventory.ts`, `procurement.ts`, `reports.ts`, `AppError`, `transactions.ts`, `reports.ts`, `products.ts`, `outbox.test.ts`, `customer.test.ts`, `outbox.ts`, `customer.ts`, `device-identity.ts`, `main.ts`, `main/db/open.ts`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Should `web/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.06423034330011074 - nodes in this community are weakly interconnected._
- **Why does `AppError` connect `AppError` to `inventory.ts`, `procurement.ts`, `reports.ts`, `transactions.ts`, `reports.ts`, `products.ts`, `outbox.test.ts`, `outbox.ts`, `customer.ts`, `main/db/open.ts`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.08695652173913043 - nodes in this community are weakly interconnected._