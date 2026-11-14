-- Phase 4.1: business-level idempotency for customer payments
ALTER TABLE customer_transactions ADD COLUMN idempotency_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_transactions_idempotency
  ON customer_transactions(idempotency_key);
