import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function getSupabase() {
  try {
    return createAdminClient();
  } catch {
    return await createClient();
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await getSupabase();

    // 1. Resolve Provider
    let query = supabase.from('providers').select('*');
    if (UUID_REGEX.test(id)) {
      query = query.eq('id', id);
    } else {
      const cleanCode = id.toLowerCase() === 'new' ? 'finshop' : id.toLowerCase();
      query = query.eq('code', cleanCode);
    }

    const { data: provider, error: provErr } = await query.maybeSingle();

    if (provErr || !provider) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลผู้ให้บริการนี้' }, { status: 404 });
    }

    const apiKey = provider.api_key;
    if (!apiKey) {
      return NextResponse.json({
        success: true,
        history: [],
        message: 'ยังไม่ได้บันทึก API Key สำหรับผู้ให้บริการนี้',
        provider: { id: provider.id, code: provider.code, name: provider.name },
      });
    }

    const code = (provider.code || '').toLowerCase();
    let rawItems: any[] = [];

    // 2. Fetch history from Provider API securely (Server-Side only)
    if (code === 'byshop') {
      const baseUrl = provider.api_base_url?.replace(/\/$/, '') || 'https://byshop.me/api';
      const formParams = new URLSearchParams();
      formParams.append('keyapi', apiKey);

      try {
        const res = await fetch(`${baseUrl}/history`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: formParams.toString(),
          cache: 'no-store',
        });

        if (res.ok) {
          const body = await res.json().catch(() => null);
          if (Array.isArray(body)) {
            rawItems = body;
          } else if (body && Array.isArray(body.data)) {
            rawItems = body.data;
          } else if (body && body.history && Array.isArray(body.history)) {
            rawItems = body.history;
          }
        }
      } catch {
        // Never log apiKey or sensitive request details
      }

      // If /history returned empty, attempt /history-all fallback
      if (rawItems.length === 0) {
        try {
          const resAll = await fetch(`${baseUrl}/history-all`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formParams.toString(),
            cache: 'no-store',
          });
          if (resAll.ok) {
            const bodyAll = await resAll.json().catch(() => null);
            if (Array.isArray(bodyAll)) {
              rawItems = bodyAll;
            } else if (bodyAll && Array.isArray(bodyAll.data)) {
              rawItems = bodyAll.data;
            }
          }
        } catch {
          // Silent catch to prevent key leaks
        }
      }
    } else if (code === 'finshop') {
      const baseUrl = provider.api_base_url?.replace(/\/$/, '') || 'https://finshop.me/api/v1';
      try {
        const res = await fetch(`${baseUrl}/history?limit=50&offset=0`, {
          method: 'GET',
          headers: {
            'X-API-Key': apiKey,
            Accept: 'application/json',
          },
          cache: 'no-store',
        });

        if (res.ok) {
          const body = await res.json().catch(() => null);
          if (Array.isArray(body)) {
            rawItems = body;
          } else if (body && Array.isArray(body.data)) {
            rawItems = body.data;
          }
        }
      } catch {
        // Never log apiKey
      }
    }

    // 3. Fetch recent customer orders for cross-referencing
    let customerOrders: any[] = [];
    try {
      const { data: orders } = await supabase
        .from('orders')
        .select('id, order_number, user_id, status, total_price, player_data, created_at, guest_email')
        .order('created_at', { ascending: false })
        .limit(100);

      customerOrders = orders || [];
    } catch {
      // Proceed even if orders fetch fails
    }

    // 4. Normalize & Link with Customer Orders
    const normalizedHistory = rawItems.map((item: any, idx: number) => {
      const orderId = String(item.orderid || item.transaction_id || item.id || `TXN-${idx}`);
      const productName = item.name || item.product_name || 'สินค้าดิจิทัล';
      const productInfo = item.info || item.product_info || item.stock_received || '';
      const price = Number(item.price || item.amount || 0);
      const time = item.time || item.created_at || item.date || new Date().toISOString();
      const rawStatus = (item.status || 'success').toString().toLowerCase();
      const customer = item.username_customer || item.customer || '';
      const image = item.img || item.image || item.product_img || null;

      // Status mapping
      let normalizedStatus: 'SUCCESS' | 'PENDING' | 'FAILED' = 'SUCCESS';
      if (rawStatus.includes('fail') || rawStatus.includes('cancel') || rawStatus.includes('error')) {
        normalizedStatus = 'FAILED';
      } else if (rawStatus.includes('wait') || rawStatus.includes('pend') || rawStatus.includes('process')) {
        normalizedStatus = 'PENDING';
      }

      // Match against local customer orders
      const matchedOrder = customerOrders.find((ord: any) => {
        const pData = ord.player_data || {};
        if (pData.provider_order_id && String(pData.provider_order_id) === orderId) return true;
        if (pData.orderid && String(pData.orderid) === orderId) return true;
        if (pData.transaction_id && String(pData.transaction_id) === orderId) return true;
        if (customer && ord.order_number && String(customer).includes(ord.order_number)) return true;
        if (ord.order_number && orderId.includes(ord.order_number)) return true;
        return false;
      });

      return {
        provider_order_id: orderId,
        product_name: productName,
        product_info: productInfo,
        price,
        time,
        status: normalizedStatus,
        raw_status: rawStatus,
        customer,
        image,
        matched_customer_order: matchedOrder
          ? {
              id: matchedOrder.id,
              order_number: matchedOrder.order_number,
              status: matchedOrder.status,
              total_price: matchedOrder.total_price,
              created_at: matchedOrder.created_at,
              customer_identifier: matchedOrder.guest_email || matchedOrder.user_id || 'ลูกค้าหน้าร้าน',
            }
          : null,
      };
    });

    return NextResponse.json({
      success: true,
      history: normalizedHistory,
      total: normalizedHistory.length,
      provider: {
        id: provider.id,
        code: provider.code,
        name: provider.name,
        category: provider.category,
      },
    });
  } catch (err: any) {
    return NextResponse.json({
      error: 'เกิดข้อผิดพลาดในการดึงประวัติคำสั่งซื้อ',
      history: [],
    }, { status: 500 });
  }
}
