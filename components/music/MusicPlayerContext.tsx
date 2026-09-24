'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { MusicTrack } from '@/types/music';

interface MusicPlayerContextType {
  tracks: MusicTrack[];
  currentTrack: MusicTrack | null;
  currentIndex: number;
  isPlaying: boolean;
  isMuted: boolean;
  masterVolume: number;
  effectiveVolume: number;
  hasUserInteracted: boolean;
  togglePlay: () => void;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  toggleMute: () => void;
  setMasterVolume: (vol: number) => void;
  nextTrack: () => void;
  prevTrack: () => void;
  selectTrack: (trackId: string) => void;
  refreshPlaylist: () => Promise<void>;
}

const MusicPlayerContext = createContext<MusicPlayerContextType | undefined>(undefined);

// Automatic smooth fade durations (applied to EVERY track start/end/switch)
const FADE_IN_DURATION = 1500;
const FADE_OUT_DURATION = 1200;
const FADE_STEPS = 25;

export function MusicPlayerProvider({ children }: { children: React.ReactNode }) {
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [masterVolume, setMasterVolumeState] = useState<number>(0.65);
  const [hasUserInteracted, setHasUserInteracted] = useState<boolean>(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isTransitioningRef = useRef<boolean>(false);

  const currentTrack = tracks[currentIndex] || null;
  const trackVolume = currentTrack?.track_volume ?? 0.7;
  const targetVolume = isMuted ? 0 : masterVolume * trackVolume;

  const clearFade = useCallback(() => {
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
    }
  }, []);

  const rampVolume = useCallback(
    (fromVol: number, toVol: number, durationMs: number): Promise<void> => {
      clearFade();
      const audio = audioRef.current;
      if (!audio) return Promise.resolve();

      return new Promise<void>((resolve) => {
        const stepTime = durationMs / FADE_STEPS;
        const volStep = (toVol - fromVol) / FADE_STEPS;
        let currentStep = 0;
        audio.volume = Math.min(1, Math.max(0, fromVol));

        fadeIntervalRef.current = setInterval(() => {
          currentStep++;
          const newVol = fromVol + volStep * currentStep;
          audio.volume = Math.min(1, Math.max(0, newVol));
          if (currentStep >= FADE_STEPS) {
            clearFade();
            audio.volume = Math.min(1, Math.max(0, toVol));
            resolve();
          }
        }, stepTime);
      });
    },
    [clearFade]
  );

  const fadeIn = useCallback(
    async (target: number) => {
      const audio = audioRef.current;
      if (!audio) return;
      audio.volume = 0;
      await audio.play();
      setIsPlaying(true);
      await rampVolume(0, target, FADE_IN_DURATION);
    },
    [rampVolume]
  );

  const fadeOut = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || audio.paused) return;
    const currentVol = audio.volume;
    await rampVolume(currentVol, 0, FADE_OUT_DURATION);
    audio.pause();
    setIsPlaying(false);
  }, [rampVolume]);

  useEffect(() => {
    try {
      const savedVol = localStorage.getItem('naymos_bgm_volume');
      if (savedVol !== null) setMasterVolumeState(Number(savedVol));
      const savedMute = localStorage.getItem('naymos_bgm_muted');
      if (savedMute !== null) setIsMuted(savedMute === 'true');
    } catch {
      // Ignore storage errors
    }
  }, []);

  const refreshPlaylist = useCallback(async () => {
    try {
      const res = await fetch('/api/music', { cache: 'no-store' });
      const data = await res.json();
      if (data?.tracks && Array.isArray(data.tracks) && data.tracks.length > 0) {
        setTracks(data.tracks);
      }
    } catch (e) {
      console.warn('Could not load BGM tracks, will use fallback', e);
    }
  }, []);

  useEffect(() => {
    refreshPlaylist();
  }, [refreshPlaylist]);

  useEffect(() => {
    const onInteract = () => {
      setHasUserInteracted(true);
      window.removeEventListener('click', onInteract);
      window.removeEventListener('keydown', onInteract);
      window.removeEventListener('touchstart', onInteract);
    };

    window.addEventListener('click', onInteract, { once: true });
    window.addEventListener('keydown', onInteract, { once: true });
    window.addEventListener('touchstart', onInteract, { once: true });

    return () => {
      window.removeEventListener('click', onInteract);
      window.removeEventListener('keydown', onInteract);
      window.removeEventListener('touchstart', onInteract);
    };
  }, []);

  const switchTrack = useCallback(
    async (nextIdx: number) => {
      if (isTransitioningRef.current || !tracks[nextIdx]) return;
      isTransitioningRef.current = true;

      const audio = audioRef.current;
      try {
        if (audio && !audio.paused && isPlaying) {
          await fadeOut(); // smooth fade-out of current track
        }

        const nextTrackData = tracks[nextIdx];
        setCurrentIndex(nextIdx);

        if (audio) {
          audio.src = nextTrackData.audio_url;
          const nextTargetVol = isMuted ? 0 : masterVolume * (nextTrackData.track_volume ?? 0.7);
          await fadeIn(nextTargetVol); // smooth fade-in of next track
        }
      } catch (err) {
        console.warn('Playback switch error:', err);
      } finally {
        isTransitioningRef.current = false;
      }
    },
    [tracks, isPlaying, isMuted, masterVolume, fadeOut, fadeIn]
  );

  const play = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;
    if (!audio.src || !audio.src.includes(currentTrack.audio_url)) {
      audio.src = currentTrack.audio_url;
    }
    const finalVol = isMuted ? 0 : masterVolume * (currentTrack.track_volume ?? 0.7);
    await fadeIn(finalVol);
  }, [currentTrack, isMuted, masterVolume, fadeIn]);

  const pause = useCallback(async () => {
    await fadeOut();
  }, [fadeOut]);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('naymos_bgm_muted', String(next));
      } catch {
        // Ignore storage errors
      }
      const audio = audioRef.current;
      if (audio && isPlaying) {
        const target = next ? 0 : masterVolume * (currentTrack?.track_volume ?? 0.7);
        rampVolume(audio.volume, target, 400);
      }
      return next;
    });
  }, [masterVolume, currentTrack, isPlaying, rampVolume]);

  const setMasterVolume = useCallback(
    (vol: number) => {
      const safe = Math.min(1, Math.max(0, vol));
      setMasterVolumeState(safe);
      try {
        localStorage.setItem('naymos_bgm_volume', String(safe));
      } catch {
        // Ignore storage errors
      }

      if (!isMuted && audioRef.current && isPlaying) {
        const target = safe * (currentTrack?.track_volume ?? 0.7);
        audioRef.current.volume = target;
      }
    },
    [isMuted, isPlaying, currentTrack]
  );

  const nextTrack = useCallback(() => {
    if (tracks.length === 0) return;
    const nextIdx = (currentIndex + 1) % tracks.length;
    switchTrack(nextIdx);
  }, [tracks, currentIndex, switchTrack]);

  const prevTrack = useCallback(() => {
    if (tracks.length === 0) return;
    const prevIdx = (currentIndex - 1 + tracks.length) % tracks.length;
    switchTrack(prevIdx);
  }, [tracks, currentIndex, switchTrack]);

  const selectTrack = useCallback(
    (trackId: string) => {
      const idx = tracks.findIndex((t) => t.id === trackId);
      if (idx !== -1) {
        switchTrack(idx);
      }
    },
    [tracks, switchTrack]
  );

  return (
    <MusicPlayerContext.Provider
      value={{
        tracks,
        currentTrack,
        currentIndex,
        isPlaying,
        isMuted,
        masterVolume,
        effectiveVolume: targetVolume,
        hasUserInteracted,
        togglePlay,
        play,
        pause,
        toggleMute,
        setMasterVolume,
        nextTrack,
        prevTrack,
        selectTrack,
        refreshPlaylist,
      }}
    >
      <audio
        ref={audioRef}
        preload="auto"
        onEnded={() => {
          nextTrack();
        }}
      />
      {children}
    </MusicPlayerContext.Provider>
  );
}

export function useMusicPlayer() {
  const context = useContext(MusicPlayerContext);
  if (!context) {
    throw new Error('useMusicPlayer must be used within MusicPlayerProvider');
  }
  return context;
}
