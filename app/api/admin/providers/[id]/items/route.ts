import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

async function getSupabase() {
  try {
    return createAdminClient();
  } catch {
    return await createClient();
  }
}

// 1. GET: Fetch existing synced products for this specific provider (NO MOCK DUMP)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const triggerSync = searchParams.get('sync') === 'true';
    const supabase = await getSupabase();

    const { data: provider, error: pErr } = await supabase
      .from('providers')
      .select('*')
      .or(`id.eq.${id},code.eq.${id}`)
      .maybeSingle();

    if (pErr || !provider) {
      return NextResponse.json({ error: 'ไม่พบ Provider ในระบบ' }, { status: 404 });
    }

    let liveBalance = provider.balance ?? 0;
    let liveStatus = provider.health_status || 'HEALTHY';
    let liveMessage = '';

    // If triggerSync is requested via GET query or balance check is needed
    if (triggerSync) {
      const syncResult = await performProviderSync(supabase, provider);
      if (!syncResult.success) {
        return NextResponse.json({ error: syncResult.error }, { status: 400 });
      }
      liveBalance = syncResult.balance;
      liveStatus = syncResult.health_status;
    } else if (provider.api_key && provider.code === 'finshop') {
      // Just check real-time balance
      try {
        const baseUrl = provider.api_base_url?.replace(/\/$/, '') || 'https://finshop.me/api/v1';
        const res = await fetch(`${baseUrl}/balance`, {
          headers: { 'X-API-Key': provider.api_key, Accept: 'application/json' },
          cache: 'no-store',
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.status === 'success' && data.data?.balance !== undefined) {
            liveBalance = Number(data.data.balance);
            liveStatus = 'HEALTHY';
            await supabase.from('providers').update({
              balance: liveBalance,
              health_status: 'HEALTHY',
              last_health_check_at: new Date().toISOString(),
            }).eq('id', provider.id);
          }
        }
      } catch (err: any) {
        liveStatus = 'DEGRADED';
        liveMessage = err.message || 'ไม่สามารถติดต่อ API ได้';
      }
    }

    // Fetch ONLY products that actually belong to this provider
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

    // Format items from database only — if 0 items have been synced, return empty array!
    const items = (providerProducts || []).map((p: any) => {
      const cost = Number(p.cost) || 0;
      const sellingPrice = p.metadata?.selling_price || p.selling_price || (cost > 0 ? (cost <= 30 ? cost + 10 : Math.round(cost * 1.25)) : 0);
      const profit = Math.max(0, sellingPrice - cost);
      const profitMargin = sellingPrice > 0 ? Math.round((profit / sellingPrice) * 100) : 0;
      const stock = p.stock !== undefined ? Number(p.stock) : 0;
      const isActive = Boolean(p.is_active);

      return {
        id: p.id,
        type: `${provider.code.toUpperCase()}_PRODUCT`,
        name: p.external_name || `สินค้า #${p.external_product_code}`,
        external_code: String(p.external_product_code),
        category: p.metadata?.category || provider.category || 'PREMIUM_APP',
        category_id: p.metadata?.category_id || provider.config?.default_category_id || categories?.[0]?.id || null,
        duration: p.metadata?.duration || '30 วัน',
        cost: cost,
        selling_price: sellingPrice,
        profit: profit,
        profit_margin: profitMargin,
        stock: stock,
        is_active: isActive,
        allowed_api: true,
        image: p.metadata?.image || 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=160&auto=format&fit=crop&q=80',
        availability: stock <= 0 ? 'out_of_stock' : (p.availability || 'available'),
        is_in_storefront: isActive,
      };
    });

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
      },
      categories: categories || [],
      items,
      count: items.length,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล' }, { status: 500 });
  }
}

// Helper function to sync with provider API
async function performProviderSync(supabase: any, provider: any) {
  const apiKey = provider.api_key;
  if (!apiKey) {
    return { success: false, error: 'กรุณากรอก API Key ของผู้ให้บริการก่อนทำการซิงค์' };
  }

  const baseUrl = provider.api_base_url?.replace(/\/$/, '') || (provider.code === 'finshop' ? 'https://finshop.me/api/v1' : '');
  if (!baseUrl) {
    return { success: false, error: 'ไม่พบ Base URL สำหรับเชื่อมต่อ API ผู้ให้บริการนี้' };
  }

  try {
    let liveBalance = provider.balance ?? 0;
    let liveStatus = 'HEALTHY';

    // 1. Check Balance
    if (provider.code === 'finshop') {
      try {
        const balRes = await fetch(`${baseUrl}/balance`, {
          headers: { 'X-API-Key': apiKey, Accept: 'application/json' },
          cache: 'no-store',
        });
        if (balRes.ok) {
          const balData = await balRes.json();
          if (balData?.status === 'success' && balData.data?.balance !== undefined) {
            liveBalance = Number(balData.data.balance);
          }
        }
      } catch (err) {
        console.warn('Finshop balance check error:', err);
      }

      // 2. Fetch Products
      const prodRes = await fetch(`${baseUrl}/products`, {
        headers: { 'X-API-Key': apiKey, Accept: 'application/json' },
        cache: 'no-store',
      });

      if (!prodRes.ok) {
        return { success: false, error: `FinShop API ตอบกลับ HTTP ${prodRes.status}` };
      }

      const prodData = await prodRes.json();
      if (prodData?.status !== 'success' || !Array.isArray(prodData?.data)) {
        return { success: false, error: prodData?.message || 'รูปแบบข้อมูลสินค้าจาก API ไม่ถูกต้อง' };
      }

      const apiProducts = prodData.data;

      // Existing records to preserve customized prices and active toggles
      const { data: existingRecords } = await supabase
        .from('provider_products')
        .select('*')
        .eq('provider_id', provider.id);

      const existingMap = new Map((existingRecords || []).map((r: any) => [String(r.external_product_code), r]));

      // Upsert products into provider_products
      for (const item of apiProducts) {
        const extCode = String(item.product_id);
        const existing = existingMap.get(extCode);

        const cost = Number(item.price) || 0;
        const stock = item.stock !== undefined ? Number(item.stock) : 0;
        const defaultMargin = cost > 0 ? (cost <= 30 ? 10 : Math.round(cost * 0.25)) : 0;
        const sellingPrice = existing?.metadata?.selling_price || existing?.selling_price || (cost + defaultMargin);
        const isActive = existing ? Boolean(existing.is_active) : false;

        await supabase
          .from('provider_products')
          .upsert({
            provider_id: provider.id,
            external_product_code: extCode,
            external_name: item.product_name,
            cost: cost,
            stock: stock,
            is_active: isActive,
            availability: stock <= 0 ? 'out_of_stock' : 'available',
            metadata: {
              ...(existing?.metadata || {}),
              selling_price: sellingPrice,
              duration: '30 วัน',
              image: item.product_img || existing?.metadata?.image || '',
              product_info: item.product_info || '',
            },
            updated_at: new Date().toISOString(),
          }, { onConflict: 'provider_id,external_product_code' });
      }

      // Update provider balance and health
      await supabase.from('providers').update({
        balance: liveBalance,
        health_status: 'HEALTHY',
        last_health_check_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', provider.id);

      return {
        success: true,
        balance: liveBalance,
        health_status: 'HEALTHY',
        synced_count: apiProducts.length,
      };
    }

    return { success: false, error: `ยังไม่รองรับการซิงค์อัตโนมัติสำหรับโค้ด ${provider.code}` };
  } catch (err: any) {
    return { success: false, error: err.message || 'ไม่สามารถเชื่อมต่อ API ผู้ให้บริการได้' };
  }
}

// 2. POST: Trigger sync or actions
export async function POST(
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

    const syncResult = await performProviderSync(supabase, provider);
    if (!syncResult.success) {
      return NextResponse.json({ error: syncResult.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `ซิงค์ข้อมูลจาก API สำเร็จ (${syncResult.synced_count} รายการ)`,
      balance: syncResult.balance,
      synced_count: syncResult.synced_count,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'เกิดข้อผิดพลาดในการซิงค์' }, { status: 500 });
  }
}

// 3. PUT: Update settings, single item price/category/toggle, or bulk toggle
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await getSupabase();
    const body = await req.json();
    const { items, default_category_id, toggle_item_id, set_active_state, enable_all, disable_all } = body;

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
        const stock = Number(targetItem.stock) ?? 0;
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
              duration: targetItem.duration || '30 วัน',
              image: targetItem.image || '',
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
          message: targetActive ? `เปิดใช้งาน "${targetItem.name}" ไปยังหน้าเว็บแล้ว` : `ปิดการแสดงผล "${targetItem.name}" บนหน้าเว็บแล้ว`,
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
          const stock = Number(item.stock) ?? 0;
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
                duration: item.duration || '30 วัน',
                image: item.image || '',
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
        message: targetState ? 'เปิดใช้งานสินค้าทั้งหมดไปยังหน้าเว็บแล้ว' : 'ปิดการแสดงผลสินค้าทั้งหมดบนหน้าเว็บแล้ว',
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'บันทึกข้อมูลล้มเหลว' }, { status: 500 });
  }
}
