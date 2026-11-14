-- Backfill: populate cost snapshot for existing transaction_items
-- This sets the cost to the product's current cost at migration time.
-- Going forward, new transactions capture cost at time of sale (see createTransaction).
-- For transactions created before this migration, historical COGS reports
-- will reflect the cost state at migration time. Future cost updates to products
-- will NOT affect historical profit for transactions after this migration.
--
-- IMPORTANT: This is a one-time migration. Do not re-run.

UPDATE transaction_items
SET cost = (SELECT p.cost FROM products p WHERE p.id = transaction_items.product_id)
WHERE cost = 0 AND product_id IS NOT NULL;