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

const FADE_IN_DURATION = 1500;
const FADE_OUT_DURATION = 1200;
const FADE_STEPS = 25;

export function MusicPlayerProvider({ children }: { children: React.ReactNode }) {
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [masterVolume, setMasterVolumeState] = useState<number>(0.65);

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
        const stepTime = Math.max(16, durationMs / FADE_STEPS);
        const volStep = (toVol - fromVol) / FADE_STEPS;
        let currentStep = 0;
        audio.volume = Math.min(1, Math.max(0, fromVol));

        fadeIntervalRef.current = setInterval(() => {
          currentStep++;
          const newVol = fromVol + volStep * currentStep;
          if (audio) {
            audio.volume = Math.min(1, Math.max(0, newVol));
          }
          if (currentStep >= FADE_STEPS) {
            clearFade();
            if (audio) audio.volume = Math.min(1, Math.max(0, toVol));
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
    } catch {}
  }, []);

  const refreshPlaylist = useCallback(async () => {
    try {
      const res = await fetch('/api/music', { cache: 'no-store' });
      const data = await res.json();
      if (data?.tracks && Array.isArray(data.tracks) && data.tracks.length > 0) {
        setTracks(data.tracks);
      }
    } catch (e) {
      console.warn('Could not load BGM tracks, fallback loaded', e);
    }
  }, []);

  useEffect(() => {
    refreshPlaylist();
  }, [refreshPlaylist]);

  const switchTrack = useCallback(
    async (nextIdx: number) => {
      if (isTransitioningRef.current || !tracks[nextIdx]) return;
      isTransitioningRef.current = true;

      const audio = audioRef.current;
      try {
        if (audio && !audio.paused && isPlaying) {
          await fadeOut();
        }

        const nextTrackData = tracks[nextIdx];
        setCurrentIndex(nextIdx);

        if (audio) {
          audio.src = nextTrackData.audio_url;
          const nextTargetVol = isMuted ? 0 : masterVolume * (nextTrackData.track_volume ?? 0.7);
          await fadeIn(nextTargetVol);
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
    if (!audio) return;
    const track = tracks[currentIndex] || tracks[0];
    if (!track) return;

    if (!audio.src || !audio.src.includes(track.audio_url)) {
      audio.src = track.audio_url;
    }
    const finalVol = isMuted ? 0 : masterVolume * (track.track_volume ?? 0.7);
    await fadeIn(finalVol);
  }, [tracks, currentIndex, isMuted, masterVolume, fadeIn]);

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
      } catch {}
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
      } catch {}

      if (!isMuted && audioRef.current && isPlaying) {
        const target = safe * (currentTrack?.track_volume ?? 0.7);
        audioRef.current.volume = target;
      }
    },
    [isMuted, isPlaying, currentTrack]
  );

  // Play next track, and loop back to track 0 when reaching the end!
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
          // Song finished: automatic fade-out and advance to next track, loops back to first
          nextTrack();
        }}
      />
      {children}
    </MusicPlayerContext.Provider>
  );
}

const DEFAULT_PLAYER: MusicPlayerContextType = {
  tracks: [],
  currentTrack: null,
  currentIndex: 0,
  isPlaying: false,
  isMuted: false,
  masterVolume: 0.65,
  effectiveVolume: 0,
  togglePlay: () => {},
  play: async () => {},
  pause: async () => {},
  toggleMute: () => {},
  setMasterVolume: () => {},
  nextTrack: () => {},
  prevTrack: () => {},
  selectTrack: () => {},
  refreshPlaylist: async () => {},
};

export function useMusicPlayer() {
  const context = useContext(MusicPlayerContext);
  if (!context) {
    return DEFAULT_PLAYER;
  }
  return context;
}
