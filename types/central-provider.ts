export type ProviderCategory =
  | 'GAME_TOPUP'
  | 'PREMIUM_APP'
  | 'DIGITAL_PRODUCT'
  | 'PAYMENT'
  | 'AI'
  | 'NOTIFICATION'
  | 'CUSTOM';

export type ProviderEnvironment = 'sandbox' | 'production';

export type ProviderHealthStatus = 'HEALTHY' | 'DEGRADED' | 'DOWN' | 'UNKNOWN';

export type ProviderAvailabilityStatus =
  | 'available'
  | 'out_of_stock'
  | 'provider_error'
  | 'unavailable'
  | 'unknown';

export interface CentralProvider {
  id: string;
  name: string;
  code: string;
  type: string;
  category: ProviderCategory;
  api_base_url: string | null;
  api_key?: string | null;
  api_secret?: string | null;
  credentials_preview?: string | null;
  is_active: boolean;
  is_test_mode: boolean;
  environment: ProviderEnvironment;
  priority: number;
  balance?: number;
  currency?: string;
  health_status: ProviderHealthStatus;
  last_check_at?: string | null;
  health_response_ms?: number | null;
  timeout_ms: number;
  max_retries: number;
  config?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface CentralProviderProduct {
  id: string;
  provider_id: string;
  external_product_code: string;
  external_name: string;
  cost: number;
  stock?: number | null;
  availability: ProviderAvailabilityStatus;
  is_active: boolean;
  metadata?: Record<string, any>;
  last_synced_at?: string;
  error_message?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CentralProviderRoute {
  id: string;
  route_key?: string;
  target_type: 'GAME_PRODUCT' | 'DIGITAL_PRODUCT_PACKAGE';
  target_id: string;
  provider_id: string;
  provider_product_id?: string | null;
  failover_provider_id?: string | null;
  priority: number;
  is_active: boolean;
  timeout_ms?: number;
  max_retries?: number;
  provider?: CentralProvider;
  failover_provider?: CentralProvider;
}

export interface ProviderExecutionRequest {
  provider_id?: string;
  route_key?: string;
  action:
    | 'validate_player'
    | 'topup'
    | 'deliver_package'
    | 'check_balance'
    | 'ping'
    | 'get_products'
    | 'purchase'
    | 'get_history'
    | 'report';
  reference_id?: string;
  payload: Record<string, any>;
  is_sandbox?: boolean;
}

export interface ProviderExecutionResult {
  success: boolean;
  provider_id: string;
  provider_code: string;
  action: string;
  reference_id?: string;
  http_status: number;
  duration_ms: number;
  data?: any;
  error?: string;
  is_failover?: boolean;
  original_error?: string;
}

export interface HealthCheckResult {
  provider_id: string;
  provider_code: string;
  status: ProviderHealthStatus;
  latency_ms: number;
  message?: string;
  checked_at: string;
}
