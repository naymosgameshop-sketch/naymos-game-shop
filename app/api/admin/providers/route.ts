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
    api_base_url: 'https://byshop.me/api/v1',
    is_active: false,
    is_test_mode: false,
    priority: 8,
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

    const { data: dbProviders, error } = await supabase
      .from('providers')
      .select('*')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });

    let providers = dbProviders || [];

    // If database has no providers yet, seed/fallback to built-in providers
    if (providers.length === 0) {
      for (const p of BUILT_IN_PROVIDERS) {
        try {
          await supabase.from('providers').upsert({
            name: p.name,
            code: p.code,
            category: p.category,
            type: p.type,
            api_base_url: p.api_base_url,
            is_active: p.is_active,
            is_test_mode: p.is_test_mode,
            priority: p.priority,
            health_status: p.health_status,
            balance: p.balance,
            currency: p.currency,
          }, { onConflict: 'code' });
        } catch {
          // ignore seeding error if RLS/permission restricts
        }
      }

      // Re-query after upsert attempt
      const { data: reloaded } = await supabase
        .from('providers')
        .select('*')
        .order('priority', { ascending: false });

      providers = (reloaded && reloaded.length > 0) ? reloaded : BUILT_IN_PROVIDERS.map((p, idx) => ({ ...p, id: p.code }));
    }

    const safeProviders = providers.map((p: any) => ({
      ...p,
      api_key: p.api_key ? maskSecretPreview(p.api_key) : null,
      api_secret: p.api_secret ? maskSecretPreview(p.api_secret) : null,
      has_credentials: !!(p.api_key || p.api_secret),
    }));

    return NextResponse.json({
      success: true,
      providers: safeProviders,
    });
  } catch (err: any) {
    // If error querying database, return built-in fallback so UI never goes blank
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

    const credentials_preview = maskSecretPreview(api_key || api_secret);

    const { data, error } = await supabase
      .from('providers')
      .insert({
        name,
        code: code.toLowerCase(),
        category: category || 'PREMIUM_APP',
        type: type || 'ALL',
        api_base_url,
        api_key,
        api_secret,
        credentials_preview,
        environment,
        is_test_mode,
        priority: Number(priority) || 1,
        timeout_ms: Number(timeout_ms) || 10000,
        max_retries: Number(max_retries) || 2,
        health_status: 'UNKNOWN',
      })
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
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
