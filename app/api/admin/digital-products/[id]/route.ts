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
      image_url,
      banner,
      is_active,
      sort_order,
      metadata,
      packages,
    } = body;

    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
    if (name !== undefined) updateData.name = name;
    if (slug !== undefined) updateData.slug = slug;
    if (category_id !== undefined) updateData.category_id = category_id || null;
    if (category_type !== undefined) updateData.category_type = category_type;
    if (description !== undefined) updateData.description = description;
    if (icon !== undefined) updateData.icon = icon;
    if (image_url !== undefined && !updateData.icon) updateData.icon = image_url;
    if (banner !== undefined) updateData.banner = banner;
    if (is_active !== undefined) updateData.is_active = Boolean(is_active);
    if (sort_order !== undefined) updateData.sort_order = sort_order;
    if (metadata !== undefined) updateData.metadata = metadata;

    if (UUID_REGEX.test(targetId)) {
      let { data: updatedProd, error } = await supabase
        .from('digital_products')
        .update(updateData)
        .eq('id', targetId)
        .select()
        .maybeSingle();

      // If icon column doesn't exist, fallback to image_url
      if (error && (error.message?.includes('icon') || error.code === '42703')) {
        const fallbackData = { ...updateData };
        if (fallbackData.icon) {
          fallbackData.image_url = fallbackData.icon;
          delete fallbackData.icon;
        }
        const res2 = await supabase
          .from('digital_products')
          .update(fallbackData)
          .eq('id', targetId)
          .select()
          .maybeSingle();

        if (!res2.error) {
          updatedProd = res2.data;
          error = null;
        }
      }

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      // If packages are sent, update package prices / names
      if (Array.isArray(packages) && packages.length > 0) {
        for (const pkg of packages) {
          if (pkg.id && UUID_REGEX.test(pkg.id)) {
            const pkgUpdate: Record<string, any> = { updated_at: new Date().toISOString() };
            if (pkg.price !== undefined) pkgUpdate.price = Number(pkg.price);
            if (pkg.name !== undefined) pkgUpdate.name = pkg.name;
            if (pkg.duration !== undefined) pkgUpdate.duration = pkg.duration;
            if (pkg.is_active !== undefined) pkgUpdate.is_active = Boolean(pkg.is_active);

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
        // If it's an API app (e.g. app-finshop-1 or app-byshop-10)
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
      let pkgIds: string[] = [];
      const { data: pkgs1 } = await supabase
        .from('digital_product_packages')
        .select('id')
        .eq('digital_product_id', targetId);

      if (pkgs1 && pkgs1.length > 0) {
        pkgIds = pkgs1.map((p: any) => p.id);
      } else {
        const { data: pkgs2 } = await supabase
          .from('digital_product_packages')
          .select('id')
          .eq('product_id', targetId);
        if (pkgs2) pkgIds = pkgs2.map((p: any) => p.id);
      }

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
        .or(`digital_product_id.eq.${targetId},product_id.eq.${targetId}`);

      // 3. Delete fields
      await supabase.from('digital_product_fields').delete().eq('digital_product_id', targetId);

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
