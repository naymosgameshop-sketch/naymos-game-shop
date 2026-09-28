import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/get-user';
import { fulfillOrder } from '@/lib/fulfillment/fulfill-order';

export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ success: false, message: 'ไม่มีสิทธิ์ Admin' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const orderId = body.id || body.orderId;

    if (!orderId) {
      return NextResponse.json({ success: false, message: 'กรุณาระบุ Order ID' }, { status: 400 });
    }

    const result = await fulfillOrder(orderId);
    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.error || 'การสั่งซื้อผ่าน Provider ล้มเหลว', result },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'ส่งมอบสินค้าสำเร็จเรียบร้อย',
      result,
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, message: e instanceof Error ? e.message : 'เกิดข้อผิดพลาดในการส่งมอบสินค้า' },
      { status: 500 }
    );
  }
}
