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
        const mock = MOCK_DIGITAL_PRODUCTS.find((p) => p.id === id || p.slug === slug);
        if (mock) {
          const { data: created } = await supabase
            .from('digital_products')
            .insert({
              name: mock.name,
              slug: mock.slug,
              description: mock.description,
              image_url: body.image_url || mock.icon || '',
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
      description,
      short_description,
      image_url,
      banner_url,
      icon,
      banner,
      is_active,
      sort_order,
      packages,
    } = body;

    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
    if (name !== undefined) updateData.name = name;
    if (slug !== undefined) updateData.slug = slug;
    if (category_id !== undefined) updateData.category_id = category_id || null;
    if (description !== undefined) updateData.description = description;
    if (short_description !== undefined) updateData.short_description = short_description;
    if (image_url !== undefined) updateData.image_url = image_url;
    else if (icon !== undefined) updateData.image_url = icon;
    if (banner_url !== undefined) updateData.banner_url = banner_url;
    else if (banner !== undefined) updateData.banner_url = banner;
    if (is_active !== undefined) updateData.is_active = Boolean(is_active);
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

      // If packages are sent, update package prices / names using valid columns
      if (Array.isArray(packages) && packages.length > 0) {
        for (const pkg of packages) {
          if (pkg.id && UUID_REGEX.test(pkg.id)) {
            const pkgUpdate: Record<string, any> = { updated_at: new Date().toISOString() };
            if (pkg.price !== undefined) pkgUpdate.price = Number(pkg.price);
            if (pkg.name !== undefined) pkgUpdate.name = pkg.name;
            if (pkg.duration_days !== undefined) pkgUpdate.duration_days = parseInt(pkg.duration_days, 10);
            else if (pkg.duration !== undefined) pkgUpdate.duration_days = parseInt(pkg.duration, 10);
            if (pkg.is_active !== undefined) pkgUpdate.is_active = Boolean(pkg.is_active);
            if (pkg.availability !== undefined) pkgUpdate.availability = pkg.availability;

            await supabase
              .from('digital_product_packages')
              .update(pkgUpdate)
              .eq('id', pkg.id);
          }
        }
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

    if (!UUID_REGEX.test(id)) {
      targetSlug = id.replace(/^mock-prod-/, '');
      const { data: existing } = await supabase
        .from('digital_products')
        .select('id, slug')
        .eq('slug', targetSlug)
        .maybeSingle();

      if (existing) {
        targetId = existing.id;
        targetSlug = existing.slug;
      } else {
        return NextResponse.json({ success: true, message: 'Mock item removed' });
      }
    }

    if (UUID_REGEX.test(targetId)) {
      // 0. Get product info before deletion to sync provider_products state
      const { data: prodToDelete } = await supabase
        .from('digital_products')
        .select('id, slug')
        .eq('id', targetId)
        .maybeSingle();

      const slugToDelete = prodToDelete?.slug || targetSlug;

      if (slugToDelete) {
        const match = slugToDelete.match(/^app-[a-z0-9]+-(.+)$/);
        if (match) {
          const extCode = match[1];
          await supabase
            .from('provider_products')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .or(`external_product_code.eq.${extCode},external_product_code.ilike.${extCode}`);
        }
      }

      // 1. Get package IDs for this product to clean up provider routes
      const { data: pkgs } = await supabase
        .from('digital_product_packages')
        .select('id')
        .eq('product_id', targetId);

      const pkgIds = (pkgs || []).map((p: any) => p.id);

      if (pkgIds.length > 0) {
        await supabase
          .from('provider_routes')
          .delete()
          .eq('target_type', 'DIGITAL_PRODUCT_PACKAGE')
          .in('target_id', pkgIds);
      }

      // 2. Delete packages
      await supabase
        .from('digital_product_packages')
        .delete()
        .eq('product_id', targetId);

      // 3. Delete fields
      await supabase.from('digital_product_fields').delete().eq('product_id', targetId);

      // 4. Delete the product itself
      const { error: delErr } = await supabase.from('digital_products').delete().eq('id', targetId);

      if (delErr) {
        return NextResponse.json({ error: delErr.message }, { status: 400 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Unauthorized' }, { status: 401 });
  }
}
