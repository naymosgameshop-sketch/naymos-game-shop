import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSessionUser } from '@/lib/auth/get-user';

function generateOrderNumber(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `NM${year}${month}${day}${random}`;
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    const body = await request.json();
    const { productId, packageId, customerInfo, customFields, quantity: rawQuantity, agreedToTerms } = body;

    if (!agreedToTerms) {
      return NextResponse.json(
        { success: false, message: 'กรุณายอมรับข้อตกลงก่อนดำเนินการต่อ' },
        { status: 400 }
      );
    }

    if (!productId || !packageId) {
      return NextResponse.json(
        { success: false, message: 'กรุณาเลือกสินค้าและแพ็กเกจที่ต้องการสั่งซื้อ' },
        { status: 400 }
      );
    }

    const quantity = Math.max(1, Math.min(99, parseInt(String(rawQuantity || 1), 10) || 1));
    const adminSupabase = createAdminClient();

    // 1. Validate Product from DB (Active check)
    const { data: product, error: prodErr } = await adminSupabase
      .from('digital_products')
      .select('id, name, is_active, slug')
      .eq('id', productId)
      .maybeSingle();

    if (prodErr || !product) {
      return NextResponse.json(
        { success: false, message: 'ไม่พบสินค้าดิจิทัลนี้' },
        { status: 404 }
      );
    }

    if (!product.is_active) {
      return NextResponse.json(
        { success: false, message: 'สินค้านี้ถูกปิดการขายชั่วคราว' },
        { status: 400 }
      );
    }

    // 2. Validate Package from DB (Active & Availability & Stock check)
    const { data: pkg, error: pkgErr } = await adminSupabase
      .from('digital_product_packages')
      .select('id, name, price, is_active, availability, stock, stock_count')
      .eq('id', packageId)
      .maybeSingle();

    if (pkgErr || !pkg) {
      return NextResponse.json(
        { success: false, message: 'ไม่พบแพ็กเกจที่เลือก' },
        { status: 404 }
      );
    }

    if (!pkg.is_active) {
      return NextResponse.json(
        { success: false, message: 'แพ็กเกจนี้ถูกปิดการขายชั่วคราว' },
        { status: 400 }
      );
    }

    if (pkg.availability === 'out_of_stock' || (typeof pkg.stock === 'number' && pkg.stock <= 0)) {
      return NextResponse.json(
        { success: false, message: 'สินค้านี้หมดสต็อกชั่วคราว' },
        { status: 400 }
      );
    }

    // 3. Verify Provider Mapping exists and is active before creating order
    const { data: route } = await adminSupabase
      .from('provider_routes')
      .select('id, is_active, provider:providers(is_active), provider_product:provider_products(is_active, availability)')
      .eq('target_type', 'DIGITAL_PRODUCT_PACKAGE')
      .eq('target_id', packageId)
      .eq('is_active', true)
      .maybeSingle();

    if (route) {
      const p = route.provider as any;
      const pp = route.provider_product as any;
      if (p && !p.is_active) {
        return NextResponse.json({ success: false, message: 'ระบบจัดส่งต้นทางปิดปรับปรุงชั่วคราว' }, { status: 400 });
      }
      if (pp && (!pp.is_active || pp.availability === 'out_of_stock')) {
        return NextResponse.json({ success: false, message: 'สินค้าต้นทางหมดหรือไม่พร้อมให้บริการ' }, { status: 400 });
      }
    }

    // 4. Server-Side Price Calculation
    const unitPrice = Number(pkg.price);
    const subtotal = unitPrice * quantity;
    const discount = 0;
    const total = subtotal - discount;

    const orderNumber = generateOrderNumber();
    const playerData = {
      product_name: product.name,
      package_name: pkg.name,
      quantity,
      unit_price: unitPrice,
      customer_info: customerInfo || {},
      custom_fields: customFields || {},
      digital_order: true,
      product_type: 'DIGITAL_PRODUCT',
      digital_product_id: product.id,
      digital_package_id: pkg.id,
    };

    // 5. Clean DB Insert without non-existent 'amount' column
    const isFreeOrder = total === 0;
    const nowIso = new Date().toISOString();
    
    // Primary attempt: standard columns with order_type and digital references
    const insertPayload: Record<string, any> = {
      order_number: orderNumber,
      order_type: 'DIGITAL_PRODUCT',
      digital_product_id: product.id,
      digital_package_id: pkg.id,
      user_id: user?.id || null,
      subtotal,
      discount,
      total,
      status: isFreeOrder ? 'PROCESSING' : 'PENDING_PAYMENT',
      payment_confirmed_at: isFreeOrder ? nowIso : null,
      player_data: playerData,
      created_at: nowIso,
      updated_at: nowIso,
    };

    let { data: newOrder, error: insertErr } = await adminSupabase
      .from('orders')
      .insert(insertPayload)
      .select('id, order_number, status, total')
      .maybeSingle();

    // Resilient fallback: if schema cache hasn't synced migration 040 columns, insert baseline orders fields
    if (insertErr && (insertErr.message?.includes('schema cache') || insertErr.code === 'PGRST204' || insertErr.code === '42703')) {
      console.warn('Retrying order creation with baseline schema fallback:', insertErr.message);
      const fallbackPayload = {
        order_number: orderNumber,
        user_id: user?.id || null,
        subtotal,
        discount,
        total,
        status: isFreeOrder ? 'PROCESSING' : 'PENDING_PAYMENT',
        payment_confirmed_at: isFreeOrder ? nowIso : null,
        player_data: playerData,
        created_at: nowIso,
        updated_at: nowIso,
      };

      const fallbackRes = await adminSupabase
        .from('orders')
        .insert(fallbackPayload)
        .select('id, order_number, status, total')
        .maybeSingle();

      if (!fallbackRes.error && fallbackRes.data) {
        newOrder = fallbackRes.data;
        insertErr = null;
      }
    }

    if (insertErr || !newOrder) {
      console.error('Order creation DB error:', insertErr);
      return NextResponse.json(
        { success: false, message: 'ไม่สามารถสร้างคำสั่งซื้อได้ กรุณาลองใหม่อีกครั้ง' },
        { status: 500 }
      );
    }

    if (newOrder && isFreeOrder) {
      await adminSupabase.from('payments').insert({
        order_id: newOrder.id,
        provider: 'free_test',
        payment_reference: `FREE-${orderNumber}`,
        amount: 0,
        status: 'PAID',
        expires_at: null,
      });
    }

    return NextResponse.json({
      success: true,
      order_id: newOrder.id,
      order_number: newOrder.order_number,
      payment_url: `/pay/${newOrder.order_number}`,
      message: 'สร้างคำสั่งซื้อสำเร็จ กำลังพาไปหน้าชำระเงิน...',
    });
  } catch (error) {
    console.error('Digital order creation API error:', error);
    return NextResponse.json(
      { success: false, message: 'เกิดข้อผิดพลาดในการประมวลผลคำสั่งซื้อ' },
      { status: 500 }
    );
  }
}
