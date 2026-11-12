# Database Design — VYAPARA

## Rules

SQLite lokal; PostgreSQL cloud; UUID global; uang Rupiah integer;
timestamp UTC; foreign keys; versioned migrations; soft-delete/tombstone
bila perlu; koreksi transaksi dengan reversal.

## Table groups

Identity: `users`, `roles`, `permissions`, `user_roles`,
`role_permissions`, `settings`, `audit_logs`, `devices`. Catalog:
`categories`, `units`, `products`, `product_barcodes`, `price_tiers`,
`services`, `service_pricing_rules`. Parties: `customers`, `suppliers`.
Orders: `orders`, `order_items`, `order_payments`,
`order_status_history`, `order_item_status_history`, `sales_returns`,
`sales_return_items`. Fulfillment: `print_jobs`, `print_job_files`,
`order_item_materials`. Inventory: `stock_balances`, `stock_movements`,
`stock_adjustments`, `stock_adjustment_items`, `stock_opnames`,
`stock_opname_items`. Procurement: `purchase_orders`,
`purchase_order_items`, `goods_receipts`, `goods_receipt_items`,
`purchase_payments`, `purchase_returns`, `purchase_return_items`.
Finance: `cash_sessions`, `cash_movements`, `financial_accounts`,
`expenses`, `expense_categories`, `receivables`, `payables`. Sync:
`sync_outbox`, `sync_inbox`, `sync_logs`, `sync_conflicts`,
`sync_checkpoints`, `sync_tombstones`. System: `app_migrations`,
`backup_history`.

## Unified order

`orders` is the invoice header. Suggested fields: id, order_number,
customer_id, created_by, order_date, subtotal, discount_total,
tax_total, grand_total, paid_total, balance_due, payment_status,
fulfillment_status, notes, timestamps.

`order_items`: id, order_id, item_type, product_id nullable, service_id
nullable, description_snapshot, specification_snapshot, quantity,
unit_id, unit_price, discount_amount, tax_amount, line_total,
unit_cost_snapshot, fulfillment_status, due_at, timestamps.

Item types: `PRODUCT`, `PRINTING`, `PHOTOCOPY`, `LAMINATING`, `BINDING`,
`OTHER_SERVICE`.

`order_payments`: id, order_id, payment_number, payment_method, amount,
paid_at, reference, received_by, idempotency_key.

## Fulfillment

Possible item statuses: `PENDING`, `IN_PROGRESS`, `READY`,
`PARTIALLY_DELIVERED`, `COMPLETED`, `CANCELLED`. Payment status is
separate. Aggregate order status derived from item states.

## Inventory

`stock_movements` is the traceable ledger with product, quantity delta,
movement type, source reference, cost snapshot, actor, timestamp.
Balance may be a transactional projection.

## Money and costing

Never use float. Snapshot price/cost. Costing policy, tax, rounding, DP
revenue recognition, and receivable rules require owner approval.

## Indexes

Order number/date/customer; SKU/barcode; stock movement product/date;
sync state/time; payment order/date; fulfillment status/deadline.
Enforce UUID, invoice, SKU, and idempotency uniqueness.
