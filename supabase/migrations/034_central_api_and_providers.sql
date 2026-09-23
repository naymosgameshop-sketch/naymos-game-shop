-- Migration 034: Central API & Providers Architecture
-- Non-destructive additive migration expanding providers, routes, transactions, and audit logs

-- 1. Enhance providers table with environment, test mode, credentials security and health metrics
ALTER TABLE public.providers 
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'GAME_TOPUP',
  ADD COLUMN IF NOT EXISTS environment TEXT NOT NULL DEFAULT 'sandbox',
  ADD COLUMN IF NOT EXISTS is_test_mode BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS credentials_preview TEXT,
  ADD COLUMN IF NOT EXISTS timeout_ms INT NOT NULL DEFAULT 10000,
  ADD COLUMN IF NOT EXISTS max_retries INT NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS health_response_ms INT,
  ADD COLUMN IF NOT EXISTS last_health_check_at TIMESTAMPTZ;

-- Safe check constraint on environment
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_providers_environment'
  ) THEN 
    ALTER TABLE public.providers ADD CONSTRAINT chk_providers_environment 
      CHECK (environment IN ('sandbox', 'production'));
  END IF;
END $$;

-- 2. Enhance provider_routes with failover, route keys, and timeout
ALTER TABLE public.provider_routes 
  ADD COLUMN IF NOT EXISTS route_key TEXT,
  ADD COLUMN IF NOT EXISTS failover_provider_id UUID REFERENCES public.providers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS timeout_ms INT DEFAULT 10000,
  ADD COLUMN IF NOT EXISTS max_retries INT DEFAULT 2;

CREATE INDEX IF NOT EXISTS idx_provider_routes_route_key ON public.provider_routes(route_key);

-- 3. Enhance api_transactions with routing, duration, and sanitized payloads
ALTER TABLE public.api_transactions 
  ADD COLUMN IF NOT EXISTS route_key TEXT,
  ADD COLUMN IF NOT EXISTS action_name TEXT,
  ADD COLUMN IF NOT EXISTS duration_ms INT,
  ADD COLUMN IF NOT EXISTS http_status INT,
  ADD COLUMN IF NOT EXISTS error_message TEXT,
  ADD COLUMN IF NOT EXISTS request_payload_sanitized JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS response_payload_sanitized JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_api_transactions_provider ON public.api_transactions(provider_id);
CREATE INDEX IF NOT EXISTS idx_api_transactions_created ON public.api_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_transactions_reference ON public.api_transactions(reference_id);

-- 4. Enhance api_logs
ALTER TABLE public.api_logs 
  ADD COLUMN IF NOT EXISTS transaction_id UUID REFERENCES public.api_transactions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS level TEXT DEFAULT 'info',
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_api_logs_created ON public.api_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_logs_level ON public.api_logs(level);

-- 5. Seed Core Providers (Idempotent)
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
