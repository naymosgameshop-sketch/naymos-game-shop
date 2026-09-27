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

// NOTE: Provider purchase is NOT fired at order creation.
// The real provider API purchase runs only AFTER payment is confirmed
// (admin manual confirm / slip verification) via the central provider router.
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    const body = await req.json();
    const {
      packageId,
      contactEmail,
      contactPhone,
      notes,
      customFields = {},
    } = body;

    if (!packageId) {
      return NextResponse.json({ error: 'กรุณาเลือกแพ็กเกจที่ต้องการสั่งซื้อ' }, { status: 400 });
    }

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
    const price = Number(pkg.price) || 0;

    const playerData = {
      type: 'DIGITAL_PRODUCT',
      product_id: prod?.id || pkg.digital_product_id,
      product_name: prod?.name || 'แอปพรีเมียม',
      package_id: pkg.id,
      package_name: pkg.name,
      duration: pkg.duration || '',
      contact_email: contactEmail || user?.email || '',
      contact_phone: contactPhone || '',
      notes: notes || '',
      custom_fields: customFields,
      created_via: 'digital_storefront',
    };

    // Create Order in DB using standard total/subtotal columns
    const orderPayload: Record<string, any> = {
      order_number: orderNumber,
      user_id: user?.id || null,
      total: price,
      subtotal: price,
      discount: 0,
      status: 'PENDING_PAYMENT',
      player_data: playerData,
    };

    // Try primary insert with contact_email
    let { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert({
        ...orderPayload,
        contact_email: contactEmail || user?.email || null,
        contact_phone: contactPhone || null,
      })
      .select()
      .maybeSingle();

    // If column contact_email fails in cache, fallback to guest_email or core payload
    if (orderErr && (orderErr.message?.includes('contact_email') || orderErr.message?.includes('column'))) {
      const retry1 = await supabase
        .from('orders')
        .insert({
          ...orderPayload,
          guest_email: contactEmail || user?.email || null,
          guest_phone: contactPhone || null,
        })
        .select()
        .maybeSingle();

      if (!retry1.error) {
        order = retry1.data;
        orderErr = null;
      } else {
        const retry2 = await supabase
          .from('orders')
          .insert(orderPayload)
          .select()
          .maybeSingle();
        if (!retry2.error) {
          order = retry2.data;
          orderErr = null;
        }
      }
    }

    if (orderErr) {
      console.error('Create digital order DB error:', orderErr);
      return NextResponse.json({ error: 'ไม่สามารถสร้างคำสั่งซื้อได้: ' + orderErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      order: {
        id: order?.id,
        order_number: orderNumber,
        product_name: prod?.name,
        package_name: pkg.name,
        price: price,
        status: 'PENDING_PAYMENT',
      },
      message: 'สร้างคำสั่งซื้อสำเร็จ กรุณาชำระเงิน',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
