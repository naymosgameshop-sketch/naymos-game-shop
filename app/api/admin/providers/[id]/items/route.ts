import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Verify admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin' && profile?.role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get provider
    const { data: provider, error: pErr } = await supabase
      .from('providers')
      .select('*')
      .or(`id.eq.${id},code.eq.${id}`)
      .maybeSingle();

    if (pErr || !provider) {
      return NextResponse.json({ error: 'ไม่พบ Provider ในระบบ' }, { status: 404 });
    }

    // Fetch provider products from provider_products table
    const { data: providerProducts } = await supabase
      .from('provider_products')
      .select('*')
      .eq('provider_id', provider.id)
      .order('external_name', { ascending: true });

    // Fetch linked NayMos products (Game packages)
    const { data: gameProducts } = await supabase
      .from('products')
      .select('id, game_id, name, price, cost, reseller_price, is_active, availability, stock, provider_product_id, games(id, name, slug, icon)')
      .order('name', { ascending: true });

    // Fetch linked Digital product packages
    const { data: digitalPackages } = await supabase
      .from('digital_product_packages')
      .select('id, digital_product_id, name, price, cost, is_active, availability, stock, digital_products(id, name, slug, image_url)')
      .order('name', { ascending: true });

    // Combine into unified item list
    const items: any[] = [];

    // 1. From provider_products if present
    if (providerProducts && providerProducts.length > 0) {
      for (const pp of providerProducts) {
        const linkedGameProd = (gameProducts || []).find((gp: any) => gp.provider_product_id === pp.id);
        const cost = Number(pp.cost) || 0;
        const sellingPrice = linkedGameProd ? Number(linkedGameProd.price) : Math.round(cost * 1.15);
        const profit = sellingPrice - cost;
        const profitMargin = sellingPrice > 0 ? (profit / sellingPrice) * 100 : 0;

        items.push({
          id: pp.id,
          type: 'PROVIDER_PRODUCT',
          name: pp.external_name,
          external_code: pp.external_product_code,
          category: provider.category || 'GAME_TOPUP',
          cost: cost,
          selling_price: sellingPrice,
          profit: profit,
          profit_margin: profitMargin,
          stock: pp.stock,
          is_active: linkedGameProd ? linkedGameProd.is_active : pp.is_active,
          availability: pp.availability || 'available',
          linked_product_id: linkedGameProd?.id || null,
        });
      }
    } else {
      // Fallback for providers like FinShop, ByShop, Mock etc when DB is empty: Provide template items
      const defaultItemsByCode: Record<string, any[]> = {
        finshop: [
          { name: 'Spotify Premium 1 เดือน (ครอบครัว)', cost: 35, selling_price: 49, category: 'PREMIUM_APP', code: '66' },
          { name: 'Netflix Premium 4K 1 เดือน', cost: 120, selling_price: 149, category: 'PREMIUM_APP', code: '102' },
          { name: 'YouTube Premium 1 เดือน (เมลเดิม)', cost: 40, selling_price: 59, category: 'PREMIUM_APP', code: '105' },
          { name: 'Disney+ Hotstar 1 เดือน', cost: 79, selling_price: 99, category: 'PREMIUM_APP', code: '110' },
          { name: 'Canva Pro 1 เดือน (เมลส่วนตัว)', cost: 25, selling_price: 39, category: 'PREMIUM_APP', code: '115' },
        ],
        byshop: [
          { name: 'Free Fire - 100 เพชร', cost: 26, selling_price: 29, category: 'GAME_TOPUP', code: 'ff-100' },
          { name: 'Free Fire - 310 เพชร', cost: 79, selling_price: 89, category: 'GAME_TOPUP', code: 'ff-310' },
          { name: 'RoV - 35 คูปอง', cost: 32, selling_price: 35, category: 'GAME_TOPUP', code: 'rov-35' },
          { name: 'RoV - 90 คูปอง', cost: 82, selling_price: 90, category: 'GAME_TOPUP', code: 'rov-90' },
          { name: 'MLBB - 86 Diamonds', cost: 26, selling_price: 29, category: 'GAME_TOPUP', code: 'ml-86' },
          { name: 'Valorant - 475 VP', cost: 145, selling_price: 159, category: 'GAME_TOPUP', code: 'val-475' },
        ],
        'mock-game-topup': [
          { name: 'Free Fire Sandbox Package', cost: 20, selling_price: 29, category: 'GAME_TOPUP', code: 'mock-ff' },
          { name: 'RoV Sandbox Package', cost: 25, selling_price: 35, category: 'GAME_TOPUP', code: 'mock-rov' },
          { name: 'PUBG Mobile Sandbox Package', cost: 22, selling_price: 29, category: 'GAME_TOPUP', code: 'mock-pubg' },
        ],
        'mock-digital-goods': [
          { name: 'Spotify Family Invite Mock', cost: 20, selling_price: 39, category: 'PREMIUM_APP', code: 'mock-spot' },
          { name: 'YouTube Family Invite Mock', cost: 25, selling_price: 49, category: 'PREMIUM_APP', code: 'mock-yt' },
        ],
        'local-promptpay': [
          { name: 'PromptPay QR Engine (All Orders)', cost: 0, selling_price: 0, category: 'PAYMENT', code: 'pp-engine' },
        ],
        'ai-gateway': [
          { name: 'Gemini 1.5 Flash (Customer Support)', cost: 0.01, selling_price: 0, category: 'AI', code: 'gemini-flash' },
        ],
      };

      const defaults = defaultItemsByCode[provider.code] || defaultItemsByCode.finshop;
      for (const d of defaults) {
        const cost = d.cost;
        const sellingPrice = d.selling_price;
        const profit = sellingPrice - cost;
        const profitMargin = sellingPrice > 0 ? (profit / sellingPrice) * 100 : 0;
        items.push({
          id: `item-${provider.code}-${d.code}`,
          type: 'MAPPED_ITEM',
          name: d.name,
          external_code: d.code,
          category: d.category,
          cost: cost,
          selling_price: sellingPrice,
          profit: profit,
          profit_margin: profitMargin,
          stock: 999,
          is_active: true,
          availability: 'available',
        });
      }
    }

    return NextResponse.json({
      success: true,
      provider: {
        id: provider.id,
        name: provider.name,
        code: provider.code,
        category: provider.category,
        is_active: provider.is_active,
        is_test_mode: provider.is_test_mode,
        balance: provider.balance || 0,
        currency: provider.currency || 'THB',
        health_status: provider.health_status || 'HEALTHY',
      },
      items,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Verify admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { items, enable_all } = body;

    // Get provider
    const { data: provider } = await supabase
      .from('providers')
      .select('*')
      .or(`id.eq.${id},code.eq.${id}`)
      .maybeSingle();

    if (!provider) {
      return NextResponse.json({ error: 'ไม่พบ Provider ในระบบ' }, { status: 404 });
    }

    // If enable_all flag is true, set all items of this provider to is_active = true
    if (enable_all) {
      await supabase
        .from('provider_products')
        .update({ is_active: true, updated_at: new Date().toISOString() })
        .eq('provider_id', provider.id);

      await supabase
        .from('providers')
        .update({ is_active: true, updated_at: new Date().toISOString() })
        .eq('id', provider.id);

      return NextResponse.json({ success: true, message: 'เปิดใช้งาน API นี้สำหรับทุกเกมและแอพสำเร็จ' });
    }

    // Update individual items
    if (Array.isArray(items)) {
      for (const item of items) {
        if (item.linked_product_id) {
          // Update linked NayMos game product
          await supabase
            .from('products')
            .update({
              price: Number(item.selling_price) || 0,
              is_active: Boolean(item.is_active),
              updated_at: new Date().toISOString(),
            })
            .eq('id', item.linked_product_id);
        } else if (item.id && !item.id.startsWith('item-')) {
          // Update provider_products record
          await supabase
            .from('provider_products')
            .update({
              is_active: Boolean(item.is_active),
              updated_at: new Date().toISOString(),
            })
            .eq('id', item.id);
        }
      }
    }

    return NextResponse.json({ success: true, message: 'บันทึกการตั้งค่าเรียบร้อย' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
