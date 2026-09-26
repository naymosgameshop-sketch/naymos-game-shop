import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/get-user';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();
    const supabase = await createClient();
    const body = await req.json();

    const { id } = params;
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

    const { data: updated, error } = await supabase
      .from('digital_products')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, product: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Unauthorized' }, { status: 401 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();
    const supabase = await createClient();
    const { id } = params;

    // 1. Delete associated fields and packages
    try {
      await supabase.from('digital_product_fields').delete().eq('digital_product_id', id);
    } catch {
      // ignore
    }

    try {
      await supabase.from('digital_product_packages').delete().eq('digital_product_id', id);
    } catch {
      // ignore
    }

    // 2. Delete product record (with fallback to deactivate if foreign key constraints exist)
    const { error: delErr } = await supabase
      .from('digital_products')
      .delete()
      .eq('id', id);

    if (delErr) {
      // Fallback: soft-delete / hide if linked to orders
      await supabase
        .from('digital_products')
        .update({ is_active: false })
        .eq('id', id);
    }

    return NextResponse.json({ success: true, message: 'ลบแอปเรียบร้อยแล้ว' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Unauthorized' }, { status: 401 });
  }
}
