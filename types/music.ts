export interface MusicTrack {
  id: string;
  title: string;
  audio_url: string;
  track_volume: number; // 0.0 - 1.0 (per-track volume, default 0.70)
  is_active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}
