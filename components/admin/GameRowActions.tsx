'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Trash2, Edit, X, Eye, EyeOff, Package } from 'lucide-react';
import { useConfirm } from '@/components/ui/ConfirmDialog';

export function GameRowActions({
  id,
  name,
  icon,
  is_active,
  provider_availability = 'available',
  provider_error_message,
}: {
  id: string;
  name?: string;
  icon?: string | null;
  is_active: boolean;
  provider_availability?: string;
  provider_error_message?: string | null;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const [active, setActive] = useState(is_active);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(name || '');
  const [editIcon, setEditIcon] = useState(icon || '');
  const [savingEdit, setSavingEdit] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Toggle Storefront Visibility with Confirmation Dialog
  async function handleToggleVisibility() {
    const nextActive = !active;
    const gameTitle = name || 'เกมนี้';

    if (active) {
      // Confirmation required before taking off storefront
      const ok = await confirm({
        title: `ต้องการนำ ${gameTitle} ออกจากหน้าเว็บใช่หรือไม่?`,
        description: 'สินค้าและแพ็กเกจทั้งหมดจะยังคงอยู่ในระบบ แต่ลูกค้าจะไม่เห็นเกมนี้บนหน้าร้าน',
        confirmText: 'ยืนยัน',
        cancelText: 'ยกเลิก',
        tone: 'danger',
      });
      if (!ok) return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/admin/games/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_active: nextActive }),
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.message || 'ไม่สามารถปรับสถานะได้');
      } else {
        setActive(nextActive);
        router.refresh();
      }
    } catch {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
    setLoading(false);
  }

  async function handleSaveEdit() {
    setSavingEdit(true);
    setMsg(null);
    try {
      const res = await fetch('/api/admin/games/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name: editName, icon: editIcon }),
      });
      const data = await res.json();
      if (data.success) {
        setEditing(false);
        router.refresh();
      } else {
        setMsg(data.message || 'บันทึกไม่สำเร็จ');
      }
    } catch {
      setMsg('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
    setSavingEdit(false);
  }

  async function handleDelete() {
    const ok = await confirm({
      title: `ลบเกม "${name || 'นี้'}"?`,
      description: 'ข้อมูลแพ็กเกจและรายการทั้งหมดของเกมนี้จะถูกลบออกอย่างถาวรและกู้คืนไม่ได้ (หากต้องการซ่อนแนะนำให้ใช้ปุ่ม "เอาออกจากหน้าเว็บ")',
      confirmText: 'ลบถาวร',
      cancelText: 'ยกเลิก',
      tone: 'danger',
    });
    if (!ok) return;

    setDeleting(true);
    try {
      const res = await fetch('/api/admin/games/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.success) {
        router.refresh();
      } else {
        alert(data.message || 'ลบเกมไม่สำเร็จ');
      }
    } catch {
      alert('เกิดข้อผิดพลาด');
    }
    setDeleting(false);
  }

  return (
    <div className="flex items-center justify-end gap-2">
      {/* Manage Packages Button */}
      <Link
        href={`/admin/products?game_id=${id}`}
        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-sky-200 bg-sky-50 text-xs font-semibold text-sky-700 hover:bg-sky-100 transition shadow-2xs"
        title="จัดการแพ็กเกจของเกมนี้"
      >
        <Package className="w-3.5 h-3.5" />
        จัดการแพ็ก
      </Link>

      {/* Visibility Toggle Button */}
      <button
        type="button"
        disabled={loading}
        onClick={handleToggleVisibility}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer ${
          active
            ? 'border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
            : 'border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
        }`}
        title={active ? 'ซ่อนเกมนี้จากหน้าร้าน' : 'เปิดให้แสดงบนหน้าร้าน'}
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : active ? (
          <>
            <EyeOff className="w-3.5 h-3.5 text-amber-600" />
            เอาออกจากหน้าเว็บ
          </>
        ) : (
          <>
            <Eye className="w-3.5 h-3.5 text-emerald-600" />
            เพิ่มเข้าหน้าเว็บ
          </>
        )}
      </button>

      {/* Edit button */}
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition"
        title="แก้ไขชื่อและรูปเกม"
      >
        <Edit className="w-3.5 h-3.5" />
      </button>

      {/* Delete button (secondary) */}
      <button
        type="button"
        disabled={deleting}
        onClick={handleDelete}
        className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition"
        title="ลบเกมถาวร"
      >
        {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
      </button>

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="relative w-full max-w-sm rounded-2xl border border-sky-100 bg-white p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">แก้ไขข้อมูล / รูปเกม</h3>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="text-slate-500 hover:text-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">ชื่อเกม</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-xl border border-sky-100 bg-slate-50 px-3 py-2 text-xs text-slate-900 font-medium focus:border-sky-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-500 mb-1">URL รูปภาพ / ไอคอนเกม</label>
                <input
                  type="text"
                  value={editIcon}
                  onChange={(e) => setEditIcon(e.target.value)}
                  placeholder="https://... หรือ /games/...jpg"
                  className="w-full rounded-xl border border-sky-100 bg-slate-50 px-3 py-2 text-xs text-slate-900 font-medium focus:border-sky-400 focus:outline-none"
                />
                {editIcon && (
                  <div className="mt-2 flex items-center gap-2">
                    <img src={editIcon} alt="Preview" className="w-10 h-10 rounded-lg object-cover border border-sky-100" />
                    <span className="text-[11px] text-slate-500">รูปตัวอย่าง</span>
                  </div>
                )}
              </div>
            </div>

            {msg && <p className="text-xs text-rose-600">{msg}</p>}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="flex-1 rounded-xl border border-slate-200 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={savingEdit}
                onClick={handleSaveEdit}
                className="flex-1 rounded-xl bg-sky-500 hover:bg-sky-600 py-2 text-xs font-bold text-white flex items-center justify-center gap-1.5"
              >
                {savingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
