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

export async function GET() {
  try {
    const supabase = await getSupabase();

    const { data: providers, error } = await supabase
      .from('providers')
      .select('*')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const safeProviders = (providers || []).map((p: any) => ({
      ...p,
      api_key: p.api_key ? maskSecretPreview(p.api_key) : null,
      api_secret: p.api_secret ? maskSecretPreview(p.api_secret) : null,
      has_credentials: !!(p.api_key || p.api_secret),
    }));

    return NextResponse.json({ providers: safeProviders });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
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
      environment = 'sandbox',
      is_test_mode = true,
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
        category: category || 'GAME_TOPUP',
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
