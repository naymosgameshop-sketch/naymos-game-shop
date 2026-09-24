'use client';

import { useEffect, useRef } from 'react';
import { useMusicPlayer } from './MusicPlayerContext';

export function GlobalBGMPlayer() {
  const { isPlaying, play, currentTrack, tracks } = useMusicPlayer();
  const hasTriggeredRef = useRef(false);

  useEffect(() => {
    if (hasTriggeredRef.current || tracks.length === 0) return;

    // Wait ~3 seconds after page load before starting first song
    const timer = setTimeout(() => {
      if (hasTriggeredRef.current) return;
      hasTriggeredRef.current = true;

      play().catch(() => {
        // Autoplay blocked by browser policy: arm one-time interaction listener to play smoothly
        const unlock = () => {
          play().catch(() => {});
          window.removeEventListener('pointerdown', unlock);
          window.removeEventListener('touchstart', unlock);
          window.removeEventListener('click', unlock);
          window.removeEventListener('keydown', unlock);
        };
        window.addEventListener('pointerdown', unlock, { once: true });
        window.addEventListener('touchstart', unlock, { once: true });
        window.addEventListener('click', unlock, { once: true });
        window.addEventListener('keydown', unlock, { once: true });
      });
    }, 3000);

    return () => clearTimeout(timer);
  }, [tracks, play]);

  return null;
}
