import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSessionUser } from '@/lib/auth/get-user';
import { incrementCouponUsage } from '@/lib/coupons/validate';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const orderNumber = String(body.order_number ?? '').trim().toUpperCase();
    const slipBase64 = body.slip_image || body.slip_url;

    if (!orderNumber) {
      return NextResponse.json({ success: false, message: 'กรุณาระบุหมายเลขออเดอร์' }, { status: 400 });
    }

    if (!slipBase64) {
      return NextResponse.json({ success: false, message: 'กรุณาแนบไฟล์สลิปหลักฐานการโอนเงิน' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: order, error } = await supabase
      .from('orders')
      .select('id, user_id, contact_email, status, player_data')
      .eq('order_number', orderNumber)
      .maybeSingle();

    if (error || !order) {
      return NextResponse.json({ success: false, message: 'ไม่พบหมายเลขออเดอร์นี้' }, { status: 404 });
    }

    // Ownership check: If order has an assigned user_id, verify that the authenticated caller owns it
    const currentUser = await getSessionUser();
    if (order.user_id) {
      if (!currentUser || currentUser.id !== order.user_id) {
        return NextResponse.json({ 
          success: false, 
          message: 'คุณไม่มีสิทธิ์แนบสลิปให้กับออเดอร์ของผู้อื่น กรุณาเข้าสู่ระบบด้วยบัญชีที่สร้างออเดอร์นี้' 
        }, { status: 403 });
      }
    }

    // Only orders in PENDING_PAYMENT or SLIP_REJECTED can attach payment slip
    if (order.status !== 'PENDING_PAYMENT' && order.status !== 'PAYMENT_REJECTED') {
      return NextResponse.json({ 
        success: false, 
        message: `ไม่สามารถแนบสลิปได้ เนื่องจากออเดอร์อยู่ในสถานะ ${order.status}` 
      }, { status: 400 });
    }

    const currentData = (order.player_data as Record<string, unknown>) || {};
    const updatedData = {
      ...currentData,
      slip_attached: true,
      slip_timestamp: new Date().toISOString(),
      _slip_url: String(slipBase64),
      slip_image: String(slipBase64),
      payment_proof_status: 'PENDING_VERIFICATION',
    };

    const now = new Date().toISOString();
    
    // Status moves to QUEUED with verification requirement (or SLIP_UPLOADED)
    // We update status to QUEUED so it shows in the Admin queue for verification & processing
    const { error: updateErr } = await supabase
      .from('orders')
      .update({
        status: 'QUEUED',
        payment_method: 'PROMPTPAY',
        payment_confirmed_at: now,
        player_data: updatedData,
        updated_at: now,
      })
      .eq('id', order.id);

    if (updateErr) {
      return NextResponse.json({ success: false, message: 'ไม่สามารถอัปเดตสถานะได้' }, { status: 500 });
    }

    // Commit coupon usage if coupon was applied to this order
    const couponId = currentData._coupon_id as string | undefined;
    if (couponId) {
      try {
        await incrementCouponUsage(couponId);
      } catch {}
    }

    return NextResponse.json({ 
      success: true, 
      message: 'แนบหลักฐานสลิปเรียบร้อยแล้ว ออเดอร์ของคุณเข้าสู่ระบบเพื่อรอการตรวจสอบและส่งมอบสินค้าครับ',
      status: 'QUEUED'
    });
  } catch (e) {
    return NextResponse.json({ success: false, message: e instanceof Error ? e.message : 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}
