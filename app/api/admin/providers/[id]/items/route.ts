import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { maskSecretPreview } from '@/lib/providers/security/masking';

export const dynamic = 'force-dynamic';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

    let query = supabase.from('providers').select('*');
    if (UUID_REGEX.test(id)) {
      query = query.eq('id', id);
    } else {
      const cleanCode = id.toLowerCase() === 'new' ? 'finshop' : id.toLowerCase();
      query = query.or(`id.eq.${id},code.eq.${cleanCode}`);
    }

    let { data: provider, error: pErr } = await query.maybeSingle();

    if (pErr || !provider) {
      // Fallback search by code or name
      const { data: fallbackProv } = await supabase
        .from('providers')
        .select('*')
        .or(`code.eq.finshop,name.ilike.%finshop%`)
        .maybeSingle();
      provider = fallbackProv;
    }

    if (!provider) {
      return NextResponse.json({ error: 'ไม่พบ Provider ในระบบ' }, { status: 404 });
    }

    // Auto-repair code if it was 'new' or broken
    if (provider.code === 'new') {
      const targetCode = provider.name?.toLowerCase().includes('byshop') ? 'byshop' : 'finshop';
      provider.code = targetCode;
      await supabase.from('providers').update({ code: targetCode }).eq('id', provider.id);
    }

    let liveBalance = provider.balance ?? 0;
    let liveStatus = provider.health_status || 'HEALTHY';
    let liveMessage = '';

    // If triggerSync is requested via GET query
    if (triggerSync) {
      const syncResult = await performProviderSync(supabase, provider);
      if (!syncResult.success) {
        return NextResponse.json({ error: syncResult.error }, { status: 400 });
      }
      liveBalance = syncResult.balance;
      liveStatus = syncResult.health_status;
    } else if (provider.api_key) {
      // Real-time balance check
      if (provider.code === 'finshop') {
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
      } else if (provider.code === 'byshop') {
        try {
          const baseUrl = provider.api_base_url?.replace(/\/$/, '') || 'https://byshop.me/api';
          const formParams = new URLSearchParams();
          formParams.append('keyapi', provider.api_key);

          const res = await fetch(`${baseUrl}/money`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formParams.toString(),
            cache: 'no-store',
          });
          if (res.ok) {
            const data = await res.json();
            if (data?.status === 'success' || data?.money !== undefined) {
              liveBalance = Number(data.money) || 0;
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
          liveMessage = err.message || 'ไม่สามารถติดต่อ API BYShop ได้';
        }
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

    const hasCreds = Boolean(provider.api_key && provider.api_key.trim() !== '');
    const maskedKey = provider.credentials_preview || (hasCreds ? maskSecretPreview(provider.api_key) : null);

    // Format items from database only
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
        has_credentials: hasCreds,
        credentials_preview: maskedKey,
        api_base_url: provider.api_base_url,
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
  if (!apiKey || apiKey.trim() === '') {
    return { success: false, error: 'กรุณากรอกและบันทึก API Key ของผู้ให้บริการก่อนทำการซิงค์' };
  }

  // Auto-resolve code
  let providerCode = provider.code?.toLowerCase();
  if (providerCode === 'new' || provider.name?.toLowerCase().includes('finshop')) {
    providerCode = 'finshop';
  } else if (provider.name?.toLowerCase().includes('byshop')) {
    providerCode = 'byshop';
  }

  try {
    let liveBalance = provider.balance ?? 0;
    let syncedCount = 0;

    // Existing records to preserve customized prices and active toggles
    const { data: existingRecords } = await supabase
      .from('provider_products')
      .select('*')
      .eq('provider_id', provider.id);

    const existingMap = new Map((existingRecords || []).map((r: any) => [String(r.external_product_code), r]));

    // ============================================
    // 1. FINSHOP SYNC
    // ============================================
    if (providerCode === 'finshop') {
      const baseUrl = provider.api_base_url?.replace(/\/$/, '') || 'https://finshop.me/api/v1';

      // Check balance
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
        console.warn('Finshop balance check error:', err?.message || 'Unknown error');
      }

      // Fetch products
      const prodRes = await fetch(`${baseUrl}/products`, {
        headers: { 'X-API-Key': apiKey, Accept: 'application/json' },
        cache: 'no-store',
      });

      if (!prodRes.ok) {
        return { success: false, error: `FinShop API ตอบกลับ HTTP ${prodRes.status}` };
      }

      const prodData = await prodRes.json();
      if (prodData?.status !== 'success' || !Array.isArray(prodData?.data)) {
        return { success: false, error: prodData?.message || 'รูปแบบข้อมูลสินค้าจาก FinShop ไม่ถูกต้อง' };
      }

      const apiProducts = prodData.data;

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

      syncedCount = apiProducts.length;
    }

    // ============================================
    // 2. BYSHOP SYNC
    // ============================================
    else if (providerCode === 'byshop') {
      const baseUrl = provider.api_base_url?.replace(/\/$/, '') || 'https://byshop.me/api';

      // Check balance
      try {
        const formParams = new URLSearchParams();
        formParams.append('keyapi', apiKey);

        const balRes = await fetch(`${baseUrl}/money`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: formParams.toString(),
          cache: 'no-store',
        });

        if (balRes.ok) {
          const balData = await balRes.json();
          if (balData?.status === 'success' || balData?.money !== undefined) {
            liveBalance = Number(balData.money) || 0;
          }
        }
      } catch (err) {
        console.warn('BYShop balance check error:', err?.message || 'Unknown error');
      }

      // Fetch products
      const prodRes = await fetch(`${baseUrl}/product`, { cache: 'no-store' });
      if (!prodRes.ok) {
        return { success: false, error: `BYShop API ตอบกลับ HTTP ${prodRes.status}` };
      }

      const prodData = await prodRes.json();
      let apiProducts: any[] = [];
      if (Array.isArray(prodData)) {
        apiProducts = prodData;
      } else if (prodData && typeof prodData === 'object') {
        if (Array.isArray(prodData.data)) apiProducts = prodData.data;
        else if (Array.isArray(prodData.products)) apiProducts = prodData.products;
        else if (prodData.id) apiProducts = [prodData];
      }

      if (apiProducts.length === 0) {
        return { success: false, error: 'ไม่พบรายการสินค้าจาก BYShop API' };
      }

      for (const item of apiProducts) {
        const extCode = String(item.id);
        const existing = existingMap.get(extCode);

        const cost = Number(item.price) || 0;
        const stock = item.stock !== undefined ? Number(item.stock) : 0;
        const defaultMargin = cost > 0 ? (cost <= 30 ? 10 : Math.round(cost * 0.25)) : 0;
        const sellingPrice = existing?.metadata?.selling_price || existing?.selling_price || (cost + defaultMargin);
        const isActive = existing ? Boolean(existing.is_active) : false;
        const isOutOfStock = stock <= 0 || item.status === 'สินค้าหมด';

        await supabase
          .from('provider_products')
          .upsert({
            provider_id: provider.id,
            external_product_code: extCode,
            external_name: item.name,
            cost: cost,
            stock: stock,
            is_active: isActive,
            availability: isOutOfStock ? 'out_of_stock' : 'available',
            metadata: {
              ...(existing?.metadata || {}),
              selling_price: sellingPrice,
              duration: '30 วัน',
              image: item.img || existing?.metadata?.image || '',
              product_info: item.product_info || '',
              category: item.category || 'PREMIUM_APP',
            },
            updated_at: new Date().toISOString(),
          }, { onConflict: 'provider_id,external_product_code' });
      }

      syncedCount = apiProducts.length;
    } else {
      return { success: false, error: `ยังไม่รองรับการซิงค์อัตโนมัติสำหรับโค้ด ${providerCode}` };
    }

    // Update provider balance and health in DB
    await supabase.from('providers').update({
      code: providerCode,
      balance: liveBalance,
      health_status: 'HEALTHY',
      last_health_check_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', provider.id);

    return {
      success: true,
      balance: liveBalance,
      health_status: 'HEALTHY',
      synced_count: syncedCount,
    };
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

    let query = supabase.from('providers').select('*');
    if (UUID_REGEX.test(id)) {
      query = query.eq('id', id);
    } else {
      const cleanCode = id.toLowerCase() === 'new' ? 'finshop' : id.toLowerCase();
      query = query.or(`id.eq.${id},code.eq.${cleanCode}`);
    }

    let { data: provider } = await query.maybeSingle();

    if (!provider) {
      const { data: fallbackProv } = await supabase
        .from('providers')
        .select('*')
        .or(`code.eq.finshop,name.ilike.%finshop%`)
        .maybeSingle();
      provider = fallbackProv;
    }

    if (!provider) {
      return NextResponse.json({ error: 'ไม่พบ Provider ในระบบ' }, { status: 404 });
    }

    const syncResult = await performProviderSync(supabase, provider);
    if (!syncResult.success) {
      return NextResponse.json({ error: syncResult.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `ซิงค์ข้อมูลสำเร็จ (${syncResult.synced_count} รายการ)`,
      balance: syncResult.balance,
      synced_count: syncResult.synced_count,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'เกิดข้อผิดพลาดในการซิงค์' }, { status: 500 });
  }
}


async function syncItemToStorefront(
  supabase: any,
  provider: any,
  item: any,
  categoryId: string | null,
  enable: boolean
) {
  if (!item || !item.external_code) return;

  const rawCode = String(item.external_code).toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  const slug = `app-${provider.code.toLowerCase()}-${rawCode}`;
  const validCatId = categoryId && UUID_REGEX.test(categoryId) ? categoryId : null;

  if (enable) {
    // 1. Upsert into digital_products
    const { data: digProd, error: prodErr } = await supabase
      .from('digital_products')
      .upsert({
        name: item.name,
        slug: slug,
        category_id: validCatId,
        description: item.product_info || item.name,
        icon: item.image || '',
        category_type: 'PREMIUM_APP',
        is_active: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'slug' })
      .select()
      .maybeSingle();

    if (digProd) {
      // 2. Check if package exists for this digital product
      const { data: existingPkgs } = await supabase
        .from('digital_product_packages')
        .select('id')
        .eq('digital_product_id', digProd.id);

      const priceVal = Number(item.selling_price) || Number(item.cost) || 0;
      const costVal = Number(item.cost) || 0;
      const durationVal = item.duration || '30 วัน';
      const pkgName = `${item.name} (${durationVal})`;

      if (existingPkgs && existingPkgs.length > 0) {
        await supabase
          .from('digital_product_packages')
          .update({
            name: pkgName,
            price: priceVal,
            cost: costVal,
            duration: durationVal,
            is_active: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingPkgs[0].id);
      } else {
        await supabase
          .from('digital_product_packages')
          .insert({
            digital_product_id: digProd.id,
            name: pkgName,
            price: priceVal,
            cost: costVal,
            duration: durationVal,
            is_active: true,
            sort_order: 1,
          });
      }
    }
  } else {
    // Hide from storefront
    const { data: digProd } = await supabase
      .from('digital_products')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    if (digProd) {
      await supabase
        .from('digital_products')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', digProd.id);

      await supabase
        .from('digital_product_packages')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('digital_product_id', digProd.id);
    }
  }
}

// 3. PUT: Update item prices, toggles, or default category
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await getSupabase();
    const body = await req.json();

    const {
      toggle_item_id,
      set_active_state,
      enable_all,
      disable_all,
      default_category_id,
      items,
    } = body;

    let query = supabase.from('providers').select('*');
    if (UUID_REGEX.test(id)) {
      query = query.eq('id', id);
    } else {
      const cleanCode = id.toLowerCase() === 'new' ? 'finshop' : id.toLowerCase();
      query = query.or(`id.eq.${id},code.eq.${cleanCode}`);
    }

    let { data: provider } = await query.maybeSingle();

    if (!provider) {
      const { data: fallbackProv } = await supabase
        .from('providers')
        .select('*')
        .or(`code.eq.finshop,name.ilike.%finshop%`)
        .maybeSingle();
      provider = fallbackProv;
    }

    if (!provider) {
      return NextResponse.json({ error: 'ไม่พบ Provider ในระบบ' }, { status: 404 });
    }

    // Update default category config if specified
    if (default_category_id) {
      const newConfig = { ...(provider.config || {}), default_category_id };
      await supabase.from('providers').update({ config: newConfig }).eq('id', provider.id);
    }

    // Toggle Single Item
    if (toggle_item_id !== undefined && set_active_state !== undefined) {
      const targetItem = Array.isArray(items) ? items.find((i: any) => i.id === toggle_item_id || String(i.external_code) === String(toggle_item_id)) : null;
      const targetCode = String(toggle_item_id);

      // Update provider_products
      await supabase
        .from('provider_products')
        .update({
          is_active: set_active_state,
          updated_at: new Date().toISOString(),
        })
        .eq('provider_id', provider.id)
        .eq('external_product_code', targetCode);

      // Publish / unpublish in storefront & backoffice
      if (targetItem) {
        const catId = targetItem.category_id || default_category_id || provider.config?.default_category_id || null;
        await syncItemToStorefront(supabase, provider, targetItem, catId, Boolean(set_active_state));
      }

      return NextResponse.json({
        success: true,
        message: set_active_state ? 'เปิดขายสินค้าและนำเข้าหลังบ้านเรียบร้อยแล้ว' : 'ปิดการแสดงผลสินค้าแล้ว',
      });
    }

    // Bulk Toggle
    if (enable_all !== undefined || disable_all !== undefined) {
      const shouldEnable = Boolean(enable_all);

      await supabase
        .from('provider_products')
        .update({
          is_active: shouldEnable,
          updated_at: new Date().toISOString(),
        })
        .eq('provider_id', provider.id);

      if (Array.isArray(items)) {
        for (const item of items) {
          const catId = item.category_id || default_category_id || provider.config?.default_category_id || null;
          await syncItemToStorefront(supabase, provider, item, catId, shouldEnable);
        }
      }

      return NextResponse.json({
        success: true,
        message: shouldEnable ? 'เปิดขายสินค้าทั้งหมดและนำเข้าหลังบ้านแล้ว' : 'ปิดการขายสินค้าทั้งหมดแล้ว',
      });
    }

    // Update item customized selling prices
    if (Array.isArray(items)) {
      for (const item of items) {
        if (!item.external_code) continue;

        await supabase
          .from('provider_products')
          .update({
            metadata: {
              selling_price: Number(item.selling_price),
              category_id: item.category_id || default_category_id,
              duration: item.duration || '30 วัน',
            },
            updated_at: new Date().toISOString(),
          })
          .eq('provider_id', provider.id)
          .eq('external_product_code', String(item.external_code));

        const rawCode = String(item.external_code).toLowerCase().replace(/[^a-z0-9_-]/g, '-');
        const slug = `app-${provider.code.toLowerCase()}-${rawCode}`;
        const { data: digProd } = await supabase
          .from('digital_products')
          .select('id')
          .eq('slug', slug)
          .maybeSingle();

        if (digProd && item.selling_price !== undefined) {
          await supabase
            .from('digital_product_packages')
            .update({
              price: Number(item.selling_price),
              updated_at: new Date().toISOString(),
            })
            .eq('digital_product_id', digProd.id);
        }
      }

      return NextResponse.json({
        success: true,
        message: 'บันทึกราคาขายเรียบร้อยแล้ว',
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'บันทึกข้อมูลล้มเหลว' }, { status: 500 });
  }
}
