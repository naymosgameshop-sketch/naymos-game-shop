-- Migration 035: Site Background Music System (additive, no existing tables touched)
CREATE TABLE IF NOT EXISTS public.site_music (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  audio_url TEXT NOT NULL,
  track_volume NUMERIC(3,2) NOT NULL DEFAULT 0.70 CHECK (track_volume >= 0 AND track_volume <= 1),
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_site_music_active_sort ON public.site_music(is_active, sort_order ASC);

ALTER TABLE public.site_music ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active music" ON public.site_music;
CREATE POLICY "Public can view active music" ON public.site_music
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage site music" ON public.site_music;
CREATE POLICY "Admins can manage site music" ON public.site_music
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Seed default initial tracks from uploaded audio
INSERT INTO public.site_music (title, audio_url, track_volume, is_active, sort_order)
VALUES
  ('NayMos Theme 01 (Lobby)', '/audio/bgm-01.mp3', 0.65, true, 1),
  ('NayMos Theme 02 (Chill)', '/audio/bgm-02.mp3', 0.65, true, 2)
ON CONFLICT DO NOTHING;
