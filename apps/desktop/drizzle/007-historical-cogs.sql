-- Historical COGS: add cost snapshot column to transaction_items
-- and backfill existing transactions with the product cost at migration time.
-- Idempotent: safe to re-run.

ALTER TABLE transaction_items ADD COLUMN cost REAL NOT NULL DEFAULT 0;

UPDATE transaction_items
SET cost = (SELECT p.cost FROM products p WHERE p.id = transaction_items.productId)
WHERE cost = 0 AND productId IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transaction_items_cost ON transaction_items(cost);