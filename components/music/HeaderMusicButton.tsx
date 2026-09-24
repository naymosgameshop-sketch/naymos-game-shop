'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Volume2, VolumeX, Play, Pause, SkipForward, SkipBack, Music } from 'lucide-react';
import { useMusicPlayer } from './MusicPlayerContext';

export function HeaderMusicButton() {
  const [mounted, setMounted] = useState(false);
  const {
    currentTrack,
    tracks,
    isPlaying,
    isMuted,
    masterVolume,
    togglePlay,
    toggleMute,
    setMasterVolume,
    nextTrack,
    prevTrack,
    selectTrack,
  } = useMusicPlayer();

  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (!mounted) {
    return (
      <div className="relative inline-flex items-center">
        <button
          type="button"
          className="relative flex items-center justify-center h-9 w-9 sm:h-10 sm:w-10 rounded-full border bg-white text-slate-400 border-sky-200 shadow-xs"
          aria-label="เครื่องเล่นเพลงเว็บไซต์"
        >
          <VolumeX className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400" />
        </button>
      </div>
    );
  }

  const isSoundOn = isPlaying && !isMuted && masterVolume > 0;

  return (
    <div className="relative inline-flex items-center" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={
          'relative flex items-center justify-center h-9 w-9 sm:h-10 sm:w-10 rounded-full transition-all duration-200 border ' +
          (isSoundOn
            ? 'bg-sky-500 text-white border-sky-400 shadow-xs shadow-sky-300'
            : 'bg-white hover:bg-sky-50 text-sky-700 border-sky-200 shadow-xs')
        }
        title={isSoundOn ? 'กำลังเล่น: ' + (currentTrack?.title || 'เพลงพื้นหลัง') : 'เพลงประกอบเว็บไซต์'}
        aria-label="เครื่องเล่นเพลงเว็บไซต์"
      >
        {isSoundOn ? (
          <div className="relative flex items-center justify-center">
            <Volume2 className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </div>
        ) : (
          <VolumeX className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-12 z-50 w-72 sm:w-80 rounded-2xl bg-slate-900/95 backdrop-blur-md border border-slate-700 p-4 text-white shadow-2xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400 shrink-0">
                <Music className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-400">เพลงประกอบเว็บไซต์</p>
                <p className="text-xs font-bold text-white truncate">
                  {currentTrack?.title || 'ไม่มีเพลง'}
                </p>
              </div>
            </div>
            <button
              onClick={toggleMute}
              className="px-2 py-1 rounded-md text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition shrink-0"
            >
              {isMuted ? 'เปิดเสียง' : 'ปิดเสียง'}
            </button>
          </div>

          <div className="flex items-center justify-center gap-4 py-3">
            <button onClick={prevTrack} className="p-1.5 text-slate-400 hover:text-white transition" title="เพลงก่อนหน้า">
              <SkipBack className="h-4 w-4" />
            </button>
            <button
              onClick={togglePlay}
              className="p-3 rounded-full bg-gradient-to-r from-sky-400 to-blue-500 text-white shadow-md hover:scale-105 transition-all"
              title={isPlaying ? 'หยุดชั่วคราว (Fade-Out)' : 'เล่นเพลง (Fade-In)'}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-white translate-x-0.5" />}
            </button>
            <button onClick={nextTrack} className="p-1.5 text-slate-400 hover:text-white transition" title="เพลงถัดไป">
              <SkipForward className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-1 pt-1 pb-3">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>ระดับเสียงหลัก (Master)</span>
              <span className="font-mono">{Math.round(masterVolume * 100)}%</span>
            </div>
            <div className="flex items-center gap-2">
              <VolumeX className="h-3.5 w-3.5 text-slate-500 shrink-0" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : masterVolume}
                onChange={(e) => setMasterVolume(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-400"
              />
              <Volume2 className="h-3.5 w-3.5 text-sky-400 shrink-0" />
            </div>
          </div>

          {tracks.length > 1 && (
            <div className="pt-2 border-t border-slate-800">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                รายการเพลง ({tracks.length})
              </p>
              <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
                {tracks.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => selectTrack(t.id)}
                    className={
                      'w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition text-left ' +
                      (currentTrack?.id === t.id
                        ? 'bg-sky-500/20 text-sky-300 font-semibold border border-sky-500/30'
                        : 'text-slate-300 hover:bg-slate-800')
                    }
                  >
                    <span className="truncate">{t.title}</span>
                    {currentTrack?.id === t.id && isPlaying && (
                      <span className="flex gap-0.5 items-end h-3 shrink-0">
                        <span className="w-0.5 h-full bg-sky-400 animate-pulse"></span>
                        <span className="w-0.5 h-2 bg-sky-400 animate-pulse"></span>
                        <span className="w-0.5 h-3 bg-sky-400 animate-pulse"></span>
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
