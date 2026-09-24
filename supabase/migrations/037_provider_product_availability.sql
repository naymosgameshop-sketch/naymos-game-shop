-- Migration 037: Provider Product Availability & Store Visibility Architecture
-- Additive & Non-destructive: Separates Storefront Visibility from Provider Availability

-- 1. Add Availability & Stock fields to products (NayMos Game Packages)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS availability TEXT NOT NULL DEFAULT 'available' CHECK (availability IN ('available', 'out_of_stock', 'provider_error', 'unavailable', 'unknown')),
  ADD COLUMN IF NOT EXISTS stock INT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS provider_status_reason TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS last_provider_check_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Add Provider Availability fields to games
ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS provider_availability TEXT NOT NULL DEFAULT 'available' CHECK (provider_availability IN ('available', 'out_of_stock', 'provider_error', 'unavailable', 'unknown')),
  ADD COLUMN IF NOT EXISTS provider_error_message TEXT DEFAULT NULL;

-- 3. Add Availability & Stock fields to provider_products
ALTER TABLE public.provider_products
  ADD COLUMN IF NOT EXISTS stock INT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS availability TEXT NOT NULL DEFAULT 'available' CHECK (availability IN ('available', 'out_of_stock', 'provider_error', 'unavailable', 'unknown')),
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS error_message TEXT DEFAULT NULL;

-- 4. Add Availability & Stock fields to digital_products and digital_product_packages
ALTER TABLE public.digital_products
  ADD COLUMN IF NOT EXISTS provider_availability TEXT NOT NULL DEFAULT 'available' CHECK (provider_availability IN ('available', 'out_of_stock', 'provider_error', 'unavailable', 'unknown'));

ALTER TABLE public.digital_product_packages
  ADD COLUMN IF NOT EXISTS availability TEXT NOT NULL DEFAULT 'available' CHECK (availability IN ('available', 'out_of_stock', 'provider_error', 'unavailable', 'unknown')),
  ADD COLUMN IF NOT EXISTS stock INT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS provider_status_reason TEXT DEFAULT NULL;

-- 5. Indexes for fast lookup on availability
CREATE INDEX IF NOT EXISTS idx_products_avail ON public.products(availability);
CREATE INDEX IF NOT EXISTS idx_games_prov_avail ON public.games(provider_availability);
CREATE INDEX IF NOT EXISTS idx_prov_prods_avail ON public.provider_products(availability);

-- 6. Reload schema cache for PostgREST
DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
