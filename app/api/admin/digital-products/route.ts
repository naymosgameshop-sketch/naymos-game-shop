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
      // Fallback only when database table does not exist or has connection failure
      return NextResponse.json({
        products: MOCK_DIGITAL_PRODUCTS.map(p => ({ ...p, is_mock: true })),
        is_mock: true,
      });
    }

    // If query succeeded: Return actual products from DB.
    // If the table is empty because items were deleted, return [] so deleted items don't resurrect!
    return NextResponse.json({ products: products || [], is_mock: false });
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
        const { data: newProd } = await supabase
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
      short_description,
      description,
      image_url,
      banner_url,
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
        short_description: short_description || null,
        description: description || null,
        image_url: image_url || icon || null,
        banner_url: banner_url || banner || null,
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
        product_id: newProd.id,
        name: pkg.name,
        duration_days: pkg.duration_days ? parseInt(pkg.duration_days, 10) : (pkg.duration ? parseInt(pkg.duration, 10) : null),
        price: Number(pkg.price) || 0,
        stock_type: pkg.stock_type || 'UNLIMITED',
        stock_count: typeof pkg.stock_count === 'number' ? pkg.stock_count : 0,
        delivery_type: pkg.delivery_type || 'MANUAL',
        availability: pkg.availability || 'available',
        stock: typeof pkg.stock === 'number' ? pkg.stock : 999,
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
