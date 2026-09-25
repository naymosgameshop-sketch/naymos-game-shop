-- Migration 038: Fix RLS Policies for Providers, Provider Routes, and Provider Products
-- Additive, Non-destructive, Idempotent

-- Ensure RLS is enabled
ALTER TABLE IF EXISTS public.providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.provider_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.provider_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.api_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.api_logs ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  -- Providers policies
  DROP POLICY IF EXISTS "Allow authenticated full access to providers" ON public.providers;
  CREATE POLICY "Allow authenticated full access to providers" ON public.providers FOR ALL TO authenticated USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Allow anon read active providers" ON public.providers;
  CREATE POLICY "Allow anon read active providers" ON public.providers FOR SELECT TO anon USING (is_active = true);

  -- Provider routes policies
  DROP POLICY IF EXISTS "Allow authenticated full access to provider_routes" ON public.provider_routes;
  CREATE POLICY "Allow authenticated full access to provider_routes" ON public.provider_routes FOR ALL TO authenticated USING (true) WITH CHECK (true);

  -- Provider products policies
  DROP POLICY IF EXISTS "Allow authenticated full access to provider_products" ON public.provider_products;
  CREATE POLICY "Allow authenticated full access to provider_products" ON public.provider_products FOR ALL TO authenticated USING (true) WITH CHECK (true);

  -- Transactions & Logs policies
  DROP POLICY IF EXISTS "Allow authenticated full access to api_transactions" ON public.api_transactions;
  CREATE POLICY "Allow authenticated full access to api_transactions" ON public.api_transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Allow authenticated full access to api_logs" ON public.api_logs;
  CREATE POLICY "Allow authenticated full access to api_logs" ON public.api_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
END $$;

NOTIFY pgrst, 'reload schema';
