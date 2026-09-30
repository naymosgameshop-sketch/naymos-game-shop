import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/get-user';
import { dispatchCentralAction } from '@/lib/providers/central-router';

export const dynamic = 'force-dynamic';

// Allowed safe read-only actions for provider test endpoint
const ALLOWED_TEST_ACTIONS = new Set(['health_check', 'get_balance', 'catalog', 'validate_player']);
const FORBIDDEN_TEST_ACTIONS = new Set(['purchase', 'topup', 'redeem', 'fulfill', 'order', 'buy', 'send']);

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ success: false, message: 'ไม่มีสิทธิ์ Admin' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { provider_id, route_key, action = 'health_check', payload = {} } = body;

    const normalizedAction = String(action).toLowerCase().trim();

    // Enforce action whitelist & reject dangerous purchase/topup actions
    if (FORBIDDEN_TEST_ACTIONS.has(normalizedAction) || !ALLOWED_TEST_ACTIONS.has(normalizedAction)) {
      return NextResponse.json(
        {
          success: false,
          error: 'PROVIDER_TEST_ACTION_NOT_ALLOWED',
          message: 'ไม่อนุญาตให้ทดสอบคำสั่งซื้อ เติมเงิน หรือแลกเปลี่ยนผ่าน Test Endpoint',
        },
        { status: 400 }
      );
    }

    const result = await dispatchCentralAction({
      provider_id,
      route_key,
      action: normalizedAction,
      payload,
      reference_id: ,
      is_sandbox: true,
    });

    return NextResponse.json({ success: true, result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
