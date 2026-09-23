import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/get-user';
import { createClient } from '@/lib/supabase/server';
import { resolveActiveRoute, createApiTransaction, recordApiLog } from '@/lib/providers/central-router';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    const body = await req.json();
    const { packageId, customFields = {} } = body;

    if (!packageId) {
      return NextResponse.json({ error: 'packageId is required' }, { status: 400 });
    }

    const supabase = await createClient();

    // 1. Fetch package and parent product
    const { data: pkg, error: pkgErr } = await supabase
      .from('digital_product_packages')
      .select('*, product:digital_products(*)')
      .eq('id', packageId)
      .single();

    if (pkgErr || !pkg || !pkg.is_active) {
      return NextResponse.json({ error: 'ไม่พบสินค้าหรือสินค้านี้ปิดให้บริการชั่วคราว' }, { status: 404 });
    }

    // 2. Resolve Provider Route via Central Router
    const route = await resolveActiveRoute('DIGITAL_PRODUCT_PACKAGE', pkg.id);

    // 3. Create API transaction record safely
    let transaction = null;
    if (route) {
      transaction = await createApiTransaction({
        routeId: route.id,
        providerId: route.provider_id,
        targetType: 'DIGITAL_PRODUCT_PACKAGE',
        targetId: pkg.id,
        requestPayload: {
          package_name: pkg.name,
          product_name: pkg.product?.name,
          customer_fields: customFields,
          user_id: user?.id || null,
        },
      });

      await recordApiLog({
        transactionId: transaction?.id,
        providerId: route.provider_id,
        endpoint: '/api/v1/fulfill',
        direction: 'OUTBOUND',
        requestPayload: { target: pkg.name, status: 'QUEUED' },
      });
    }

    return NextResponse.json({
      success: true,
      product: {
        id: pkg.product?.id,
        name: pkg.product?.name,
        package: pkg.name,
        price: pkg.price,
      },
      hasProviderRoute: !!route,
      transactionId: transaction?.id || null,
      message: 'สร้างรายการคำสั่งซื้อเรียบร้อยแล้ว',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
