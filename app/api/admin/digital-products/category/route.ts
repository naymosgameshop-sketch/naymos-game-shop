import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/get-user';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || `dcat-${Date.now()}`;
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ success: false, message: 'ไม่มีสิทธิ์ Admin' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const name = String(body.name || '').trim();
    if (!name) {
      return NextResponse.json({ success: false, message: 'ต้องระบุชื่อหมวดหมู่' }, { status: 400 });
    }

    const slug = body.slug ? slugify(String(body.slug)) : slugify(name);
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('digital_product_categories')
      .insert({
        name,
        slug,
        description: body.description || null,
        sort_order: Number(body.sort_order) || 0,
        is_active: body.is_active !== undefined ? Boolean(body.is_active) : true,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, category: data });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('digital_product_categories')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) {
      return NextResponse.json({ success: false, categories: [] });
    }
    return NextResponse.json({ success: true, categories: data || [] });
  } catch {
    return NextResponse.json({ success: false, categories: [] });
  }
}
