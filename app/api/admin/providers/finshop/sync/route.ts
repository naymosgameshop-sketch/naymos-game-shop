import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { providerRegistry } from '@/lib/providers/central-registry';
import { CentralProvider } from '@/types/central-provider';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Check admin authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin' && profile?.role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get FinShop provider
    const { data: provider, error: pErr } = await supabase
      .from('providers')
      .select('*')
      .eq('code', 'finshop')
      .maybeSingle();

    if (pErr || !provider) {
      return NextResponse.json({ error: 'ไม่พบ Provider FinShop ในระบบ' }, { status: 404 });
    }

    if (!provider.api_key && !process.env.FINSHOP_API_KEY) {
      return NextResponse.json(
        { error: 'ยังไม่ได้ตั้งค่า FinShop API Key กรุณาระบุ API Key ในการตั้งค่า Provider ก่อนทำการ Sync' },
        { status: 400 }
      );
    }

    const adapter = providerRegistry.getAdapter(provider as CentralProvider);
    const result = await adapter.execute({
      action: 'get_products',
      payload: {},
    });

    if (!result.success || !Array.isArray(result.data)) {
      return NextResponse.json(
        { error: result.error || 'ไม่สามารถดึงข้อมูลสินค้าจาก FinShop ได้' },
        { status: 502 }
      );
    }

    const products = result.data;
    const upsertRows = products.map((item: any) => ({
      provider_id: provider.id,
      external_product_code: String(item.product_id),
      external_name: item.product_name || `Product #${item.product_id}`,
      cost: Number(item.price) || 0,
      is_active: false, // Default is_active = false until mapped and enabled by admin
      metadata: {
        stock: item.stock ?? null,
        product_img: item.product_img || null,
        product_info: item.product_info || '',
        synced_at: new Date().toISOString(),
      },
      updated_at: new Date().toISOString(),
    }));

    if (upsertRows.length > 0) {
      const { error: upsertErr } = await supabase
        .from('provider_products')
        .upsert(upsertRows, {
          onConflict: 'provider_id,external_product_code',
        });

      if (upsertErr) {
        return NextResponse.json({ error: upsertErr.message }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      synced_count: upsertRows.length,
      products: upsertRows.map((r: any) => ({
        external_code: r.external_product_code,
        name: r.external_name,
        cost: r.cost,
        stock: r.metadata.stock,
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
