import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { maskSecretPreview } from '@/lib/providers/security/masking';

export const dynamic = 'force-dynamic';

async function getSupabase() {
  try {
    return createAdminClient();
  } catch {
    return await createClient();
  }
}

const BUILT_IN_PROVIDERS = [
  {
    name: 'FinShop',
    code: 'finshop',
    category: 'PREMIUM_APP',
    type: 'ALL',
    api_base_url: 'https://finshop.me/api/v1',
    is_active: true,
    is_test_mode: false,
    priority: 10,
    health_status: 'HEALTHY',
    balance: 0,
    currency: 'THB',
  },
  {
    name: 'BYShop',
    code: 'byshop',
    category: 'PREMIUM_APP',
    type: 'ALL',
    api_base_url: 'https://byshop.me/api',
    is_active: false,
    is_test_mode: false,
    priority: 9,
    health_status: 'UNKNOWN',
    balance: 0,
    currency: 'THB',
  },
  {
    name: 'ระบบเติมเกมอัตโนมัติ',
    code: 'game_mock',
    category: 'GAME_TOPUP',
    type: 'ALL',
    api_base_url: 'https://api.naymos.com/topup/v1',
    is_active: true,
    is_test_mode: false,
    priority: 10,
    health_status: 'HEALTHY',
    balance: 0,
    currency: 'THB',
  },
  {
    name: 'PromptPay SCB QR',
    code: 'promptpay_scb',
    category: 'PAYMENT',
    type: 'ALL',
    api_base_url: 'https://api.naymos.com/payment/v1',
    is_active: true,
    is_test_mode: false,
    priority: 10,
    health_status: 'HEALTHY',
    balance: 0,
    currency: 'THB',
  },
  {
    name: 'NayMos AI Gateway',
    code: 'ai_gateway',
    category: 'AI',
    type: 'ALL',
    api_base_url: 'https://api.naymos.com/ai/v1',
    is_active: true,
    is_test_mode: false,
    priority: 10,
    health_status: 'HEALTHY',
    balance: 0,
    currency: 'THB',
  },
];

export async function GET() {
  try {
    const supabase = await getSupabase();

        // 1. Repair any legacy/corrupted provider records in DB
    try {
      await supabase
        .from('providers')
        .update({
          code: 'finshop',
          name: 'FinShop',
          category: 'PREMIUM_APP',
          api_base_url: 'https://finshop.me/api/v1',
        })
        .or('code.eq.new,code.eq.finshop,name.ilike.%finshop%');
    } catch {
      // Ignore if update fails
    }

    const { data: dbProviders } = await supabase
      .from('providers')
      .select('*')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });

        let providers = dbProviders || [];

    // Ensure finshop and byshop are normalized to PREMIUM_APP
    providers = providers.map((p: any) => {
      const c = (p.code || '').toLowerCase();
      if (c === 'finshop' || c === 'byshop') {
        return { ...p, category: 'PREMIUM_APP' };
      }
      return p;
    });

    // Ensure finshop and byshop are seeded if missing
    for (const seed of BUILT_IN_PROVIDERS) {
      const exists = providers.some((p: any) => p.code === seed.code);
      if (!exists) {
        try {
          const { data: inserted } = await supabase
            .from('providers')
            .upsert({
              name: seed.name,
              code: seed.code,
              category: seed.category,
              type: seed.type,
              api_base_url: seed.api_base_url,
              is_active: seed.is_active,
              is_test_mode: seed.is_test_mode,
              priority: seed.priority,
              health_status: seed.health_status,
              balance: seed.balance,
              currency: seed.currency,
            }, { onConflict: 'code' })
            .select()
            .single();

          if (inserted) {
            providers.push(inserted);
          }
        } catch {
          providers.push({ ...seed, id: seed.code });
        }
      }
    }

        // STRICT FILTER: In PREMIUM_APP, allow ONLY FinShop and BYShop (user requirement)
    providers = providers.filter((p: any) => {
      const code = (p.code || '').toLowerCase();
      if (code === 'finshop' || code === 'byshop') {
        return true;
      }
      if (p.category === 'PREMIUM_APP') {
        return code === 'finshop' || code === 'byshop';
      }
      return true;
    });

    const safeProviders = providers.map((p: any) => {
      const hasKey = Boolean(p.api_key && p.api_key.trim() !== '');
      const hasSecret = Boolean(p.api_secret && p.api_secret.trim() !== '');
      const preview = p.credentials_preview || (hasKey ? maskSecretPreview(p.api_key) : (hasSecret ? maskSecretPreview(p.api_secret) : null));

      return {
        ...p,
        api_key: hasKey ? preview : null,
        api_secret: hasSecret ? preview : null,
        credentials_preview: preview,
        has_credentials: hasKey || hasSecret,
      };
    });

    return NextResponse.json({
      success: true,
      providers: safeProviders,
    });
  } catch (err: any) {
    const fallback = BUILT_IN_PROVIDERS.map((p) => ({ ...p, id: p.code, has_credentials: false }));
    return NextResponse.json({
      success: true,
      providers: fallback,
      warning: err.message,
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await getSupabase();
    const body = await req.json();

    const {
      name,
      code,
      category,
      type,
      api_base_url,
      api_key,
      api_secret,
      environment = 'production',
      is_test_mode = false,
      priority = 1,
      timeout_ms = 10000,
      max_retries = 2,
    } = body;

    if (!name || !code) {
      return NextResponse.json({ error: 'Name and Code are required' }, { status: 400 });
    }

    const cleanCode = code.toLowerCase() === 'new' ? (name.toLowerCase().includes('finshop') ? 'finshop' : 'byshop') : code.toLowerCase();
    const credentials_preview = maskSecretPreview(api_key || api_secret);

    const { data, error } = await supabase
      .from('providers')
      .upsert({
        name,
        code: cleanCode,
        category: category || 'PREMIUM_APP',
        type: type || 'ALL',
        api_base_url: api_base_url || (cleanCode === 'finshop' ? 'https://finshop.me/api/v1' : 'https://byshop.me/api'),
        api_key,
        api_secret,
        credentials_preview,
        environment,
        is_test_mode,
        priority: Number(priority) || 1,
        timeout_ms: Number(timeout_ms) || 10000,
        max_retries: Number(max_retries) || 2,
        health_status: 'UNKNOWN',
      }, { onConflict: 'code' })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      provider: {
        ...data,
        api_key: data.api_key ? maskSecretPreview(data.api_key) : null,
        api_secret: data.api_secret ? maskSecretPreview(data.api_secret) : null,
        has_credentials: Boolean(data.api_key || data.api_secret),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
