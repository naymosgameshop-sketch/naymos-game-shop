import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/get-user';
import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const supabase = await createServerClient();

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
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ products });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const supabase = await createServerClient();
    const body = await req.json();

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
      return NextResponse.json({ error: 'Name and Slug are required' }, { status: 400 });
    }

    // 1. Insert product
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

    // 2. Insert packages if any
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

      const { error: pkgErr } = await supabase
        .from('digital_product_packages')
        .insert(packageRows);

      if (pkgErr) {
        console.error('Failed to insert packages:', pkgErr);
      }
    }

    // 3. Insert fields if any
    if (fields.length > 0) {
      const fieldRows = fields.map((f: any, idx: number) => ({
        digital_product_id: newProd.id,
        name: f.name,
        label: f.label,
        type: f.type || 'text',
        placeholder: f.placeholder || null,
        required: f.required ?? true,
        sort_order: f.sort_order ?? idx,
      }));

      const { error: fldErr } = await supabase
        .from('digital_product_fields')
        .insert(fieldRows);

      if (fldErr) {
        console.error('Failed to insert fields:', fldErr);
      }
    }

    return NextResponse.json({ success: true, product: newProd });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Unauthorized' }, { status: 401 });
  }
}
