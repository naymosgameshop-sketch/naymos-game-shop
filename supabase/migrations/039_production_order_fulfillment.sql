-- Migration 039: Production Order Fulfillment, Idempotency & RLS Hardening
-- Additive & Non-destructive

-- 1. Ensure unique reference_id constraint on api_transactions to prevent double fulfillment
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'api_transactions_reference_id_unique'
  ) THEN
    -- Only enforce unique on non-null reference_id
    CREATE UNIQUE INDEX IF NOT EXISTS uq_api_transactions_reference_id 
    ON public.api_transactions (reference_id) 
    WHERE reference_id IS NOT NULL;
  END IF;
END $$;

-- 2. Add safe fulfillment tracking columns to orders if not already present
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS fulfillment_status TEXT DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS provider_reference_id TEXT,
  ADD COLUMN IF NOT EXISTS fulfilled_at TIMESTAMPTZ;

-- 3. Hardened RLS policies for Sensitive Tables (providers, api_transactions, api_logs)
ALTER TABLE IF EXISTS public.providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.api_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.api_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view and manage providers
DROP POLICY IF EXISTS "Admins can view and manage providers" ON public.providers;
CREATE POLICY "Admins can view and manage providers"
ON public.providers
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'super_admin')
  )
);

-- Customers cannot access api_transactions directly
DROP POLICY IF EXISTS "Admins can view api_transactions" ON public.api_transactions;
CREATE POLICY "Admins can view api_transactions"
ON public.api_transactions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'super_admin')
  )
);

NOTIFY pgrst, 'reload schema';
