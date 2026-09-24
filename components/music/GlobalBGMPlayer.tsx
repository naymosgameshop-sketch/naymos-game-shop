'use client';

import { useEffect, useRef } from 'react';
import { useMusicPlayer } from './MusicPlayerContext';

export function GlobalBGMPlayer() {
  const { isPlaying, play, currentTrack, hasUserInteracted } = useMusicPlayer();
  const triedAutoplayRef = useRef<boolean>(false);

  // Gentle autoplay attempt on first user interaction (browser policy safe)
  useEffect(() => {
    if (hasUserInteracted && !isPlaying && !triedAutoplayRef.current && currentTrack) {
      triedAutoplayRef.current = true;
      play().catch(() => {
        // Browser rejected, user can press the speaker button to start
      });
    }
  }, [hasUserInteracted, isPlaying, currentTrack, play]);

  return null;
}
