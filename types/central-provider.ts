export type ProviderType = 'GAME_TOPUP' | 'PREMIUM_APP' | 'DIGITAL_PRODUCT' | 'ALL';
export type ProviderHealthStatus = 'HEALTHY' | 'DEGRADED' | 'DOWN' | 'UNKNOWN';
export type ApiTransactionStatus = 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'UNKNOWN' | 'CANCELLED';

export interface CentralProvider {
  id: string;
  name: string;
  code: string;
  type: ProviderType;
  api_base_url?: string | null;
  is_active: boolean;
  priority: number;
  balance: number;
  currency: string;
  health_status: ProviderHealthStatus;
  last_check_at?: string | null;
  supported_types: string[];
}

export interface ProviderRoute {
  id: string;
  target_type: 'GAME_PRODUCT' | 'DIGITAL_PRODUCT_PACKAGE';
  target_id: string;
  provider_id: string;
  provider_product_id?: string | null;
  priority: number;
  is_active: boolean;
}

export interface ApiTransaction {
  id: string;
  order_id?: string | null;
  order_number?: string | null;
  provider_id?: string | null;
  target_type?: string | null;
  target_id?: string | null;
  provider_product_id?: string | null;
  request_payload?: Record<string, unknown> | null;
  response_payload?: Record<string, unknown> | null;
  provider_order_id?: string | null;
  status: ApiTransactionStatus;
  cost?: number | null;
  error_message?: string | null;
  created_at: string;
  completed_at?: string | null;
}
