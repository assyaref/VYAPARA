# Graph Report - VYAPARA POS Windows Desktop hybird  (2026-11-15)

## Corpus Check
- 118 files · ~92,640 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: .graphify-bak 1, (none) 1, .backup 1)

## Summary
- 1679 nodes · 3418 edges · 152 communities (71 shown, 81 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 62 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `dea88169`
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
- auth.ts
- AppDatabase
- normalizeParams
- @types/react-dom@^19.3.0
- typescript@^5.9.3
- main.js
- check
- outbox.ts
- auth.js
- @types/node@^22.13.1
- vyapara.d.ts
- package.json
- main.ts
- open.ts
- schema.ts
- inventory.ts
- schemas.ts
- procurement.ts
- reports.ts
- AppError
- .clone
- dependencies
- electron
- transactions.ts
- ref_vitest
- sql.d.ts
- eslint@^9.21.2
- @neondatabase/serverless@^1.2.0
- postcss@^8.4.33
- _gte
- @fontsource/inter@^5.2.2
- admin.ts
- sql
- inventory.js
- config
- postcss@^8.4.33
- supplier.js
- prettier@^3.5.3
- constructor
- @types/better-sqlite3@^9.6.0
- typescript-eslint@^8.24.1
- procurement.js
- reports.js
- finance.js
- customer.js
- _prepare
- _lte
- transactions.js
- _overwrite
- pos.ts
- db.test.ts
- mapResult
- drizzle-kit
- products.js
- @vitejs/plugin-react@^1.2.0
- errors.js
- foldObjects
- isRecursive
- getSQLiteColumnBuilders
- buildQueryFromSourceParams
- mcpServers
- capSize
- createTableRelationsHelpers
- default
- tsconfig.electron.json
- parseTableDefinition
- own
- getPrebuildPath
- _base64
- with
- outbox.js
- Database
- canParseURL
- _base64url
- superRefine
- createWindow
- datetime
- cacheTable
- safeParse
- nullable
- pipe
- stringifyKeyNames
- _cidrv4
- @fontsource/inter@^5.2.2
- globals@^6.1.0
- claim
- tailwindcss@^4.3.5
- @tailwindcss/vite@^4.3.5
- @types/react@^19.3.0
- _cuid2
- vitest@^5.1.0
- date
- having
- inputOptin
- prefault
- safeDecodeAsync
- duration
- safeParseAsync
- where
- _email
- encodeJSONPointerSegment
- _endsWith
- flattenError
- from
- getDb
- _getMessage
- _guid
- handleUnrepresentable
- queryWithCache
- _ipv6
- isValidBase64
- joinValues
- _lowercase
- _nanoid
- normalizeDef
- refine
- _regex
- _startsWith
- _ulid
- _uuid
- _uuidv4
- drizzle-orm@^0.45.4
- typescript-eslint@^8.24.1
- vite@^8.3.8
- exactOptional
- primaryKey
- readonly
- safeDecode
- safeEncode
- safeEncodeAsync
- validate

## God Nodes (most connected - your core abstractions)
1. `AppError` - 74 edges
2. `check()` - 61 edges
3. `normalizeParams()` - 55 edges
4. `AppDatabase` - 45 edges
5. `sql()` - 39 edges
6. `useAuth` - 37 edges
7. `is()` - 28 edges
8. `setupAdmin()` - 27 edges
9. `getOperators()` - 22 edges
10. `constructor()` - 20 edges

## Surprising Connections (you probably didn't know these)
- `createTransaction()` --calls--> `quoteSale()`  [EXTRACTED]
  apps/desktop/electron/main/services/transactions.ts → packages/shared/src/pos.ts
- `createTransaction()` --calls--> `settlePayments()`  [EXTRACTED]
  apps/desktop/electron/main/services/transactions.ts → packages/shared/src/pos.ts
- `createDb()` --calls--> `AppDatabase`  [EXTRACTED]
  apps/desktop/electron/main/services/customer.test.ts → apps/desktop/electron/main/db/open.ts
- `createDb()` --calls--> `AppDatabase`  [EXTRACTED]
  apps/desktop/electron/main/services/finance.test.ts → apps/desktop/electron/main/db/open.ts
- `createDb()` --calls--> `AppDatabase`  [EXTRACTED]
  apps/desktop/electron/main/services/supplier.payment.test.ts → apps/desktop/electron/main/db/open.ts

## Import Cycles
- None detected.

## Communities (152 total, 81 thin omitted)

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
Cohesion: 0.15
Nodes (13): devDependencies, autoprefixer@^10.4.16, eslint-plugin-react@^7.37.4, @playwright/test@^1.65.0, @types/node@^22.13.1, vite-tsconfig-paths@^6.1.1, @vitejs/plugin-react@^1.2.0, autoprefixer (+5 more)

### Community 8 - "devDependencies"
Cohesion: 0.10
Nodes (21): devDependencies, autoprefixer@^10.4.16, drizzle-orm@^0.45.4, eslint-plugin-react@^7.37.4, globals@^6.1.0, @tailwindcss/vite@^4.3.5, @types/babel__core@^7.20.5, @types/react-dom@^19.3.0 (+13 more)

### Community 9 - "desktop/package.json"
Cohesion: 0.21
Nodes (12): dependencies, jsbarcode@^3.11.0, react@^19.3.1, react-dom@^19.3.1, zustand@^5.1.0, react, react-dom, zustand (+4 more)

### Community 10 - "scripts"
Cohesion: 0.12
Nodes (17): scripts, build, build:electron, build:installer, build:web, dev, electron:build, electron:dev (+9 more)

### Community 11 - "shared/package.json"
Cohesion: 0.20
Nodes (10): dependencies, zod@^4.6.7, main, name, private, scripts, build, lint (+2 more)

### Community 12 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, build, dev, electron:build, electron:dev, lint, preview, typecheck

### Community 14 - "auth.ts"
Cohesion: 0.18
Nodes (25): assertNotLocked(), assertPasswordPolicy(), assertPermission(), changePassword(), clearFailures(), failures, hashToken(), issueSession() (+17 more)

### Community 15 - "AppDatabase"
Cohesion: 0.12
Nodes (27): AppDatabase, openAppDatabase(), getDb(), createDb(), createDb(), applyStockMovement(), listStockMovements(), assertReference() (+19 more)

### Community 16 - "normalizeParams"
Cohesion: 0.09
Nodes (22): _boolean(), boolean(), _cuid(), cuid(), emoji(), _emoji(), _includes(), includes() (+14 more)

### Community 20 - "check"
Cohesion: 0.09
Nodes (25): check(), _cidrv6(), cidrv6(), _e164(), e164(), _gt(), gt(), _ipv4() (+17 more)

### Community 21 - "outbox.ts"
Cohesion: 0.08
Nodes (30): countOutboxEvents(), recordStockMovement(), appendOutboxEvent(), AppendOutboxInput, eventPayloadSchemas, isoDateSchema, listOutboxEvents(), mapRow() (+22 more)

### Community 22 - "auth.js"
Cohesion: 0.11
Nodes (22): createUser(), listRolePermissions(), setRolePermissions(), assertNotLocked(), assertPasswordPolicy(), changePassword(), clearFailures(), hashToken() (+14 more)

### Community 25 - "package.json"
Cohesion: 0.12
Nodes (16): eslint@^9.21.2, @playwright/test@^1.65.0, tailwindcss@^4.3.5, @types/react@^19.3.0, unbuild@^3.0.1, eslint, @playwright/test, tailwindcss (+8 more)

### Community 29 - "main.ts"
Cohesion: 0.06
Nodes (34): AppInfo, AppInfoSchema, createWindow(), EnvironmentStatus, EnvironmentStatusSchema, gotLock, isOnline(), loadToken() (+26 more)

### Community 30 - "open.ts"
Cohesion: 0.11
Nodes (12): applyMigrations(), applySql(), AppOrm, connect(), countOf(), MIGRATIONS, normalizeLegacySchema(), renameColumnIfNeeded() (+4 more)

### Community 31 - "schema.ts"
Cohesion: 0.05
Nodes (37): cashDrawers, cashMovements, categories, customers, customerTransactions, deviceIdentity, expenseRecords, goodsReceiving (+29 more)

### Community 32 - "inventory.ts"
Cohesion: 0.11
Nodes (22): addOpnameItem(), approveStockAdjustment(), completeStockOpname(), createStockAdjustment(), createStockOpname(), generateOpnameNumber(), getCurrentStock(), getOpnameItem() (+14 more)

### Community 33 - "schemas.ts"
Cohesion: 0.06
Nodes (59): AuthChangePasswordSchema, AuthLoginSchema, AuthSetupSchema, AuthTokenSchema, CashDrawerCloseSchema, CashDrawerOpenSchema, CashDrawerQuerySchema, CashMovementsQuerySchema (+51 more)

### Community 34 - "procurement.ts"
Cohesion: 0.06
Nodes (53): cancelPurchaseOrder(), createPurchaseOrder(), createPurchaseReturn(), getGoodsReceiving(), getPurchaseHistory(), getPurchaseOrder(), getPurchaseReturn(), GoodsReceivingItemRecord (+45 more)

### Community 35 - "reports.ts"
Cohesion: 0.08
Nodes (49): CashDrawerRecord, CashFlow, CashMovementRecord, closeCashDrawer(), drawerNumber(), DrawerRow, ExpenseRecord, ExpenseRow (+41 more)

### Community 36 - "AppError"
Cohesion: 0.12
Nodes (22): createCustomer(), customerCode(), CustomerRecord, CustomerRow, CustomerTransactionRecord, CustomerTxRow, deactivateCustomer(), getCustomer() (+14 more)

### Community 37 - ".clone"
Cohesion: 0.12
Nodes (30): Aliased, catchall(), clone(), deferProp(), describe(), exactPartial(), extend(), extended() (+22 more)

### Community 38 - "dependencies"
Cohesion: 0.29
Nodes (7): dependencies, react@^19.3.1, react-dom@^19.3.1, zustand@^5.1.0, react, react-dom, zustand

### Community 39 - "electron"
Cohesion: 0.28
Nodes (7): api, send(), withToken(), send(), withToken(), electron@^45.3.1, electron

### Community 40 - "transactions.ts"
Cohesion: 0.18
Nodes (13): transact(), getSettings(), readValue(), StoreSettings, updateSettings(), assertQuantity(), createTransaction(), listTransactions() (+5 more)

### Community 46 - "_gte"
Cohesion: 0.33
Nodes (6): _gte(), gte(), min(), _minLength(), nonempty(), nonnegative()

### Community 48 - "admin.ts"
Cohesion: 0.14
Nodes (22): AppError, AdminPermissionRecord, AdminRoleRecord, AdminUserRecord, createRole(), createUser(), deactivateRole(), deactivateUser() (+14 more)

### Community 49 - "sql"
Cohesion: 0.06
Nodes (68): aliasedTable(), aliasedTableColumn(), all(), and(), asc(), between(), bindIfParam(), buildCount() (+60 more)

### Community 50 - "inventory.js"
Cohesion: 0.16
Nodes (14): addOpnameItem(), approveStockAdjustment(), completeStockOpname(), createStockAdjustment(), createStockOpname(), generateOpnameNumber(), getCurrentStock(), getOpnameItem() (+6 more)

### Community 51 - "config"
Cohesion: 0.11
Nodes (18): aborted(), config(), en_default(), _ensureDefaultLocale(), _ensureDefaultMemoizer(), finalizeIssue(), getName(), handleArrayResult() (+10 more)

### Community 53 - "supplier.js"
Cohesion: 0.21
Nodes (13): createSupplier(), createSupplierInvoice(), deactivateSupplier(), generateSupplierCode(), getSupplier(), getSupplierInvoice(), getSupplierTransaction(), listSupplierInvoices() (+5 more)

### Community 55 - "constructor"
Cohesion: 0.08
Nodes (29): applyMigrations(), applySql(), connect(), constructor(), init(), Internals(), countOf(), createSetOperator() (+21 more)

### Community 58 - "procurement.js"
Cohesion: 0.24
Nodes (11): cancelPurchaseOrder(), createPurchaseOrder(), createPurchaseReturn(), getGoodsReceiving(), getPurchaseOrder(), getPurchaseReturn(), poNumber(), receiveGoods() (+3 more)

### Community 59 - "reports.js"
Cohesion: 0.41
Nodes (13): dateExpression(), getBestSellingProducts(), getCashierPerformance(), getExpenseReport(), getGrossProfit(), getPurchaseReport(), getSalesReport(), getSlowMovingProducts() (+5 more)

### Community 60 - "finance.js"
Cohesion: 0.22
Nodes (9): closeCashDrawer(), drawerNumber(), getCashDrawer(), getCashFlow(), listCashMovements(), openCashDrawer(), recordCashMovement(), recordExpense() (+1 more)

### Community 61 - "customer.js"
Cohesion: 0.28
Nodes (10): createCustomer(), customerCode(), deactivateCustomer(), getCustomer(), getCustomerReceivables(), getCustomerStats(), getCustomerTransaction(), payCustomerCredit() (+2 more)

### Community 62 - "_prepare"
Cohesion: 0.14
Nodes (16): as(), catch(), _catch(), constantCatch(), execute(), executeRaw(), extractUsedTable(), finally() (+8 more)

### Community 63 - "_lte"
Cohesion: 0.40
Nodes (5): _lte(), lte(), max(), _maxLength(), nonpositive()

### Community 64 - "transactions.js"
Cohesion: 0.29
Nodes (11): recordStockMovement(), assertMoney(), quoteSale(), settlePayments(), getSettings(), readValue(), updateSettings(), assertQuantity() (+3 more)

### Community 65 - "_overwrite"
Cohesion: 0.17
Nodes (12): _normalize(), normalize(), _overwrite(), overwrite(), slugify(), _slugify(), _toLowerCase(), toLowerCase() (+4 more)

### Community 66 - "pos.ts"
Cohesion: 0.31
Nodes (9): assertMoney(), PAYMENT_METHODS, PaymentLine, PaymentMethod, quoteSale(), SaleQuote, Settlement, settlePayments() (+1 more)

### Community 67 - "db.test.ts"
Cohesion: 0.11
Nodes (16): assertIntegrity(), backupDatabase(), restoreDatabase(), DeviceIdentity, getOrCreateDeviceIdentity(), identityFilePath(), persist(), readPersisted() (+8 more)

### Community 68 - "mapResult"
Cohesion: 0.50
Nodes (4): mapAllResult(), mapGetResult(), mapResult(), mapRunResult()

### Community 70 - "products.js"
Cohesion: 0.36
Nodes (8): applyStockMovement(), assertReference(), assertUnique(), createProduct(), deactivateProduct(), listProducts(), mapProduct(), updateProduct()

### Community 72 - "errors.js"
Cohesion: 0.28
Nodes (3): assertIntegrity(), backupDatabase(), restoreDatabase()

### Community 73 - "foldObjects"
Cohesion: 0.31
Nodes (9): assignProp(), assignProps(), compactTypeUnion(), finalize(), foldIntersection(), foldObjects(), isTransforming(), processSchema() (+1 more)

### Community 74 - "isRecursive"
Cohesion: 0.22
Nodes (9): attach(), bucketFor(), cloneIssues(), guard(), isBackEdge(), isRecursive(), isRef(), rawShape() (+1 more)

### Community 75 - "getSQLiteColumnBuilders"
Cohesion: 0.33
Nodes (9): blob(), customType(), getColumnNameAndConfig(), getSQLiteColumnBuilders(), integer(), numeric(), real(), sqliteTableBase() (+1 more)

### Community 76 - "buildQueryFromSourceParams"
Cohesion: 0.22
Nodes (9): buildQueryFromSourceParams(), escapeName(), escapeParam(), escapeString(), isPgEnum(), isSQLWrapper(), mapInlineParam(), mergeQueries() (+1 more)

### Community 77 - "mcpServers"
Cohesion: 0.22
Nodes (8): mcpServers, args, command, env, name, name, schema, version

### Community 78 - "capSize"
Cohesion: 0.67
Nodes (3): attachSchema(), capSize(), sizeCaps()

### Community 79 - "createTableRelationsHelpers"
Cohesion: 0.67
Nodes (3): createMany(), createOne(), createTableRelationsHelpers()

### Community 80 - "default"
Cohesion: 0.67
Nodes (3): default(), _default(), defaultNow()

### Community 81 - "tsconfig.electron.json"
Cohesion: 0.29
Nodes (6): compilerOptions, moduleResolution, exclude, extends, include, ./tsconfig.json

### Community 82 - "parseTableDefinition"
Cohesion: 0.29
Nodes (7): extractRowArray(), extractRowObject(), identifier(), inferParameters(), parseTableDefinition(), wrapFactory(), wrapGenerator()

### Community 83 - "own"
Cohesion: 0.40
Nodes (6): hide(), own(), spa(), "~standard"(), standardProps(), validateAsync()

### Community 84 - "getPrebuildPath"
Cohesion: 0.67
Nodes (3): getBinding(), getPrebuildPath(), isLinuxMusl()

### Community 87 - "outbox.js"
Cohesion: 0.14
Nodes (19): _array(), array(), _enum(), keyof(), literal(), _number(), number(), object() (+11 more)

### Community 88 - "Database"
Cohesion: 0.40
Nodes (5): arrayAppender(), arrayFactory(), Database(), recordFactory(), rowFactory()

### Community 89 - "canParseURL"
Cohesion: 0.40
Nodes (5): canParseURL(), isValidCIDRv6(), isValidIPv6(), parseURLObject(), validateURL()

### Community 91 - "superRefine"
Cohesion: 0.40
Nodes (5): _check(), handleRefineResult(), issue(), _superRefine(), superRefine()

### Community 92 - "createWindow"
Cohesion: 0.50
Nodes (5): createWindow(), loadToken(), publicUser(), setActiveToken(), tokenFile()

### Community 93 - "datetime"
Cohesion: 0.40
Nodes (5): datetime(), _isoDateTime(), _isoTime(), time(), timeSource()

### Community 95 - "safeParse"
Cohesion: 0.67
Nodes (3): isNullable(), isOptional(), safeParse()

### Community 96 - "nullable"
Cohesion: 0.67
Nodes (3): nullable(), nullish(), optional()

## Knowledge Gaps
- **2 isolated node(s):** `RFC-9562`, `./tsconfig.json`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 549 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **81 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `electron` connect `electron` to `package.json`, `main.js`, `main.ts`?**
  _High betweenness centrality (0.087) - this node is a cross-community bridge._
- **Are the 5 inferred relationships involving `sql()` (e.g. with `buildRelationalQuery()` and `constructor()`) actually correct?**
  _`sql()` has 5 INFERRED edges - model-reasoned connections that need verification._
- **What connects `RFC-9562`, `./tsconfig.json` to the rest of the system?**
  _2 weakly-connected nodes found - possible missing edges._
- **Should `useAuth` be split into smaller, more focused modules?**
  _Cohesion score 0.055135135135135134 - nodes in this community are weakly interconnected._
- **Why does `better-sqlite3` connect `db.test.ts` to `desktop/package.json`, `main.ts`, `open.ts`, `auth.ts`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
- **Should `web/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.06423034330011074 - nodes in this community are weakly interconnected._
- **Why does `devDependencies` connect `devDependencies` to `electron`, `@vitejs/plugin-react@^1.2.0`, `electron-vite`, `@fontsource/inter@^5.2.2`, `postcss@^8.4.33`, `prettier@^3.5.3`, `@types/node@^22.13.1`, `@types/better-sqlite3@^9.6.0`, `package.json`, `typescript-eslint@^8.24.1`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._