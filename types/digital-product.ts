export type ProductType = 'GAME_TOPUP' | 'DIGITAL_PRODUCT' | 'PREMIUM_APP' | 'OTHER';

export interface DigitalProductCategory {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface DigitalProductPackage {
  id: string;
  digital_product_id: string;
  name: string;
  duration?: string | null;
  price: number;
  reseller_price?: number | null;
  cost?: number | null;
  is_active: boolean;
  sort_order: number;
}

export interface DigitalProductField {
  id: string;
  digital_product_id: string;
  name: string;
  label: string;
  type: 'text' | 'email' | 'password';
  placeholder?: string | null;
  required: boolean;
  sort_order: number;
}

export interface DigitalProduct {
  id: string;
  category_id?: string | null;
  slug: string;
  name: string;
  description?: string | null;
  category_type: 'PREMIUM_APP' | 'DIGITAL_PRODUCT' | 'OTHER';
  icon?: string | null;
  banner?: string | null;
  is_active: boolean;
  sort_order: number;
  packages: DigitalProductPackage[];
  fields: DigitalProductField[];
  minPrice: number;
}
