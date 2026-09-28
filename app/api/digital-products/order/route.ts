import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/get-user';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateOrderNumber } from '@/lib/orders/order-number';
import { MOCK_DIGITAL_PRODUCTS } from '@/lib/digital-products/queries';

export const dynamic = 'force-dynamic';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function getSupabase() {
  try {
    return createAdminClient();
  } catch {
    return await createClient();
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    const body = await req.json();
    const {
      packageId,
      quantity = 1,
      contactEmail,
      contactPhone,
      notes,
      customFields = {},
    } = body;

    if (!packageId) {
      return NextResponse.json({ error: 'กรุณาเลือกแพ็กเกจที่ต้องการสั่งซื้อ' }, { status: 400 });
    }

    const qty = Math.max(1, Math.min(99, Math.floor(Number(quantity) || 1)));

    const supabase = await getSupabase();
    let pkg: any = null;
    let prod: any = null;

    if (UUID_REGEX.test(packageId)) {
      const { data: dbPkg, error: pkgErr } = await supabase
        .from('digital_product_packages')
        .select('*, product:digital_products(*)')
        .eq('id', packageId)
        .maybeSingle();

      if (!pkgErr && dbPkg) {
        pkg = dbPkg;
        prod = dbPkg.product;
      }
    }

    // Fallback search in mock data if DB row not found (e.g. preview mode)
    if (!pkg) {
      for (const p of MOCK_DIGITAL_PRODUCTS) {
        const found = p.packages?.find((k) => k.id === packageId);
        if (found) {
          pkg = found;
          prod = p;
          break;
        }
      }
    }

    if (!pkg) {
      return NextResponse.json({ error: 'ไม่พบแพ็กเกจที่เลือก หรือสินค้านี้ปิดให้บริการชั่วคราว' }, { status: 404 });
    }

    const orderNumber = generateOrderNumber();
    const unitPrice = Number(pkg.price) || 0;
    const subtotal = unitPrice * qty;
    const discount = 0;
    const total = subtotal - discount;

    const playerData = {
      type: 'DIGITAL_PRODUCT',
      product_id: prod?.id || pkg.digital_product_id,
      product_name: prod?.name || 'แอปพรีเมียม',
      package_id: pkg.id,
      package_name: pkg.name,
      duration: pkg.duration || '',
      quantity: qty,
      unit_price: unitPrice,
      contact_email: contactEmail || user?.email || '',
      contact_phone: contactPhone || '',
      notes: notes || '',
      custom_fields: customFields,
      created_via: 'digital_storefront',
    };

    // Create Order with clean schema - NO fake game_id or fake product_id
    const orderPayload: Record<string, any> = {
      order_number: orderNumber,
      order_type: 'DIGITAL_PRODUCT',
      user_id: user?.id || null,
      digital_product_id: UUID_REGEX.test(prod?.id) ? prod.id : null,
      digital_package_id: UUID_REGEX.test(pkg?.id) ? pkg.id : null,
      subtotal,
      discount,
      total,
      amount: total,
      status: 'PENDING_PAYMENT',
      player_data: playerData,
    };

    let { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert({
        ...orderPayload,
        contact_email: contactEmail || user?.email || null,
        contact_phone: contactPhone || null,
      })
      .select()
      .maybeSingle();

    // Resilient fallback if optional columns are absent in older cached schemas
    if (orderErr) {
      console.warn('First order insert attempt failed, attempting fallback payload:', orderErr.message);

      // Attempt fallback without digital_product_id / digital_package_id if migration 040 is not yet applied
      const fallbackPayload = {
        order_number: orderNumber,
        user_id: user?.id || null,
        subtotal,
        discount,
        total,
        amount: total,
        status: 'PENDING_PAYMENT',
        player_data: playerData,
      };

      const retry = await supabase
        .from('orders')
        .insert(fallbackPayload)
        .select()
        .maybeSingle();

      if (!retry.error && retry.data) {
        order = retry.data;
        orderErr = null;
      } else {
        console.error('All order insert attempts failed:', retry.error || orderErr);
        // Friendly client error message - never expose internal DB columns or SQL errors
        return NextResponse.json({ 
          error: 'ไม่สามารถสร้างคำสั่งซื้อได้ กรุณาลองใหม่อีกครั้ง หรือติดต่อแอดมิน' 
        }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      order: {
        id: order?.id,
        order_number: orderNumber,
        product_name: prod?.name || 'แอปพรีเมียม',
        package_name: pkg.name,
        price: total,
        status: 'PENDING_PAYMENT',
        redirect_url: `/pay/${orderNumber}`,
      },
      message: 'สร้างคำสั่งซื้อสำเร็จ กรุณาชำระเงิน',
    });
  } catch (err: any) {
    console.error('Digital order creation exception:', err);
    return NextResponse.json({ 
      error: 'ระบบขัดข้องชั่วคราว ไม่สามารถสร้างคำสั่งซื้อได้' 
    }, { status: 500 });
  }
}
