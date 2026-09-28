import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { paymentManager } from './payment-manager';
import { getStoreSettings } from '@/lib/admin/settings';

export type EnsurePaymentResult =
  | {
      success: true;
      order_number: string;
      order_status: string;
      amount: number;
      payment_status: string;
      payment_reference: string | null;
      qr_data: string | null;
      expires_at: string | null;
      game_name?: string;
      product_name?: string;
    }
  | { success: false; message: string };

export async function ensurePaymentForOrder(
  orderNumber: string
): Promise<EnsurePaymentResult> {
  const num = orderNumber.trim().toUpperCase();
  if (!num) return { success: false, message: 'ไม่มีหมายเลขออเดอร์' };

  const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : await createClient();

  const { data: rpcRows } = await supabase.rpc('get_payment_for_order', {
    p_order_number: num,
  });
  const rpc = Array.isArray(rpcRows) ? rpcRows[0] : rpcRows;

  let orderId: string | null = rpc?.order_id ?? null;
  let orderStatus: string = rpc?.order_status ?? '';
  let amount: number = rpc?.amount != null ? Number(rpc.amount) : 0;
  let gameId: string | null = rpc?.game_id ?? null;
  let productId: string | null = rpc?.product_id ?? null;
  let orderData: any = null;

  {
    const { data: orderRows } = await supabase.rpc('get_order_by_number', {
      p_order_number: num,
    });
    const order = Array.isArray(orderRows) ? orderRows[0] : orderRows;
    if (!order && !orderId) {
      // Direct query fallback
      const { data: directOrder } = await supabase
        .from('orders')
        .select('*')
        .eq('order_number', num)
        .maybeSingle();
      if (!directOrder) {
        return { success: false, message: 'ไม่พบออเดอร์' };
      }
      orderData = directOrder;
      orderId = directOrder.id;
      orderStatus = directOrder.status;
      amount = Number(directOrder.total || directOrder.amount || 0);
      gameId = directOrder.game_id;
      productId = directOrder.product_id;
    } else if (order) {
      orderData = order;
      orderId = orderId ?? order.id;
      orderStatus = orderStatus || order.status;
      const orderTotal = Number(order.total || order.amount || 0);
      if (!amount || amount === 0) {
        amount = orderTotal;
      }
      gameId = gameId ?? order.game_id;
      productId = productId ?? order.product_id;
    }
  }

  if (!orderId) {
    return { success: false, message: 'ไม่พบออเดอร์' };
  }

  // Resolve display names for game topup OR digital products
  let resolvedGameName: string | undefined = undefined;
  let resolvedProductName: string | undefined = undefined;

  const playerData = (orderData?.player_data as Record<string, any>) || {};
  if (playerData.product_name) {
    resolvedGameName = 'แอปพรีเมียม / สินค้าดิจิทัล';
    resolvedProductName = `${playerData.product_name} - ${playerData.package_name || ''}`;
  } else if (gameId || productId) {
    const [{ data: game }, { data: product }] = await Promise.all([
      gameId ? supabase.from('games').select('name').eq('id', gameId).maybeSingle() : Promise.resolve({ data: null }),
      productId ? supabase.from('products').select('name').eq('id', productId).maybeSingle() : Promise.resolve({ data: null }),
    ]);
    resolvedGameName = game?.name;
    resolvedProductName = product?.name;
  }

  if (rpc?.payment_id && rpc.payment_status === 'PENDING') {
    return {
      success: true,
      order_number: num,
      order_status: orderStatus,
      amount,
      payment_status: rpc.payment_status,
      payment_reference: rpc.payment_reference,
      qr_data: rpc.qr_data,
      expires_at: rpc.expires_at,
      game_name: resolvedGameName,
      product_name: resolvedProductName,
    };
  }

  if (orderStatus !== 'PENDING_PAYMENT') {
    return {
      success: false,
      message: `ออเดอร์ไม่อยู่ในสถานะรอชำระ (สถานะ: ${orderStatus})`,
    };
  }

  if (amount === undefined || amount === null || isNaN(amount) || amount < 0) {
    return { success: false, message: 'ยอดออเดอร์ไม่ถูกต้อง' };
  }

  // Handle 0-baht (Free / Test) orders
  if (amount === 0) {
    if (orderStatus === 'PENDING_PAYMENT') {
      const now = new Date().toISOString();
      await supabase
        .from('orders')
        .update({
          status: 'PROCESSING',
          payment_confirmed_at: now,
          updated_at: now,
        })
        .eq('id', orderId);

      await supabase.from('payments').insert({
        order_id: orderId,
        provider: 'free_test',
        payment_reference: `FREE-${num}`,
        amount: 0,
        status: 'PAID',
      });
      orderStatus = 'PROCESSING';
    }

    return {
      success: true,
      order_number: num,
      order_status: orderStatus,
      amount: 0,
      payment_status: 'PAID',
      payment_reference: `FREE-${num}`,
      qr_data: null,
      expires_at: null,
      game_name: resolvedGameName,
      product_name: resolvedProductName,
    };
  }

  const storeSettings = await getStoreSettings();
  const provider = paymentManager.getDefault();
  const created = await provider.createPayment({
    orderId,
    amount,
    orderNumber: num,
    expiresInMinutes: 30,
    promptpayId: storeSettings.promptpay_id,
  });

  const { error } = await supabase.from('payments').insert({
    order_id: orderId,
    provider: created.payment.provider ?? provider.id,
    payment_reference: created.payment.payment_reference,
    amount,
    status: 'PENDING',
    qr_data: created.qrData,
    expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  });

  if (error) {
    return { success: false, message: 'บันทึกการชำระเงินไม่สำเร็จ' };
  }

  return {
    success: true,
    order_number: num,
    order_status: orderStatus,
    amount,
    payment_status: 'PENDING',
    payment_reference: created.payment.payment_reference ?? null,
    qr_data: created.qrData ?? null,
    expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    game_name: resolvedGameName,
    product_name: resolvedProductName,
  };
}
