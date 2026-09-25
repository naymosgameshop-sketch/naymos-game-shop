import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export const DEFAULT_CATALOG: Record<string, Array<{ id: string; name: string; cost: number; allowed_api: boolean; category: string; duration: string; image: string }>> = {
  finshop: [
    { id: '26', name: 'iQIYI VIP Premium 4K / 30 วัน (แบบมีจอชน)', cost: 23.00, allowed_api: true, category: 'PREMIUM_APP', duration: '30 วัน', image: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=160&auto=format&fit=crop&q=80' },
    { id: '27', name: 'iQIYI VIP Premium 4K / 30 วัน (แบบจอไม่ชน)', cost: 47.00, allowed_api: true, category: 'PREMIUM_APP', duration: '30 วัน', image: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=160&auto=format&fit=crop&q=80' },
    { id: '28', name: 'Amazon Prime Video / 30วัน', cost: 35.00, allowed_api: false, category: 'PREMIUM_APP', duration: '30 วัน', image: 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=160&auto=format&fit=crop&q=80' },
    { id: '30', name: 'WeTV VIP / 30วัน', cost: 33.00, allowed_api: true, category: 'PREMIUM_APP', duration: '30 วัน', image: 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?w=160&auto=format&fit=crop&q=80' },
    { id: '31', name: 'WeTV VIP / 90วัน', cost: 75.00, allowed_api: true, category: 'PREMIUM_APP', duration: '90 วัน', image: 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?w=160&auto=format&fit=crop&q=80' },
    { id: '32', name: 'VIU Premium / 30วัน', cost: 13.00, allowed_api: true, category: 'PREMIUM_APP', duration: '30 วัน', image: 'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?w=160&auto=format&fit=crop&q=80' },
    { id: '33', name: 'VIU Premium / 90วัน', cost: 35.00, allowed_api: true, category: 'PREMIUM_APP', duration: '90 วัน', image: 'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?w=160&auto=format&fit=crop&q=80' },
    { id: '34', name: 'Canva PRO / 30วัน (เมลลูกค้า)', cost: 15.00, allowed_api: true, category: 'PREMIUM_APP', duration: '30 วัน', image: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=160&auto=format&fit=crop&q=80' },
    { id: '36', name: 'MONO MAX / 30วัน (จอส่วนตัว)', cost: 45.00, allowed_api: true, category: 'PREMIUM_APP', duration: '30 วัน', image: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=160&auto=format&fit=crop&q=80' },
    { id: '37', name: 'Bilibili Premium / 30วัน', cost: 25.00, allowed_api: true, category: 'PREMIUM_APP', duration: '30 วัน', image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=160&auto=format&fit=crop&q=80' },
    { id: '38', name: 'YOUKU VIP / 30วัน', cost: 25.00, allowed_api: true, category: 'PREMIUM_APP', duration: '30 วัน', image: 'https://images.unsplash.com/photo-1536240478700-b869070f9279?w=160&auto=format&fit=crop&q=80' },
    { id: '46', name: 'Netflix 4K / 7วัน (รองรับทุกอุปกรณ์) (จอส่วนตัว)', cost: 59.00, allowed_api: false, category: 'PREMIUM_APP', duration: '7 วัน', image: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=160&auto=format&fit=crop&q=80' },
    { id: '48', name: 'Netflix 4K / 30วัน (มือถือ/แท็บเล็ต/ไอแพด) (จอส่วนตัว)', cost: 159.00, allowed_api: false, category: 'PREMIUM_APP', duration: '30 วัน', image: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=160&auto=format&fit=crop&q=80' },
    { id: '56', name: 'HBO MAX / 30วัน (4K) (จอส่วนตัว)', cost: 79.00, allowed_api: true, category: 'PREMIUM_APP', duration: '30 วัน', image: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=160&auto=format&fit=crop&q=80' },
    { id: '59', name: 'Disney+ / 30วัน (จอส่วนตัว) (รองรับทุกอุปกรณ์)', cost: 99.00, allowed_api: true, category: 'PREMIUM_APP', duration: '30 วัน', image: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=160&auto=format&fit=crop&q=80' },
    { id: '60', name: 'Youtube Premium / 30วัน (เมลตัวเอง)', cost: 25.00, allowed_api: false, category: 'PREMIUM_APP', duration: '30 วัน', image: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=160&auto=format&fit=crop&q=80' },
    { id: '61', name: 'inFINN แพ็คเกจ Trio Plus / 30 วัน', cost: 20.00, allowed_api: true, category: 'PREMIUM_APP', duration: '30 วัน', image: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=160&auto=format&fit=crop&q=80' },
    { id: '62', name: 'Reelshort บน inFINN / 30 วัน', cost: 10.00, allowed_api: true, category: 'PREMIUM_APP', duration: '30 วัน', image: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=160&auto=format&fit=crop&q=80' },
    { id: '63', name: 'Netshort บน inFINN / 30 วัน', cost: 10.00, allowed_api: true, category: 'PREMIUM_APP', duration: '30 วัน', image: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=160&auto=format&fit=crop&q=80' },
    { id: '65', name: 'DramaBox บน inFINN / 30 วัน', cost: 10.00, allowed_api: true, category: 'PREMIUM_APP', duration: '30 วัน', image: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=160&auto=format&fit=crop&q=80' },
    { id: '66', name: 'Test API (สำหรับทดสอบระบบ)', cost: 0.00, allowed_api: true, category: 'PREMIUM_APP', duration: 'ทดสอบ', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTtDeGtrelq2Phox5_wqtnSmvEYicZtpkZgX5BWlwTjI9MzYTSVFD7DJNVU&s=10' },
  ],
  byshop: [
    { id: '15', name: 'Amazon Prime Video/30วัน', cost: 45.00, allowed_api: true, category: 'PREMIUM_APP', duration: '30 วัน', image: 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=160&auto=format&fit=crop&q=80' },
    { id: '20', name: 'Bilibili Premium/30วัน', cost: 25.00, allowed_api: true, category: 'PREMIUM_APP', duration: '30 วัน', image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=160&auto=format&fit=crop&q=80' },
    { id: '22', name: 'Canva Pro/30วัน', cost: 20.00, allowed_api: true, category: 'PREMIUM_APP', duration: '30 วัน', image: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=160&auto=format&fit=crop&q=80' },
    { id: '25', name: 'Disney+ Hotstar/30วัน', cost: 89.00, allowed_api: true, category: 'PREMIUM_APP', duration: '30 วัน', image: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=160&auto=format&fit=crop&q=80' },
    { id: '35', name: 'Netflix 4K/30วัน (จอส่วนตัว)', cost: 149.00, allowed_api: true, category: 'PREMIUM_APP', duration: '30 วัน', image: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=160&auto=format&fit=crop&q=80' },
    { id: '40', name: 'YouTube Premium/30วัน', cost: 35.00, allowed_api: true, category: 'PREMIUM_APP', duration: '30 วัน', image: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=160&auto=format&fit=crop&q=80' },
  ],
};

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

    const { data: provider, error: pErr } = await supabase
      .from('providers')
      .select('*')
      .or(`id.eq.${id},code.eq.${id}`)
      .maybeSingle();

    if (pErr || !provider) {
      return NextResponse.json({ error: 'ไม่พบ Provider ในระบบ' }, { status: 404 });
    }

    // Try live balance check if API key exists
    let liveBalance = provider.balance ?? 0;
    let liveStatus = provider.health_status || 'HEALTHY';
    let liveMessage = '';

    if (provider.api_key) {
      try {
        const baseUrl = provider.api_base_url?.replace(/\/$/, '') || (provider.code === 'finshop' ? 'https://finshop.me/api/v1' : '');
        if (baseUrl && provider.code === 'finshop') {
          const res = await fetch(`${baseUrl}/balance`, {
            headers: { 'X-API-Key': provider.api_key, 'Accept': 'application/json' },
            cache: 'no-store',
          });
          if (res.ok) {
            const data = await res.json();
            if (data?.status === 'success' && data.data?.balance !== undefined) {
              liveBalance = Number(data.data.balance);
              liveStatus = 'HEALTHY';
              liveMessage = 'ดึงยอดเงินสดสำเร็จ';
              // update provider in background
              await supabase.from('providers').update({ balance: liveBalance, health_status: 'HEALTHY', last_health_check_at: new Date().toISOString() }).eq('id', provider.id);
            }
          }
        }
      } catch (err: any) {
        liveStatus = 'DEGRADED';
        liveMessage = err.message || 'ไม่สามารถติดต่อ API ผู้ให้บริการได้';
      }
    }

    // Fetch existing provider products
    const { data: providerProducts } = await supabase
      .from('provider_products')
      .select('*')
      .eq('provider_id', provider.id)
      .order('external_product_code', { ascending: true });

    // Fetch categories to link
    const { data: categories } = await supabase
      .from('digital_product_categories')
      .select('*')
      .order('sort_order', { ascending: true });

    const catalog = DEFAULT_CATALOG[provider.code] || DEFAULT_CATALOG['finshop'];
    const ppMap = new Map((providerProducts || []).map((p: any) => [String(p.external_product_code), p]));

    const items: any[] = [];

    for (const item of catalog) {
      const existingPP: any = ppMap.get(item.id);
      const cost = existingPP ? Number(existingPP.cost) : item.cost;
      const defaultMargin = cost > 0 ? (cost <= 30 ? 10 : Math.round(cost * 0.2)) : 0;
      const sellingPrice = existingPP?.metadata?.selling_price || existingPP?.selling_price || (cost + defaultMargin);
      const profit = Math.max(0, sellingPrice - cost);
      const profitMargin = sellingPrice > 0 ? Math.round((profit / sellingPrice) * 100) : 0;
      const isActive = existingPP ? Boolean(existingPP.is_active) : false;
      const stock = existingPP?.stock !== undefined ? Number(existingPP.stock) : (item.allowed_api ? 99 : 0);
      const categoryId = existingPP?.metadata?.category_id || provider.config?.default_category_id || categories?.[0]?.id || null;

      items.push({
        id: existingPP?.id || `prov-item-${item.id}`,
        type: provider.code.toUpperCase() + '_PRODUCT',
        name: existingPP?.external_name || item.name,
        external_code: item.id,
        category: item.category,
        category_id: categoryId,
        duration: item.duration,
        cost: cost,
        selling_price: sellingPrice,
        profit: profit,
        profit_margin: profitMargin,
        stock: stock,
        is_active: isActive,
        allowed_api: item.allowed_api,
        image: item.image,
        availability: stock <= 0 ? 'out_of_stock' : (item.allowed_api ? 'available' : 'unavailable'),
        is_in_storefront: isActive,
      });
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
        balance: liveBalance,
        currency: provider.currency || 'THB',
        health_status: liveStatus,
        health_message: liveMessage,
        default_category_id: provider.config?.default_category_id || null,
        api_base_url: provider.api_base_url,
        has_credentials: Boolean(provider.api_key),
      },
      categories: categories || [],
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
    const supabase = await getSupabase();
    const body = await req.json();
    const { items, default_category_id, toggle_item_id, set_active_state, sync_all, enable_all, disable_all } = body;

    const { data: provider } = await supabase
      .from('providers')
      .select('*')
      .or(`id.eq.${id},code.eq.${id}`)
      .maybeSingle();

    if (!provider) {
      return NextResponse.json({ error: 'ไม่พบ Provider ในระบบ' }, { status: 404 });
    }

    // Update default category config for provider
    if (default_category_id !== undefined) {
      await supabase
        .from('providers')
        .update({
          config: {
            ...(provider.config || {}),
            default_category_id: default_category_id || null,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', provider.id);
    }

    // Handle single item toggle or edit
    if (toggle_item_id) {
      const targetItem = Array.isArray(items) ? items.find((i: any) => i.id === toggle_item_id || i.external_code === toggle_item_id) : null;
      const targetActive = set_active_state !== undefined ? Boolean(set_active_state) : true;

      if (targetItem) {
        const cost = Number(targetItem.cost) || 0;
        const price = Number(targetItem.selling_price) || (cost + 10);
        const stock = Number(targetItem.stock) ?? 99;
        const catId = targetItem.category_id || default_category_id || provider.config?.default_category_id;

        // Upsert provider_products
        await supabase
          .from('provider_products')
          .upsert({
            provider_id: provider.id,
            external_product_code: String(targetItem.external_code),
            external_name: targetItem.name,
            cost: cost,
            stock: stock,
            is_active: targetActive,
            availability: stock <= 0 ? 'out_of_stock' : 'available',
            metadata: {
              selling_price: price,
              category_id: catId,
              duration: targetItem.duration,
              image: targetItem.image,
            },
            updated_at: new Date().toISOString(),
          }, { onConflict: 'provider_id,external_product_code' });

        // Update storefront digital_products & packages
        const slug = `app-${provider.code}-${targetItem.external_code}`;
        const { data: existingDP } = await supabase
          .from('digital_products')
          .select('id')
          .eq('slug', slug)
          .maybeSingle();

        let dpId = existingDP?.id;
        if (!dpId && targetActive) {
          const { data: createdDP } = await supabase
            .from('digital_products')
            .insert({
              slug,
              name: targetItem.name,
              category_id: catId || null,
              description: `แพ็กเกจ ${targetItem.name} เชื่อมต่อระบบอัตโนมัติ`,
              category_type: 'PREMIUM_APP',
              icon: targetItem.image,
              is_active: true,
              sort_order: Number(targetItem.external_code) || 1,
            })
            .select('id')
            .maybeSingle();
          dpId = createdDP?.id;
        } else if (dpId) {
          await supabase
            .from('digital_products')
            .update({
              is_active: targetActive,
              category_id: catId || null,
              name: targetItem.name,
              icon: targetItem.image,
              updated_at: new Date().toISOString(),
            })
            .eq('id', dpId);
        }

        if (dpId) {
          await supabase
            .from('digital_product_packages')
            .upsert({
              digital_product_id: dpId,
              name: targetItem.duration ? `${targetItem.name} (${targetItem.duration})` : targetItem.name,
              duration: targetItem.duration || '30 วัน',
              price: price,
              cost: cost,
              stock: stock,
              is_active: targetActive,
              availability: stock <= 0 ? 'out_of_stock' : 'available',
            }, { onConflict: 'digital_product_id,name' });
        }

        return NextResponse.json({
          success: true,
          message: targetActive ? `เปิดใช้งาน ${targetItem.name} ไปยังหน้าเว็บแล้ว` : `ปิดการแสดงผล ${targetItem.name} บนหน้าเว็บแล้ว`,
        });
      }
    }

    // Handle Enable All or Disable All
    if (enable_all || disable_all) {
      const targetState = Boolean(enable_all);
      if (Array.isArray(items)) {
        for (const item of items) {
          const cost = Number(item.cost) || 0;
          const price = Number(item.selling_price) || (cost + 10);
          const stock = Number(item.stock) ?? 99;
          const catId = item.category_id || default_category_id || provider.config?.default_category_id;

          await supabase
            .from('provider_products')
            .upsert({
              provider_id: provider.id,
              external_product_code: String(item.external_code),
              external_name: item.name,
              cost: cost,
              stock: stock,
              is_active: targetState,
              availability: stock <= 0 ? 'out_of_stock' : 'available',
              metadata: {
                selling_price: price,
                category_id: catId,
                duration: item.duration,
                image: item.image,
              },
              updated_at: new Date().toISOString(),
            }, { onConflict: 'provider_id,external_product_code' });

          const slug = `app-${provider.code}-${item.external_code}`;
          const { data: existingDP } = await supabase
            .from('digital_products')
            .select('id')
            .eq('slug', slug)
            .maybeSingle();

          let dpId = existingDP?.id;
          if (!dpId && targetState) {
            const { data: createdDP } = await supabase
              .from('digital_products')
              .insert({
                slug,
                name: item.name,
                category_id: catId || null,
                description: `แพ็กเกจ ${item.name} เชื่อมต่อระบบอัตโนมัติ`,
                category_type: 'PREMIUM_APP',
                icon: item.image,
                is_active: true,
                sort_order: Number(item.external_code) || 1,
              })
              .select('id')
              .maybeSingle();
            dpId = createdDP?.id;
          } else if (dpId) {
            await supabase
              .from('digital_products')
              .update({
                is_active: targetState,
                category_id: catId || null,
                updated_at: new Date().toISOString(),
              })
              .eq('id', dpId);
          }

          if (dpId) {
            await supabase
              .from('digital_product_packages')
              .upsert({
                digital_product_id: dpId,
                name: item.duration ? `${item.name} (${item.duration})` : item.name,
                duration: item.duration || '30 วัน',
                price: price,
                cost: cost,
                stock: stock,
                is_active: targetState,
                availability: stock <= 0 ? 'out_of_stock' : 'available',
              }, { onConflict: 'digital_product_id,name' });
          }
        }
      }

      return NextResponse.json({
        success: true,
        message: targetState ? 'เปิดสินค้าทั้งหมดเข้าสู่หน้าเว็บสำเร็จแล้ว' : 'ปิดการแสดงสินค้าทั้งหมดบนหน้าเว็บสำเร็จแล้ว',
      });
    }

    // Default Save items list
    if (Array.isArray(items)) {
      for (const item of items) {
        if (item.external_code) {
          await supabase
            .from('provider_products')
            .upsert({
              provider_id: provider.id,
              external_product_code: String(item.external_code),
              external_name: item.name,
              cost: Number(item.cost) || 0,
              stock: Number(item.stock) ?? 99,
              is_active: Boolean(item.is_active),
              availability: Number(item.stock) <= 0 ? 'out_of_stock' : 'available',
              metadata: {
                selling_price: Number(item.selling_price) || 0,
                category_id: item.category_id || null,
                duration: item.duration,
                image: item.image,
              },
              updated_at: new Date().toISOString(),
            }, { onConflict: 'provider_id,external_product_code' });
        }
      }
    }

    return NextResponse.json({ success: true, message: 'บันทึกข้อมูลสินค้าเรียบร้อย' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
