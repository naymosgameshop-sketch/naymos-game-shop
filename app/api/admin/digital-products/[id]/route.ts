import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/get-user';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { MOCK_DIGITAL_PRODUCTS } from '@/lib/digital-products/queries';

export const dynamic = 'force-dynamic';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function getSupabase() {
  try {
    return createAdminClient();
  } catch {
    return await createClient();
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const supabase = await getSupabase();
    const body = await req.json();
    const { id } = await params;

    let targetId = id;

    // If non-UUID or mock item, check if it exists in DB by slug
    if (!UUID_REGEX.test(id)) {
      const slug = id.replace(/^mock-prod-/, '');
      const { data: existing } = await supabase
        .from('digital_products')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();

      if (existing) {
        targetId = existing.id;
      } else {
        // Find mock item to persist into database first
        const mock = MOCK_DIGITAL_PRODUCTS.find((p) => p.id === id || p.slug === slug);
        if (mock) {
          const { data: created } = await supabase
            .from('digital_products')
            .insert({
              name: mock.name,
              slug: mock.slug,
              description: mock.description,
              icon: body.icon || mock.icon || '',
              category_type: mock.category_type || 'PREMIUM_APP',
              is_active: true,
              sort_order: mock.sort_order || 0,
            })
            .select()
            .single();

          if (created) {
            targetId = created.id;
          }
        }
      }
    }

    const {
      name,
      slug,
      category_id,
      category_type,
      description,
      icon,
      banner,
      is_active,
      sort_order,
    } = body;

    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
    if (name !== undefined) updateData.name = name;
    if (slug !== undefined) updateData.slug = slug;
    if (category_id !== undefined) updateData.category_id = category_id || null;
    if (category_type !== undefined) updateData.category_type = category_type;
    if (description !== undefined) updateData.description = description;
    if (icon !== undefined) updateData.icon = icon;
    if (banner !== undefined) updateData.banner = banner;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (sort_order !== undefined) updateData.sort_order = sort_order;

    if (UUID_REGEX.test(targetId)) {
      const { data: updatedProd, error } = await supabase
        .from('digital_products')
        .update(updateData)
        .eq('id', targetId)
        .select()
        .maybeSingle();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json({ success: true, product: updatedProd });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Unauthorized' }, { status: 401 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const supabase = await getSupabase();
    const { id } = await params;
    const url = new URL(req.url);
    const slugQuery = url.searchParams.get('slug') || '';

    let targetId = id;
    let targetSlug = slugQuery;

    // Handle mock id or non-UUID id
    if (!UUID_REGEX.test(id)) {
      targetSlug = slugQuery || id.replace(/^mock-prod-/, '');
      const { data: existing } = await supabase
        .from('digital_products')
        .select('id')
        .eq('slug', targetSlug)
        .maybeSingle();

      if (existing) {
        targetId = existing.id;
      } else {
        // If the table was never seeded with this mock, seed the OTHER mock items
        // so they have real records in DB, while skipping this deleted item completely
        for (const mock of MOCK_DIGITAL_PRODUCTS) {
          if (mock.id === id || mock.slug === targetSlug) continue;
          
          const { data: created } = await supabase
            .from('digital_products')
            .upsert({
              name: mock.name,
              slug: mock.slug,
              description: mock.description,
              icon: mock.icon || '',
              category_type: mock.category_type || 'PREMIUM_APP',
              is_active: true,
              sort_order: mock.sort_order || 0,
            }, { onConflict: 'slug' })
            .select()
            .maybeSingle();

          if (created && mock.packages) {
            for (const pkg of mock.packages) {
              const { data: existPkg } = await supabase
                .from('digital_product_packages')
                .select('id')
                .eq('digital_product_id', created.id)
                .eq('name', pkg.name)
                .maybeSingle();

              if (!existPkg) {
                await supabase.from('digital_product_packages').insert({
                  digital_product_id: created.id,
                  name: pkg.name,
                  duration: pkg.duration || '30 วัน',
                  price: Number(pkg.price) || 0,
                  reseller_price: pkg.reseller_price ? Number(pkg.reseller_price) : null,
                  cost: pkg.cost ? Number(pkg.cost) : 0,
                  is_active: true,
                  sort_order: pkg.sort_order || 1,
                });
              }
            }
          }
        }
        return NextResponse.json({ success: true, message: 'ลบแอปสำเร็จ' });
      }
    }

    if (UUID_REGEX.test(targetId)) {
      // 1. Get package IDs for this product to clean up provider routes
      const { data: pkgs } = await supabase
        .from('digital_product_packages')
        .select('id')
        .eq('digital_product_id', targetId);

      const pkgIds = (pkgs || []).map((p: any) => p.id);
      if (pkgIds.length > 0) {
        await supabase
          .from('provider_routes')
          .delete()
          .eq('target_type', 'DIGITAL_PRODUCT_PACKAGE')
          .in('target_id', pkgIds);
      }

      // 2. Delete packages
      await supabase.from('digital_product_packages').delete().eq('digital_product_id', targetId);

      // 3. Delete fields
      await supabase.from('digital_product_fields').delete().eq('digital_product_id', targetId);

      // 4. Delete product
      const { error } = await supabase.from('digital_products').delete().eq('id', targetId);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    return NextResponse.json({ success: true, message: 'ลบแอปสำเร็จ' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Unauthorized' }, { status: 401 });
  }
}
