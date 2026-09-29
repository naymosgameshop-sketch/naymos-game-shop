-- Migration 042: Reconcile Game & Digital Provider Architecture, Constraints, and Performance Indexes
-- Safe, additive, reproducible migration without destructive schema drops.

-- 1. Ensure orders table has proper constraints and indexes
ALTER TABLE IF EXISTS orders 
  ADD COLUMN IF NOT EXISTS order_type text DEFAULT 'GAME_TOPUP',
  ADD COLUMN IF NOT EXISTS digital_product_id uuid REFERENCES digital_products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS digital_package_id uuid REFERENCES digital_product_packages(id) ON DELETE SET NULL;

-- 2. Indexes for Foreign Keys and Query Performance
CREATE INDEX IF NOT EXISTS idx_orders_order_type ON orders(order_type);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_digital_product_id ON orders(digital_product_id);
CREATE INDEX IF NOT EXISTS idx_orders_digital_package_id ON orders(digital_package_id);

-- 3. Provider Routes Indexes
CREATE INDEX IF NOT EXISTS idx_provider_routes_provider_id ON provider_routes(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_routes_provider_product_id ON provider_routes(provider_product_id);
CREATE INDEX IF NOT EXISTS idx_provider_routes_failover_provider_id ON provider_routes(failover_provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_routes_target ON provider_routes(target_type, target_id);

-- 4. Audit & API Transactions Idempotency & Indexes
CREATE INDEX IF NOT EXISTS idx_api_transactions_reference ON api_transactions(reference_id);
CREATE INDEX IF NOT EXISTS idx_api_transactions_provider_id ON api_transactions(provider_id);
CREATE INDEX IF NOT EXISTS idx_api_logs_provider_id ON api_logs(provider_id);

-- Ensure reference_id uniqueness constraint for provider transactions to prevent duplicate purchases at DB level
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_api_transactions_reference_id'
  ) THEN
    ALTER TABLE api_transactions ADD CONSTRAINT uq_api_transactions_reference_id UNIQUE (reference_id);
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- 5. Safe Order Status Check Constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_orders_valid_status'
  ) THEN
    ALTER TABLE orders ADD CONSTRAINT chk_orders_valid_status 
      CHECK (status IN ('PENDING_PAYMENT', 'PAID', 'QUEUED', 'PROCESSING', 'SUCCESS', 'COMPLETED', 'FAILED', 'CANCELLED', 'REFUND_PENDING', 'REFUNDED', 'UNKNOWN', 'PROVIDER_ERROR', 'SLIP_UPLOADED'));
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;
