import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { maskSecretPreview } from '@/lib/providers/security/masking';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: provider, error } = await supabase
      .from('providers')
      .select('*')
      .eq('id', id)
      .single();

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
    const supabase = await createClient();
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

    if (body.api_key !== undefined && body.api_key !== null) {
      updates.api_key = body.api_key;
      updates.credentials_preview = maskSecretPreview(body.api_key);
    }

    if (body.api_secret !== undefined && body.api_secret !== null) {
      updates.api_secret = body.api_secret;
      if (!updates.credentials_preview) {
        updates.credentials_preview = maskSecretPreview(body.api_secret);
      }
    }

    const { data, error } = await supabase
      .from('providers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, provider: data });
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
    const supabase = await createClient();

    // Clean up dependent foreign keys if needed before deleting provider
    await supabase.from('provider_routes').delete().eq('provider_id', id);
    await supabase.from('api_transactions').delete().eq('provider_id', id);
    await supabase.from('api_logs').delete().eq('provider_id', id);

    const { error } = await supabase
      .from('providers')
      .delete()
      .eq('id', id);

    if (error) {
      // Fallback to soft disable if delete is blocked by constraint
      const { error: softErr } = await supabase
        .from('providers')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (softErr) {
        return NextResponse.json({ error: error.message || softErr.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, message: 'Provider disabled' });
    }

    return NextResponse.json({ success: true, message: 'Provider deleted successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
