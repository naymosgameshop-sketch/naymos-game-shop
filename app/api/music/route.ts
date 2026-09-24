import { NextResponse } from 'next/server';
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
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error || !data || data.length === 0) {
      return NextResponse.json({ success: true, tracks: FALLBACK_TRACKS });
    }

    return NextResponse.json({ success: true, tracks: data });
  } catch (err) {
    console.error('Failed to get music tracks:', err);
    return NextResponse.json({ success: true, tracks: FALLBACK_TRACKS });
  }
}
