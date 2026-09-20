-- =====================================================
-- Migration 024: Providers & Provider Management
-- =====================================================
-- หมายเหตุ:
-- - Credential columns เป็น encrypted (ไม่เก็บ plaintext)
-- - Encryption จะทำใน server-side (lib/providers/)
-- - provider_routing มี deterministic ordering (priority DESC, created_at ASC, id ASC)
-- - Backward-compatible (ไม่ทำลาย order/payment/game/product flow เดิม)
-- - Migration นี้สร้าง infrastructure เท่านั้น (ยังไม่เปลี่ยน production order flow)
-- - เตรียมสำหรับ RLS migration ใน 025 (ห้าม client เข้าถึง credential โดยตรง)

-- Table: providers
CREATE TABLE IF NOT EXISTS providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  provider_kind text NOT NULL, -- api, webhook, custom (ไม่จำกัด service)
  is_active boolean DEFAULT true,
  config_json jsonb, -- timeout, retry, endpoints (ไม่เก็บ credential)
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_providers_provider_kind ON providers(provider_kind);

-- Table: provider_credentials
CREATE TABLE IF NOT EXISTS provider_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  env text NOT NULL, -- development, staging, production
  api_url text,
  api_key_encrypted text, -- encrypt ใน server-side
  api_secret_encrypted text,
  password_encrypted text,
  headers_json jsonb DEFAULT '{}', -- non-sensitive headers (Content-Type, User-Agent)
  sensitive_headers_encrypted text, -- encrypt ทั้ง JSON blob (Authorization, API token)
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(provider_id, env)
);

CREATE INDEX IF NOT EXISTS idx_provider_credentials_provider_id ON provider_credentials(provider_id);

-- Table: provider_services
CREATE TABLE IF NOT EXISTS provider_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  service_type text NOT NULL, -- game_topup, balance, products, player_verification, payment, notification
  is_enabled boolean DEFAULT true,
  request_mapping_json jsonb DEFAULT '{}', -- internal → provider
  response_mapping_json jsonb DEFAULT '{}', -- provider → internal
  error_mapping_json jsonb DEFAULT '{}', -- provider error → internal status
  webhook_url text,
  webhook_secret_encrypted text, -- encrypt ใน server-side
  health_check_config_json jsonb DEFAULT '{}', -- endpoint, method, headers, body, timeout
  created_at timestamptz DEFAULT now(),
  UNIQUE(provider_id, service_type)
);

CREATE INDEX IF NOT EXISTS idx_provider_services_provider_id ON provider_services(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_services_service_type ON provider_services(service_type);

-- Table: provider_routing (global + game-specific)
CREATE TABLE IF NOT EXISTS provider_routing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid REFERENCES games(id) ON DELETE CASCADE, -- NULL = global
  service_type text NOT NULL,
  provider_id uuid NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  priority integer NOT NULL DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Partial unique indexes สำหรับ provider_routing
-- Game-specific: game_id IS NOT NULL (ป้องกัน priority ซ้ำในเกมเดียวกัน)
CREATE UNIQUE INDEX IF NOT EXISTS idx_provider_routing_game_specific
ON provider_routing(game_id, service_type, priority)
WHERE game_id IS NOT NULL;

-- Global: game_id IS NULL (ป้องกัน priority ซ้ำใน global)
CREATE UNIQUE INDEX IF NOT EXISTS idx_provider_routing_global
ON provider_routing(service_type, priority)
WHERE game_id IS NULL;

-- Indexes สำหรับ query
CREATE INDEX IF NOT EXISTS idx_provider_routing_game_id ON provider_routing(game_id);
CREATE INDEX IF NOT EXISTS idx_provider_routing_service_type ON provider_routing(service_type);
CREATE INDEX IF NOT EXISTS idx_provider_routing_provider_id ON provider_routing(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_routing_is_active ON provider_routing(is_active);

-- Table: provider_logs
CREATE TABLE IF NOT EXISTS provider_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES providers(id) ON DELETE SET NULL,
  service_type text NOT NULL,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  request_id text, -- provider request ID
  http_status integer,
  response_time_ms integer,
  status text NOT NULL, -- SUCCESS, FAILED, TIMEOUT, UNKNOWN
  error_code text,
  error_message text,
  request_masked_json jsonb DEFAULT '{}', -- mask sensitive data
  response_masked_json jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_provider_logs_provider_id ON provider_logs(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_logs_service_type ON provider_logs(service_type);
CREATE INDEX IF NOT EXISTS idx_provider_logs_order_id ON provider_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_provider_logs_created_at ON provider_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_provider_logs_status ON provider_logs(status);

-- Table: provider_health_checks
CREATE TABLE IF NOT EXISTS provider_health_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL UNIQUE REFERENCES providers(id) ON DELETE CASCADE,
  status text NOT NULL, -- ONLINE, SLOW, OFFLINE, NOT_CONFIGURED, DISABLED
  response_time_ms integer,
  last_error text,
  last_check_at timestamptz,
  updated_at timestamptz DEFAULT now()
);

-- ไม่ต้องสร้าง index แยก (provider_id เป็น UNIQUE อยู่แล้ว)
CREATE INDEX IF NOT EXISTS idx_provider_health_checks_status ON provider_health_checks(status);

-- Modify: orders table (เพิ่ม idempotency_key)
-- Backward-compatible: nullable, order เดิมไม่กระทบ
-- idempotency_key ถูกสร้างครั้งเดียวตอนสร้าง order และใช้ค่าเดิมตลอด retry
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS idempotency_key text;

-- Unique index (nullable) — ป้องกันซ้ำ
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_idempotency_key 
ON orders(idempotency_key) 
WHERE idempotency_key IS NOT NULL;

-- Trigger: update_updated_at (ใช้ function เดิมจาก 001_foundation.sql)
-- ตรวจสอบก่อนสร้าง trigger ด้วย DO block

DO $$
BEGIN
  -- providers
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_providers_updated_at'
  ) THEN
    CREATE TRIGGER update_providers_updated_at
    BEFORE UPDATE ON providers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  -- provider_credentials
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_provider_credentials_updated_at'
  ) THEN
    CREATE TRIGGER update_provider_credentials_updated_at
    BEFORE UPDATE ON provider_credentials
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  -- provider_health_checks
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_provider_health_checks_updated_at'
  ) THEN
    CREATE TRIGGER update_provider_health_checks_updated_at
    BEFORE UPDATE ON provider_health_checks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- =====================================================
-- สรุปตารางทั้งหมด
-- =====================================================
-- 1. providers: เก็บข้อมูล provider (name, provider_kind, config)
-- 2. provider_credentials: เก็บ credential (encrypted) - ใช้ server-side เท่านั้น
-- 3. provider_services: เก็บ service config (mapping, health check)
-- 4. provider_routing: global + game-specific routing (deterministic)
-- 5. provider_logs: เก็บ log การเรียก API (mask sensitive data)
-- 6. provider_health_checks: สถานะ health check ล่าสุด
-- 7. orders: เพิ่ม idempotency_key (backward-compatible)

-- =====================================================
-- Security Notes
-- =====================================================
-- - api_key_encrypted, api_secret_encrypted, password_encrypted, sensitive_headers_encrypted, webhook_secret_encrypted
-- - Encrypt ใน server-side (lib/providers/) ก่อน INSERT/UPDATE
-- - Decrypt ใน server-side เมื่อจะเรียก API
-- - ไม่ส่ง plaintext ไป client
-- - ไม่เก็บ plaintext ใน logs/config_json
-- - config_json ใช้เฉพาะ non-sensitive configuration (timeout/retry/endpoints)
-- - ตาราง provider ทั้งหมดเตรียมสำหรับ RLS migration ใน 025 (ห้าม client เข้าถึง credential โดยตรง)

-- =====================================================
-- Routing Behavior
-- =====================================================
-- - Global routing: game_id IS NULL
-- - Game-specific routing: game_id IS NOT NULL
-- - ลำดับเลือก: ORDER BY priority DESC, created_at ASC, id ASC
-- - Deterministic: priority ไม่ซ้ำใน routing scope เดียวกัน (partial unique indexes)

-- =====================================================
-- Idempotency Behavior
-- =====================================================
-- - orders.idempotency_key: สร้างจาก order_{order_uuid}:topup
-- - Stable สำหรับ retry เดิม (ไม่สร้างใหม่ทุก retry)
-- - Backward-compatible: nullable, order เดิมไม่กระทบ

-- =====================================================
-- สิ่งที่ Migration นี้ "ยังไม่ทำ"
-- =====================================================
-- - ไม่ encrypt ข้อมูล (จะทำใน server-side)
-- - ไม่เปลี่ยน production order flow (ยังใช้ mock provider)
-- - ไม่เพิ่ม data seed (จะทำใน STEP 3 ต่อๆ ไป)
-- - ไม่สร้าง RLS policies (จะทำแยกใน migration 025)
-- - ไม่ทำ automatic failover เมื่อ provider เดิมอยู่สถานะ UNKNOWN/timeout (ต้องตรวจสอบ order เดิมก่อน)
