'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Music,
  Plus,
  Trash2,
  Volume2,
  Play,
  Pause,
  Save,
  CheckCircle,
  RefreshCw,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  Database,
  Minus,
} from 'lucide-react';
import { MusicTrack } from '@/types/music';

export default function AdminMusicPage() {
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSchemaMissing, setIsSchemaMissing] = useState(false);

  const [newTitle, setNewTitle] = useState('');
  const [newAudioUrl, setNewAudioUrl] = useState('');
  const [newVolume, setNewVolume] = useState(0.7);
  const [isAdding, setIsAdding] = useState(false);

  // Live preview
  const [previewTrackId, setPreviewTrackId] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  const fetchTracks = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/music');
      const data = await res.json();
      if (data?.tracks) {
        setTracks(data.tracks);
      }
      if (data?.schemaMissing) {
        setIsSchemaMissing(true);
      } else {
        setIsSchemaMissing(false);
      }
    } catch {
      setMessage({ type: 'error', text: 'ไม่สามารถโหลดรายการเพลงได้' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTracks();
    return () => {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
    };
  }, []);

  // Update volume in real-time while preview is playing
  const handleVolumeChange = (trackId: string, newVol: number) => {
    const safeVol = Math.min(1, Math.max(0, Math.round(newVol * 100) / 100));
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, track_volume: safeVol } : t))
    );

    // If currently testing this track, sync audio volume instantly!
    if (previewTrackId === trackId && previewAudioRef.current) {
      previewAudioRef.current.volume = safeVol;
    }
  };

  // Move track up (play sooner)
  const moveTrackUp = async (index: number) => {
    if (index === 0) return;
    const newTracks = [...tracks];
    const temp = newTracks[index - 1];
    newTracks[index - 1] = newTracks[index];
    newTracks[index] = temp;

    // re-assign sort_orders
    const updated = newTracks.map((t, idx) => ({ ...t, sort_order: idx + 1 }));
    setTracks(updated);
    await saveNewOrder(updated);
  };

  // Move track down (play later)
  const moveTrackDown = async (index: number) => {
    if (index === tracks.length - 1) return;
    const newTracks = [...tracks];
    const temp = newTracks[index + 1];
    newTracks[index + 1] = newTracks[index];
    newTracks[index] = temp;

    const updated = newTracks.map((t, idx) => ({ ...t, sort_order: idx + 1 }));
    setTracks(updated);
    await saveNewOrder(updated);
  };

  const saveNewOrder = async (orderList: MusicTrack[]) => {
    setIsSavingOrder(true);
    try {
      const orders = orderList.map((t, idx) => ({ id: t.id, sort_order: idx + 1 }));
      const res = await fetch('/api/admin/music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reorder', orders }),
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'จัดอันดับเพลงเรียบร้อยแล้ว (เพลงบนสุดจะเล่นเป็นเพลงแรก)' });
      }
    } catch {
      setMessage({ type: 'error', text: 'บันทึกลำดับไม่สำเร็จ' });
    } finally {
      setIsSavingOrder(false);
    }
  };

  const handleUpdate = async (track: MusicTrack) => {
    setSavingId(track.id);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/music', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(track),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Update failed');
      }
      if (data.track) {
        setTracks((prev) => prev.map((t) => (t.id === track.id ? data.track : t)));
      }
      setMessage({ type: 'success', text: 'บันทึกเพลง "' + track.title + '" (เสียง ' + Math.round(track.track_volume * 100) + '%) เรียบร้อยแล้ว' });
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.message?.includes('schema cache')
          ? 'ฐานข้อมูลยังไม่มีตาราง site_music กรุณารัน SQL Migration ใน Supabase ก่อน'
          : err.message || 'บันทึกล้มเหลว',
      });
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm('ต้องการลบเพลง "' + title + '" หรือไม่?')) return;
    try {
      const res = await fetch('/api/admin/music?id=' + id, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Delete failed');
      setTracks((prev) => prev.filter((t) => t.id !== id));
      if (previewTrackId === id && previewAudioRef.current) {
        previewAudioRef.current.pause();
        setPreviewTrackId(null);
      }
      setMessage({ type: 'success', text: 'ลบเพลง "' + title + '" เรียบร้อยแล้ว' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'ลบล้มเหลว' });
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newAudioUrl.trim()) return;
    setIsAdding(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          audio_url: newAudioUrl.trim(),
          track_volume: newVolume,
          is_active: true,
          sort_order: tracks.length + 1,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Add failed');
      setTracks((prev) => [...prev, data.track]);
      setNewTitle('');
      setNewAudioUrl('');
      setMessage({ type: 'success', text: 'เพิ่มเพลงใหม่สำเร็จ' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'เพิ่มเพลงไม่สำเร็จ' });
    } finally {
      setIsAdding(false);
    }
  };

  const togglePreview = (track: MusicTrack) => {
    if (previewTrackId === track.id) {
      previewAudioRef.current?.pause();
      setPreviewTrackId(null);
    } else {
      if (previewAudioRef.current) previewAudioRef.current.pause();
      const audio = new Audio(track.audio_url);
      audio.volume = track.track_volume;
      audio.play().catch(console.error);
      audio.onended = () => setPreviewTrackId(null);
      previewAudioRef.current = audio;
      setPreviewTrackId(track.id);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-700/60 pb-5">
        <div>
          <div className="flex items-center gap-2 text-sky-400">
            <Music className="h-6 w-6" />
            <h1 className="text-xl sm:text-2xl font-bold text-white">จัดการระบบเพลงพื้นหลัง (BGM)</h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            เข้าเว็บ 3 วินาทีเพลงแรกจะเริ่มเล่นอัตโนมัติ (Fade-In) และวนลูปเพลงไปเรื่อยๆ | จัดอันดับเพลงที่ต้องการให้เล่นก่อน-หลังได้
          </p>
        </div>
        <button
          onClick={fetchTracks}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm border border-slate-700 transition self-start sm:self-auto"
        >
          <RefreshCw className={'h-4 w-4 ' + (loading ? 'animate-spin' : '')} />
          รีเฟรช
        </button>
      </div>

      {isSchemaMissing && (
        <div className="flex items-start gap-3 p-4 rounded-xl border bg-amber-950/40 border-amber-500/40 text-amber-200 text-sm">
          <Database className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-amber-300">
              ยังไม่พบตาราง public.site_music ในฐานข้อมูล Supabase
            </p>
            <p className="text-xs text-amber-200/90 leading-relaxed">
              กรุณานำโค้ด Migration 035 ไปรันใน <strong>Supabase SQL Editor</strong> และรันคำสั่ง{' '}
              <code className="bg-black/40 px-1 py-0.5 rounded font-mono text-amber-300">
                NOTIFY pgrst, &apos;reload schema&apos;;
              </code>{' '}
              เพื่อให้ระบบบันทึกลงฐานข้อมูลจริงได้
            </p>
          </div>
        </div>
      )}

      {message && (
        <div
          className={
            'flex items-center gap-2 p-3.5 rounded-xl border text-sm ' +
            (message.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
              : 'bg-rose-950/40 border-rose-500/40 text-rose-200')
          }
        >
          {message.type === 'success' ? (
            <CheckCircle className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          {message.text}
        </div>
      )}

      {/* Add New Song */}
      <div className="rounded-2xl bg-slate-800/80 border border-slate-700 p-5 shadow-lg">
        <h2 className="text-base font-bold text-white flex items-center gap-2 mb-4">
          <Plus className="h-4 w-4 text-sky-400" />
          เพิ่มเพลงใหม่
        </h2>
        <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-4">
            <label className="block text-xs font-semibold text-slate-300 mb-1">ชื่อเพลง</label>
            <input
              type="text"
              placeholder="เช่น NayMos Theme 03"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-sm focus:border-sky-400 focus:outline-none"
              required
            />
          </div>
          <div className="md:col-span-5">
            <label className="block text-xs font-semibold text-slate-300 mb-1">URL หรือไฟล์เพลง (Path)</label>
            <input
              type="text"
              placeholder="เช่น /audio/bgm-01.mp3 หรือ URL HTTPS"
              value={newAudioUrl}
              onChange={(e) => setNewAudioUrl(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-sm focus:border-sky-400 focus:outline-none font-mono text-xs"
              required
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              เสียงเพลงนี้ ({Math.round(newVolume * 100)}%)
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={newVolume}
              onChange={(e) => setNewVolume(parseFloat(e.target.value))}
              className="w-full h-8 cursor-pointer accent-sky-400"
            />
          </div>
          <div className="md:col-span-1 flex items-end">
            <button
              type="submit"
              disabled={isAdding}
              className="w-full h-10 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white text-sm font-bold flex items-center justify-center transition disabled:opacity-50"
            >
              {isAdding ? '...' : 'เพิ่ม'}
            </button>
          </div>
        </form>
      </div>

      {/* Playlist & Order Management */}
      <div className="rounded-2xl bg-slate-800/80 border border-slate-700 p-5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Music className="h-4 w-4 text-sky-400" />
              ลำดับการเล่นเพลง ({tracks.length})
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              เพลงอันดับ #1 จะเล่นก่อนเมื่อเข้าเว็บครบ 3 วินาที จากนั้นจะต่อด้วย #2 และวนกลับมา #1 เมื่อจบ
            </p>
          </div>
          {isSavingOrder && (
            <span className="text-xs text-sky-400 animate-pulse font-medium">กำลังบันทึกลำดับ...</span>
          )}
        </div>

        {tracks.length === 0 && !loading && (
          <p className="text-sm text-slate-400 text-center py-6">ยังไม่มีเพลงในระบบ</p>
        )}

        <div className="space-y-3">
          {tracks.map((track, idx) => (
            <div
              key={track.id}
              className={
                'flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 p-4 rounded-xl border transition ' +
                (track.is_active
                  ? 'bg-slate-900/80 border-slate-700'
                  : 'bg-slate-900/30 border-slate-800 opacity-60')
              }
            >
              {/* Order buttons & Index Badge */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="flex items-center justify-center h-7 w-7 rounded-lg bg-sky-500/20 text-sky-300 font-black text-xs border border-sky-500/30">
                  #{idx + 1}
                </span>
                <div className="flex flex-col gap-0.5">
                  <button
                    type="button"
                    onClick={() => moveTrackUp(idx)}
                    disabled={idx === 0}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-25 transition"
                    title="เลื่อนขึ้น (เล่นก่อน)"
                  >
                    <ArrowUp className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveTrackDown(idx)}
                    disabled={idx === tracks.length - 1}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-25 transition"
                    title="เลื่อนลง (เล่นทีหลัง)"
                  >
                    <ArrowDown className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* Play preview & Title */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <button
                  type="button"
                  onClick={() => togglePreview(track)}
                  className="p-2.5 rounded-full bg-slate-800 hover:bg-sky-500 text-slate-200 hover:text-white border border-slate-700 transition shrink-0"
                  title={previewTrackId === track.id ? 'หยุดทดสอบ' : 'ทดสอบฟัง'}
                >
                  {previewTrackId === track.id ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4 fill-current translate-x-0.5" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <input
                    type="text"
                    value={track.title}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTracks((prev) =>
                        prev.map((t) => (t.id === track.id ? { ...t, title: val } : t))
                      );
                    }}
                    className="w-full bg-transparent font-bold text-white text-sm focus:bg-slate-800 px-2 py-1 rounded-lg border border-transparent focus:border-slate-600 focus:outline-none"
                  />
                  <p className="text-xs font-mono text-slate-400 px-2 truncate">{track.audio_url}</p>
                </div>
              </div>

              {/* Volume Slider & Controls */}
              <div className="flex items-center gap-3 flex-wrap lg:flex-nowrap shrink-0">
                {/* Real-time Volume Adjustment */}
                <div className="flex items-center gap-2 bg-slate-800/80 p-2 rounded-xl border border-slate-700/60">
                  <Volume2 className="h-4 w-4 text-sky-400 shrink-0" />
                  <div className="w-32">
                    <div className="flex justify-between text-[11px] text-slate-400 mb-0.5">
                      <span>ระดับเสียง</span>
                      <span className="font-mono font-bold text-white">
                        {Math.round(track.track_volume * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={track.track_volume}
                      onChange={(e) => handleVolumeChange(track.id, parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-400"
                    />
                  </div>
                  {/* Quick - / + buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleVolumeChange(track.id, track.track_volume - 0.05)}
                      className="p-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-300"
                      title="ลดเสียง 5%"
                    >
                      <Minus className="h-2.5 w-2.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleVolumeChange(track.id, track.track_volume + 0.05)}
                      className="p-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-300"
                      title="เพิ่มเสียง 5%"
                    >
                      <Plus className="h-2.5 w-2.5" />
                    </button>
                  </div>
                </div>

                {/* Active Toggle */}
                <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={track.is_active}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setTracks((prev) =>
                        prev.map((t) => (t.id === track.id ? { ...t, is_active: checked } : t))
                      );
                    }}
                    className="rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-sky-500 h-4 w-4"
                  />
                  <span>เปิดใช้งาน</span>
                </label>

                {/* Save button */}
                <button
                  type="button"
                  onClick={() => handleUpdate(track)}
                  disabled={savingId === track.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition disabled:opacity-50"
                >
                  <Save className="h-3.5 w-3.5" />
                  {savingId === track.id ? '...' : 'บันทึก'}
                </button>

                {/* Delete button */}
                <button
                  type="button"
                  onClick={() => handleDelete(track.id, track.title)}
                  className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-lg transition"
                  title="ลบเพลง"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
