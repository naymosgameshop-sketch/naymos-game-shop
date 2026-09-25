'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Layers,
  Key,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Trash2,
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
  Bot,
  Eye,
  EyeOff,
  FolderPlus,
  ToggleLeft,
  ToggleRight,
  Loader2,
  Ban,
  Package
} from 'lucide-react';

interface Category {
  id: string;
  name: string;
  slug?: string;
}

interface ProviderItem {
  id: string;
  name: string;
  external_code: string;
  category: string;
  category_id?: string | null;
  duration?: string;
  cost: number;
  selling_price: number;
  profit: number;
  profit_margin: number;
  stock: number;
  is_active: boolean;
  allowed_api: boolean;
  image?: string;
  availability: string;
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
  credentials_preview?: string;
  has_credentials?: boolean;
  balance?: number;
  currency?: string;
  health_status?: string;
  default_category_id?: string | null;
}

export default function ProvidersPage() {
  const [activeTab, setActiveTab] = useState<'PREMIUM_APP' | 'GAME_TOPUP' | 'PAYMENT' | 'AI'>('PREMIUM_APP');
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<string>('');
  const [loadingProviders, setLoadingProviders] = useState(true);

  // Provider specific details
  const [currentProvider, setCurrentProvider] = useState<Provider | null>(null);
  const [items, setItems] = useState<ProviderItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [defaultCategoryId, setDefaultCategoryId] = useState<string>('');
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [savingApiKey, setSavingApiKey] = useState(false);
  const [savingCategory, setSavingCategory] = useState(false);

  // Actions state
  const [syncing, setSyncing] = useState(false);
  const [checkingBalance, setCheckingBalance] = useState(false);
  const [updatingBulk, setUpdatingBulk] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Edit Item Modal
  const [editingItem, setEditingItem] = useState<ProviderItem | null>(null);
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editCategoryId, setEditCategoryId] = useState<string>('');
  const [savingItem, setSavingItem] = useState(false);

  // Feedback Toast
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showFeedback = (message: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 4000);
  };

  // 1. Fetch all providers
  const loadProviders = useCallback(async () => {
    setLoadingProviders(true);
    try {
      const res = await fetch('/api/admin/providers');
      const data = await res.json();
      if (res.ok && data.providers) {
        setProviders(data.providers);
        // Find provider matching activeTab
        const matched = data.providers.filter((p: Provider) => p.category === activeTab);
        if (matched.length > 0) {
          const active = matched.find((p: Provider) => p.is_active) || matched[0];
          setSelectedProviderId(active.id || active.code);
        } else {
          setSelectedProviderId('');
          setCurrentProvider(null);
          setItems([]);
        }
      }
    } catch {
      showFeedback('ไม่สามารถโหลดรายการ Providers ได้', 'error');
    } finally {
      setLoadingProviders(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  // 2. Load selected provider items & data
  const loadProviderDetails = useCallback(async (providerId: string) => {
    if (!providerId) return;
    try {
      const res = await fetch(`/api/admin/providers/${providerId}/items`);
      const data = await res.json();
      if (res.ok && data.success) {
        setCurrentProvider(data.provider);
        setItems(data.items || []);
        setCategories(data.categories || []);
        setDefaultCategoryId(data.provider.default_category_id || data.categories?.[0]?.id || '');
      }
    } catch {
      showFeedback('ไม่สามารถโหลดข้อมูลสินค้าของ Provider ได้', 'error');
    }
  }, []);

  useEffect(() => {
    if (selectedProviderId) {
      loadProviderDetails(selectedProviderId);
    }
  }, [selectedProviderId, loadProviderDetails]);

  // Handle Tab Switch
  const handleTabChange = (tab: 'PREMIUM_APP' | 'GAME_TOPUP' | 'PAYMENT' | 'AI') => {
    setActiveTab(tab);
    const matched = providers.filter((p) => p.category === tab);
    if (matched.length > 0) {
      const active = matched.find((p) => p.is_active) || matched[0];
      setSelectedProviderId(active.id || active.code);
    } else {
      setSelectedProviderId('');
      setCurrentProvider(null);
      setItems([]);
    }
  };

  // Activate Provider (Enforce 1 Active Provider per category)
  const handleActivateProvider = async (provider: Provider) => {
    try {
      const res = await fetch(`/api/admin/providers/${provider.id || provider.code}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: true, category: provider.category }),
      });
      if (res.ok) {
        showFeedback(`เปิดใช้งาน ${provider.name} เป็นผู้ให้บริการหลักของระบบนี้แล้ว`, 'success');
        loadProviders();
      } else {
        showFeedback('ไม่สามารถตั้งค่าผู้ให้บริการได้', 'error');
      }
    } catch {
      showFeedback('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
    }
  };

  // Save API Key
  const handleSaveApiKey = async () => {
    if (!currentProvider || !apiKeyInput.trim()) return;
    setSavingApiKey(true);
    try {
      const res = await fetch(`/api/admin/providers/${currentProvider.id || currentProvider.code}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKeyInput.trim() }),
      });
      if (res.ok) {
        showFeedback('บันทึก API Key สำเร็จ!', 'success');
        setApiKeyInput('');
        loadProviderDetails(currentProvider.id || currentProvider.code);
      } else {
        showFeedback('บันทึก API Key ล้มเหลว', 'error');
      }
    } catch {
      showFeedback('เกิดข้อผิดพลาดในการบันทึก', 'error');
    } finally {
      setSavingApiKey(false);
    }
  };

  // Save Default Category
  const handleSaveDefaultCategory = async () => {
    if (!currentProvider) return;
    setSavingCategory(true);
    try {
      const res = await fetch(`/api/admin/providers/${currentProvider.id || currentProvider.code}/items`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ default_category_id: defaultCategoryId }),
      });
      if (res.ok) {
        showFeedback('บันทึกหมวดหมู่เริ่มต้นเรียบร้อยแล้ว!', 'success');
      } else {
        showFeedback('บันทึกหมวดหมู่ไม่สำเร็จ', 'error');
      }
    } catch {
      showFeedback('เกิดข้อผิดพลาดในการบันทึก', 'error');
    } finally {
      setSavingCategory(false);
    }
  };

  // Sync Products & Stock
  const handleSyncProducts = async () => {
    if (!currentProvider) return;
    setSyncing(true);
    try {
      const res = await fetch(`/api/admin/providers/${currentProvider.id || currentProvider.code}/items`);
      const data = await res.json();
      if (res.ok && data.success) {
        setCurrentProvider(data.provider);
        setItems(data.items || []);
        showFeedback(`ซิงค์ข้อมูลสินค้าและสต็อกเรียบร้อยแล้ว (${data.items?.length || 0} รายการ)`, 'success');
      } else {
        showFeedback('การซิงค์ข้อมูลล้มเหลว', 'error');
      }
    } catch {
      showFeedback('เกิดข้อผิดพลาดในการซิงค์', 'error');
    } finally {
      setSyncing(false);
    }
  };

  // Real-time Balance Check
  const handleCheckBalance = async () => {
    if (!currentProvider) return;
    setCheckingBalance(true);
    try {
      const res = await fetch(`/api/admin/providers/${currentProvider.id || currentProvider.code}/items`);
      const data = await res.json();
      if (res.ok && data.success) {
        setCurrentProvider(data.provider);
        showFeedback(`อัปเดตยอดเงินสดสำเร็จ: ฿${(data.provider.balance || 0).toLocaleString()}`, 'success');
      } else {
        showFeedback('ไม่สามารถตรวจสอบยอดเงินได้', 'error');
      }
    } catch {
      showFeedback('เกิดข้อผิดพลาดในการตรวจสอบยอดเงิน', 'error');
    } finally {
      setCheckingBalance(false);
    }
  };

  // Toggle Single Item (Send to storefront or hide)
  const handleToggleItem = async (item: ProviderItem) => {
    if (!currentProvider) return;
    const nextState = !item.is_active;

    // Optimistic UI update
    setItems((prev) =>
      prev.map((i) => (i.external_code === item.external_code ? { ...i, is_active: nextState } : i))
    );

    try {
      const res = await fetch(`/api/admin/providers/${currentProvider.id || currentProvider.code}/items`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toggle_item_id: item.external_code,
          set_active_state: nextState,
          items: [{ ...item, is_active: nextState, category_id: item.category_id || defaultCategoryId }],
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showFeedback(data.message, 'success');
      } else {
        // Rollback
        setItems((prev) =>
          prev.map((i) => (i.external_code === item.external_code ? { ...i, is_active: !nextState } : i))
        );
        showFeedback('เกิดข้อผิดพลาดในการอัปเดตสถานะสินค้า', 'error');
      }
    } catch {
      // Rollback
      setItems((prev) =>
        prev.map((i) => (i.external_code === item.external_code ? { ...i, is_active: !nextState } : i))
      );
      showFeedback('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
    }
  };

  // Bulk Enable All / Disable All
  const handleBulkToggle = async (enable: boolean) => {
    if (!currentProvider || items.length === 0) return;
    setUpdatingBulk(true);
    try {
      const res = await fetch(`/api/admin/providers/${currentProvider.id || currentProvider.code}/items`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enable_all: enable,
          disable_all: !enable,
          default_category_id: defaultCategoryId,
          items: items.map((i) => ({ ...i, is_active: enable, category_id: i.category_id || defaultCategoryId })),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setItems((prev) => prev.map((i) => ({ ...i, is_active: enable })));
        showFeedback(data.message, 'success');
      } else {
        showFeedback('เกิดข้อผิดพลาดในการตั้งค่าทั้งหมด', 'error');
      }
    } catch {
      showFeedback('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
    } finally {
      setUpdatingBulk(false);
    }
  };

  // Save Item Price & Category from Modal
  const handleSaveItemEdit = async () => {
    if (!currentProvider || !editingItem) return;
    setSavingItem(true);
    try {
      const updatedItem = {
        ...editingItem,
        selling_price: Number(editPrice),
        category_id: editCategoryId || defaultCategoryId,
      };

      const res = await fetch(`/api/admin/providers/${currentProvider.id || currentProvider.code}/items`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toggle_item_id: updatedItem.external_code,
          set_active_state: updatedItem.is_active,
          items: [updatedItem],
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setItems((prev) =>
          prev.map((i) =>
            i.external_code === updatedItem.external_code
              ? {
                  ...i,
                  selling_price: editPrice,
                  profit: Math.max(0, editPrice - i.cost),
                  profit_margin: editPrice > 0 ? Math.round(((editPrice - i.cost) / editPrice) * 100) : 0,
                  category_id: editCategoryId,
                }
              : i
          )
        );
        showFeedback('บันทึกราคาและหมวดหมู่สินค้าสำเร็จ!', 'success');
        setEditingItem(null);
      } else {
        showFeedback('บันทึกสินค้าไม่สำเร็จ', 'error');
      }
    } catch {
      showFeedback('เกิดข้อผิดพลาดในการบันทึก', 'error');
    } finally {
      setSavingItem(false);
    }
  };

  // Filter items
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.external_code.includes(searchQuery)
    );
  }, [items, searchQuery]);

  // Current category providers list
  const currentCategoryProviders = useMemo(() => {
    return providers.filter((p) => p.category === activeTab);
  }, [providers, activeTab]);

  return (
    <div className="min-h-screen bg-[#0d1117] text-slate-100 p-4 sm:p-6 lg:p-8 font-sans">
      {/* Toast Feedback */}
      {feedback && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-sm font-semibold transition-all duration-300 animate-in fade-in slide-in-from-bottom-5 ${
            feedback.type === 'success'
              ? 'bg-emerald-600 text-white shadow-emerald-900/40'
              : 'bg-rose-600 text-white shadow-rose-900/40'
          }`}
        >
          {feedback.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          <span>{feedback.message}</span>
        </div>
      )}

      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header & System Tabs */}
        <div>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
                <span>จัดการสินค้าและ API ผู้ให้บริการ</span>
              </h1>
              <p className="text-sm text-slate-400 mt-1 flex items-center gap-2">
                <span>Sync สินค้าจาก API ผู้ให้บริการ และตั้งค่าราคาขายหน้าร้านอัตโนมัติ</span>
                <span className="hidden sm:inline-block w-1.5 h-1.5 rounded-full bg-slate-600" />
                <span className="text-sky-400 font-medium">⚡ ระบบอนุญาตให้เปิดใช้งานได้ 1 ผู้ให้บริการหลักต่อระบบ</span>
              </p>
            </div>

            {/* System Category Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-900/90 border border-slate-800 rounded-2xl overflow-x-auto scrollbar-none">
              <button
                onClick={() => handleTabChange('PREMIUM_APP')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                  activeTab === 'PREMIUM_APP'
                    ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span>แอพพรีเมี่ยม</span>
              </button>
              <button
                onClick={() => handleTabChange('GAME_TOPUP')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                  activeTab === 'GAME_TOPUP'
                    ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Gamepad2 className="w-4 h-4" />
                <span>เติมเกม</span>
              </button>
              <button
                onClick={() => handleTabChange('PAYMENT')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                  activeTab === 'PAYMENT'
                    ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>ระบบชำระเงิน</span>
              </button>
              <button
                onClick={() => handleTabChange('AI')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                  activeTab === 'AI'
                    ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Bot className="w-4 h-4" />
                <span>AI Gateway</span>
              </button>
            </div>
          </div>

          {/* Provider Selection Tabs within the Active System */}
          <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-xs font-semibold text-slate-400 mr-2 shrink-0">ผู้ให้บริการ:</span>
            {currentCategoryProviders.map((prov) => {
              const isSelected = selectedProviderId === prov.id || selectedProviderId === prov.code;
              return (
                <div
                  key={prov.id || prov.code}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-800 border-sky-500/80 text-white shadow-xs'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                  }`}
                  onClick={() => setSelectedProviderId(prov.id || prov.code)}
                >
                  <span>{prov.name}</span>
                  {prov.is_active ? (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Active (ใช้งานอยู่)
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleActivateProvider(prov);
                      }}
                      className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-700/60 text-slate-300 hover:bg-sky-600 hover:text-white transition"
                    >
                      เลือกใช้นี้
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Loading state */}
        {loadingProviders ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
            <span className="text-sm">กำลังโหลดข้อมูลระบบ API...</span>
          </div>
        ) : !currentProvider ? (
          <div className="p-12 text-center bg-slate-900/60 rounded-3xl border border-slate-800">
            <Server className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white">ยังไม่มีผู้ให้บริการในระบบนี้</h3>
            <p className="text-sm text-slate-400 mt-1">กรุณาเพิ่มหรือเปิดใช้งานผู้ให้บริการในหมวดนี้</p>
          </div>
        ) : (
          <>
            {/* Card 1: API Configuration Card (Matching IMG_8526.png) */}
            <div className="bg-[#161b22] border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl space-y-6">
              <div className="border-b border-slate-800/80 pb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                    <span>จัดการสินค้า {currentProvider.name}</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Sync สินค้าจาก {currentProvider.name} API และตั้งค่าราคา
                  </p>
                </div>
                {currentProvider.is_active && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    ผู้ให้บริการหลัก (Active)
                  </span>
                )}
              </div>

              {/* API Key Input Row */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300">API KEY</label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                  <div className="relative flex-1">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      placeholder={currentProvider.has_credentials ? '••••••••••••••••••••••••••••••••' : 'ใส่ API Key ของคุณที่นี่...'}
                      className="w-full bg-[#0d1117] border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-hidden focus:border-sky-500 transition pr-10 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition"
                    >
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveApiKey}
                    disabled={savingApiKey || !apiKeyInput.trim()}
                    className="px-6 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white transition flex items-center justify-center gap-2 shadow-xs shrink-0"
                  >
                    {savingApiKey ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    <span>บันทึก</span>
                  </button>
                </div>
              </div>

              {/* Default Category Row */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                  <FolderPlus className="w-4 h-4 text-sky-400" />
                  <span>หมวดหมู่ default สำหรับสินค้า {currentProvider.name}</span>
                </div>
                <p className="text-xs text-slate-400">
                  สินค้าที่ Sync ใหม่จะถูกจัดอยู่ในหมวดหมู่นี้อัตโนมัติ (สามารถเปลี่ยนได้ทีละตัว)
                </p>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                  <select
                    value={defaultCategoryId}
                    onChange={(e) => setDefaultCategoryId(e.target.value)}
                    className="flex-1 bg-[#0d1117] border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-hidden focus:border-sky-500 transition"
                  >
                    <option value="">ไม่มีหมวดหมู่</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleSaveDefaultCategory}
                    disabled={savingCategory}
                    className="px-6 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white transition flex items-center justify-center gap-2 shadow-xs shrink-0"
                  >
                    {savingCategory ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    <span>บันทึก</span>
                  </button>
                </div>
              </div>

              {/* 4 Action Buttons Bar (Exact match to IMG_8526.png) */}
              <div className="flex flex-wrap items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleSyncProducts}
                  disabled={syncing}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-emerald-700 hover:bg-emerald-600 disabled:bg-slate-800 disabled:text-slate-500 text-white transition shadow-sm"
                >
                  <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                  <span>{syncing ? 'กำลัง Sync...' : 'Sync สินค้าทันที'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCheckBalance}
                  disabled={checkingBalance}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-[#21262d] hover:bg-[#30363d] border border-slate-700 text-slate-200 transition"
                >
                  <DollarSign className={`w-4 h-4 ${checkingBalance ? 'animate-spin' : 'text-emerald-400'}`} />
                  <span>เช็คยอดเงิน</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleBulkToggle(true)}
                  disabled={updatingBulk}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-[#21262d] hover:bg-[#30363d] border border-slate-700 text-slate-200 transition"
                >
                  <Eye className="w-4 h-4 text-sky-400" />
                  <span>เปิดทั้งหมด</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleBulkToggle(false)}
                  disabled={updatingBulk}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-[#21262d] hover:bg-[#30363d] border border-slate-700 text-slate-200 transition"
                >
                  <EyeOff className="w-4 h-4 text-rose-400" />
                  <span>ปิดทั้งหมด</span>
                </button>
              </div>

              {/* Card 2: Live Balance Card (Matching IMG_8526.png) */}
              <div className="bg-[#0d1117] border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="text-xs font-bold text-slate-400 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                    ยอดเงิน {currentProvider.name}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">อัปเดตแบบ Real-time</span>
                </div>
                <div className="grid grid-cols-2 gap-4 py-2 border-t border-slate-800/80">
                  <div>
                    <span className="text-xs text-slate-400 block mb-1">Status</span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      success
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block mb-1">Money</span>
                    <span className="text-lg sm:text-xl font-extrabold text-white font-mono">
                      ฿{(currentProvider.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: All Products List (Matching IMG_8526.png) */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="text-lg sm:text-xl font-extrabold text-white flex items-center gap-2">
                  <span>สินค้าทั้งหมด</span>
                  <span className="text-sm font-bold px-2 py-0.5 rounded-lg bg-slate-800 text-sky-400 border border-slate-700">
                    {filteredItems.length}
                  </span>
                </h3>

                {/* Search Bar */}
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ค้นหาชื่อสินค้า..."
                    className="w-full bg-[#161b22] border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-hidden focus:border-sky-500 transition shadow-2xs"
                  />
                </div>
              </div>

              {/* Items Table / List */}
              {filteredItems.length === 0 ? (
                <div className="bg-[#161b22] border border-slate-800 rounded-3xl p-12 text-center text-slate-500">
                  <Package className="w-12 h-12 mx-auto mb-3 stroke-1 text-slate-600" />
                  <p className="text-sm font-semibold text-slate-400">ไม่พบสินค้า</p>
                  <p className="text-xs text-slate-500 mt-1">กดปุ่ม &quot;Sync สินค้าทันที&quot; ด้านบนเพื่อดึงข้อมูลรายการสินค้าจาก API</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredItems.map((item) => {
                    const isOutOfStock = item.stock <= 0;
                    return (
                      <div
                        key={item.external_code}
                        className={`bg-[#161b22] border rounded-2xl p-4 sm:p-5 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                          item.is_active
                            ? 'border-slate-700 hover:border-slate-600'
                            : 'border-slate-800/80 opacity-75'
                        }`}
                      >
                        {/* Left: Thumbnail & Details */}
                        <div className="flex items-start gap-3.5 flex-1 min-w-0">
                          {/* Thumbnail */}
                          <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
                            {item.image ? (
                              <img
                                src={item.image}
                                alt={item.name}
                                className={`w-full h-full object-cover ${isOutOfStock ? 'grayscale opacity-75' : ''}`}
                              />
                            ) : (
                              <Smartphone className="w-6 h-6 text-slate-500" />
                            )}
                          </div>

                          {/* Info */}
                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-sm sm:text-base font-bold text-white truncate">
                                {item.name}
                              </h4>
                              {item.is_active ? (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                  เปิดหน้าเว็บ
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                                  ปิด
                                </span>
                              )}
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-800/80 text-slate-400 border border-slate-700">
                                {currentProvider.code}
                              </span>
                            </div>

                            {/* Meta Specs */}
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                              <span>ID: <strong className="text-slate-300 font-mono">{item.external_code}</strong></span>
                              <span>•</span>
                              <span>ต้นทุน: <strong className="text-slate-300 font-mono">฿{item.cost}</strong></span>
                              <span>•</span>
                              <span>ราคาขาย: <strong className="text-sky-400 font-mono font-bold">฿{item.selling_price}</strong></span>
                              <span>•</span>
                              <span>
                                สต็อก: {isOutOfStock ? (
                                  <strong className="text-rose-400 font-mono font-bold">0 (หมด)</strong>
                                ) : (
                                  <strong className="text-emerald-400 font-mono font-bold">{item.stock}</strong>
                                )}
                              </span>
                            </div>

                            {/* Sub Package Tag Badge */}
                            <div className="pt-1 flex flex-wrap gap-1.5">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-[#0d1117] border border-slate-800 text-slate-300">
                                <span>{item.name}</span>
                                <span className="text-sky-400 font-bold">฿{item.selling_price}</span>
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Right: Toggle Switch & Edit Button */}
                        <div className="flex items-center justify-end gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800/80">
                          {/* Toggle Switch */}
                          <button
                            type="button"
                            onClick={() => handleToggleItem(item)}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                              item.is_active ? 'bg-sky-500' : 'bg-slate-700'
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                                item.is_active ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>

                          {/* Edit Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setEditingItem(item);
                              setEditPrice(item.selling_price);
                              setEditCategoryId(item.category_id || defaultCategoryId);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#21262d] hover:bg-[#30363d] border border-slate-700 text-slate-200 transition"
                          >
                            <SlidersHorizontal className="w-3.5 h-3.5 text-sky-400" />
                            <span>แก้ไข</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Edit Item Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#161b22] border border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-white">{editingItem.name}</h3>
                <p className="text-xs text-slate-400 mt-0.5">ตั้งค่าราคาขายหน้าร้านและหมวดหมู่</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Cost & Live Profit Calc */}
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-[#0d1117] border border-slate-800 text-xs">
                <div>
                  <span className="text-slate-400 block mb-0.5">ต้นทุน API</span>
                  <span className="text-sm font-bold text-slate-200 font-mono">฿{editingItem.cost}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">กำไรคาดการณ์</span>
                  <span className="text-sm font-bold text-emerald-400 font-mono">
                    ฿{Math.max(0, editPrice - editingItem.cost)} ({editPrice > 0 ? Math.round(((editPrice - editingItem.cost) / editPrice) * 100) : 0}%)
                  </span>
                </div>
              </div>

              {/* Selling Price Input */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">ราคาขายหน้าร้าน (บาท)</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">฿</span>
                  <input
                    type="number"
                    value={editPrice}
                    onChange={(e) => setEditPrice(Number(e.target.value))}
                    min={editingItem.cost}
                    className="w-full bg-[#0d1117] border border-slate-700 rounded-xl pl-8 pr-4 py-2.5 text-sm text-white font-mono focus:outline-hidden focus:border-sky-500 transition"
                  />
                </div>
              </div>

              {/* Category Selector */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">หมวดหมู่สำหรับสินค้านี้</label>
                <select
                  value={editCategoryId}
                  onChange={(e) => setEditCategoryId(e.target.value)}
                  className="w-full bg-[#0d1117] border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-hidden focus:border-sky-500 transition"
                >
                  <option value="">ไม่มีหมวดหมู่</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:bg-slate-800 transition"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSaveItemEdit}
                disabled={savingItem}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-sky-500 hover:bg-sky-400 disabled:bg-slate-800 text-white transition flex items-center gap-1.5 shadow-xs"
              >
                {savingItem && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>บันทึกการแก้ไข</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
