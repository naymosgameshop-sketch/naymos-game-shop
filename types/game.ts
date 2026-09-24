export type GameFieldType = 'text' | 'number' | 'select' | 'password';

export type ProviderAvailability = 'available' | 'out_of_stock' | 'provider_error' | 'unavailable' | 'unknown';

export interface GameField {
  id: string;
  game_id: string;
  key?: string;
  name: string;
  label: string;
  type: GameFieldType;
  placeholder?: string;
  required: boolean;
  options?: string[];
  sort_order: number;
}

export interface ProductCategory {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface Game {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  banner?: string | null;
  category?: string | null;
  product_category_id?: string | null;
  product_category?: ProductCategory | null;
  is_active: boolean; // Storefront Visibility: true = visible, false = hidden
  provider_availability?: ProviderAvailability; // Provider Availability: available, out_of_stock, provider_error, etc.
  provider_error_message?: string | null;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
  game_fields?: GameField[];
}

export interface Product {
  id: string;
  game_id: string;
  name: string;
  description?: string | null;
  amount?: number | null;
  currency: string;
  price: number; // NayMos Selling Price
  cost: number; // Provider Cost
  reseller_price?: number | null;
  provider_product_id?: string | null;
  is_active: boolean; // Storefront Visibility for Package: true = active, false = disabled
  availability?: ProviderAvailability; // Provider Availability: available, out_of_stock, provider_error, etc.
  stock?: number | null; // Stock count from Provider if supported
  provider_status_reason?: string | null;
  last_provider_check_at?: string | null;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}
