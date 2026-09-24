-- Migration 036: Register FinShop Provider in Central Provider Architecture
-- Additive & Idempotent: Registers FinShop with is_active = false until API Key is configured

INSERT INTO public.providers (
  id,
  name,
  code,
  type,
  category,
  api_base_url,
  is_active,
  is_test_mode,
  environment,
  priority,
  currency,
  health_status,
  timeout_ms,
  max_retries,
  supported_types,
  config
) VALUES (
  '33333333-3333-3333-3333-333333333301',
  'FinShop',
  'finshop',
  'ALL',
  'DIGITAL_PRODUCT',
  'https://finshop.me/api/v1',
  false,
  false,
  'production',
  2,
  'THB',
  'UNKNOWN',
  10000,
  2,
  ARRAY['DIGITAL_PRODUCT', 'PREMIUM_APP']::TEXT[],
  '{"allowed_product_ids": [26,27,30,31,32,33,34,36,37,38,56,61,62,63,65,66]}'::JSONB
) ON CONFLICT (code) DO UPDATE SET
  api_base_url = EXCLUDED.api_base_url,
  category = EXCLUDED.category,
  supported_types = EXCLUDED.supported_types;

-- Notify postgrest schema reload
DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
