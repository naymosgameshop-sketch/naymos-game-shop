import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/get-user';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  let adminUser;
  try {
    adminUser = await requireAdmin();
  } catch {
    return NextResponse.json({ success: false, message: 'ไม่มีสิทธิ์ Admin' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const orderId = body.id || body.orderId;
    const fulfilledItems = body.fulfilled_items || [];

    if (!orderId) {
      return NextResponse.json({ success: false, message: 'กรุณาระบุ Order ID' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Verify order is currently in PROCESSING status and check order_type
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('id, order_number, status, player_data, user_id, order_type')
      .eq('id', orderId)
      .maybeSingle();

    if (orderErr || !order) {
      return NextResponse.json({ success: false, message: 'ไม่พบออเดอร์' }, { status: 404 });
    }

    // P0: DIGITAL PRODUCT ห้าม MANUAL SUCCESS (Enforce strictly on backend)
    if (order.order_type === 'DIGITAL_PRODUCT' || (order as any).digital_package_id || (order.player_data as any)?.digital_order) {
      return NextResponse.json({
        success: false,
        message: 'สินค้าดิจิทัลไม่สามารถกดเสร็จสิ้นด้วยตนเองได้ ต้องดำเนินการจัดส่งผ่าน Provider Fulfillment เท่านั้น',
      }, { status: 400 });
    }

    if (order.status !== 'PROCESSING') {
      return NextResponse.json({ 
        success: false, 
        message: `ออเดอร์ต้องอยู่ในสถานะกำลังดำเนินการเติม (สถานะปัจจุบัน: ${order.status})` 
      }, { status: 400 });
    }

    // Try RPC first
    const { data: rpcData, error: rpcErr } = await supabase.rpc('admin_complete_order', {
      p_order_id: orderId,
      p_admin_id: adminUser.id,
      p_fulfilled_items: fulfilledItems,
    });

    if (!rpcErr && rpcData && typeof rpcData === 'object' && (rpcData as any).success) {
      return NextResponse.json(rpcData);
    }

    // Direct atomic update fallback for GAME_TOPUP only
    const now = new Date().toISOString();
    const pd = (order.player_data as Record<string, any>) || {};
    pd._fulfilled_items = fulfilledItems;
    pd.completed_by_admin = adminUser.id;

    const { error: updateErr } = await supabase
      .from('orders')
      .update({
        status: 'SUCCESS',
        completed_at: now,
        completed_admin_id: adminUser.id,
        player_data: pd,
        updated_at: now,
      })
      .eq('id', orderId)
      .eq('status', 'PROCESSING');

    if (updateErr) {
      return NextResponse.json({ success: false, message: updateErr.message }, { status: 500 });
    }

    // Insert notification for user if exists
    if (order.user_id) {
      try {
        await supabase.from('notifications').insert({
          user_id: order.user_id,
          title: 'เติมเกมสำเร็จเรียบร้อย',
          message: `ออเดอร์ ${order.order_number} ดำเนินการเติมเกมสำเร็จแล้ว ขอบคุณที่ใช้บริการครับ`,
          link: `/order-tracking?number=${order.order_number}`,
          type: 'order_completed',
        });
      } catch {
        /* best-effort */
      }
    }

    return NextResponse.json({
      success: true,
      message: 'ยืนยันการเติมสำเร็จเรียบร้อยแล้ว',
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, message: e instanceof Error ? e.message : 'เกิดข้อผิดพลาด' },
      { status: 500 }
    );
  }
}
