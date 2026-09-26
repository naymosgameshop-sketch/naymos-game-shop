import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/get-user';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

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

    if (!UUID_REGEX.test(id)) {
      return NextResponse.json({ success: true, message: 'บันทึกข้อมูลตัวอย่างสำเร็จ' });
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

    const { data: updatedProd, error } = await supabase
      .from('digital_products')
      .update(updateData)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, product: updatedProd });
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

    // Handle mock / non-UUID items gracefully
    if (!UUID_REGEX.test(id)) {
      return NextResponse.json({ success: true, message: 'ลบแอปตัวอย่างเรียบร้อย' });
    }

    // 1. Get package IDs for this product to clean up provider routes
    const { data: pkgs } = await supabase
      .from('digital_product_packages')
      .select('id')
      .eq('digital_product_id', id);

    const pkgIds = (pkgs || []).map((p: any) => p.id);
    if (pkgIds.length > 0) {
      await supabase
        .from('provider_routes')
        .delete()
        .eq('target_type', 'DIGITAL_PRODUCT_PACKAGE')
        .in('target_id', pkgIds);
    }

    // 2. Delete packages
    await supabase.from('digital_product_packages').delete().eq('digital_product_id', id);

    // 3. Delete fields
    await supabase.from('digital_product_fields').delete().eq('digital_product_id', id);

    // 4. Delete product
    const { error } = await supabase.from('digital_products').delete().eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'ลบแอปสำเร็จ' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Unauthorized' }, { status: 401 });
  }
}
