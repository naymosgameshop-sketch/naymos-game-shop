import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: provider } = await supabase
      .from('providers')
      .select('id')
      .eq('code', 'finshop')
      .maybeSingle();

    if (!provider) {
      return NextResponse.json({ products: [] });
    }

    const { data: products, error } = await supabase
      .from('provider_products')
      .select('*')
      .eq('provider_id', provider.id)
      .order('external_product_code', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ products: products || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
