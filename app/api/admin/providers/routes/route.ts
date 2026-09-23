import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: routes, error } = await supabase
      .from('provider_routes')
      .select(`
        *,
        provider:providers!provider_routes_provider_id_fkey(id, name, code, is_active, health_status),
        failover_provider:providers!provider_routes_failover_provider_id_fkey(id, name, code, is_active)
      `)
      .order('priority', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ routes: routes || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await req.json();

    const {
      route_key,
      target_type = 'GAME_PRODUCT',
      target_id,
      provider_id,
      failover_provider_id,
      priority = 1,
      is_active = true,
    } = body;

    if (!provider_id) {
      return NextResponse.json({ error: 'Primary provider is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('provider_routes')
      .insert({
        route_key,
        target_type,
        target_id: target_id || '00000000-0000-0000-0000-000000000000',
        provider_id,
        failover_provider_id: failover_provider_id || null,
        priority: Number(priority) || 1,
        is_active,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, route: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
