import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/get-user';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { MOCK_DIGITAL_PRODUCTS } from '@/lib/digital-products/queries';

export const dynamic = 'force-dynamic';

async function getSupabase() {
  try {
    return createAdminClient();
  } catch {
    return await createClient();
  }
}

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const supabase = await getSupabase();

    const { data: products, error } = await supabase
      .from('digital_products')
      .select(`
        *,
        category:digital_product_categories(*),
        packages:digital_product_packages(*),
        fields:digital_product_fields(*)
      `)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Fetch digital products error:', error);
      // Fallback to mock products so backoffice matches storefront
      return NextResponse.json({
        products: MOCK_DIGITAL_PRODUCTS.map(p => ({ ...p, is_mock: true })),
        is_mock: true,
      });
    }

    if (!products || products.length === 0) {
      // Return default mock products matching storefront
      return NextResponse.json({
        products: MOCK_DIGITAL_PRODUCTS.map(p => ({ ...p, is_mock: true })),
        is_mock: true,
      });
    }

    return NextResponse.json({ products, is_mock: false });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const supabase = await getSupabase();
    const body = await req.json();

    // 1. Action: Seed default mock products into database
    if (body.action === 'seed_defaults') {
      let insertedCount = 0;
      for (const mock of MOCK_DIGITAL_PRODUCTS) {
        const { data: newProd, error: pErr } = await supabase
          .from('digital_products')
          .upsert({
            name: mock.name,
            slug: mock.slug,
            description: mock.description,
            icon: mock.icon || '',
            category_type: mock.category_type || 'PREMIUM_APP',
            is_active: true,
            sort_order: mock.sort_order || 0,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'slug' })
          .select()
          .maybeSingle();

        if (newProd && mock.packages && mock.packages.length > 0) {
          insertedCount++;
          for (const pkg of mock.packages) {
            const { data: existing } = await supabase
              .from('digital_product_packages')
              .select('id')
              .eq('digital_product_id', newProd.id)
              .eq('name', pkg.name)
              .maybeSingle();

            if (!existing) {
              await supabase
                .from('digital_product_packages')
                .insert({
                  digital_product_id: newProd.id,
                  name: pkg.name,
                  duration: pkg.duration || '30 วัน',
                  price: Number(pkg.price) || 0,
                  reseller_price: pkg.reseller_price ? Number(pkg.reseller_price) : null,
                  cost: pkg.cost ? Number(pkg.cost) : 0,
                  is_active: pkg.is_active ?? true,
                  sort_order: pkg.sort_order || 1,
                });
            }
          }
        }
      }

      return NextResponse.json({
        success: true,
        message: `บันทึกแอปเริ่มต้นลงฐานข้อมูลแล้ว (${insertedCount} แอป)`,
      });
    }

    // 2. Normal creation
    const {
      name,
      slug,
      category_id,
      category_type = 'PREMIUM_APP',
      description,
      icon,
      banner,
      is_active = true,
      sort_order = 0,
      packages = [],
      fields = [],
    } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: 'กรุณากรอกชื่อและ Slug' }, { status: 400 });
    }

    const { data: newProd, error: prodErr } = await supabase
      .from('digital_products')
      .insert({
        name,
        slug,
        category_id: category_id || null,
        category_type,
        description,
        icon,
        banner,
        is_active,
        sort_order,
      })
      .select()
      .single();

    if (prodErr) {
      return NextResponse.json({ error: prodErr.message }, { status: 400 });
    }

    if (packages.length > 0) {
      const packageRows = packages.map((pkg: any, idx: number) => ({
        digital_product_id: newProd.id,
        name: pkg.name,
        duration: pkg.duration || null,
        price: Number(pkg.price) || 0,
        reseller_price: pkg.reseller_price ? Number(pkg.reseller_price) : null,
        cost: pkg.cost ? Number(pkg.cost) : 0,
        is_active: pkg.is_active ?? true,
        sort_order: pkg.sort_order ?? idx,
      }));

      await supabase.from('digital_product_packages').insert(packageRows);
    }

    return NextResponse.json({ success: true, product: newProd });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Unauthorized' }, { status: 401 });
  }
}
