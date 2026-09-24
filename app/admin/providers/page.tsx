'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Server,
  Activity,
  ShieldCheck,
  RefreshCw,
  Plus,
  Play,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Gamepad2,
  Sparkles,
  Package,
  Wallet,
  Bot,
  Trash2,
  Search,
  Filter,
  Eye,
  Sliders,
  DollarSign,
  TrendingUp,
  Zap,
  Check,
  X,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { CentralProvider, ProviderHealthStatus } from '@/types/central-provider';

const CATEGORY_META: Record<string, { label: string; icon: any; color: string; badge: string }> = {
  GAME_TOPUP: {
    label: 'ระบบเติมเกม',
    icon: Gamepad2,
    color: 'text-sky-400',
    badge: 'bg-sky-500/10 text-sky-400 border-sky-400/30',
  },
  PREMIUM_APP: {
    label: 'แอพพรีเมียม',
    icon: Sparkles,
    color: 'text-violet-400',
    badge: 'bg-violet-500/10 text-violet-400 border-violet-400/30',
  },
  DIGITAL_PRODUCT: {
    label: 'สินค้าดิจิทัล',
    icon: Package,
    color: 'text-pink-400',
    badge: 'bg-pink-500/10 text-pink-400 border-pink-400/30',
  },
  PAYMENT: {
    label: 'ระบบชำระเงิน',
    icon: Wallet,
    color: 'text-emerald-400',
    badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-400/30',
  },
  AI: {
    label: 'ระบบ AI ผู้ช่วย',
    icon: Bot,
    color: 'text-amber-400',
    badge: 'bg-amber-500/10 text-amber-400 border-amber-400/30',
  },
  ALL: {
    label: 'ทั้งหมด',
    icon: Server,
    color: 'text-slate-300',
    badge: 'bg-slate-800 text-slate-300 border-slate-700',
  },
};

const BUILT_IN_TRIAL_APIS = [
  {
    id: 'mock-game-topup-fallback',
    code: 'mock-game-topup',
    name: 'Mock Game Topup Sandbox',
    category: 'GAME_TOPUP',
    api_base_url: 'https://mock.naymos.local/v1/topup',
    environment: 'sandbox',
    is_test_mode: true,
    is_active: true,
    health_status: 'HEALTHY',
    system: 'ระบบเติมเกมอัตโนมัติ',
    description: 'จำลองการตรวจสอบ Player ID และส่งไอเทมเกม Free Fire, ROV, MLBB',
  },
  {
    id: 'mock-digital-goods-fallback',
    code: 'mock-digital-goods',
    name: 'Sandbox Premium Apps Provider',
    category: 'PREMIUM_APP',
    api_base_url: 'https://mock.naymos.local/v1/digital',
    environment: 'sandbox',
    is_test_mode: true,
    is_active: true,
    health_status: 'HEALTHY',
    system: 'ระบบแอพพรีเมียม & สินค้าดิจิทัล',
    description: 'จำลองการส่งมอบบัญชีอัตโนมัติ Spotify, Netflix, YouTube Premium',
  },
  {
    id: 'finshop-fallback',
    code: 'finshop',
    name: 'FinShop API',
    category: 'PREMIUM_APP',
    api_base_url: 'https://finshop.me/api/v1',
    environment: 'production',
    is_test_mode: false,
    is_active: true,
    health_status: 'HEALTHY',
    system: 'ระบบแอพพรีเมียม FinShop',
    description: 'เชื่อมต่อแอพพรีเมียมและสินค้าดิจิทัลจาก FinShop',
  },
  {
    id: 'byshop-fallback',
    code: 'byshop',
    name: 'ByShop Gateway API',
    category: 'GAME_TOPUP',
    api_base_url: 'https://byshop.me/api/v1',
    environment: 'production',
    is_test_mode: false,
    is_active: true,
    health_status: 'HEALTHY',
    system: 'ระบบเกตเวย์เติมเกม ByShop',
    description: 'เกตเวย์เติมเกมอัตโนมัติ Free Fire, RoV, Valorant',
  },
  {
    id: 'local-promptpay-fallback',
    code: 'local-promptpay',
    name: 'PromptPay EMVCo Local Engine',
    category: 'PAYMENT',
    api_base_url: 'internal://payments/promptpay',
    environment: 'production',
    is_test_mode: false,
    is_active: true,
    health_status: 'HEALTHY',
    system: 'ระบบชำระเงิน & QR พร้อมเพย์',
    description: 'สร้าง QR Code พร้อมเพย์มาตรฐาน EMVCo เบอร์ 0988251064',
  },
  {
    id: 'ai-gateway-fallback',
    code: 'ai-gateway',
    name: 'AI Assistant Unified Gateway',
    category: 'AI',
    api_base_url: 'https://generativelanguage.googleapis.com',
    environment: 'production',
    is_test_mode: false,
    is_active: true,
    health_status: 'HEALTHY',
    system: 'ระบบบอท AI & แชทบอท',
    description: 'เชื่อมต่อ Gemini 1.5 Flash ตอบคำถามลูกค้าอัตโนมัติ',
  },
];

interface ProviderItem {
  id: string;
  name: string;
  external_code?: string;
  category: string;
  cost: number;
  selling_price: number;
  profit: number;
  profit_margin: number;
  stock?: number | null;
  is_active: boolean;
  linked_product_id?: string | null;
}

export default function AdminProvidersHubPage() {
  const [providers, setProviders] = useState<CentralProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Details Modal (ดูรายละเอียด API + รายการเกม/แอพ + กำหนดราคาขาย + กำไร)
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailProvider, setDetailProvider] = useState<any | null>(null);
  const [detailItems, setDetailItems] = useState<ProviderItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [savingItems, setSavingItems] = useState(false);
  const [itemsSuccessMsg, setItemsSuccessMsg] = useState<string | null>(null);

  // Edit Provider Modal (Real-time edit)
  const [editingApi, setEditingApi] = useState<any | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    code: '',
    category: 'GAME_TOPUP',
    api_base_url: '',
    api_key: '',
    api_secret: '',
    environment: 'sandbox',
    is_active: true,
  });
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    fetchProviders();
  }, []);

  async function fetchProviders() {
    try {
      const res = await fetch('/api/admin/providers');
      const data = await res.json();
      if (data.providers) {
        setProviders(data.providers);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  // Merged Display List with fallbacks
  const displayList = useMemo(() => {
    const list = [...providers];
    const existingCodes = new Set(providers.map((p) => p.code));
    for (const item of BUILT_IN_TRIAL_APIS) {
      if (!existingCodes.has(item.code)) {
        list.push(item as any);
      }
    }
    return list;
  }, [providers]);

  const filteredList = useMemo(() => {
    return displayList.filter((item: any) => {
      const cat = item.category || item.type || 'ALL';
      if (selectedCategory !== 'ALL' && cat !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = (item.name || '').toLowerCase().includes(q);
        const matchesCode = (item.code || '').toLowerCase().includes(q);
        if (!matchesName && !matchesCode) return false;
      }
      return true;
    });
  }, [displayList, selectedCategory, searchQuery]);

  // Open Details Modal and fetch items
  async function handleOpenDetails(provider: any) {
    setDetailProvider(provider);
    setDetailModalOpen(true);
    setLoadingItems(true);
    setItemsSuccessMsg(null);
    try {
      const res = await fetch(`/api/admin/providers/${provider.id || provider.code}/items`);
      const data = await res.json();
      if (data.items) {
        setDetailItems(data.items);
      } else {
        setDetailItems([]);
      }
    } catch (e) {
      console.error('Failed to load provider items:', e);
      setDetailItems([]);
    } finally {
      setLoadingItems(false);
    }
  }

  // Update item selling price in detail view & calculate profit
  function handleUpdateSellingPrice(itemId: string, newPriceStr: string) {
    const newPrice = Number(newPriceStr) || 0;
    setDetailItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          const cost = item.cost || 0;
          const profit = newPrice - cost;
          const profitMargin = newPrice > 0 ? (profit / newPrice) * 100 : 0;
          return {
            ...item,
            selling_price: newPrice,
            profit,
            profit_margin: profitMargin,
          };
        }
        return item;
      })
    );
  }

  // Toggle active per item (ใช้ API รายแอพหรือรายเกม)
  function handleToggleItemActive(itemId: string) {
    setDetailItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, is_active: !item.is_active } : item
      )
    );
  }

  // Use API for ALL items (ปุ่มใช้ API ทั้งหมด)
  async function handleUseAllApi() {
    if (!detailProvider) return;
    setSavingItems(true);
    try {
      const res = await fetch(`/api/admin/providers/${detailProvider.id || detailProvider.code}/items`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enable_all: true }),
      });
      const data = await res.json();
      if (data.success) {
        setDetailItems((prev) => prev.map((item) => ({ ...item, is_active: true })));
        setItemsSuccessMsg('เปิดใช้งาน API นี้สำหรับทุกเกมและแอพทั้งหมดเรียบร้อยแล้ว!');
        fetchProviders();
      } else {
        alert(data.error || 'เกิดข้อผิดพลาดในการเปิดใช้งานทั้งหมด');
      }
    } catch (err: any) {
      alert(err.message || 'เกิดข้อผิดพลาด');
    } finally {
      setSavingItems(false);
    }
  }

  // Save items (prices and active state)
  async function handleSaveItems() {
    if (!detailProvider) return;
    setSavingItems(true);
    setItemsSuccessMsg(null);
    try {
      const res = await fetch(`/api/admin/providers/${detailProvider.id || detailProvider.code}/items`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: detailItems }),
      });
      const data = await res.json();
      if (data.success) {
        setItemsSuccessMsg('บันทึกการตั้งค่าราคาและสถานะการใช้งานเรียบร้อยแล้ว');
        setTimeout(() => setItemsSuccessMsg(null), 3000);
      } else {
        alert(data.error || 'ไม่สามารถบันทึกได้');
      }
    } catch (err: any) {
      alert(err.message || 'เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setSavingItems(false);
    }
  }

  // Delete Provider
  async function handleDeleteProvider(provider: any) {
    if (!confirm(`ต้องการลบ API "${provider.name}" (${provider.code}) ใช่หรือไม่?`)) return;
    try {
      const res = await fetch(`/api/admin/providers/${provider.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        setProviders((prev) => prev.filter((p) => p.id !== provider.id));
        alert('ลบ API เรียบร้อยแล้ว');
      } else {
        alert(data.error || 'ไม่สามารถลบได้');
      }
    } catch (err: any) {
      alert(err.message || 'เกิดข้อผิดพลาด');
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto text-slate-100 font-sans pb-12">
      {/* Top Header - Frontstore Match Navy & Sky Gradient */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-slate-900 via-[#0b1222] to-slate-900 border border-slate-800 p-6 rounded-3xl shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-400/30 flex items-center justify-center text-sky-400 shrink-0 shadow-inner">
            <Server className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-wide flex items-center gap-2">
              จัดการระบบ API &amp; Providers
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 font-medium">
              ควบคุมบริการ API รายเกม รายแอพ กำหนดราคาขาย และคำนวณกำไรอัตโนมัติ
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => fetchProviders()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-800/80 border border-slate-700 text-slate-200 hover:text-white hover:bg-slate-700 transition cursor-pointer active:scale-95"
          >
            <RefreshCw className="w-4 h-4 text-sky-400" /> รีเฟรช
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-lg flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ค้นหาชื่อผู้ให้บริการ หรือรหัส API..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950/80 border border-slate-700/80 focus:border-sky-400 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-slate-500 outline-none transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-300 font-semibold mr-1">
            <Filter className="w-3.5 h-3.5 text-sky-400" />
            <span>ประเภท:</span>
          </div>
          {Object.entries(CATEGORY_META).map(([key, meta]) => {
            const isSelected = selectedCategory === key;
            return (
              <button
                key={key}
                onClick={() => setSelectedCategory(key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  isSelected
                    ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                    : 'bg-slate-800/70 border border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
              >
                {meta.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Streamlined API Providers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredList.map((api: any) => {
          const cat = api.category || api.type || 'ALL';
          const meta = CATEGORY_META[cat] || CATEGORY_META.ALL;
          const Icon = meta.icon;
          const isTest = api.is_test_mode || api.environment === 'sandbox';

          return (
            <div
              key={api.id || api.code}
              className="bg-slate-900/90 border border-slate-800 hover:border-sky-500/50 rounded-2xl p-5 transition-all shadow-xl hover:shadow-sky-500/5 flex flex-col justify-between group"
            >
              <div>
                {/* Header: Name and Category Only */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-slate-800 border border-slate-700/80 shadow-inner group-hover:border-sky-500/40 transition">
                      <Icon className={`w-6 h-6 ${meta.color}`} />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-white group-hover:text-sky-300 transition-colors">
                        {api.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${meta.badge}`}>
                          {meta.label}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400 font-semibold">
                          {api.code}
                        </span>
                      </div>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border shrink-0 ${
                      isTest
                        ? 'bg-amber-500/10 text-amber-300 border-amber-400/30'
                        : 'bg-emerald-500/10 text-emerald-300 border-emerald-400/30'
                    }`}
                  >
                    {isTest ? 'Sandbox' : 'Production'}
                  </span>
                </div>

                {/* Short info */}
                <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 mb-4 text-xs text-slate-300 flex items-center justify-between">
                  <span className="text-slate-400">สถานะ:</span>
                  <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    พร้อมให้บริการ
                  </span>
                </div>
              </div>

              {/* Action Buttons: Primary "ดูรายละเอียด" */}
              <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => handleOpenDetails(api)}
                  className="flex-1 min-h-[40px] px-4 py-2 rounded-xl text-xs font-bold bg-sky-500 hover:bg-sky-400 text-white transition flex items-center justify-center gap-2 shadow-md shadow-sky-500/20 active:scale-95 cursor-pointer"
                >
                  <Eye className="w-4 h-4" />
                  <span>ดูรายละเอียด</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEditingApi(api);
                    setEditFormData({
                      name: api.name || '',
                      code: api.code || '',
                      category: api.category || 'GAME_TOPUP',
                      api_base_url: api.api_base_url || '',
                      api_key: '',
                      api_secret: '',
                      environment: isTest ? 'sandbox' : 'production',
                      is_active: api.is_active !== false,
                    });
                  }}
                  className="min-h-[40px] px-3 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center gap-1 cursor-pointer"
                  title="แก้ไขการเชื่อมต่อ API"
                >
                  <Sliders className="w-3.5 h-3.5 text-sky-400" />
                </button>

                <button
                  type="button"
                  onClick={() => handleDeleteProvider(api)}
                  className="min-h-[40px] px-3 py-2 rounded-xl text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition flex items-center gap-1 cursor-pointer"
                  title="ลบ API นี้"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* DETAILS MODAL: รายละเอียดครบถ้วน + รายการเกม/แอพ + กำหนดราคาขาย + กำไร + ปุ่มใช้ API รายแอพ/ทั้งหมด */}
      {detailModalOpen && detailProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-7 space-y-6 max-h-[90vh] flex flex-col my-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-5">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-sky-500/10 border border-sky-400/30 text-sky-400">
                  <Server className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white flex items-center gap-2">
                    {detailProvider.name}
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-bold bg-slate-800 border border-slate-700 text-sky-400">
                      {detailProvider.code}
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Endpoint: <span className="font-mono text-slate-300">{detailProvider.api_base_url || 'internal://engine'}</span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setDetailModalOpen(false)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Top Toolbar: Buttons "ใช้ API ทั้งหมด" & "บันทึกการตั้งค่า" */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={savingItems}
                  onClick={handleUseAllApi}
                  className="px-4 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/20 transition flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <Zap className="w-4 h-4 fill-current text-amber-300" />
                  <span>ใช้ API ทั้งหมด (เปิดทุกเกมและแอพ)</span>
                </button>
              </div>

              <div className="flex items-center gap-3">
                {itemsSuccessMsg && (
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 animate-fadeIn">
                    <CheckCircle2 className="w-4 h-4" /> {itemsSuccessMsg}
                  </span>
                )}
                <button
                  type="button"
                  disabled={savingItems}
                  onClick={handleSaveItems}
                  className="px-5 py-2.5 rounded-xl text-xs font-black bg-sky-500 hover:bg-sky-400 text-white shadow-lg shadow-sky-500/20 transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  {savingItems ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่าราคาขาย'}
                </button>
              </div>
            </div>

            {/* List of Games & Apps Serviced by this API */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              <h3 className="text-sm font-black text-slate-200 flex items-center gap-2">
                <Package className="w-4 h-4 text-sky-400" />
                เกมและแอพที่ให้บริการ ({detailItems.length} รายการ)
              </h3>

              {loadingItems ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  กำลังโหลดรายการเกมและแอพจาก Provider...
                </div>
              ) : detailItems.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs bg-slate-950/40 rounded-2xl border border-slate-800">
                  ไม่มีรายการสินค้าที่ผูกกับ Provider นี้
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-950/60">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs min-w-[700px]">
                      <thead className="bg-slate-800/80 text-slate-300 font-bold uppercase tracking-wider text-[11px] border-b border-slate-700">
                        <tr>
                          <th className="px-4 py-3">เกม / แอพที่ให้บริการ</th>
                          <th className="px-4 py-3 text-center">ราคาต้นทุน (Cost)</th>
                          <th className="px-4 py-3 text-center">กำหนดราคาขาย (Selling)</th>
                          <th className="px-4 py-3 text-center">คำนวณกำไรสุทธิ</th>
                          <th className="px-4 py-3 text-center">เปิดใช้ API รายตัว</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80">
                        {detailItems.map((item) => {
                          const isProfitPositive = item.profit > 0;
                          const isProfitZero = item.profit === 0;

                          return (
                            <tr key={item.id} className="hover:bg-slate-800/30 transition">
                              {/* Name & External ID */}
                              <td className="px-4 py-3">
                                <div className="font-bold text-white text-xs">{item.name}</div>
                                <div className="text-[10px] font-mono text-slate-400">
                                  ID: {item.external_code || '—'}
                                </div>
                              </td>

                              {/* Cost Price */}
                              <td className="px-4 py-3 text-center font-mono font-bold text-slate-300">
                                ฿{item.cost.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                              </td>

                              {/* Selling Price Input Field */}
                              <td className="px-4 py-3 text-center">
                                <div className="inline-flex items-center gap-1 bg-slate-900 border border-slate-700 focus-within:border-sky-400 rounded-xl px-2.5 py-1">
                                  <span className="text-slate-400 font-bold text-xs">฿</span>
                                  <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={item.selling_price}
                                    onChange={(e) => handleUpdateSellingPrice(item.id, e.target.value)}
                                    className="w-20 bg-transparent text-white font-mono font-bold text-xs outline-none text-right"
                                  />
                                </div>
                              </td>

                              {/* Profit and Margin Calculation */}
                              <td className="px-4 py-3 text-center font-mono font-bold">
                                {isProfitPositive ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs">
                                    <TrendingUp className="w-3 h-3" />
                                    +฿{item.profit.toFixed(2)} ({item.profit_margin.toFixed(1)}%)
                                  </span>
                                ) : isProfitZero ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-slate-800 text-slate-400 text-xs">
                                    ฿0.00 (0%)
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/30 text-xs">
                                    -฿{Math.abs(item.profit).toFixed(2)} (ขาดทุน)
                                  </span>
                                )}
                              </td>

                              {/* Toggle Use API per App / Game */}
                              <td className="px-4 py-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleToggleItemActive(item.id)}
                                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer shadow-sm ${
                                    item.is_active
                                      ? 'bg-emerald-500 text-white shadow-emerald-500/20'
                                      : 'bg-slate-800 border border-slate-700 text-slate-400 hover:text-white'
                                  }`}
                                >
                                  {item.is_active ? (
                                    <>
                                      <Check className="w-3.5 h-3.5" />
                                      <span>ใช้ API นี้</span>
                                    </>
                                  ) : (
                                    <span>ไม่ใช้งาน</span>
                                  )}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL: Real-time edit provider credentials */}
      {editingApi && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-white">แก้ไขการตั้งค่า Provider</h3>
              <button
                onClick={() => setEditingApi(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">ชื่อ Provider</label>
                <input
                  type="text"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-sky-400"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">API Base URL</label>
                <input
                  type="text"
                  value={editFormData.api_base_url}
                  onChange={(e) => setEditFormData({ ...editFormData, api_base_url: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-sky-400"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">API Key (เว้นว่างไว้หากไม่ต้องการเปลี่ยน)</label>
                <input
                  type="password"
                  placeholder="••••••••••••••••"
                  value={editFormData.api_key}
                  onChange={(e) => setEditFormData({ ...editFormData, api_key: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-sky-400 font-mono"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-3">
              <button
                type="button"
                onClick={() => setEditingApi(null)}
                className="flex-1 py-2 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={savingEdit}
                onClick={async () => {
                  setSavingEdit(true);
                  try {
                    const res = await fetch(`/api/admin/providers/${editingApi.id}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(editFormData),
                    });
                    if (res.ok) {
                      alert('บันทึกข้อมูลเรียบร้อย');
                      setEditingApi(null);
                      fetchProviders();
                    } else {
                      alert('เกิดข้อผิดพลาดในการบันทึก');
                    }
                  } catch (e: any) {
                    alert(e.message);
                  } finally {
                    setSavingEdit(false);
                  }
                }}
                className="flex-1 py-2 rounded-xl text-xs font-black bg-sky-500 hover:bg-sky-400 text-white"
              >
                {savingEdit ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
