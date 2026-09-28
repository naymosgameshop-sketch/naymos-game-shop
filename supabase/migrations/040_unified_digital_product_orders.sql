-- Migration 040: Unified Digital Product Orders Architecture & Schema Hardening
-- Allows orders to support both GAME_TOPUP and DIGITAL_PRODUCT without fake game_id

-- 1. Make game_id and product_id nullable for non-game orders
ALTER TABLE public.orders ALTER COLUMN game_id DROP NOT NULL;
ALTER TABLE public.orders ALTER COLUMN product_id DROP NOT NULL;

-- 2. Add order_type and digital product references to orders table safely
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS order_type TEXT NOT NULL DEFAULT 'GAME_TOPUP',
  ADD COLUMN IF NOT EXISTS digital_product_id UUID REFERENCES public.digital_products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS digital_package_id UUID REFERENCES public.digital_product_packages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS amount NUMERIC(12, 2);

-- Sync amount with total if total exists and amount is null
UPDATE public.orders
SET amount = total
WHERE amount IS NULL AND total IS NOT NULL;

-- 3. Update order status check constraint to include all valid production statuses
DO $$
BEGIN
  ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
  ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS check_order_status;
  
  ALTER TABLE public.orders 
  ADD CONSTRAINT orders_status_check 
  CHECK (status IN (
    'PENDING_PAYMENT',
    'PAID',
    'QUEUED',
    'PROCESSING',
    'SUCCESS',
    'FAILED',
    'REFUND_PENDING',
    'REFUNDED',
    'CANCELLED',
    'PROVIDER_ERROR',
    'UNKNOWN'
  ));
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- 4. Add constraint for order_type validation
DO $$
BEGIN
  ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS check_orders_order_type;
  ALTER TABLE public.orders 
  ADD CONSTRAINT check_orders_order_type 
  CHECK (order_type IN ('GAME_TOPUP', 'DIGITAL_PRODUCT'));
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- 5. Helpful indexes for digital orders lookup
CREATE INDEX IF NOT EXISTS idx_orders_order_type ON public.orders(order_type);
CREATE INDEX IF NOT EXISTS idx_orders_digital_product_id ON public.orders(digital_product_id);
CREATE INDEX IF NOT EXISTS idx_orders_digital_package_id ON public.orders(digital_package_id);

-- Reload postgrest schema cache
NOTIFY pgrst, 'reload schema';
