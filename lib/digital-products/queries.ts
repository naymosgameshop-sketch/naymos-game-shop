import { createPublicClient, createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
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

export const MOCK_DIGITAL_PRODUCTS: DigitalProduct[] = [];

async function getSupabaseClient() {
  try {
    return createPublicClient() || (await createClient());
  } catch {
    try {
      return await createClient();
    } catch {
      try {
        return createAdminClient();
      } catch {
        return null;
      }
    }
  }
}

export async function getDigitalProductCategories(): Promise<DigitalProductCategory[]> {
  try {
    const supabase = await getSupabaseClient();
    if (!supabase) return MOCK_DIGITAL_CATEGORIES;

    const { data, error } = await supabase
      .from('digital_product_categories')
      .select('*')
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
    let supabase = await getSupabaseClient();
    if (!supabase) return [];

    // 1. Fetch active digital products
    let { data: prods, error: prodErr } = await supabase
      .from('digital_products')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    // If RLS blocked public client, try admin client
    if ((prodErr || !prods) && typeof createAdminClient === 'function') {
      try {
        const adminSupabase = createAdminClient();
        const resAdmin = await adminSupabase
          .from('digital_products')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true });
        if (resAdmin.data) {
          prods = resAdmin.data;
          prodErr = null;
          supabase = adminSupabase;
        }
      } catch {}
    }

    if (prodErr || !prods || prods.length === 0) {
      return [];
    }

    const prodIds = prods.map((p: any) => p.id);

    // 2. Fetch packages for these products
    let allPackages: any[] = [];
    try {
      const { data: pkgs1 } = await supabase
        .from('digital_product_packages')
        .select('*')
        .eq('is_active', true);
      if (pkgs1 && pkgs1.length > 0) {
        allPackages = pkgs1;
      }
    } catch {}

    // 3. Fetch fields if present
    let allFields: any[] = [];
    try {
      const { data: flds } = await supabase
        .from('digital_product_fields')
        .select('*')
        .order('sort_order', { ascending: true });
      if (flds) allFields = flds;
    } catch {}

    // Group packages and fields by product ID
    return prods.map((p: any) => {
      const pId = p.id;
      const matchedPkgs = allPackages.filter(
        (pkg: any) => (pkg.digital_product_id === pId || pkg.product_id === pId) && pkg.is_active !== false
      );

      const pkgs: DigitalProductPackage[] = matchedPkgs.map((pkg: any) => ({
        id: pkg.id,
        digital_product_id: pId,
        name: pkg.name,
        duration: pkg.duration || (pkg.duration_days ? `${pkg.duration_days} วัน` : '30 วัน'),
        price: Number(pkg.price) || 0,
        reseller_price: pkg.reseller_price ? Number(pkg.reseller_price) : null,
        cost: pkg.cost ? Number(pkg.cost) : 0,
        is_active: pkg.is_active !== false,
        sort_order: pkg.sort_order || 0,
      }));

      const matchedFields = allFields.filter(
        (fld: any) => fld.digital_product_id === pId || fld.product_id === pId
      );

      const minPrice = pkgs.length > 0
        ? pkgs.reduce((min, cur) => (cur.price < min ? cur.price : min), pkgs[0]?.price ?? 0)
        : 0;

      const iconUrl = p.icon || p.image_url || '';

      return {
        ...p,
        icon: iconUrl,
        image_url: iconUrl,
        category_type: p.category_type || 'PREMIUM_APP',
        description: p.description || '',
        packages: pkgs,
        fields: matchedFields,
        minPrice,
      };
    });
  } catch (err) {
    console.error('Error in getActiveDigitalProducts:', err);
    return [];
  }
}
