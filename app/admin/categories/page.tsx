'use client';

import { useState, useEffect } from 'react';
import { Layers, Plus, Edit2, Trash2, CheckCircle2, XCircle, Smartphone, Gamepad2, Loader2 } from 'lucide-react';

export default function AdminCategoriesUnifiedPage() {
  const [activeTab, setActiveTab] = useState<'games' | 'digital'>('games');
  const [gameCategories, setGameCategories] = useState<any[]>([]);
  const [digitalCategories, setDigitalCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [sortOrder, setSortOrder] = useState<number>(0);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [resGame, resDigital] = await Promise.all([
        fetch('/api/admin/categories'),
        fetch('/api/admin/digital-products'),
      ]);

      const gData = await resGame.json();
      if (gData.success) setGameCategories(gData.categories || []);

      const dData = await resDigital.json();
      if (dData.categories) setDigitalCategories(dData.categories || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function handleOpenCreate() {
    setEditingId(null);
    setName('');
    setSlug('');
    setDescription('');
    setSortOrder(0);
    setIsActive(true);
    setShowModal(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (activeTab === 'games') {
        const res = await fetch('/api/admin/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, slug, description, sort_order: sortOrder, is_active: isActive }),
        });
        if (res.ok) {
          setShowModal(false);
          fetchData();
        }
      } else {
        // Digital Category
        const res = await fetch('/api/admin/digital-products/category', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, slug, description, sort_order: sortOrder, is_active: isActive }),
        });
        if (res.ok) {
          setShowModal(false);
          fetchData();
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  }

  const currentList = activeTab === 'games' ? gameCategories : digitalCategories;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-400/30 flex items-center justify-center text-sky-400">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white">จัดการหมวดหมู่สินค้าทั้งหมด</h1>
            <p className="text-xs sm:text-sm text-slate-400">
              ควบคุมหมวดหมู่สำหรับทั้งระบบเติมเกม และระบบแอปพรีเมียม / สินค้าดิจิทัล
            </p>
          </div>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-sky-500 text-white hover:bg-sky-400 transition shadow-lg shadow-sky-500/20"
        >
          <Plus className="w-4 h-4" /> เพิ่มหมวดหมู่ ({activeTab === 'games' ? 'เติมเกม' : 'แอปดิจิทัล'})
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('games')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
            activeTab === 'games'
              ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Gamepad2 className="w-4 h-4" /> หมวดหมู่เติมเกม ({gameCategories.length})
        </button>
        <button
          onClick={() => setActiveTab('digital')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
            activeTab === 'digital'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Smartphone className="w-4 h-4" /> หมวดหมู่แอปพรีเมียม / ดิจิทัล ({digitalCategories.length})
        </button>
      </div>

      {/* Categories Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">ชื่อหมวดหมู่</th>
                <th className="py-3.5 px-4">Slug (URL)</th>
                <th className="py-3.5 px-4">คำอธิบาย</th>
                <th className="py-3.5 px-4">ลำดับ</th>
                <th className="py-3.5 px-4">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-sky-400" />
                    กำลังโหลดข้อมูล...
                  </td>
                </tr>
              ) : currentList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    ยังไม่มีข้อมูลหมวดหมู่ในแท็บนี้
                  </td>
                </tr>
              ) : (
                currentList.map((cat) => (
                  <tr key={cat.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-4 px-4 font-bold text-white text-sm">{cat.name}</td>
                    <td className="py-4 px-4 font-mono text-sky-400">{cat.slug}</td>
                    <td className="py-4 px-4 text-slate-400 truncate max-w-xs">{cat.description || '-'}</td>
                    <td className="py-4 px-4 font-mono text-slate-400">{cat.sort_order ?? 0}</td>
                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          cat.is_active
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {cat.is_active ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {cat.is_active ? 'ใช้งาน' : 'ปิด'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">
              เพิ่มหมวดหมู่ ({activeTab === 'games' ? 'เติมเกม' : 'แอปพรีเมียม'})
            </h3>
            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">ชื่อหมวดหมู่</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  placeholder="เช่น แอปสตรีมมิ่ง"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Slug (URL)</label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  placeholder="เว้นว่างเพื่อสร้างอัตโนมัติ"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">คำอธิบาย</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-sky-500 font-bold text-white hover:bg-sky-400 disabled:opacity-50"
                >
                  {submitting ? 'กำลังบันทึก...' : 'บันทึก'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
