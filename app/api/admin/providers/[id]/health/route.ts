import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { providerRegistry } from '@/lib/providers/central-registry';
import { CentralProvider } from '@/types/central-provider';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: provider, error } = await supabase
      .from('providers')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !provider) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    const adapter = providerRegistry.getAdapter(provider as CentralProvider);
    const health = await adapter.checkHealth();

    // Update health status in database
    await supabase
      .from('providers')
      .update({
        health_status: health.status,
        health_response_ms: health.latency_ms,
        last_health_check_at: health.checked_at,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    return NextResponse.json({ success: true, health });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
