import { createAdminClient } from '@/lib/supabase/admin';
import { fulfillOrder } from '@/lib/fulfillment/fulfill-order';
import { awardPointsForOrder } from '@/lib/points/queries';
import { notifyUser } from '@/lib/notifications/queries';

export type ProcessTopupResult = {
  success: boolean;
  message: string;
  order_status?: string;
  transaction_id?: string;
};

/**
 * Unified Game Topup Processor using Central Fulfillment Engine.
 * Replaces legacy MockProvider with Central Provider Routing & Idempotency.
 */
export async function processTopupForOrder(
  orderNumber: string
): Promise<ProcessTopupResult> {
  const num = orderNumber.trim().toUpperCase();
  if (!num) return { success: false, message: 'ไม่มีหมายเลขออเดอร์' };

  const supabase = createAdminClient();

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, order_number, status, product_id, order_type, player_data, total, provider_transaction_id, user_id')
    .eq('order_number', num)
    .maybeSingle();

  if (orderError || !order) {
    return {
      success: false,
      message: orderError?.message ?? 'ไม่พบออเดอร์ หรือไม่มีสิทธิ์อ่าน',
    };
  }

  if (order.status === 'SUCCESS' || order.status === 'COMPLETED') {
    return {
      success: true,
      message: 'ออเดอร์นี้ดำเนินการสำเร็จแล้ว',
      order_status: 'SUCCESS',
      transaction_id: order.provider_transaction_id ?? undefined,
    };
  }

  // Reject if it is a digital product order being routed to game process-topup
  if (order.order_type === 'DIGITAL_PRODUCT' && !order.product_id) {
    return {
      success: false,
      message: 'ออเดอร์นี้เป็นประเภทสินค้าดิจิทัล/แอป ต้องดำเนินการผ่าน Digital Fulfillment เท่านั้น',
      order_status: order.status,
    };
  }

  // Route through Central Fulfillment Engine
  const fulfillmentResult = await fulfillOrder(order.id);

  if (fulfillmentResult.success) {
    if (order.user_id) {
      try {
        await awardPointsForOrder(order.id);
      } catch {
        /* best-effort */
      }
      try {
        await notifyUser(
          order.user_id,
          'ออเดอร์สำเร็จ',
          `ออเดอร์ ${order.order_number} ดำเนินการสำเร็จแล้ว`,
          `/order-tracking?number=${order.order_number}`,
          'success'
        );
      } catch {
        /* best-effort */
      }
    }

    return {
      success: true,
      message: 'ดำเนินการเติมเกมสำเร็จเรียบร้อย',
      order_status: 'SUCCESS',
      transaction_id: fulfillmentResult.reference_id,
    };
  }

  return {
    success: false,
    message: fulfillmentResult.error || 'การดำเนินการผ่านผู้ให้บริการไม่สำเร็จ',
    order_status: fulfillmentResult.status,
    transaction_id: fulfillmentResult.reference_id,
  };
}
