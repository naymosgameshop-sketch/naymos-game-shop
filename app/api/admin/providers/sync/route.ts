import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { providerRegistry } from '@/lib/providers/central-registry';
import { CentralProvider } from '@/types/central-provider';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const supabase = await createClient();

    // Verify admin
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

    const body = await req.json().catch(() => ({}));
    const providerCode = body.code || 'finshop';

    const { data: provider, error: pErr } = await supabase
      .from('providers')
      .select('*')
      .eq('code', providerCode)
      .maybeSingle();

    if (pErr || !provider) {
      return NextResponse.json({ error: `ไม่พบ Provider code: ${providerCode} ในระบบ` }, { status: 404 });
    }

    const adapter = providerRegistry.getAdapter(provider as CentralProvider);
    if (!adapter) {
      return NextResponse.json({ error: `ไม่พบ Adapter สำหรับ Provider: ${providerCode}` }, { status: 400 });
    }

    // Execute get_products via Central Adapter
    const result = await adapter.execute({
      action: 'get_products',
      payload: body.payload || {},
      is_sandbox: provider.is_test_mode,
    });

    const duration = Date.now() - startTime;

    if (!result.success || !result.data) {
      // Mark provider health as DOWN and update error reason without deleting any products
      await supabase
        .from('providers')
        .update({
          health_status: 'DOWN',
          health_response_ms: duration,
          last_health_check_at: new Date().toISOString(),
          config: {
            ...(provider.config || {}),
            last_sync_error: result.error || 'Connection failed',
            last_sync_attempt: new Date().toISOString(),
          },
        })
        .eq('id', provider.id);

      // Mark linked provider products as provider_error
      await supabase
        .from('provider_products')
        .update({
          availability: 'provider_error',
          error_message: result.error || 'Provider connection error',
          last_synced_at: new Date().toISOString(),
        })
        .eq('provider_id', provider.id);

      return NextResponse.json({
        success: false,
        error: result.error || 'Provider API เกิดข้อผิดพลาดในการดึงรายการสินค้า',
        provider: provider.name,
        code: provider.code,
        duration_ms: duration,
      }, { status: 502 });
    }

    const rawList = Array.isArray(result.data)
      ? result.data
      : (result.data?.products || result.data?.data || []);

    let syncedCount = 0;
    const syncedExternalCodes: string[] = [];

    for (const item of rawList) {
      const externalCode = String(item.id || item.code || item.product_id || item.external_id || '');
      if (!externalCode) continue;

      syncedExternalCodes.push(externalCode);
      const externalName = String(item.name || item.title || `Product ${externalCode}`);
      const cost = Number(item.price || item.cost || item.amount || 0);
      const stock = item.stock !== undefined && item.stock !== null ? Number(item.stock) : null;
      
      let availability: 'available' | 'out_of_stock' | 'unavailable' = 'available';
      if (item.is_active === false || item.status === 'inactive' || item.status === 'disabled') {
        availability = 'unavailable';
      } else if (stock !== null && stock <= 0) {
        availability = 'out_of_stock';
      }

      // Upsert into provider_products (Preserving NayMos products, never overwriting NayMos selling price)
      const { data: ppData, error: ppErr } = await supabase
        .from('provider_products')
        .upsert(
          {
            provider_id: provider.id,
            external_product_code: externalCode,
            external_name: externalName,
            cost: cost,
            stock: stock,
            availability: availability,
            is_active: availability === 'available',
            metadata: item,
            last_synced_at: new Date().toISOString(),
            error_message: null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'provider_id,external_product_code' }
        )
        .select('id')
        .single();

      if (!ppErr && ppData) {
        syncedCount++;

        // Update linked NayMos products: updates cost and stock, BUT NEVER OVERWRITES selling price!
        await supabase
          .from('products')
          .update({
            cost: cost,
            stock: stock,
            availability: availability,
            last_provider_check_at: new Date().toISOString(),
          })
          .eq('provider_product_id', ppData.id);
      }
    }

    // For any previously synced provider products that were not returned in this sync:
    // Mark them unavailable/unknown without deleting them!
    if (syncedExternalCodes.length > 0) {
      await supabase
        .from('provider_products')
        .update({
          availability: 'unknown',
          error_message: 'Not found in latest sync response',
          updated_at: new Date().toISOString(),
        })
        .eq('provider_id', provider.id)
        .not('external_product_code', 'in', `(${syncedExternalCodes.map((c) => `"${c}"`).join(',')})`);
    }

    // Update Provider record health
    await supabase
      .from('providers')
      .update({
        health_status: 'HEALTHY',
        health_response_ms: duration,
        last_health_check_at: new Date().toISOString(),
        config: {
          ...(provider.config || {}),
          last_sync_success: new Date().toISOString(),
          last_synced_count: syncedCount,
        },
      })
      .eq('id', provider.id);

    return NextResponse.json({
      success: true,
      provider: provider.name,
      code: provider.code,
      total_received: rawList.length,
      synced_count: syncedCount,
      duration_ms: duration,
      synced_at: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message || 'Internal server error while syncing provider',
    }, { status: 500 });
  }
}
