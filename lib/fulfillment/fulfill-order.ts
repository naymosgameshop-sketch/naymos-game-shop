import { createAdminClient } from '@/lib/supabase/admin';
import { dispatchCentralAction } from '@/lib/providers/central-router';
import type { ProviderExecutionRequest, ProviderExecutionResult } from '@/types/central-provider';

export interface FulfillmentResult {
  success: boolean;
  order_id: string;
  order_number: string;
  status: string;
  provider_id?: string;
  reference_id: string;
  delivered_info?: string;
  error?: string;
}

/**
 * Central Idempotent Order Fulfillment Service
 * Lifecycle:
 * 1. Verify order payment (PAID / QUEUED)
 * 2. Idempotency check: prevent duplicate purchase if already fulfilled
 * 3. Resolve exact external provider product ID mapping (FinShop / BYShop / etc.)
 *    NEVER pass NayMos internal UUID to FinShop!
 *    NO generic PREMIUM_APP fallback!
 * 4. Generate unique reference_id (NMS-{order_number}-{order_id})
 * 5. Dispatch provider purchase through Central Router
 * 6. Record transaction & update order status safely (SUCCESS / PROVIDER_ERROR / UNKNOWN)
 */
export async function fulfillOrder(orderId: string): Promise<FulfillmentResult> {
  const supabase = createAdminClient();

  // 1. Fetch order
  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .select('*, items:order_items(*)')
    .eq('id', orderId)
    .maybeSingle();

  if (orderErr || !order) {
    return {
      success: false,
      order_id: orderId,
      order_number: '',
      status: 'NOT_FOUND',
      reference_id: '',
      error: 'ไม่พบหมายเลขคำสั่งซื้อนี้',
    };
  }

  const orderNumber = order.order_number;
  const referenceId = `NMS-${orderNumber}-${order.id.slice(0, 8)}`;

  // 2. State & Idempotency check:
  if (order.status === 'SUCCESS' || order.status === 'COMPLETED') {
    const deliveredInfo = (order.player_data as any)?.delivered_info || '';
    return {
      success: true,
      order_id: order.id,
      order_number: orderNumber,
      status: order.status,
      reference_id: referenceId,
      delivered_info: deliveredInfo,
    };
  }

  // Must have payment confirmed
  const validPaymentStatuses = ['PAID', 'QUEUED', 'PROCESSING'];
  if (!validPaymentStatuses.includes(order.status)) {
    return {
      success: false,
      order_id: order.id,
      order_number: orderNumber,
      status: order.status,
      reference_id: referenceId,
      error: `ออเดอร์ยังไม่ได้รับการชำระเงิน (สถานะปัจจุบัน: ${order.status})`,
    };
  }

  // Check if an existing SUCCESS transaction exists with this reference_id
  const { data: existingTx } = await supabase
    .from('api_transactions')
    .select('id, status, response_payload_sanitized')
    .eq('reference_id', referenceId)
    .maybeSingle();

  if (existingTx && existingTx.status === 'SUCCESS') {
    const now = new Date().toISOString();
    await supabase
      .from('orders')
      .update({
        status: 'SUCCESS',
        updated_at: now,
      })
      .eq('id', order.id);

    return {
      success: true,
      order_id: order.id,
      order_number: orderNumber,
      status: 'SUCCESS',
      reference_id: referenceId,
    };
  }

  // Mark PROCESSING to lock order
  await supabase
    .from('orders')
    .update({
      status: 'PROCESSING',
      updated_at: new Date().toISOString(),
    })
    .eq('id', order.id)
    .in('status', ['PAID', 'QUEUED']);

  // 3. Resolve exact Provider Mapping
  let targetProviderId: string | null = null;
  let externalProductCode: string | null = null;
  let targetRouteKey: string | null = null;
  const playerData = (order.player_data as Record<string, any>) || {};

  const isDigital = order.order_type === 'DIGITAL_PRODUCT' || !!order.digital_package_id;

  if (isDigital && order.digital_package_id) {
    // P0: FULFILLMENT ROUTING - Strict package mapping, NO generic fallback
    const { data: route, error: routeErr } = await supabase
      .from('provider_routes')
      .select('*, provider:providers(*), provider_product:provider_products(*)')
      .eq('target_type', 'DIGITAL_PRODUCT_PACKAGE')
      .eq('target_id', order.digital_package_id)
      .eq('is_active', true)
      .order('priority', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (route && route.provider && route.provider_product) {
      if (!route.provider.is_active) {
        return markProviderError(supabase, order.id, orderNumber, referenceId, 'ผู้ให้บริการ (Provider) อยู่ในสถานะปิดการใช้งาน');
      }
      if (!route.provider_product.is_active) {
        return markProviderError(supabase, order.id, orderNumber, referenceId, 'สินค้าของผู้ให้บริการปิดการใช้งานอยู่');
      }
      if (route.provider_product.availability === 'out_of_stock' || route.provider_product.availability === 'unavailable') {
        return markProviderError(supabase, order.id, orderNumber, referenceId, 'สินค้าของผู้ให้บริการหมดสต็อกหรือยังไม่พร้อมจัดส่ง');
      }

      targetProviderId = route.provider_id;
      externalProductCode = route.provider_product.external_product_code || route.provider_product.provider_product_id;
      targetRouteKey = route.route_key;
    }
  } else if (order.product_id) {
    // Game top-up route lookup
    const { data: gameRoute } = await supabase
      .from('provider_routes')
      .select('*, provider:providers(*), provider_product:provider_products(*)')
      .eq('target_type', 'GAME_PRODUCT')
      .eq('target_id', order.product_id)
      .eq('is_active', true)
      .order('priority', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (gameRoute && gameRoute.provider && gameRoute.provider_product) {
      if (gameRoute.provider.is_active && gameRoute.provider_product.is_active) {
        targetProviderId = gameRoute.provider_id;
        externalProductCode = gameRoute.provider_product.external_product_code || gameRoute.provider_product.provider_product_id;
        targetRouteKey = gameRoute.route_key;
      }
    }
  }

  // Reject execution if provider product mapping is missing or invalid
  if (!targetProviderId || !externalProductCode) {
    const errorMsg = 'ยังไม่ได้ตั้งค่าคู่สินค้า (Product Mapping) ของ Provider สำหรับสินค้านี้';
    return markProviderError(supabase, order.id, orderNumber, referenceId, errorMsg);
  }

  // 4. Dispatch Provider Purchase with EXTERNAL product code
  const executionReq: ProviderExecutionRequest = {
    provider_id: targetProviderId,
    route_key: targetRouteKey || undefined,
    action: 'purchase',
    reference_id: referenceId,
    payload: {
      order_id: order.id,
      order_number: orderNumber,
      product_id: externalProductCode,
      provider_product_id: externalProductCode,
      customer: order.contact_email || order.user_id || 'customer',
      player_data: playerData,
    },
  };

  const dispatchResult: ProviderExecutionResult = await dispatchCentralAction(executionReq);

  // 5. Update Order according to Provider Execution
  if (dispatchResult.success) {
    const deliveredInfo = dispatchResult.data?.stock_received || 
                          dispatchResult.data?.delivered_info || 
                          dispatchResult.data?.info || 
                          dispatchResult.data?.code || 
                          'จัดส่งสินค้าสำเร็จเรียบร้อย';

    const updatedPlayerData = {
      ...playerData,
      delivered_info: deliveredInfo,
      provider_transaction_id: dispatchResult.reference_id || referenceId,
      fulfilled_at: new Date().toISOString(),
    };

    await supabase
      .from('orders')
      .update({
        status: 'SUCCESS',
        player_data: updatedPlayerData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id);

    return {
      success: true,
      order_id: order.id,
      order_number: orderNumber,
      status: 'SUCCESS',
      provider_id: targetProviderId,
      reference_id: referenceId,
      delivered_info: deliveredInfo,
    };
  } else {
    // P0: UNKNOWN on timeout / network ambiguity
    const isTimeout = dispatchResult.error?.toLowerCase().includes('timeout') || dispatchResult.http_status === 504;
    const finalStatus = isTimeout ? 'UNKNOWN' : 'PROVIDER_ERROR';

    await supabase
      .from('orders')
      .update({
        status: finalStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id);

    return {
      success: false,
      order_id: order.id,
      order_number: orderNumber,
      status: finalStatus,
      provider_id: targetProviderId,
      reference_id: referenceId,
      error: dispatchResult.error || (isTimeout ? 'เกิดความล่าช้าในการตอบกลับจาก Provider (สถานะ UNKNOWN - ต้องตรวจสอบประวัติก่อนลองใหม่)' : 'การสั่งซื้อผ่านผู้ให้บริการขัดข้อง'),
    };
  }
}

async function markProviderError(supabase: any, orderId: string, orderNumber: string, referenceId: string, errorMsg: string): Promise<FulfillmentResult> {
  await supabase
    .from('orders')
    .update({
      status: 'PROVIDER_ERROR',
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId);

  return {
    success: false,
    order_id: orderId,
    order_number: orderNumber,
    status: 'PROVIDER_ERROR',
    reference_id: referenceId,
    error: errorMsg,
  };
}
