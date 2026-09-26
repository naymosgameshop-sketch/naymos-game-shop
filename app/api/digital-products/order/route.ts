import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/get-user';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolveActiveRoute, createApiTransaction, recordApiLog } from '@/lib/providers/central-router';
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

    // Create Order in DB
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        user_id: user?.id || null,
        guest_email: contactEmail || user?.email || null,
        guest_phone: contactPhone || null,
        amount: price,
        status: 'PENDING_PAYMENT',
        player_data: playerData,
      })
      .select()
      .maybeSingle();

    if (orderErr) {
      console.error('Create digital order DB error:', orderErr);
      return NextResponse.json({ error: 'ไม่สามารถสร้างคำสั่งซื้อได้: ' + orderErr.message }, { status: 500 });
    }

    // Provider integration (if connected)
    let transaction = null;
    if (UUID_REGEX.test(pkg.id)) {
      try {
        const route = await resolveActiveRoute('DIGITAL_PRODUCT_PACKAGE', pkg.id);
        if (route) {
          transaction = await createApiTransaction({
            routeId: route.id,
            providerId: route.provider_id,
            targetType: 'DIGITAL_PRODUCT_PACKAGE',
            targetId: pkg.id,
            orderId: order?.id,
            orderNumber: orderNumber,
            requestPayload: {
              package_name: pkg.name,
              product_name: prod?.name,
              customer_fields: {
                email: contactEmail || user?.email,
                phone: contactPhone,
                notes,
                ...customFields,
              },
              user_id: user?.id || null,
            },
          });

          await recordApiLog({
            transactionId: transaction?.id,
            providerId: route.provider_id,
            endpoint: '/api/v1/purchase',
            direction: 'OUTBOUND',
            requestPayload: { target: pkg.name, order_number: orderNumber, status: 'QUEUED' },
          });
        }
      } catch (provErr) {
        console.warn('Provider routing deferred:', provErr);
      }
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
