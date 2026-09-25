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

  {
    id: 'prod-fin-iqiyi',
    category_id: 'mock-cat-premium-app',
    slug: 'iqiyi-vip-premium',
    name: 'iQIYI VIP Premium 4K',
    description: 'ซีรีส์และภาพยนตร์เอเชียระดับพรีเมียม ความคมชัด 4K ไม่มีโฆษณาคั่น',
    category_type: 'PREMIUM_APP',
    icon: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=160&auto=format&fit=crop&q=80',
    banner: null,
    is_active: true,
    sort_order: 5,
    minPrice: 35,
    packages: [
      { id: 'pkg-fin-26', digital_product_id: 'prod-fin-iqiyi', name: 'iQIYI VIP 4K / 30 วัน (แบบมีจอชน)', duration: '30 วัน', price: 35, reseller_price: 30, cost: 23, is_active: true, sort_order: 1 },
      { id: 'pkg-fin-27', digital_product_id: 'prod-fin-iqiyi', name: 'iQIYI VIP 4K / 30 วัน (แบบจอไม่ชน)', duration: '30 วัน', price: 65, reseller_price: 58, cost: 47, is_active: true, sort_order: 2 },
    ],
    fields: [
      { id: 'f-iqiyi-email', digital_product_id: 'prod-fin-iqiyi', name: 'email', label: 'Email / เบอร์ที่ใช้ล็อกอิน iQIYI', type: 'text', placeholder: 'example@gmail.com', required: true, sort_order: 1 },
    ],
  },
  {
    id: 'prod-fin-wetv',
    category_id: 'mock-cat-premium-app',
    slug: 'wetv-vip',
    name: 'WeTV VIP',
    description: 'รับชมซีรีส์จีนและอนิเมะตอนล่าสุดก่อนใคร ไม่มีโฆษณา รองรับ Full HD',
    category_type: 'PREMIUM_APP',
    icon: 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?w=160&auto=format&fit=crop&q=80',
    banner: null,
    is_active: true,
    sort_order: 6,
    minPrice: 45,
    packages: [
      { id: 'pkg-fin-30', digital_product_id: 'prod-fin-wetv', name: 'WeTV VIP / 30 วัน', duration: '30 วัน', price: 45, reseller_price: 40, cost: 33, is_active: true, sort_order: 1 },
      { id: 'pkg-fin-31', digital_product_id: 'prod-fin-wetv', name: 'WeTV VIP / 90 วัน', duration: '90 วัน', price: 99, reseller_price: 89, cost: 75, is_active: true, sort_order: 2 },
    ],
    fields: [
      { id: 'f-wetv-acc', digital_product_id: 'prod-fin-wetv', name: 'account', label: 'เบอร์มือถือ หรือ WeTV ID', type: 'text', placeholder: '08X-XXX-XXXX', required: true, sort_order: 1 },
    ],
  },
  {
    id: 'prod-fin-viu',
    category_id: 'mock-cat-premium-app',
    slug: 'viu-premium',
    name: 'VIU Premium',
    description: 'ดูซีรีส์เกาหลี พากย์ไทย-ซับไทย คมชัดระดับ Full HD อัปเดตเร็วที่สุด',
    category_type: 'PREMIUM_APP',
    icon: 'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?w=160&auto=format&fit=crop&q=80',
    banner: null,
    is_active: true,
    sort_order: 7,
    minPrice: 25,
    packages: [
      { id: 'pkg-fin-32', digital_product_id: 'prod-fin-viu', name: 'VIU Premium / 30 วัน', duration: '30 วัน', price: 25, reseller_price: 20, cost: 13, is_active: true, sort_order: 1 },
      { id: 'pkg-fin-33', digital_product_id: 'prod-fin-viu', name: 'VIU Premium / 90 วัน', duration: '90 วัน', price: 55, reseller_price: 48, cost: 35, is_active: true, sort_order: 2 },
    ],
    fields: [
      { id: 'f-viu-email', digital_product_id: 'prod-fin-viu', name: 'email', label: 'Email สำหรับรับรหัสหรือลิงก์พรีเมียม', type: 'email', placeholder: 'example@gmail.com', required: true, sort_order: 1 },
    ],
  },
  {
    id: 'prod-fin-disney',
    category_id: 'mock-cat-premium-app',
    slug: 'disney-plus-hotstar',
    name: 'Disney+ (จอส่วนตัว)',
    description: 'Marvel, Disney, Pixar และ Star Wars คุณภาพ 4K HDR รองรับทุกอุปกรณ์',
    category_type: 'PREMIUM_APP',
    icon: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=160&auto=format&fit=crop&q=80',
    banner: null,
    is_active: true,
    sort_order: 8,
    minPrice: 129,
    packages: [
      { id: 'pkg-fin-59', digital_product_id: 'prod-fin-disney', name: 'Disney+ / 30 วัน (จอส่วนตัว รองรับทุกอุปกรณ์)', duration: '30 วัน', price: 129, reseller_price: 119, cost: 99, is_active: true, sort_order: 1 },
    ],
    fields: [
      { id: 'f-disney-phone', digital_product_id: 'prod-fin-disney', name: 'phone', label: 'เบอร์มือถือรับ OTP สิทธิ์ใช้งาน', type: 'text', placeholder: '08X-XXX-XXXX', required: true, sort_order: 1 },
    ],
  },
  {
    id: 'prod-fin-test',
    category_id: 'mock-cat-premium-app',
    slug: 'test-api-product',
    name: 'Test API (สำหรับทดสอบ FinShop)',
    description: 'สินค้าทดสอบการตัดยอดเงินและรับสต็อกอัตโนมัติผ่าน FinShop API Product ID 66',
    category_type: 'PREMIUM_APP',
    icon: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTtDeGtrelq2Phox5_wqtnSmvEYicZtpkZgX5BWlwTjI9MzYTSVFD7DJNVU&s=10',
    banner: null,
    is_active: true,
    sort_order: 99,
    minPrice: 0,
    packages: [
      { id: 'pkg-fin-66', digital_product_id: 'prod-fin-test', name: 'Test API Package (ฟรีทดสอบระบบ)', duration: 'ทดสอบ', price: 0, reseller_price: 0, cost: 0, is_active: true, sort_order: 1 },
    ],
    fields: [
      { id: 'f-test-customer', digital_product_id: 'prod-fin-test', name: 'customer', label: 'ชื่อผู้ใช้งานสำหรับทดสอบ', type: 'text', placeholder: 'customeruser', required: true, sort_order: 1 },
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
