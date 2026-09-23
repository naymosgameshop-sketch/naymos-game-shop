-- Migration 033: Digital Products & Central Provider System Architecture
-- Additive & Non-destructive: keeps existing games, products, orders intact.

-- ========================================================
-- 1. Digital Product Categories & Catalog
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
  category_id UUID REFERENCES public.digital_product_categories(id) ON DELETE SET NULL,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  category_type TEXT NOT NULL DEFAULT 'PREMIUM_APP' CHECK (category_type IN ('PREMIUM_APP', 'DIGITAL_PRODUCT', 'OTHER')),
  icon TEXT,
  banner TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_digital_products_active ON public.digital_products(is_active);
CREATE INDEX IF NOT EXISTS idx_digital_products_cat ON public.digital_products(category_id);
CREATE INDEX IF NOT EXISTS idx_digital_products_type ON public.digital_products(category_type);

CREATE TABLE IF NOT EXISTS public.digital_product_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  digital_product_id UUID NOT NULL REFERENCES public.digital_products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  duration TEXT,
  price NUMERIC(12, 2) NOT NULL,
  reseller_price NUMERIC(12, 2),
  cost NUMERIC(12, 2) DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_digital_product_pkgs_prod ON public.digital_product_packages(digital_product_id);

CREATE TABLE IF NOT EXISTS public.digital_product_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  digital_product_id UUID NOT NULL REFERENCES public.digital_products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  label TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'text',
  placeholder TEXT,
  required BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_digital_product_fields_prod ON public.digital_product_fields(digital_product_id);

-- ========================================================
-- 2. Central Provider Infrastructure
-- ========================================================

CREATE TABLE IF NOT EXISTS public.providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL DEFAULT 'PREMIUM_APP' CHECK (type IN ('GAME_TOPUP', 'PREMIUM_APP', 'DIGITAL_PRODUCT', 'ALL')),
  api_base_url TEXT,
  api_key TEXT,
  api_secret TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INT NOT NULL DEFAULT 1,
  balance NUMERIC(14, 2) DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'THB',
  health_status TEXT NOT NULL DEFAULT 'UNKNOWN' CHECK (health_status IN ('HEALTHY', 'DEGRADED', 'DOWN', 'UNKNOWN')),
  last_check_at TIMESTAMPTZ,
  supported_types TEXT[] DEFAULT ARRAY['PREMIUM_APP']::TEXT[],
  config JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

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
  target_type TEXT NOT NULL CHECK (target_type IN ('GAME_PRODUCT', 'DIGITAL_PRODUCT_PACKAGE')),
  target_id UUID NOT NULL,
  provider_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  provider_product_id UUID REFERENCES public.provider_products(id) ON DELETE SET NULL,
  priority INT NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(target_type, target_id, provider_id)
);

CREATE INDEX IF NOT EXISTS idx_provider_routes_target ON public.provider_routes(target_type, target_id, priority);

CREATE TABLE IF NOT EXISTS public.api_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID,
  order_number TEXT,
  provider_id UUID REFERENCES public.providers(id) ON DELETE SET NULL,
  target_type TEXT,
  target_id UUID,
  provider_product_id UUID,
  request_payload JSONB,
  response_payload JSONB,
  provider_order_id TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'UNKNOWN', 'CANCELLED')),
  cost NUMERIC(12, 2),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_api_tx_order ON public.api_transactions(order_number);
CREATE INDEX IF NOT EXISTS idx_api_tx_status ON public.api_transactions(status);

CREATE TABLE IF NOT EXISTS public.api_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES public.api_transactions(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES public.providers(id) ON DELETE SET NULL,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT 'POST',
  status_code INT,
  request_body JSONB,
  response_body JSONB,
  latency_ms INT,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ========================================================
-- 3. Row Level Security
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

CREATE POLICY "Public read active digital categories" ON public.digital_product_categories FOR SELECT USING (is_active = true);
CREATE POLICY "Public read active digital products" ON public.digital_products FOR SELECT USING (is_active = true);
CREATE POLICY "Public read active digital packages" ON public.digital_product_packages FOR SELECT USING (is_active = true);
CREATE POLICY "Public read active digital fields" ON public.digital_product_fields FOR SELECT USING (true);

CREATE POLICY "Admin manage digital categories" ON public.digital_product_categories FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'super_admin')));
CREATE POLICY "Admin manage digital products" ON public.digital_products FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'super_admin')));
CREATE POLICY "Admin manage digital packages" ON public.digital_product_packages FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'super_admin')));
CREATE POLICY "Admin manage digital fields" ON public.digital_product_fields FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'super_admin')));

CREATE POLICY "Admin manage providers" ON public.providers FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'super_admin')));
CREATE POLICY "Admin manage provider products" ON public.provider_products FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'super_admin')));
CREATE POLICY "Admin manage provider routes" ON public.provider_routes FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'super_admin')));
CREATE POLICY "Admin manage api transactions" ON public.api_transactions FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'super_admin')));
CREATE POLICY "Admin manage api logs" ON public.api_logs FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'super_admin')));

-- ========================================================
-- 4. Initial Seed Data (Idempotent)
-- ========================================================

INSERT INTO public.digital_product_categories (slug, name, description, icon, is_active, sort_order)
VALUES
  ('premium-app', 'แอปพรีเมียม', 'บริการแอปพรีเมียมรายเดือน/รายปี ลิขสิทธิ์แท้ 100%', 'Smartphone', true, 1),
  ('digital-goods', 'สินค้าดิจิทัลอื่น ๆ', 'บริการสินค้าและคีย์ดิจิทัลอื่น ๆ', 'Package', true, 2),
  ('other', 'อื่น ๆ ในอนาคต', 'บริการอื่น ๆ เพิ่มเติมในอนาคต', 'Sparkles', true, 3)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order;
