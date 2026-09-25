'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Layers,
  Key,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Plus,
  Trash2,
  Settings,
  ExternalLink,
  ShieldCheck,
  Server,
  Activity,
  Zap,
  Info,
  DollarSign,
  TrendingUp,
  SlidersHorizontal,
  ChevronRight,
  X,
  Search,
  Check,
  Gamepad2,
  Smartphone,
  CreditCard,
  Bot
} from 'lucide-react';

interface ProviderItem {
  id: string;
  name: string;
  category: string;
  external_id?: string;
  cost: number;
  selling_price: number;
  profit: number;
  margin_percent: number;
  is_active: boolean;
  is_provider_active?: boolean;
}

interface Provider {
  id: string;
  name: string;
  code: string;
  category: string;
  environment: string;
  is_active: boolean;
  is_test_mode?: boolean;
  api_base_url?: string;
  has_credentials?: boolean;
  credentials_preview?: string;
  supported_games?: string[];
  items?: ProviderItem[];
}

const CATEGORY_TABS = [
  { id: 'ALL', label: 'ทั้งหมด', icon: Layers },
  { id: 'GAME_TOPUP', label: '🎮 ระบบเติมเกม', icon: Gamepad2, desc: 'API เติมเงินและไอเทมเกมออนไลน์อัตโนมัติ' },
  { id: 'PREMIUM_APP', label: '📱 ระบบแอพพรีเมียม', icon: Smartphone, desc: 'API สั่งซื้อแอพรายเดือน แอพสตรีมมิ่ง และบัญชีดิจิทัล' },
  { id: 'PAYMENT', label: '💳 ระบบชำระเงิน', icon: CreditCard, desc: 'API จัดการคิวอาร์โค้ด พร้อมเพย์ และการรับชำระเงิน' },
  { id: 'AI', label: '🤖 ระบบ AI ผู้ช่วย', icon: Bot, desc: 'API ปัญญาประดิษฐ์ บอทแชท และโมเดลภาษา' },
];

const FALLBACK_PROVIDERS: Provider[] = [
  {
    id: 'finshop',
    name: 'FinShop API (ระบบเติมเกม & สินค้าดิจิทัล)',
    code: 'finshop',
    category: 'GAME_TOPUP',
    environment: 'production',
    is_active: true,
    api_base_url: 'https://api.finshop.in.th/v1',
    credentials_preview: 'fin_live_••••••••',
    has_credentials: true,
    supported_games: ['Free Fire', 'RoV', 'Mobile Legends', 'Valorant', 'Genshin Impact', 'PUBG Mobile', 'YouTube Premium', 'Netflix'],
    items: [
      { id: 'fs-ff', name: 'Free Fire (เพชรฟรอยด์)', category: 'GAME_TOPUP', cost: 26, selling_price: 29, profit: 3, margin_percent: 10.3, is_active: true },
      { id: 'fs-rov', name: 'RoV (คูปอง)', category: 'GAME_TOPUP', cost: 31, selling_price: 35, profit: 4, margin_percent: 11.4, is_active: true },
      { id: 'fs-ml', name: 'Mobile Legends (Diamonds)', category: 'GAME_TOPUP', cost: 25, selling_price: 29, profit: 4, margin_percent: 13.7, is_active: true },
      { id: 'fs-val', name: 'Valorant (VP Points)', category: 'GAME_TOPUP', cost: 142, selling_price: 159, profit: 17, margin_percent: 10.6, is_active: true },
      { id: 'fs-gi', name: 'Genshin Impact (Crystals)', category: 'GAME_TOPUP', cost: 30, selling_price: 35, profit: 5, margin_percent: 14.2, is_active: true },
      { id: 'fs-pubg', name: 'PUBG Mobile (UC)', category: 'GAME_TOPUP', cost: 25, selling_price: 29, profit: 4, margin_percent: 13.7, is_active: true },
      { id: 'fs-yt', name: 'YouTube Premium (30 วัน)', category: 'PREMIUM_APP', cost: 45, selling_price: 69, profit: 24, margin_percent: 34.7, is_active: true },
    ]
  },
  {
    id: 'byshop',
    name: 'ByShop API (ระบบเติมเกมสำรอง)',
    code: 'byshop',
    category: 'GAME_TOPUP',
    environment: 'sandbox',
    is_active: false,
    api_base_url: 'https://api.byshop.me/api/v2',
    credentials_preview: 'by_sb_••••••••',
    has_credentials: false,
    supported_games: ['Free Fire', 'RoV', 'PUBG Mobile', 'Roblox'],
    items: [
      { id: 'by-ff', name: 'Free Fire', category: 'GAME_TOPUP', cost: 27, selling_price: 29, profit: 2, margin_percent: 6.8, is_active: false },
      { id: 'by-rov', name: 'RoV คูปอง', category: 'GAME_TOPUP', cost: 32, selling_price: 35, profit: 3, margin_percent: 8.5, is_active: false },
    ]
  },
  {
    id: 'mock-digital',
    name: 'Sandbox Digital Goods (แอพพรีเมียมทดลอง)',
    code: 'mock_digital',
    category: 'PREMIUM_APP',
    environment: 'sandbox',
    is_active: true,
    api_base_url: 'https://sandbox.naymos.local/apps',
    credentials_preview: 'app_sb_••••••••',
    has_credentials: true,
    supported_games: ['Spotify Premium', 'Netflix 4K', 'YouTube Premium', 'Disney+ Hotstar', 'Canva Pro'],
    items: [
      { id: 'app-spot', name: 'Spotify Premium Family 30 วัน', category: 'PREMIUM_APP', cost: 35, selling_price: 59, profit: 24, margin_percent: 40.6, is_active: true },
      { id: 'app-net', name: 'Netflix 4K UHD 30 วัน (จอส่วนตัว)', category: 'PREMIUM_APP', cost: 95, selling_price: 139, profit: 44, margin_percent: 31.6, is_active: true },
      { id: 'app-yt', name: 'YouTube Premium 30 วัน (เมลตัวเอง)', category: 'PREMIUM_APP', cost: 39, selling_price: 65, profit: 26, margin_percent: 40.0, is_active: true },
      { id: 'app-canva', name: 'Canva Pro 1 ปี (บัญชีเพื่อการศึกษา/ทีม)', category: 'PREMIUM_APP', cost: 50, selling_price: 99, profit: 49, margin_percent: 49.4, is_active: true },
    ]
  },
  {
    id: 'promptpay',
    name: 'PromptPay EMVCo (ระบบรับชำระเงินคิวอาร์)',
    code: 'promptpay',
    category: 'PAYMENT',
    environment: 'production',
    is_active: true,
    api_base_url: 'https://promptpay.io/api',
    credentials_preview: 'PP_ID: 0988251064',
    has_credentials: true,
    supported_games: ['สแกน PromptPay QR ทุกธนาคารในไทย', 'TrueMoney Wallet Transfer'],
    items: []
  },
  {
    id: 'ai-gateway',
    name: 'AI Multi-Provider (ระบบผู้ช่วยและบอทบริการลูกค้า)',
    code: 'ai_gateway',
    category: 'AI',
    environment: 'production',
    is_active: true,
    api_base_url: 'https://generativelanguage.googleapis.com',
    credentials_preview: 'AIzaSy••••••••',
    has_credentials: true,
    supported_games: ['Google Gemini 1.5 Flash', 'OpenAI GPT-4o Mini', 'Groq Llama 3 Fast Inference'],
    items: []
  }
];

export default function AdminProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>(FALLBACK_PROVIDERS);
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal States
  const [detailProvider, setDetailProvider] = useState<Provider | null>(null);
  const [items, setItems] = useState<ProviderItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [savingPrices, setSavingPrices] = useState(false);

  // Edit Provider Config Modal
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    category: 'GAME_TOPUP',
    environment: 'sandbox',
    api_base_url: '',
    api_key: '',
    api_secret: '',
    is_active: true,
  });
  const [savingConfig, setSavingConfig] = useState(false);

  // Load Providers
  const fetchProviders = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/providers');
      const data = await res.json();
      if (data.providers && Array.isArray(data.providers) && data.providers.length > 0) {
        // Merge DB providers with metadata
        const merged = data.providers.map((p: any) => {
          const fallback = FALLBACK_PROVIDERS.find(f => f.code === p.code || f.id === p.id);
          return {
            ...p,
            supported_games: p.supported_games || fallback?.supported_games || [],
            items: p.items || fallback?.items || [],
          };
        });
        setProviders(merged);
      } else {
        setProviders(FALLBACK_PROVIDERS);
      }
    } catch {
      setProviders(FALLBACK_PROVIDERS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  // Filtered Providers
  const filteredProviders = useMemo(() => {
    return providers.filter(p => {
      const matchTab = activeTab === 'ALL' || p.category === activeTab;
      const matchSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.supported_games && p.supported_games.some(g => g.toLowerCase().includes(searchQuery.toLowerCase())));
      return matchTab && matchSearch;
    });
  }, [providers, activeTab, searchQuery]);

  // Open Details Modal
  const openDetailModal = async (provider: Provider) => {
    setDetailProvider(provider);
    setLoadingItems(true);
    try {
      const res = await fetch(`/api/admin/providers/${provider.id}/items`);
      const data = await res.json();
      if (data.items && data.items.length > 0) {
        setItems(data.items);
      } else if (provider.items && provider.items.length > 0) {
        setItems(provider.items);
      } else {
        const fb = FALLBACK_PROVIDERS.find(f => f.id === provider.id || f.code === provider.code);
        setItems(fb?.items || []);
      }
    } catch {
      const fb = FALLBACK_PROVIDERS.find(f => f.id === provider.id || f.code === provider.code);
      setItems(fb?.items || []);
    } finally {
      setLoadingItems(false);
    }
  };

  // Open Edit Config Modal
  const openEditModal = (provider: Provider) => {
    setEditingProvider(provider);
    setEditForm({
      name: provider.name,
      category: provider.category || 'GAME_TOPUP',
      environment: provider.environment || 'sandbox',
      api_base_url: provider.api_base_url || '',
      api_key: '',
      api_secret: '',
      is_active: provider.is_active,
    });
  };

  // Save Provider Config
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProvider) return;
    setSavingConfig(true);
    try {
      const payload: any = {
        name: editForm.name,
        category: editForm.category,
        environment: editForm.environment,
        api_base_url: editForm.api_base_url,
        is_active: editForm.is_active,
      };
      if (editForm.api_key.trim()) payload.api_key = editForm.api_key.trim();
      if (editForm.api_secret.trim()) payload.api_secret = editForm.api_secret.trim();

      const res = await fetch(`/api/admin/providers/${editingProvider.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const resData = await res.json();
      if (!res.ok || resData.error) {
        throw new Error(resData.error || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      }

      setNotification({ type: 'success', message: 'บันทึกการตั้งค่า API สำเร็จเรียบร้อยแล้ว' });
      setEditingProvider(null);
      fetchProviders();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'เกิดข้อผิดพลาดในการบันทึก' });
    } finally {
      setSavingConfig(false);
    }
  };

  // Update item price or active state in modal
  const handleItemChange = (itemId: string, field: 'selling_price' | 'is_active', val: any) => {
    setItems(prev =>
      prev.map(it => {
        if (it.id !== itemId) return it;
        const updated = { ...it, [field]: val };
        if (field === 'selling_price') {
          const numPrice = Number(val) || 0;
          updated.selling_price = numPrice;
          updated.profit = Math.round((numPrice - updated.cost) * 100) / 100;
          updated.margin_percent = numPrice > 0 ? Math.round(((numPrice - updated.cost) / numPrice) * 1000) / 10 : 0;
        }
        return updated;
      })
    );
  };

  // Batch activate all items
  const handleEnableAllItems = async () => {
    if (!detailProvider) return;
    setSavingPrices(true);
    try {
      setItems(prev => prev.map(it => ({ ...it, is_active: true })));
      const res = await fetch(`/api/admin/providers/${detailProvider.id}/items`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enable_all: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'เปิดใช้งานไม่สำเร็จ');
      setNotification({ type: 'success', message: 'เปิดใช้งาน API กับสินค้าทั้งหมดของเจ้านี้เรียบร้อยแล้ว!' });
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message });
    } finally {
      setSavingPrices(false);
    }
  };

  // Save Prices & Statuses
  const handleSaveItems = async () => {
    if (!detailProvider) return;
    setSavingPrices(true);
    try {
      const payload = {
        items: items.map(it => ({
          id: it.id,
          selling_price: it.selling_price,
          is_active: it.is_active,
        })),
      };
      const res = await fetch(`/api/admin/providers/${detailProvider.id}/items`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'บันทึกราคาไม่สำเร็จ');
      setNotification({ type: 'success', message: 'บันทึกการตั้งค่าราคาขายและสถานะสินค้าเรียบร้อยแล้ว' });
      setDetailProvider(null);
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message });
    } finally {
      setSavingPrices(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 pb-16 font-sans">
      {/* Top Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center p-2 rounded-xl bg-sky-50 text-sky-600 border border-sky-100">
                  <Server className="w-5 h-5" />
                </span>
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                  ศูนย์ควบคุม API & Providers
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                จัดการ API เติมเกม แอพพรีเมียม ระบบชำระเงิน และกำหนดราคาขายพร้อมกำไรแบบเรียลไทม์
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={fetchProviders}
                disabled={loading}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-sky-600' : ''}`} />
                รีเฟรช
              </button>
              <button
                onClick={() => {
                  setEditingProvider({
                    id: 'new',
                    name: '',
                    code: '',
                    category: 'GAME_TOPUP',
                    environment: 'sandbox',
                    is_active: true,
                  });
                  setEditForm({
                    name: '',
                    category: 'GAME_TOPUP',
                    environment: 'sandbox',
                    api_base_url: '',
                    api_key: '',
                    api_secret: '',
                    is_active: true,
                  });
                }}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold rounded-xl bg-sky-600 hover:bg-sky-700 text-white shadow-sm transition"
              >
                <Plus className="w-4 h-4" />
                เพิ่ม Provider ใหม่
              </button>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-2 mt-5 overflow-x-auto pb-1 scrollbar-none border-t border-slate-100 pt-3">
            {CATEGORY_TABS.map(tab => {
              const TabIcon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                  }`}
                >
                  <TabIcon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {/* Notification Alert */}
        {notification && (
          <div
            className={`mb-6 p-4 rounded-xl flex items-center justify-between border ${
              notification.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            <div className="flex items-center gap-3">
              {notification.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              )}
              <span className="text-sm font-semibold">{notification.message}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Search & Info Bar */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 mb-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อ API หรือชื่อเกม/แอพ..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:bg-white focus:outline-hidden focus:border-sky-500 font-medium placeholder:text-slate-400"
            />
          </div>

          <div className="text-xs text-slate-500 font-medium">
            พบผู้ให้บริการทั้งหมด <strong className="text-slate-900 font-bold">{filteredProviders.length}</strong> รายการ ในหมวดนี้
          </div>
        </div>

        {/* Provider Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProviders.map(provider => {
            const isTopup = provider.category === 'GAME_TOPUP';
            const isApp = provider.category === 'PREMIUM_APP';
            const isPay = provider.category === 'PAYMENT';

            const badgeBg = isTopup
              ? 'bg-amber-50 text-amber-700 border-amber-200'
              : isApp
              ? 'bg-purple-50 text-purple-700 border-purple-200'
              : isPay
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-sky-50 text-sky-700 border-sky-200';

            const categoryLabel = isTopup
              ? '🎮 ระบบเติมเกม'
              : isApp
              ? '📱 ระบบแอพพรีเมียม'
              : isPay
              ? '💳 ระบบชำระเงิน'
              : '🤖 ระบบ AI';

            return (
              <div
                key={provider.id}
                className="bg-white rounded-2xl border border-slate-200/90 hover:border-sky-300 hover:shadow-md transition flex flex-col justify-between overflow-hidden shadow-xs"
              >
                <div className="p-5">
                  {/* Category & Environment Header */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${badgeBg}`}>
                      {categoryLabel}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                          provider.environment === 'production'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {provider.environment === 'production' ? '● Production' : '● Sandbox'}
                      </span>
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          provider.is_active ? 'bg-emerald-500 ring-4 ring-emerald-100' : 'bg-slate-300'
                        }`}
                        title={provider.is_active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                      />
                    </div>
                  </div>

                  {/* Provider Name */}
                  <h3 className="text-base font-extrabold text-slate-900 line-clamp-1">
                    {provider.name}
                  </h3>

                  {/* Endpoint Preview */}
                  <p className="text-xs text-slate-500 font-mono mt-1 line-clamp-1">
                    {provider.api_base_url || 'ไม่ได้ระบุ Endpoint'}
                  </p>

                  {/* Supported Games / Apps List */}
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <div className="text-xs font-bold text-slate-700 mb-2 flex items-center justify-between">
                      <span>เกมและแอพที่ให้บริการ:</span>
                      <span className="text-[11px] font-semibold text-sky-600">
                        {provider.supported_games?.length || 0} รายการ
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {provider.supported_games && provider.supported_games.length > 0 ? (
                        provider.supported_games.slice(0, 5).map((game, idx) => (
                          <span
                            key={idx}
                            className="inline-block px-2 py-1 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200/60"
                          >
                            {game}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400 italic">ไม่มีข้อมูลเกมที่ผูก</span>
                      )}
                      {provider.supported_games && provider.supported_games.length > 5 && (
                        <span className="inline-block px-2 py-1 rounded-md bg-sky-50 text-sky-700 text-[11px] font-bold border border-sky-100">
                          +{provider.supported_games.length - 5}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="p-4 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => openDetailModal(provider)}
                    className="flex-1 inline-flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs sm:text-sm font-bold shadow-xs transition"
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                    ดูรายละเอียด & ตั้งราคา
                  </button>

                  <button
                    onClick={() => openEditModal(provider)}
                    title="แก้ไขการเชื่อมต่อ API"
                    className="p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 1. Modal: ดูรายละเอียด / รายการเกม / คำนวณกำไร / เปิดใช้ API */}
      {/* ======================================================== */}
      {detailProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-md bg-sky-100 text-sky-700 text-xs font-bold">
                    {detailProvider.category === 'GAME_TOPUP' ? '🎮 เติมเกม' : '📱 แอพพรีเมียม'}
                  </span>
                  <h2 className="text-lg font-extrabold text-slate-900">
                    {detailProvider.name}
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Endpoint: <span className="font-mono text-slate-700">{detailProvider.api_base_url || '-'}</span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleEnableAllItems}
                  disabled={savingPrices}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition"
                >
                  <Zap className="w-3.5 h-3.5" />
                  ⚡ ใช้ API ทั้งหมด
                </button>
                <button
                  onClick={() => setDetailProvider(null)}
                  className="p-2 rounded-xl bg-slate-200/70 hover:bg-slate-200 text-slate-600 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Content / Table */}
            <div className="p-6 overflow-y-auto flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 bg-sky-50/80 p-3.5 rounded-xl border border-sky-100">
                <div className="flex items-center gap-2">
                  <Info className="w-5 h-5 text-sky-600 shrink-0" />
                  <span className="text-xs sm:text-sm text-sky-950 font-medium">
                    กำหนด <strong>ราคาขาย</strong> ได้ทันที ระบบจะคำนวณ <strong>กำไรสุทธิ (฿)</strong> และ <strong>% Margin</strong> ให้ทันที
                  </span>
                </div>
                <button
                  onClick={handleEnableAllItems}
                  disabled={savingPrices}
                  className="sm:hidden inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold"
                >
                  <Zap className="w-3.5 h-3.5" />
                  ⚡ ใช้ API ทั้งหมด
                </button>
              </div>

              {loadingItems ? (
                <div className="py-16 text-center text-slate-400">
                  <RefreshCw className="w-7 h-7 animate-spin mx-auto text-sky-500 mb-2" />
                  กำลังโหลดข้อมูลเกมและแอพ...
                </div>
              ) : items.length === 0 ? (
                <div className="py-16 text-center text-slate-400">
                  ไม่มีรายการเกมหรือแพ็กเกจที่ผูกกับ API นี้
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs sm:text-sm border-collapse">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                          <th className="py-3 px-4">ชื่อเกม / แอพ / สินค้า</th>
                          <th className="py-3 px-3 text-right">ต้นทุน (฿)</th>
                          <th className="py-3 px-3 text-right w-36">ราคาขายหน้าร้าน (฿)</th>
                          <th className="py-3 px-3 text-right">กำไรสุทธิ (฿)</th>
                          <th className="py-3 px-3 text-center">เปิดใช้ API</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {items.map(item => {
                          const isProfitable = item.profit > 0;
                          return (
                            <tr key={item.id} className="hover:bg-slate-50/80 transition">
                              <td className="py-3 px-4 font-bold text-slate-900">
                                {item.name}
                              </td>
                              <td className="py-3 px-3 text-right font-mono font-semibold text-slate-600">
                                ฿{item.cost.toLocaleString()}
                              </td>
                              <td className="py-3 px-3 text-right">
                                <div className="inline-flex items-center gap-1 bg-white border border-slate-300 rounded-lg px-2 py-1 focus-within:border-sky-500 focus-within:ring-1 focus-within:ring-sky-500 shadow-2xs">
                                  <span className="text-slate-400 text-xs">฿</span>
                                  <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={item.selling_price}
                                    onChange={e => handleItemChange(item.id, 'selling_price', e.target.value)}
                                    className="w-20 text-right font-mono font-bold text-slate-900 focus:outline-hidden text-sm"
                                  />
                                </div>
                              </td>
                              <td className="py-3 px-3 text-right">
                                <div className="flex flex-col items-end">
                                  <span
                                    className={`font-mono font-extrabold ${
                                      isProfitable ? 'text-emerald-600' : 'text-rose-600'
                                    }`}
                                  >
                                    {item.profit >= 0 ? `+฿${item.profit.toLocaleString()}` : `-฿${Math.abs(item.profit).toLocaleString()}`}
                                  </span>
                                  <span
                                    className={`text-[10px] font-bold ${
                                      isProfitable ? 'text-emerald-700' : 'text-rose-600'
                                    }`}
                                  >
                                    ({item.margin_percent}%)
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleItemChange(item.id, 'is_active', !item.is_active)}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 mx-auto ${
                                    item.is_active
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100'
                                      : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                                  }`}
                                >
                                  {item.is_active ? (
                                    <>
                                      <Check className="w-3.5 h-3.5" />
                                      กำลังใช้
                                    </>
                                  ) : (
                                    'ปิดอยู่'
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
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDetailProvider(null)}
                className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition"
              >
                ปิดหน้าต่าง
              </button>
              <button
                type="button"
                onClick={handleSaveItems}
                disabled={savingPrices}
                className="px-5 py-2 text-xs sm:text-sm font-bold rounded-xl bg-sky-600 hover:bg-sky-700 text-white shadow-xs transition inline-flex items-center gap-2"
              >
                {savingPrices && <RefreshCw className="w-4 h-4 animate-spin" />}
                บันทึกการตั้งค่าราคาขาย
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. Modal: แก้ไข / ใส่ API Key & Config (สีขาว-ฟ้า อ่านง่าย 100%) */}
      {/* ======================================================== */}
      {editingProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-sky-100 text-sky-700">
                  <Key className="w-5 h-5" />
                </span>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">
                    ตั้งค่าการเชื่อมต่อ API Provider
                  </h2>
                  <p className="text-xs text-slate-500">
                    ระบุข้อมูลการเชื่อมต่อและ API Key ให้ถูกต้องตามระบบ
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingProvider(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveConfig} className="p-6 space-y-4">
              {/* Category Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1.5">
                  1. เลือกประเภทของระบบ API นี้ *
                </label>
                <select
                  value={editForm.category}
                  onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-sm font-semibold focus:border-sky-500 focus:outline-hidden"
                >
                  <option value="GAME_TOPUP">🎮 ระบบเติมเกม (Game Top-up)</option>
                  <option value="PREMIUM_APP">📱 ระบบแอพพรีเมียม (Premium Apps & Digital)</option>
                  <option value="PAYMENT">💳 ระบบชำระเงิน (Payment Gateway)</option>
                  <option value="AI">🤖 ระบบ AI ผู้ช่วย (AI Gateway)</option>
                </select>
              </div>

              {/* Provider Name */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1.5">
                  2. ชื่อผู้ให้บริการ (Provider Name) *
                </label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="เช่น FinShop API, ByShop, PromptPay"
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-sm font-semibold focus:border-sky-500 focus:outline-hidden placeholder:text-slate-400"
                />
              </div>

              {/* Endpoint Base URL */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1.5">
                  3. Endpoint / Base URL ของระบบ *
                </label>
                <input
                  type="text"
                  value={editForm.api_base_url}
                  onChange={e => setEditForm({ ...editForm, api_base_url: e.target.value })}
                  placeholder="เช่น https://api.finshop.in.th/v1"
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono text-xs focus:border-sky-500 focus:outline-hidden placeholder:text-slate-400"
                />
              </div>

              {/* API Key */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-900">
                    4. ช่องใส่ API Key สำหรับ
                    <span className="text-sky-700 ml-1">
                      [{editForm.category === 'GAME_TOPUP' ? 'ระบบเติมเกม' : editForm.category === 'PREMIUM_APP' ? 'ระบบแอพพรีเมียม' : editForm.category === 'PAYMENT' ? 'ระบบชำระเงิน' : 'ระบบ AI'}]
                    </span>
                  </label>
                  {editingProvider.credentials_preview && (
                    <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      มีคีย์เดิม: {editingProvider.credentials_preview}
                    </span>
                  )}
                </div>
                <input
                  type="password"
                  value={editForm.api_key}
                  onChange={e => setEditForm({ ...editForm, api_key: e.target.value })}
                  placeholder={editingProvider.credentials_preview ? 'เว้นว่างไว้หากใช้คีย์เดิม หรือกรอกคีย์ใหม่' : 'วาง API Key ที่ได้รับจากผู้ให้บริการ'}
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono text-xs focus:border-sky-500 focus:outline-hidden placeholder:text-slate-400"
                />
              </div>

              {/* API Secret */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1.5">
                  5. ช่องใส่ API Secret / Secret Token (ถ้ามี)
                </label>
                <input
                  type="password"
                  value={editForm.api_secret}
                  onChange={e => setEditForm({ ...editForm, api_secret: e.target.value })}
                  placeholder="เว้นว่างได้หากผู้ให้บริการไม่ต้องการ Secret"
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono text-xs focus:border-sky-500 focus:outline-hidden placeholder:text-slate-400"
                />
              </div>

              {/* Environment & Active Toggle */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1.5">
                    สภาพแวดล้อม (Environment)
                  </label>
                  <select
                    value={editForm.environment}
                    onChange={e => setEditForm({ ...editForm, environment: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs font-semibold focus:border-sky-500 focus:outline-hidden"
                  >
                    <option value="production">🟢 Production (ใช้งานจริง)</option>
                    <option value="sandbox">🟡 Sandbox (ทดสอบระบบ)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1.5">
                    สถานะการทำงาน
                  </label>
                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, is_active: !editForm.is_active })}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border ${
                      editForm.is_active
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : 'bg-slate-100 text-slate-600 border-slate-300'
                    }`}
                  >
                    {editForm.is_active ? '✓ เปิดใช้งาน API' : '✕ ปิดใช้งานชั่วคราว'}
                  </button>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingProvider(null)}
                  className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={savingConfig}
                  className="px-5 py-2 text-xs sm:text-sm font-bold rounded-xl bg-sky-600 hover:bg-sky-700 text-white shadow-xs transition inline-flex items-center gap-2"
                >
                  {savingConfig && <RefreshCw className="w-4 h-4 animate-spin" />}
                  บันทึกการตั้งค่า
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
