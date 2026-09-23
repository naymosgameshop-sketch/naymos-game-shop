import { NextRequest, NextResponse } from 'next/server';
import { dispatchCentralAction } from '@/lib/providers/central-router';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { provider_id, route_key, action = 'validate_player', payload = {} } = body;

    const result = await dispatchCentralAction({
      provider_id,
      route_key,
      action,
      payload,
      reference_id: `ADMIN-TEST-${Date.now()}`,
      is_sandbox: true,
    });

    return NextResponse.json({ success: true, result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
