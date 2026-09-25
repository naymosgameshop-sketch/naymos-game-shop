import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
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

export async function GET(
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
      query = query.eq('code', id.toLowerCase());
    }

    const { data: provider, error } = await query.maybeSingle();

    if (error || !provider) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    return NextResponse.json({
      provider: {
        ...provider,
        api_key: provider.api_key ? maskSecretPreview(provider.api_key) : null,
        api_secret: provider.api_secret ? maskSecretPreview(provider.api_secret) : null,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
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

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (body.name !== undefined) updates.name = body.name;
    if (body.category !== undefined) updates.category = body.category;
    if (body.api_base_url !== undefined) updates.api_base_url = body.api_base_url;
    if (body.is_active !== undefined) updates.is_active = body.is_active;
    if (body.is_test_mode !== undefined) updates.is_test_mode = body.is_test_mode;
    if (body.environment !== undefined) updates.environment = body.environment;
    if (body.priority !== undefined) updates.priority = Number(body.priority);
    if (body.timeout_ms !== undefined) updates.timeout_ms = Number(body.timeout_ms);
    if (body.max_retries !== undefined) updates.max_retries = Number(body.max_retries);
    if (body.balance !== undefined) updates.balance = Number(body.balance);
    if (body.health_status !== undefined) updates.health_status = body.health_status;
    if (body.health_error_message !== undefined) updates.health_error_message = body.health_error_message;

    if (typeof body.api_key === 'string' && body.api_key.trim() !== '') {
      updates.api_key = body.api_key.trim();
      updates.credentials_preview = maskSecretPreview(body.api_key.trim());
    }

    if (typeof body.api_secret === 'string' && body.api_secret.trim() !== '') {
      updates.api_secret = body.api_secret.trim();
      if (!updates.credentials_preview) {
        updates.credentials_preview = maskSecretPreview(body.api_secret.trim());
      }
    }

    // Find existing provider by UUID or code
    let existingProvider: any = null;
    if (UUID_REGEX.test(id)) {
      const { data } = await supabase.from('providers').select('id, code').eq('id', id).maybeSingle();
      existingProvider = data;
    } else {
      const { data } = await supabase.from('providers').select('id, code').eq('code', id.toLowerCase()).maybeSingle();
      existingProvider = data;
    }

    let finalData: any = null;

    
    // Enforce single active provider per system category
    if (updates.is_active === true) {
      const targetCategory = body.category || existingProvider?.category;
      if (targetCategory) {
        await supabase
          .from('providers')
          .update({ is_active: false })
          .eq('category', targetCategory)
          .neq('id', existingProvider ? existingProvider.id : '00000000-0000-0000-0000-000000000000');
      }
    }

    if (existingProvider) {
      const { data, error } = await supabase
        .from('providers')
        .update(updates)
        .eq('id', existingProvider.id)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      finalData = data;
    } else {
      const providerCode = body.code || (UUID_REGEX.test(id) ? `prov_${Date.now()}` : id.toLowerCase());
      const insertPayload = {
        name: body.name || providerCode,
        code: providerCode,
        category: body.category || 'GAME_TOPUP',
        type: 'ALL',
        api_base_url: body.api_base_url || '',
        is_active: body.is_active !== undefined ? body.is_active : true,
        is_test_mode: body.is_test_mode !== undefined ? body.is_test_mode : (body.environment === 'sandbox'),
        environment: body.environment || 'sandbox',
        ...updates,
      };

      const { data, error } = await supabase
        .from('providers')
        .insert(insertPayload)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      finalData = data;
    }

    const safeProvider = finalData ? {
      ...finalData,
      api_key: finalData.api_key ? maskSecretPreview(finalData.api_key) : null,
      api_secret: finalData.api_secret ? maskSecretPreview(finalData.api_secret) : null,
      has_credentials: !!(finalData.api_key || finalData.api_secret),
    } : null;

    return NextResponse.json({ success: true, provider: safeProvider });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await getSupabase();

    let targetId = id;
    if (!UUID_REGEX.test(id)) {
      const { data } = await supabase.from('providers').select('id').eq('code', id.toLowerCase()).maybeSingle();
      if (!data) {
        return NextResponse.json({ success: true, message: 'Provider removed' });
      }
      targetId = data.id;
    }

    await supabase.from('provider_routes').delete().eq('provider_id', targetId);
    await supabase.from('api_transactions').delete().eq('provider_id', targetId);
    await supabase.from('api_logs').delete().eq('provider_id', targetId);

    const { error } = await supabase.from('providers').delete().eq('id', targetId);
    if (error) {
      await supabase.from('providers').update({ is_active: false }).eq('id', targetId);
    }

    return NextResponse.json({ success: true, message: 'Provider deleted successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
