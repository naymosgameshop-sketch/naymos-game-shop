import { unstable_cache } from 'next/cache';
import { createPublicClient } from '@/lib/supabase/server';
import type {
  DigitalProduct,
  DigitalProductCategory,
  DigitalProductPackage,
} from '@/types/digital-product';

export const MOCK_DIGITAL_CATEGORIES: DigitalProductCategory[] = [
  {
    id: 'cat-premium-app',
    slug: 'premium-app',
    name: 'แอปพรีเมียม',
    description: 'แอปพรีเมียมรายเดือน/รายปี ลิขสิทธิ์แท้ 100% ใช้งานได้ทันที',
    icon: 'Smartphone',
    is_active: true,
    sort_order: 1,
  },
  {
    id: 'cat-digital-goods',
    slug: 'digital-goods',
    name: 'สินค้าดิจิทัลอื่น ๆ',
    description: 'สินค้าและบริการดิจิทัลคุณภาพสูง',
    icon: 'Package',
    is_active: true,
    sort_order: 2,
  },
];

// Empty mock products - Storefront only displays real products from database/providers
export const MOCK_DIGITAL_PRODUCTS: DigitalProduct[] = [];

export async function getDigitalProductCategories(): Promise<DigitalProductCategory[]> {
  try {
    const supabase = await createPublicClient();
    const { data, error } = await supabase
      .from('digital_product_categories')
      .select('id, slug, name, description, icon, is_active, sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error || !data || data.length === 0) {
      return MOCK_DIGITAL_CATEGORIES;
    }
    return data;
  } catch {
    return MOCK_DIGITAL_CATEGORIES;
  }
}

export async function getActiveDigitalProducts(): Promise<DigitalProduct[]> {
  try {
    const supabase = await createPublicClient();
    const { data: prods, error } = await supabase
      .from('digital_products')
      .select(`
        id, category_id, slug, name, description, category_type, icon, banner, is_active, sort_order,
        packages:digital_product_packages(id, digital_product_id, name, duration, price, reseller_price, cost, is_active, sort_order),
        fields:digital_product_fields(id, digital_product_id, name, label, type, placeholder, required, sort_order)
      `)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error || !prods || prods.length === 0) {
      return [];
    }

    return prods.map((p: any) => {
      const pkgs: DigitalProductPackage[] = (p.packages || []).filter((x: any) => x.is_active);
      const minPrice = pkgs.length > 0
        ? pkgs.reduce((min, cur) => (cur.price < min ? cur.price : min), pkgs[0]?.price ?? 0)
        : 0;
      return {
        ...p,
        packages: pkgs,
        fields: p.fields || [],
        minPrice,
      };
    });
  } catch {
    return [];
  }
}
