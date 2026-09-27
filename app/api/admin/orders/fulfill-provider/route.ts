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

    if (!orderId) {
      return NextResponse.json({ success: false, message: 'กรุณาระบุ Order ID' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // 1. Fetch Order
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle();

    if (orderErr || !order) {
      return NextResponse.json({ success: false, message: 'ไม่พบออเดอร์' }, { status: 404 });
    }

    const playerData = (order.player_data as Record<string, any>) || {};
    const packageId = playerData.package_id;

    // 2. Lookup Provider Product mapping
    let deliveredText = body.delivered_info || '';
    let apiSuccess = false;
    let apiError = '';

    // Check if connected to a Provider (e.g. FinShop or BYShop)
    const { data: provProduct } = await supabase
      .from('provider_products')
      .select('*, provider:providers(*)')
      .eq('is_active', true)
      .ilike('name', `%${playerData.product_name || ''}%`)
      .maybeSingle();

    if (provProduct && provProduct.provider?.api_key) {
      const apiKey = provProduct.provider.api_key;
      const baseUrl = provProduct.provider.api_base_url || 'https://finshop.me/api/v1';

      try {
        const purchaseRes = await fetch(`${baseUrl.replace(/\/$/, '')}/purchase`, {
          method: 'POST',
          headers: {
            'X-API-Key': apiKey,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            product_id: provProduct.external_product_code,
            customer: order.order_number,
          }),
        });

        const purchaseData = await purchaseRes.json().catch(() => null);
        if (purchaseRes.ok && purchaseData?.status === 'success') {
          apiSuccess = true;
          const info = purchaseData.data?.product_info || purchaseData.data?.info || JSON.stringify(purchaseData.data);
          deliveredText = info;
          playerData.provider_order_id = purchaseData.data?.transaction_id || purchaseData.data?.id;
          playerData.provider_name = provProduct.provider.name;
        } else {
          apiError = purchaseData?.message || 'API ตอบกลับล้มเหลว';
        }
      } catch (err: any) {
        apiError = err.message || 'เกิดข้อผิดพลาดในการเรียก Provider API';
      }
    }

    // Fallback if manual text was provided or no provider
    if (!deliveredText && !apiSuccess) {
      if (body.manual_delivery) {
        deliveredText = body.manual_delivery;
      } else {
        // If API failed and no manual text, return error so admin knows
        if (apiError) {
          return NextResponse.json({ 
            success: false, 
            message: `ยิง API สั่งซื้อไม่สำเร็จ: ${apiError} (คุณสามารถใส่ข้อมูลส่งมอบแบบแมนนวลได้)` 
          }, { status: 400 });
        }
        deliveredText = 'ดำเนินการส่งมอบสินค้าเรียบร้อยแล้ว ติดต่อแอดมินหากมีปัญหาการใช้งาน';
      }
    }

    const now = new Date().toISOString();
    playerData.delivered_info = deliveredText;
    playerData.delivered_at = now;
    playerData.verified_by_admin = adminUser.id;

    const { error: updateErr } = await supabase
      .from('orders')
      .update({
        status: 'SUCCESS',
        payment_confirmed_at: order.payment_confirmed_at || now,
        completed_at: now,
        completed_admin_id: adminUser.id,
        player_data: playerData,
        updated_at: now,
      })
      .eq('id', orderId);

    if (updateErr) {
      return NextResponse.json({ success: false, message: updateErr.message }, { status: 500 });
    }

    // Notify customer
    if (order.user_id) {
      try {
        await supabase.from('notifications').insert({
          user_id: order.user_id,
          title: 'จัดส่งสินค้าสำเร็จแล้ว',
          message: `ออเดอร์ ${order.order_number} (${playerData.product_name || 'สินค้าดิจิทัล'}) จัดส่งเรียบร้อยแล้ว ตรวจสอบรหัสได้ที่ประวัติการสั่งซื้อ`,
          link: `/account/orders`,
          type: 'order_completed',
        });
      } catch {
        /* best effort */
      }
    }

    return NextResponse.json({
      success: true,
      message: 'ยืนยันการโอนเงินและส่งมอบสินค้าให้ลูกค้าเรียบร้อยแล้ว',
      delivered_info: deliveredText,
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e.message || 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}
