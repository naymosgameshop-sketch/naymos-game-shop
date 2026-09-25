import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { providerRegistry } from '@/lib/providers/central-registry';
import { CentralProvider } from '@/types/central-provider';

export const dynamic = 'force-dynamic';

// Official FinShop products catalog from documentation
export const FINSHOP_OFFICIAL_CATALOG = [
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
];

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    let supabase: any;
    try {
      supabase = createAdminClient();
    } catch {
      supabase = await createClient();
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

    // Fetch existing provider products
    const { data: providerProducts } = await supabase
      .from('provider_products')
      .select('*')
      .eq('provider_id', provider.id)
      .order('external_product_code', { ascending: true });

    // Fetch linked digital products
    const { data: digitalPackages } = await supabase
      .from('digital_product_packages')
      .select('id, digital_product_id, name, price, cost, is_active, availability, stock, digital_products(id, name, slug, icon, image_url)')
      .order('name', { ascending: true });

    const items: any[] = [];

    // If provider is FinShop
    if (provider.code === 'finshop' || provider.category === 'PREMIUM_APP') {
      const ppMap = new Map((providerProducts || []).map((p: any) => [String(p.external_product_code), p]));

      for (const item of FINSHOP_OFFICIAL_CATALOG) {
        const existingPP: any = ppMap.get(item.id);
        const cost = existingPP ? Number(existingPP.cost) : item.cost;
        const defaultMargin = cost > 0 ? (cost <= 30 ? 10 : Math.round(cost * 0.2)) : 0;
        const sellingPrice = existingPP?.selling_price || (cost + defaultMargin);
        const profit = sellingPrice - cost;
        const profitMargin = sellingPrice > 0 ? Math.round((profit / sellingPrice) * 100) : 0;

        items.push({
          id: existingPP?.id || `fin-${item.id}`,
          type: 'FINSHOP_PRODUCT',
          name: existingPP?.external_name || item.name,
          external_code: item.id,
          category: 'PREMIUM_APP',
          duration: item.duration,
          cost: cost,
          selling_price: sellingPrice,
          profit: profit,
          profit_margin: profitMargin,
          stock: existingPP?.stock ?? (item.allowed_api ? 99 : 0),
          is_active: existingPP?.is_active ?? item.allowed_api,
          allowed_api: item.allowed_api,
          image: item.image,
          availability: existingPP?.availability || (item.allowed_api ? 'available' : 'unavailable'),
          is_in_storefront: Boolean(existingPP?.is_active),
        });
      }
    } else if (providerProducts && providerProducts.length > 0) {
      for (const pp of providerProducts) {
        const cost = Number(pp.cost) || 0;
        const sellingPrice = Math.round(cost * 1.15);
        const profit = sellingPrice - cost;
        const profitMargin = sellingPrice > 0 ? Math.round((profit / sellingPrice) * 100) : 0;

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
          is_active: pp.is_active,
          availability: pp.availability || 'available',
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

// PUT: Save selling prices and push/sync products to Storefront (digital_products and digital_product_packages)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    let supabase: any;
    try {
      supabase = createAdminClient();
    } catch {
      supabase = await createClient();
    }

    const body = await req.json();
    const { items, enable_all, push_to_storefront } = body;

    // Get provider
    const { data: provider } = await supabase
      .from('providers')
      .select('*')
      .or(`id.eq.${id},code.eq.${id}`)
      .maybeSingle();

    if (!provider) {
      return NextResponse.json({ error: 'ไม่พบ Provider ในระบบ' }, { status: 404 });
    }

    // 1. If push_to_storefront is requested:
    // Create/update records in digital_products and digital_product_packages
    if (push_to_storefront && Array.isArray(items)) {
      let createdCount = 0;

      for (const item of items) {
        if (!item.is_active && !enable_all) continue;

        // Upsert into provider_products
        await supabase
          .from('provider_products')
          .upsert(
            {
              provider_id: provider.id,
              external_product_code: String(item.external_code),
              external_name: item.name,
              cost: Number(item.cost) || 0,
              stock: item.stock ?? 99,
              availability: item.allowed_api !== false ? 'available' : 'unavailable',
              is_active: true,
              metadata: {
                selling_price: Number(item.selling_price) || 0,
                duration: item.duration || '30 วัน',
                image: item.image,
              },
              last_synced_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'provider_id,external_product_code' }
          );

        // Map into digital_products table
        const slug = `app-${item.external_code}-${item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30)}`;
        const { data: existingProd } = await supabase
          .from('digital_products')
          .select('id')
          .eq('slug', slug)
          .maybeSingle();

        let prodId = existingProd?.id;
        if (!prodId) {
          const { data: newProd } = await supabase
            .from('digital_products')
            .insert({
              slug,
              name: item.name,
              description: `แพ็กเกจ ${item.name} ลิขสิทธิ์แท้ 100% เชื่อมต่อระบบอัตโนมัติ`,
              category_type: 'PREMIUM_APP',
              icon: item.image || 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=160&auto=format&fit=crop&q=80',
              is_active: true,
              sort_order: Number(item.external_code) || 10,
            })
            .select('id')
            .maybeSingle();
          prodId = newProd?.id;
        }

        if (prodId) {
          // Upsert digital_product_packages
          await supabase
            .from('digital_product_packages')
            .insert({
              digital_product_id: prodId,
              name: item.duration ? `${item.name} (${item.duration})` : item.name,
              duration: item.duration || '30 วัน',
              price: Number(item.selling_price) || 0,
              cost: Number(item.cost) || 0,
              is_active: true,
              stock: item.stock ?? 99,
              availability: item.allowed_api !== false ? 'available' : 'unavailable',
            });
          createdCount++;
        }
      }

      return NextResponse.json({
        success: true,
        message: `ดึงสินค้า ${createdCount} รายการเข้าสู่หน้าเว็บ (หน้าร้านค้า) สำเร็จแล้ว!`,
      });
    }

    // Default save individual prices
    if (Array.isArray(items)) {
      for (const item of items) {
        if (item.external_code) {
          await supabase
            .from('provider_products')
            .upsert(
              {
                provider_id: provider.id,
                external_product_code: String(item.external_code),
                external_name: item.name,
                cost: Number(item.cost) || 0,
                stock: item.stock ?? 99,
                is_active: Boolean(item.is_active),
                availability: item.allowed_api !== false ? 'available' : 'unavailable',
                metadata: {
                  selling_price: Number(item.selling_price) || 0,
                },
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'provider_id,external_product_code' }
            );
        }
      }
    }

    return NextResponse.json({ success: true, message: 'บันทึกการตั้งค่าสินค้าเรียบร้อย' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
