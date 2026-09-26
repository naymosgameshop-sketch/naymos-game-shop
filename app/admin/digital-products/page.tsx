'use client';

import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Plus,
  Trash2,
  Image as ImageIcon,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  RefreshCw,
  Search,
  ExternalLink,
  Zap,
  Save,
  X,
  AlertTriangle,
  Sparkles,
  Download
} from 'lucide-react';
import Link from 'next/link';

interface Package {
  id: string;
  name: string;
  price: number;
  cost?: number;
  is_active?: boolean;
}

interface DigitalProduct {
  id: string;
  name: string;
  slug: string;
  category_id?: string;
  category_type?: string;
  description?: string;
  icon?: string;
  banner?: string;
  image_url?: string;
  is_active: boolean;
  sort_order: number;
  packages: Package[];
  minPrice: number;
}

const PRESET_APP_LOGOS = [
  { name: 'YouTube', url: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=160&auto=format&fit=crop&q=80' },
  { name: 'Spotify', url: 'https://images.unsplash.com/photo-1614680376593-902f749f7ffc?w=160&auto=format&fit=crop&q=80' },
  { name: 'Canva', url: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=160&auto=format&fit=crop&q=80' },
  { name: 'Netflix', url: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=160&auto=format&fit=crop&q=80' },
  { name: 'Disney+', url: 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?w=160&auto=format&fit=crop&q=80' },
  { name: 'WeTV / Viu', url: 'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?w=160&auto=format&fit=crop&q=80' },
  { name: 'iQIYI', url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=160&auto=format&fit=crop&q=80' },
  { name: 'ChatGPT / AI', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=160&auto=format&fit=crop&q=80' }
];

export default function AdminDigitalProductsPage() {
  const [products, setProducts] = useState<DigitalProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMock, setIsMock] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Edit Image Modal
  const [editingImageProduct, setEditingImageProduct] = useState<DigitalProduct | null>(null);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [savingImage, setSavingImage] = useState(false);

  // Delete Modal
  const [deletingProduct, setDeletingProduct] = useState<DigitalProduct | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Create App Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    slug: '',
    icon: '',
    category_type: 'PREMIUM_APP',
    price: '',
    description: '',
  });
  const [isCreating, setIsCreating] = useState(false);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/digital-products');
      const data = await res.json();
      setIsMock(Boolean(data.is_mock));
      if (data.products) {
        const formatted = data.products.map((p: any) => {
          const pkgs = p.packages || [];
          const minPrice = pkgs.length > 0
            ? pkgs.reduce((min: number, cur: any) => (cur.price < min ? cur.price : min), pkgs[0]?.price || 0)
            : 0;
          return {
            ...p,
            packages: pkgs,
            minPrice,
          };
        });
        setProducts(formatted);
      }
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleSeedDefaults = async () => {
    setSeeding(true);
    try {
      const res = await fetch('/api/admin/digital-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'seed_defaults' }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(data.message || 'บันทึกแอปเริ่มต้นลงฐานข้อมูลแล้ว');
        await fetchProducts();
      } else {
        alert(data.error || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      }
    } catch {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setSeeding(false);
    }
  };


  // Save Image
  const handleSaveImage = async () => {
    if (!editingImageProduct) return;
    setSavingImage(true);
    try {
      const res = await fetch(`/api/admin/digital-products/${editingImageProduct.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          icon: imageUrlInput.trim(),
        }),
      });
      if (res.ok) {
        setProducts((prev) =>
          prev.map((p) =>
            p.id === editingImageProduct.id ? { ...p, icon: imageUrlInput.trim() } : p
          )
        );
        setEditingImageProduct(null);
      } else {
        alert('เกิดข้อผิดพลาดในการบันทึกรูปภาพ');
      }
    } catch {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setSavingImage(false);
    }
  };

  // Delete Product
  const handleDeleteProduct = async () => {
    if (!deletingProduct) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/digital-products/${deletingProduct.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setProducts((prev) => prev.filter((p) => p.id !== deletingProduct.id));
        setDeletingProduct(null);
      } else {
        alert('เกิดข้อผิดพลาดในการลบแอป');
      }
    } catch {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setIsDeleting(false);
    }
  };

  // Create Product
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name || !createForm.slug) {
      alert('กรุณากรอกชื่อและ Slug ของแอป');
      return;
    }
    setIsCreating(true);
    try {
      const res = await fetch('/api/admin/digital-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createForm.name,
          slug: createForm.slug.toLowerCase().replace(/\s+/g, '-'),
          icon: createForm.icon,
          category_type: createForm.category_type,
          description: createForm.description || createForm.name,
          packages: createForm.price ? [{
            name: `${createForm.name} (30 วัน)`,
            price: Number(createForm.price),
            duration: '30 วัน',
            cost: 0,
          }] : [],
        }),
      });
      if (res.ok) {
        await fetchProducts();
        setIsCreateOpen(false);
        setCreateForm({ name: '', slug: '', icon: '', category_type: 'PREMIUM_APP', price: '', description: '' });
      } else {
        const d = await res.json();
        alert(d.error || 'เกิดข้อผิดพลาดในการสร้างแอป');
      }
    } catch {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setIsCreating(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.slug.toLowerCase().includes(search.toLowerCase());
    const matchCategory =
      categoryFilter === 'ALL' ||
      (categoryFilter === 'PREMIUM_APP' && p.category_type === 'PREMIUM_APP') ||
      (categoryFilter === 'DIGITAL_PRODUCT' && p.category_type !== 'PREMIUM_APP');
    return matchSearch && matchCategory;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-sky-100 shadow-2xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 text-sky-700 text-xs font-semibold mb-2 border border-sky-100">
            <Smartphone className="w-3.5 h-3.5 text-sky-500" />
            <span>จัดการแอปพรีเมียม & สินค้าดิจิทัล</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800">
            รายการแอปพรีเมียมในร้าน
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            ใส่รูปแอป ปรับแต่งราคา ลบแอป และจัดการสินค้าที่ซิงค์จาก FinShop & BYShop
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/providers"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-sky-200 bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold transition shadow-xs"
          >
            <Zap className="w-4 h-4" />
            <span>ซิงค์สินค้าจาก API</span>
          </Link>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-2xs"
          >
            <Plus className="w-4 h-4 text-sky-600" />
            <span>เพิ่มแอปใหม่</span>
          </button>

          <Link
            href="/products"
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-bold transition shadow-2xs"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>ดูหน้าร้าน</span>
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-sky-100 shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ค้นหาชื่อแอป หรือ slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-sky-500 bg-slate-50/50"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => setCategoryFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              categoryFilter === 'ALL'
                ? 'bg-sky-500 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            ทั้งหมด ({products.length})
          </button>
          <button
            onClick={() => setCategoryFilter('PREMIUM_APP')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              categoryFilter === 'PREMIUM_APP'
                ? 'bg-sky-500 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            แอปพรีเมียม
          </button>
          <button
            onClick={() => setCategoryFilter('DIGITAL_PRODUCT')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              categoryFilter === 'DIGITAL_PRODUCT'
                ? 'bg-sky-500 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            สินค้าดิจิทัล
          </button>

          <button
            onClick={fetchProducts}
            disabled={loading}
            className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:text-sky-600 hover:bg-slate-50 transition ml-auto"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-sky-100 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-sky-50/60 text-slate-600 border-b border-sky-100 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">รูปแอป / ชื่อสินค้า</th>
                <th className="py-3.5 px-4">หมวดหมู่</th>
                <th className="py-3.5 px-4">แพ็กเกจที่ขาย</th>
                <th className="py-3.5 px-4">ราคาเริ่มต้น</th>
                <th className="py-3.5 px-4">สถานะหน้าร้าน</th>
                <th className="py-3.5 px-4 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sky-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-sky-500" />
                    กำลังโหลดข้อมูลแอป...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    ไม่พบรายการแอปตรงกับการค้นหา
                  </td>
                </tr>
              ) : (
                filteredProducts.map((prod) => {
                  const displayImg =
                    prod.icon ||
                    prod.image_url ||
                    (typeof prod.banner === 'string' ? prod.banner : null);
                  const isHttp =
                    displayImg && (displayImg.startsWith('http') || displayImg.startsWith('/'));

                  return (
                    <tr key={prod.id} className="hover:bg-sky-50/30 transition">
                      {/* Product Image and Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="relative group w-12 h-12 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                            {isHttp ? (
                              <img
                                src={displayImg}
                                alt={prod.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Smartphone className="w-6 h-6 text-sky-500" />
                            )}
                            {/* Hover Edit Overlay */}
                            <button
                              type="button"
                              onClick={() => {
                                setEditingImageProduct(prod);
                                setImageUrlInput(prod.icon || prod.image_url || '');
                              }}
                              className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[9px] font-bold transition"
                              title="เปลี่ยนรูปภาพแอป"
                            >
                              <ImageIcon className="w-4 h-4 mb-0.5" />
                              ใส่รูป
                            </button>
                          </div>
                          <div>
                            <div className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                              <span>{prod.name}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              /{prod.slug}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingImageProduct(prod);
                                setImageUrlInput(prod.icon || prod.image_url || '');
                              }}
                              className="text-[10px] text-sky-600 hover:underline flex items-center gap-1 mt-0.5"
                            >
                              <ImageIcon className="w-3 h-3" />
                              <span>{displayImg ? 'แก้ไขรูปแอป' : '+ ใส่รูปภาพแอป'}</span>
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-full bg-sky-100/70 text-sky-700 font-semibold text-[11px]">
                          {prod.category_type === 'PREMIUM_APP' ? 'แอปพรีเมียม' : 'สินค้าดิจิทัล'}
                        </span>
                      </td>

                      {/* Packages */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {prod.packages && prod.packages.length > 0 ? (
                            prod.packages.map((pkg) => (
                              <span
                                key={pkg.id}
                                className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-medium"
                              >
                                {pkg.name} (฿{pkg.price})
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400 text-[11px]">- ไม่มีแพ็กเกจ -</span>
                          )}
                        </div>
                      </td>

                      {/* Starting Price */}
                      <td className="py-3.5 px-4 font-bold text-sky-600 text-sm">
                        ฿{prod.minPrice.toLocaleString()}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {prod.is_active ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            เปิดขาย
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-slate-400 font-semibold text-[11px]">
                            <XCircle className="w-3.5 h-3.5" />
                            ปิดขาย
                          </span>
                        )}
                      </td>

                      {/* Actions: Edit Image & Delete Button */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingImageProduct(prod);
                              setImageUrlInput(prod.icon || prod.image_url || '');
                            }}
                            className="px-2.5 py-1.5 rounded-lg border border-sky-200 bg-white hover:bg-sky-50 text-sky-600 font-bold text-[11px] transition shadow-2xs inline-flex items-center gap-1"
                            title="เปลี่ยนรูปภาพแอป"
                          >
                            <ImageIcon className="w-3.5 h-3.5" />
                            <span>ใส่รูป</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeletingProduct(prod)}
                            className="px-2.5 py-1.5 rounded-lg border border-rose-200 bg-white hover:bg-rose-50 text-rose-600 font-bold text-[11px] transition shadow-2xs inline-flex items-center gap-1"
                            title="ลบแอปนี้ออกจากระบบ"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>ลบแอป</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Edit Image */}
      {editingImageProduct && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-sky-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-sky-50 text-sky-600">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm sm:text-base">
                    ใส่รูปภาพแอป: {editingImageProduct.name}
                  </h3>
                  <p className="text-[11px] text-slate-400">รูปภาพจะแสดงบนการ์ดสินค้าหน้าร้านและหลังบ้าน</p>
                </div>
              </div>
              <button
                onClick={() => setEditingImageProduct(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Preview */}
            <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <div className="w-20 h-20 rounded-2xl bg-white border border-sky-100 shadow-xs flex items-center justify-center overflow-hidden mb-2">
                {imageUrlInput.trim() ? (
                  <img
                    src={imageUrlInput.trim()}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as any).src = '';
                    }}
                  />
                ) : (
                  <Smartphone className="w-8 h-8 text-sky-400" />
                )}
              </div>
              <span className="text-[11px] text-slate-500 font-medium">ภาพตัวอย่างจริงที่จะแสดง</span>
            </div>

            {/* URL Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">ลิงก์ URL รูปภาพ (Image URL):</label>
              <input
                type="text"
                placeholder="https://example.com/logo.png"
                value={imageUrlInput}
                onChange={(e) => setImageUrlInput(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:border-sky-500 bg-white"
              />
            </div>

            {/* Quick Presets */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-slate-500">เลือกโลโก้แนะนำ:</span>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_APP_LOGOS.map((item) => (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => setImageUrlInput(item.url)}
                    className="px-2 py-1 rounded-lg border border-sky-100 bg-sky-50/70 hover:bg-sky-100 text-sky-700 text-[10px] font-bold transition flex items-center gap-1"
                  >
                    <img src={item.url} alt={item.name} className="w-3.5 h-3.5 rounded-sm object-cover" />
                    <span>{item.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingImageProduct(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSaveImage}
                disabled={savingImage}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-sky-500 hover:bg-sky-600 text-white transition flex items-center gap-1.5 shadow-xs"
              >
                {savingImage ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>บันทึกรูปภาพ</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Delete Confirmation */}
      {deletingProduct && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-xl border border-rose-100 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 rounded-2xl bg-rose-50 border border-rose-100">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-base">ยืนยันการลบแอป?</h3>
                <p className="text-[11px] text-slate-500">การกระทำนี้จะลบแอปและแพ็กเกจออกจากร้านค้า</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs space-y-1">
              <div className="font-bold text-slate-800">{deletingProduct.name}</div>
              <div className="text-[11px] text-slate-400 font-mono">/{deletingProduct.slug}</div>
              <div className="text-[11px] text-slate-500">
                จำนวนแพ็กเกจ: {deletingProduct.packages?.length || 0} รายการ
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingProduct(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleDeleteProduct}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition flex items-center gap-1.5 shadow-xs"
              >
                {isDeleting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>ยืนยันลบแอป</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create App */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateProduct}
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-sky-100 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-sky-50 text-sky-600">
                  <Plus className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-800 text-sm sm:text-base">
                  เพิ่มแอปพรีเมียม / สินค้าใหม่
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">ชื่อแอป / สินค้า:</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น YouTube Premium, Netflix 4K"
                  value={createForm.name}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      name: e.target.value,
                      slug: createForm.slug || e.target.value.toLowerCase().replace(/\s+/g, '-'),
                    })
                  }
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-sky-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Slug URL:</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น youtube-premium"
                  value={createForm.slug}
                  onChange={(e) => setCreateForm({ ...createForm, slug: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-sky-500 font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">URL รูปภาพ / โลโก้แอป:</label>
                <input
                  type="text"
                  placeholder="https://... หรือเลือกจากพรีเซ็ต"
                  value={createForm.icon}
                  onChange={(e) => setCreateForm({ ...createForm, icon: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-sky-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">ราคาเริ่มต้น (บาท):</label>
                <input
                  type="number"
                  placeholder="เช่น 45"
                  value={createForm.price}
                  onChange={(e) => setCreateForm({ ...createForm, price: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-sky-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">คำอธิบายย่อ:</label>
                <input
                  type="text"
                  placeholder="บริการแอปแท้ ถูกลิขสิทธิ์ รับประกันตลอดการใช้งาน"
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-sky-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={isCreating}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-sky-500 hover:bg-sky-600 text-white transition flex items-center gap-1.5 shadow-xs"
              >
                {isCreating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                <span>สร้างแอปใหม่</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
