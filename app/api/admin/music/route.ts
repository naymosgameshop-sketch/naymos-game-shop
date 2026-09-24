import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { MusicTrack } from '@/types/music';

const FALLBACK_TRACKS: MusicTrack[] = [
  {
    id: 'default-bgm-01',
    title: 'NayMos Theme 01 (Lobby)',
    audio_url: '/audio/bgm-01.mp3',
    track_volume: 0.65,
    is_active: true,
    sort_order: 1,
  },
  {
    id: 'default-bgm-02',
    title: 'NayMos Theme 02 (Chill)',
    audio_url: '/audio/bgm-02.mp3',
    track_volume: 0.65,
    is_active: true,
    sort_order: 2,
  },
];

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('site_music')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      return NextResponse.json({
        success: true,
        tracks: FALLBACK_TRACKS,
        isFallback: true,
        schemaMissing: error.message?.includes('schema cache') || error.code === '42P01',
        error: error.message,
      });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ success: true, tracks: FALLBACK_TRACKS, isFallback: true });
    }

    return NextResponse.json({ success: true, tracks: data, isFallback: false });
  } catch (err: any) {
    return NextResponse.json({
      success: true,
      tracks: FALLBACK_TRACKS,
      isFallback: true,
      error: err?.message,
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Check if this is a bulk reorder request
    if (body.action === 'reorder' && Array.isArray(body.orders)) {
      const supabase = await createClient();
      for (const item of body.orders) {
        if (item.id && !item.id.startsWith('default-')) {
          await supabase
            .from('site_music')
            .update({ sort_order: item.sort_order })
            .eq('id', item.id);
        }
      }
      return NextResponse.json({ success: true });
    }

    const { title, audio_url, track_volume = 0.7, is_active = true, sort_order = 0 } = body;

    if (!title || !audio_url) {
      return NextResponse.json({ error: 'Title and audio_url are required' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('site_music')
      .insert({
        title,
        audio_url,
        track_volume: Math.min(1, Math.max(0, Number(track_volume))),
        is_active: Boolean(is_active),
        sort_order: Number(sort_order) || 0,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, track: data });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, title, audio_url, track_volume, is_active, sort_order } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const supabase = await createClient();

    // Check if trying to update fallback item into real DB
    if (id.startsWith('default-')) {
      // Upsert into real DB
      const { data, error } = await supabase
        .from('site_music')
        .insert({
          title: title || 'เพลงใหม่',
          audio_url: audio_url || '/audio/bgm-01.mp3',
          track_volume: track_volume !== undefined ? Math.min(1, Math.max(0, Number(track_volume))) : 0.65,
          is_active: is_active !== undefined ? Boolean(is_active) : true,
          sort_order: Number(sort_order) || 1,
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, track: data });
    }

    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (title !== undefined) updates.title = title;
    if (audio_url !== undefined) updates.audio_url = audio_url;
    if (track_volume !== undefined) updates.track_volume = Math.min(1, Math.max(0, Number(track_volume)));
    if (is_active !== undefined) updates.is_active = Boolean(is_active);
    if (sort_order !== undefined) updates.sort_order = Number(sort_order);

    const { data, error } = await supabase
      .from('site_music')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, track: data });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    if (id.startsWith('default-')) {
      return NextResponse.json({ success: true });
    }

    const supabase = await createClient();
    const { error } = await supabase.from('site_music').delete().eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
