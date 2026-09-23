import { unstable_cache } from 'next/cache';
import { createPublicClient } from '@/lib/supabase/server';
import type {
  DigitalProduct,
  DigitalProductCategory,
  DigitalProductPackage,
} from '@/types/digital-product';

export const MOCK_DIGITAL_CATEGORIES: DigitalProductCategory[] = [
  {
    id: 'mock-cat-premium-app',
    slug: 'premium-app',
    name: 'แอปพรีเมียม',
    description: 'แอปพรีเมียมรายเดือน/รายปี ลิขสิทธิ์แท้ 100% ใช้งานได้ทันที',
    icon: 'Smartphone',
    is_active: true,
    sort_order: 1,
  },
  {
    id: 'mock-cat-digital-goods',
    slug: 'digital-goods',
    name: 'สินค้าดิจิทัลอื่น ๆ',
    description: 'สินค้าและบริการดิจิทัลคุณภาพสูง',
    icon: 'Package',
    is_active: true,
    sort_order: 2,
  },
  {
    id: 'mock-cat-other',
    slug: 'other',
    name: 'อื่น ๆ ในอนาคต',
    description: 'บริการอื่น ๆ เพิ่มเติมในอนาคต',
    icon: 'Sparkles',
    is_active: true,
    sort_order: 3,
  },
];

export const MOCK_DIGITAL_PRODUCTS: DigitalProduct[] = [
  {
    id: 'mock-prod-youtube',
    category_id: 'mock-cat-premium-app',
    slug: 'youtube-premium',
    name: 'YouTube Premium',
    description: 'ดูวิดีโอไม่มีโฆษณาคั่น ฟังเพลงผ่าน YouTube Music แม้ปิดหน้าจอ',
    category_type: 'PREMIUM_APP',
    icon: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=160&auto=format&fit=crop&q=80',
    banner: null,
    is_active: true,
    sort_order: 1,
    minPrice: 45,
    packages: [
      { id: 'mock-pkg-yt-1m', digital_product_id: 'mock-prod-youtube', name: 'Family Plan 1 เดือน', duration: '30 วัน', price: 45, reseller_price: 39, cost: 30, is_active: true, sort_order: 1 },
      { id: 'mock-pkg-yt-3m', digital_product_id: 'mock-prod-youtube', name: 'Family Plan 3 เดือน', duration: '90 วัน', price: 129, reseller_price: 115, cost: 90, is_active: true, sort_order: 2 },
      { id: 'mock-pkg-yt-1y', digital_product_id: 'mock-prod-youtube', name: 'Family Plan 1 ปี', duration: '365 วัน', price: 490, reseller_price: 440, cost: 360, is_active: true, sort_order: 3 },
    ],
    fields: [
      { id: 'f-yt-email', digital_product_id: 'mock-prod-youtube', name: 'email', label: 'Gmail ที่ต้องการรับสิทธิ์', type: 'email', placeholder: 'example@gmail.com', required: true, sort_order: 1 },
    ],
  },
  {
    id: 'mock-prod-spotify',
    category_id: 'mock-cat-premium-app',
    slug: 'spotify-premium',
    name: 'Spotify Premium',
    description: 'ฟังเพลงไม่จำกัด คุณภาพเสียงระดับสูง ไม่มีโฆษณา ดาวน์โหลดฟังออฟไลน์ได้',
    category_type: 'PREMIUM_APP',
    icon: 'https://images.unsplash.com/photo-1614680376593-902f749f7ffc?w=160&auto=format&fit=crop&q=80',
    banner: null,
    is_active: true,
    sort_order: 2,
    minPrice: 39,
    packages: [
      { id: 'mock-pkg-sp-1m', digital_product_id: 'mock-prod-spotify', name: 'Family Plan 1 เดือน', duration: '30 วัน', price: 39, reseller_price: 35, cost: 25, is_active: true, sort_order: 1 },
      { id: 'mock-pkg-sp-3m', digital_product_id: 'mock-prod-spotify', name: 'Family Plan 3 เดือน', duration: '90 วัน', price: 110, reseller_price: 99, cost: 75, is_active: true, sort_order: 2 },
    ],
    fields: [
      { id: 'f-sp-email', digital_product_id: 'mock-prod-spotify', name: 'email', label: 'Email บัญชี Spotify', type: 'email', placeholder: 'your-spotify@email.com', required: true, sort_order: 1 },
    ],
  },
  {
    id: 'mock-prod-canva',
    category_id: 'mock-cat-premium-app',
    slug: 'canva-pro',
    name: 'Canva Pro',
    description: 'ปลดล็อกรูปภาพ สติกเกอร์ และเทมเพลตระดับ Pro กว่า 100+ ล้านรายการ',
    category_type: 'PREMIUM_APP',
    icon: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=160&auto=format&fit=crop&q=80',
    banner: null,
    is_active: true,
    sort_order: 3,
    minPrice: 59,
    packages: [
      { id: 'mock-pkg-cv-1m', digital_product_id: 'mock-prod-canva', name: 'Canva Pro 1 เดือน', duration: '30 วัน', price: 59, reseller_price: 49, cost: 35, is_active: true, sort_order: 1 },
      { id: 'mock-pkg-cv-1y', digital_product_id: 'mock-prod-canva', name: 'Canva Pro 1 ปี', duration: '365 วัน', price: 299, reseller_price: 259, cost: 180, is_active: true, sort_order: 2 },
    ],
    fields: [
      { id: 'f-cv-email', digital_product_id: 'mock-prod-canva', name: 'email', label: 'Email ที่ใช้สมัคร Canva', type: 'email', placeholder: 'your-canva@email.com', required: true, sort_order: 1 },
    ],
  },
  {
    id: 'mock-prod-netflix',
    category_id: 'mock-cat-premium-app',
    slug: 'netflix-premium',
    name: 'Netflix Premium 4K',
    description: 'รับชมภาพยนตร์และซีรีส์ความคมชัดสูงสุด Ultra HD 4K รองรับทุกอุปกรณ์',
    category_type: 'PREMIUM_APP',
    icon: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=160&auto=format&fit=crop&q=80',
    banner: null,
    is_active: true,
    sort_order: 4,
    minPrice: 129,
    packages: [
      { id: 'mock-pkg-nf-30d', digital_product_id: 'mock-prod-netflix', name: 'จอส่วนตัว 4K (30 วัน)', duration: '30 วัน', price: 129, reseller_price: 119, cost: 95, is_active: true, sort_order: 1 },
    ],
    fields: [
      { id: 'f-nf-phone', digital_product_id: 'mock-prod-netflix', name: 'contact_phone', label: 'เบอร์ติดต่อรับรหัสโปรไฟล์', type: 'text', placeholder: '08X-XXX-XXXX', required: true, sort_order: 1 },
    ],
  },
];

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
      return MOCK_DIGITAL_PRODUCTS;
    }

    return prods.map((p: any) => {
      const pkgs: DigitalProductPackage[] = (p.packages || []).filter((x: any) => x.is_active);
      const minPrice = pkgs.reduce((min, cur) => (cur.price < min ? cur.price : min), pkgs[0]?.price ?? 0);
      return {
        ...p,
        packages: pkgs,
        fields: p.fields || [],
        minPrice,
      };
    });
  } catch {
    return MOCK_DIGITAL_PRODUCTS;
  }
}
