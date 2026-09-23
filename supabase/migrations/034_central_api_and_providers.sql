-- Migration 034: Complete Self-Contained Central API & Providers Architecture
-- Additive, Non-destructive, Idempotent: Can be run safely on any state

-- ========================================================
-- 1. Digital Product Categories & Catalog (If not exists)
-- ========================================================

CREATE TABLE IF NOT EXISTS public.digital_product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_digital_product_categories_active ON public.digital_product_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_digital_product_categories_sort ON public.digital_product_categories(sort_order);

CREATE TABLE IF NOT EXISTS public.digital_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.digital_product_categories(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  short_description TEXT,
  description TEXT,
  image_url TEXT,
  banner_url TEXT,
  badge TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_digital_products_category ON public.digital_products(category_id);
CREATE INDEX IF NOT EXISTS idx_digital_products_active ON public.digital_products(is_active);
CREATE INDEX IF NOT EXISTS idx_digital_products_featured ON public.digital_products(is_featured);

CREATE TABLE IF NOT EXISTS public.digital_product_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.digital_products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  duration_days INT,
  price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  original_price NUMERIC(12, 2),
  stock_type TEXT NOT NULL DEFAULT 'UNLIMITED',
  stock_count INT DEFAULT 0,
  delivery_type TEXT NOT NULL DEFAULT 'MANUAL',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_digital_product_packages_product ON public.digital_product_packages(product_id);

CREATE TABLE IF NOT EXISTS public.digital_product_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.digital_products(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  field_label TEXT NOT NULL,
  field_type TEXT NOT NULL DEFAULT 'text',
  placeholder TEXT,
  help_text TEXT,
  is_required BOOLEAN NOT NULL DEFAULT true,
  validation_regex TEXT,
  options JSONB,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_digital_product_fields_product ON public.digital_product_fields(product_id);

-- ========================================================
-- 2. Providers, Environment & Security
-- ========================================================

CREATE TABLE IF NOT EXISTS public.providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL DEFAULT 'ALL',
  category TEXT DEFAULT 'GAME_TOPUP',
  api_base_url TEXT,
  api_key TEXT,
  api_secret TEXT,
  credentials_preview TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_test_mode BOOLEAN NOT NULL DEFAULT true,
  environment TEXT NOT NULL DEFAULT 'sandbox',
  priority INT NOT NULL DEFAULT 1,
  balance NUMERIC(14, 2) DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'THB',
  health_status TEXT NOT NULL DEFAULT 'UNKNOWN',
  health_response_ms INT,
  last_health_check_at TIMESTAMPTZ,
  timeout_ms INT NOT NULL DEFAULT 10000,
  max_retries INT NOT NULL DEFAULT 2,
  supported_types TEXT[] DEFAULT ARRAY['GAME_TOPUP', 'PREMIUM_APP']::TEXT[],
  config JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure columns exist in case providers table already existed
ALTER TABLE public.providers 
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'GAME_TOPUP',
  ADD COLUMN IF NOT EXISTS environment TEXT NOT NULL DEFAULT 'sandbox',
  ADD COLUMN IF NOT EXISTS is_test_mode BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS credentials_preview TEXT,
  ADD COLUMN IF NOT EXISTS timeout_ms INT NOT NULL DEFAULT 10000,
  ADD COLUMN IF NOT EXISTS max_retries INT NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS health_response_ms INT,
  ADD COLUMN IF NOT EXISTS last_health_check_at TIMESTAMPTZ;

-- ========================================================
-- 3. Provider Products & Routing with Failover
-- ========================================================

CREATE TABLE IF NOT EXISTS public.provider_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  external_product_code TEXT NOT NULL,
  external_name TEXT NOT NULL,
  cost NUMERIC(12, 2) DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(provider_id, external_product_code)
);

CREATE TABLE IF NOT EXISTS public.provider_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_key TEXT,
  target_type TEXT NOT NULL DEFAULT 'GAME_PRODUCT',
  target_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
  provider_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  provider_product_id UUID REFERENCES public.provider_products(id) ON DELETE SET NULL,
  failover_provider_id UUID REFERENCES public.providers(id) ON DELETE SET NULL,
  priority INT NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  timeout_ms INT DEFAULT 10000,
  max_retries INT DEFAULT 2,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_provider_routes_target ON public.provider_routes(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_provider_routes_route_key ON public.provider_routes(route_key);

-- ========================================================
-- 4. Central API Transactions & Sanitized Audit Logs
-- ========================================================

CREATE TABLE IF NOT EXISTS public.api_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  route_key TEXT,
  action_name TEXT,
  reference_id TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING',
  http_status INT,
  duration_ms INT,
  error_message TEXT,
  request_payload_sanitized JSONB DEFAULT '{}'::jsonb,
  response_payload_sanitized JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_transactions_provider ON public.api_transactions(provider_id);
CREATE INDEX IF NOT EXISTS idx_api_transactions_created ON public.api_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_transactions_reference ON public.api_transactions(reference_id);

CREATE TABLE IF NOT EXISTS public.api_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES public.providers(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES public.api_transactions(id) ON DELETE SET NULL,
  level TEXT NOT NULL DEFAULT 'info',
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_logs_created ON public.api_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_logs_level ON public.api_logs(level);

-- ========================================================
-- 5. Row Level Security (RLS)
-- ========================================================

ALTER TABLE public.digital_product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.digital_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.digital_product_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.digital_product_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_logs ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN 
  DROP POLICY IF EXISTS "Public can view active digital categories" ON public.digital_product_categories;
  CREATE POLICY "Public can view active digital categories" ON public.digital_product_categories FOR SELECT USING (is_active = true);

  DROP POLICY IF EXISTS "Public can view active digital products" ON public.digital_products;
  CREATE POLICY "Public can view active digital products" ON public.digital_products FOR SELECT USING (is_active = true);

  DROP POLICY IF EXISTS "Public can view active digital packages" ON public.digital_product_packages;
  CREATE POLICY "Public can view active digital packages" ON public.digital_product_packages FOR SELECT USING (is_active = true);

  DROP POLICY IF EXISTS "Public can view digital fields" ON public.digital_product_fields;
  CREATE POLICY "Public can view digital fields" ON public.digital_product_fields FOR SELECT USING (true);
END $$;

-- ========================================================
-- 6. Seed Core Data (Idempotent)
-- ========================================================

INSERT INTO public.digital_product_categories (id, slug, name, description, icon, sort_order) VALUES
  ('d1111111-1111-1111-1111-111111111101', 'premium-app', 'แอปพรีเมียม & บันเทิง', 'บริการแอปสตรีมมิ่ง ดูหนัง ฟังเพลง ทำงาน', 'Film', 1),
  ('d1111111-1111-1111-1111-111111111102', 'digital-goods', 'ไอเทมดิจิทัล & โค้ด', 'บัตรเติมเงิน คีย์เกม บัญชีสำเร็จรูป', 'Key', 2)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO public.providers (
  id, name, code, type, category, api_base_url, is_active, is_test_mode, environment, health_status, priority, credentials_preview
) VALUES 
  ('11111111-1111-1111-1111-111111111101', 'Mock Game Topup Sandbox', 'mock-game-topup', 'GAME_TOPUP', 'GAME_TOPUP', 'https://mock.naymos.local/v1/topup', true, true, 'sandbox', 'HEALTHY', 1, 'mock_sec_...test'),
  ('11111111-1111-1111-1111-111111111102', 'Sandbox Premium Apps Provider', 'mock-digital-goods', 'PREMIUM_APP', 'PREMIUM_APP', 'https://mock.naymos.local/v1/digital', true, true, 'sandbox', 'HEALTHY', 1, 'mock_app_...sandbox'),
  ('11111111-1111-1111-1111-111111111103', 'PromptPay EMVCo Local Engine', 'local-promptpay', 'ALL', 'PAYMENT', 'internal://payments/promptpay', true, false, 'production', 'HEALTHY', 1, 'promptpay_id_...0988'),
  ('11111111-1111-1111-1111-111111111104', 'AI Assistant Unified Gateway', 'ai-gateway', 'ALL', 'AI', 'https://generativelanguage.googleapis.com', true, false, 'production', 'HEALTHY', 1, 'ai_key_...multi')
ON CONFLICT (code) DO UPDATE SET 
  name = EXCLUDED.name,
  is_active = EXCLUDED.is_active,
  environment = EXCLUDED.environment,
  updated_at = now();
