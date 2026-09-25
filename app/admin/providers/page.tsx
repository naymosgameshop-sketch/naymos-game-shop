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
  Package,
  Sparkles,
  ArrowRight
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
  availability: 'available' | 'out_of_stock' | 'unavailable';
}

interface Provider {
  id: string;
  name: string;
  code: string;
  category: 'PREMIUM_APP' | 'GAME_TOPUP' | 'PAYMENT' | 'AI';
  api_base_url?: string;
  api_key?: string;
  is_active: boolean;
  is_test_mode?: boolean;
  balance?: number;
  currency?: string;
  health_status?: string;
  health_message?: string;
  default_category_id?: string | null;
}

export default function AdminProvidersPage() {
  const [activeTab, setActiveTab] = useState<'PREMIUM_APP' | 'GAME_TOPUP' | 'PAYMENT' | 'AI'>('PREMIUM_APP');
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<string>('');
  const [currentProvider, setCurrentProvider] = useState<Provider | null>(null);
  const [items, setItems] = useState<ProviderItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [defaultCategoryId, setDefaultCategoryId] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [checkingBalance, setCheckingBalance] = useState<boolean>(false);
  const [savingApiKey, setSavingApiKey] = useState<boolean>(false);
  const [savingCategory, setSavingCategory] = useState<boolean>(false);
  const [updatingBulk, setUpdatingBulk] = useState<boolean>(false);

  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showFeedback = (message: string, type: 'success' | 'error') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 4000);
  };

  // 1. Load All Providers
  const loadProviders = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/providers');
      const data = await res.json();
      if (res.ok && (data.providers || data.success)) {
        const provs: Provider[] = data.providers || [];
        setProviders(provs);

        const currentCategoryProvs = provs.filter((p) => p.category === activeTab);
        if (currentCategoryProvs.length > 0) {
          const activeOne = currentCategoryProvs.find((p) => p.is_active) || currentCategoryProvs[0];
          setSelectedProviderId(activeOne.id || activeOne.code);
        } else {
          setSelectedProviderId('');
          setCurrentProvider(null);
          setItems([]);
        }
      }
    } catch {
      showFeedback('ไม่สามารถโหลดข้อมูล Provider ได้', 'error');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  // 2. Load selected provider items & data (from DB only, no mock)
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

  // Real API Sync (Fetches actual /products from provider API, NO mock)
  const handleSyncProducts = async () => {
    if (!currentProvider) return;
    setSyncing(true);
    try {
      const res = await fetch(`/api/admin/providers/${currentProvider.id || currentProvider.code}/items`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showFeedback(data.message || `ซิงค์สำเร็จ (${data.synced_count} รายการ)`, 'success');
        // Reload fresh items from DB
        loadProviderDetails(currentProvider.id || currentProvider.code);
      } else {
        showFeedback(data.error || 'การซิงค์ข้อมูลล้มเหลว ตรวจสอบ API Key', 'error');
      }
    } catch {
      showFeedback('เกิดข้อผิดพลาดในการติดต่อเซิร์ฟเวอร์', 'error');
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

  // Update item selling price locally & on blur save
  const handlePriceChange = (code: string, newPriceStr: string) => {
    const newPrice = parseFloat(newPriceStr) || 0;
    setItems((prev) =>
      prev.map((item) => {
        if (item.external_code === code) {
          const profit = Math.max(0, newPrice - item.cost);
          const profitMargin = newPrice > 0 ? Math.round((profit / newPrice) * 100) : 0;
          return { ...item, selling_price: newPrice, profit, profit_margin: profitMargin };
        }
        return item;
      })
    );
  };

  const handlePriceBlur = async (item: ProviderItem) => {
    if (!currentProvider) return;
    try {
      await fetch(`/api/admin/providers/${currentProvider.id || currentProvider.code}/items`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toggle_item_id: item.external_code,
          set_active_state: item.is_active,
          items: [item],
        }),
      });
      showFeedback(`บันทึกราคาขาย ${item.name} เรียบร้อยแล้ว`, 'success');
    } catch {
      showFeedback('ไม่สามารถบันทึกราคาขายได้', 'error');
    }
  };

  // Category change for single item
  const handleItemCategoryChange = async (item: ProviderItem, catId: string) => {
    if (!currentProvider) return;
    setItems((prev) =>
      prev.map((i) => (i.external_code === item.external_code ? { ...i, category_id: catId } : i))
    );
    try {
      await fetch(`/api/admin/providers/${currentProvider.id || currentProvider.code}/items`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toggle_item_id: item.external_code,
          set_active_state: item.is_active,
          items: [{ ...item, category_id: catId }],
        }),
      });
      showFeedback('บันทึกหมวดหมู่ของสินค้าเรียบร้อยแล้ว', 'success');
    } catch {
      showFeedback('เกิดข้อผิดพลาดในการบันทึกหมวดหมู่', 'error');
    }
  };

  // Filtered Providers by Active System Tab
  const categoryProviders = useMemo(() => {
    return providers.filter((p) => p.category === activeTab);
  }, [providers, activeTab]);

  // Filtered Items by Search Query
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.external_code.includes(q)
    );
  }, [items, searchQuery]);

  return (
    <div className="space-y-6 font-sans text-slate-800">
      {/* Toast Feedback */}
      {feedback && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 text-sm font-semibold transition-all duration-300 animate-in fade-in slide-in-from-bottom-5 ${
            feedback.type === 'success'
              ? 'bg-emerald-600 text-white shadow-emerald-600/30'
              : 'bg-rose-600 text-white shadow-rose-600/30'
          }`}
        >
          {feedback.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Header & Clean Sky Blue / White System Navigation */}
      <div className="bg-white rounded-2xl border border-sky-100 shadow-sm p-5 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-sky-100 pb-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
              <span>จัดการสินค้าและ API ผู้ให้บริการ</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-100 text-sky-800 border border-sky-200">
                NayMos Realtime
              </span>
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              เชื่อมต่อ API ซิงค์ราคาต้นทุน สต็อกจริง และเลือกเปิดขายสินค้ารายชิ้นสู่หน้าร้านได้ทันที
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadProviders}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-sky-200 hover:bg-sky-50 hover:text-sky-600 transition shadow-xs"
              title="รีเฟรชข้อมูลระบบ"
            >
              <RefreshCw className="w-3.5 h-3.5 text-sky-500" />
              <span>รีเฟรชหน้า</span>
            </button>
          </div>
        </div>

        {/* 4 System Category Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-5">
          <button
            onClick={() => handleTabChange('PREMIUM_APP')}
            className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-sm font-bold transition-all border ${
              activeTab === 'PREMIUM_APP'
                ? 'bg-sky-500 text-white border-sky-500 shadow-md shadow-sky-500/20'
                : 'bg-white text-slate-600 border-sky-100 hover:border-sky-300 hover:text-sky-600 hover:bg-sky-50/50'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>แอพพรีเมี่ยม</span>
          </button>

          <button
            onClick={() => handleTabChange('GAME_TOPUP')}
            className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-sm font-bold transition-all border ${
              activeTab === 'GAME_TOPUP'
                ? 'bg-sky-500 text-white border-sky-500 shadow-md shadow-sky-500/20'
                : 'bg-white text-slate-600 border-sky-100 hover:border-sky-300 hover:text-sky-600 hover:bg-sky-50/50'
            }`}
          >
            <Gamepad2 className="w-4 h-4" />
            <span>เติมเกม</span>
          </button>

          <button
            onClick={() => handleTabChange('PAYMENT')}
            className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-sm font-bold transition-all border ${
              activeTab === 'PAYMENT'
                ? 'bg-sky-500 text-white border-sky-500 shadow-md shadow-sky-500/20'
                : 'bg-white text-slate-600 border-sky-100 hover:border-sky-300 hover:text-sky-600 hover:bg-sky-50/50'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>ระบบชำระเงิน</span>
          </button>

          <button
            onClick={() => handleTabChange('AI')}
            className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-sm font-bold transition-all border ${
              activeTab === 'AI'
                ? 'bg-sky-500 text-white border-sky-500 shadow-md shadow-sky-500/20'
                : 'bg-white text-slate-600 border-sky-100 hover:border-sky-300 hover:text-sky-600 hover:bg-sky-50/50'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>ระบบ AI</span>
          </button>
        </div>
      </div>

      {/* Provider Selector for this category */}
      <div className="bg-white rounded-2xl border border-sky-100 shadow-sm p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-sky-500" />
            <h2 className="text-sm font-bold text-slate-800">
              ผู้ให้บริการในระบบ ({categoryProviders.length} รายการ)
            </h2>
            <span className="text-xs text-slate-400">— ระบบอนุญาตเปิดใช้งานได้ 1 รายการหลักต่อหมวด</span>
          </div>
        </div>

        {categoryProviders.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-xs">
            ไม่พบผู้ให้บริการในหมวดหมู่นี้
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {categoryProviders.map((provider) => {
              const isSelected = selectedProviderId === provider.id || selectedProviderId === provider.code;
              const isActive = provider.is_active;

              return (
                <div
                  key={provider.id || provider.code}
                  onClick={() => setSelectedProviderId(provider.id || provider.code)}
                  className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-sky-50/60 border-sky-500 shadow-sm'
                      : 'bg-white border-slate-200 hover:border-sky-300 hover:bg-sky-50/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-base">{provider.name}</span>
                        {isActive && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span>ใช้งานอยู่</span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">
                        รหัส: {provider.code}
                      </p>
                    </div>

                    {!isActive && isSelected && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleActivateProvider(provider);
                        }}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold bg-sky-500 text-white hover:bg-sky-600 transition shadow-xs"
                      >
                        เปิดใช้งาน
                      </button>
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs pt-2.5 border-t border-sky-100">
                    <span className="text-slate-500">ยอดเงินในบัญชี:</span>
                    <span className="font-bold text-slate-800">
                      ฿{(provider.balance ?? 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Selected Provider Workspace */}
      {currentProvider && (
        <div className="space-y-6">
          {/* Real-time Balance & Actions Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Real-time Balance Card (Sky Blue Theme) */}
            <div className="md:col-span-1 bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-600 text-white rounded-2xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-medium text-sky-100 tracking-wide uppercase">
                    ยอดเงินคงเหลือ (Real-time)
                  </span>
                  <div className="text-3xl font-black mt-1 tracking-tight">
                    ฿{(currentProvider.balance ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs text-sky-100 mt-1 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>ผู้ให้บริการ: {currentProvider.name}</span>
                  </div>
                </div>
                <button
                  onClick={handleCheckBalance}
                  disabled={checkingBalance}
                  className="p-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white transition backdrop-blur-xs disabled:opacity-50"
                  title="เช็คยอดเงินสดจาก API"
                >
                  <RefreshCw className={`w-4 h-4 ${checkingBalance ? 'animate-spin' : ''}`} />
                </button>
              </div>

              <div className="mt-4 pt-3 border-t border-white/20 flex items-center justify-between text-xs text-sky-100">
                <span>สถานะระบบ API</span>
                <span className="font-semibold px-2 py-0.5 rounded-full bg-white/20 text-white">
                  {currentProvider.health_status === 'HEALTHY' ? 'ปกติ (พร้อมใช้งาน)' : 'พร้อมเชื่อมต่อ'}
                </span>
              </div>
            </div>

            {/* API Key & Default Category Configuration Card */}
            <div className="md:col-span-2 bg-white rounded-2xl border border-sky-100 shadow-sm p-5 flex flex-col justify-between gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* API Key input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-sky-500" />
                    <span>API Key ({currentProvider.name})</span>
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type={showApiKey ? 'text' : 'password'}
                        value={apiKeyInput}
                        onChange={(e) => setApiKeyInput(e.target.value)}
                        placeholder="วาง API Key เพื่อบันทึก..."
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 font-mono placeholder:text-slate-400"
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <button
                      onClick={handleSaveApiKey}
                      disabled={savingApiKey || !apiKeyInput.trim()}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-sky-500 text-white hover:bg-sky-600 transition disabled:opacity-50 shadow-xs shrink-0"
                    >
                      {savingApiKey ? 'บันทึก...' : 'บันทึก'}
                    </button>
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    API Key ถูกเข้ารหัสและเก็บรักษาบน Server ฝั่งปลอดภัย
                  </span>
                </div>

                {/* Default Category selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <FolderPlus className="w-3.5 h-3.5 text-sky-500" />
                    <span>หมวดหมู่เริ่มต้นหน้าร้าน</span>
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={defaultCategoryId}
                      onChange={(e) => setDefaultCategoryId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                    >
                      <option value="">-- เลือกหมวดหมู่เริ่มต้น --</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleSaveDefaultCategory}
                      disabled={savingCategory}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-sky-50 hover:text-sky-600 border border-slate-200 transition disabled:opacity-50 shrink-0"
                    >
                      {savingCategory ? '...' : 'ใช้หมวดนี้'}
                    </button>
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    สินค้าที่เปิดใหม่จะถูกจัดเข้าหมวดนี้บนหน้าเว็บ
                  </span>
                </div>
              </div>

              {/* Action Buttons: Sync & Bulk Toggles */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-sky-100">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSyncProducts}
                    disabled={syncing}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-sky-500 text-white hover:bg-sky-600 transition shadow-xs disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                    <span>{syncing ? 'กำลังซิงค์ API...' : 'ซิงค์ข้อมูลจาก API'}</span>
                  </button>
                  <span className="text-xs text-slate-500">
                    มีสินค้าทั้งหมด {items.length} รายการ
                  </span>
                </div>

                {items.length > 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleBulkToggle(true)}
                      disabled={updatingBulk}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>เปิดทั้งหมด</span>
                    </button>
                    <button
                      onClick={() => handleBulkToggle(false)}
                      disabled={updatingBulk}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 transition disabled:opacity-50"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      <span>ปิดทั้งหมด</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Products List & Management Area (Sky & White High-Contrast) */}
          <div className="bg-white rounded-2xl border border-sky-100 shadow-sm p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-sky-100">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-sky-500" />
                <h3 className="font-extrabold text-slate-900 text-lg">
                  รายการสินค้าจาก API ({filteredItems.length} รายการ)
                </h3>
              </div>

              {/* Search in items */}
              {items.length > 0 && (
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ค้นหาชื่อ หรือ รหัสสินค้า..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                  />
                </div>
              )}
            </div>

            {/* Empty State when no items have been synced from API */}
            {items.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-16 h-16 rounded-full bg-sky-50 border border-sky-200 text-sky-500 flex items-center justify-center mx-auto mb-4 shadow-xs">
                  <Package className="w-8 h-8" />
                </div>
                <h4 className="text-base font-bold text-slate-800 mb-1">
                  ยังไม่มีรายการสินค้าจาก API นี้
                </h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto mb-6">
                  กรุณากรอก API Key ด้านบนให้ถูกต้อง แล้วกดปุ่ม &quot;ซิงค์ข้อมูลจาก API&quot; เพื่อดึงรายการสินค้า ราคาต้นทุน และสต็อกสดจริงจากผู้ให้บริการ
                </p>
                <button
                  onClick={handleSyncProducts}
                  disabled={syncing}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-sky-500 text-white hover:bg-sky-600 transition shadow-md shadow-sky-500/20 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                  <span>{syncing ? 'กำลังซิงค์ข้อมูล...' : 'ซิงค์ข้อมูลจาก API ตอนนี้'}</span>
                </button>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                ไม่พบสินค้าที่ตรงกับคำค้นหา &quot;{searchQuery}&quot;
              </div>
            ) : (
              <div className="divide-y divide-sky-100">
                {filteredItems.map((item) => {
                  const isOutOfStock = item.stock <= 0;
                  const hasProfit = item.profit > 0;

                  return (
                    <div
                      key={item.external_code}
                      className={`py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-colors ${
                        item.is_active ? 'bg-sky-50/20' : ''
                      }`}
                    >
                      {/* Product Info */}
                      <div className="flex items-start gap-3.5 flex-1 min-w-0">
                        {/* Thumbnail / Icon */}
                        <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <Package className="w-6 h-6 text-slate-400" />
                          )}
                        </div>

                        {/* Title & Badges */}
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-slate-900 text-sm truncate">
                              {item.name}
                            </h4>
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-sky-50 text-sky-700 border border-sky-200 font-semibold">
                              รหัส #{item.external_code}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                            {/* Stock status */}
                            {isOutOfStock ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-600 border border-rose-200">
                                สินค้าหมด (0)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                มีสต็อก ({item.stock.toLocaleString()} ชิ้น)
                              </span>
                            )}

                            {/* Category Selector */}
                            <div className="flex items-center gap-1.5">
                              <span className="text-slate-400">หมวดหมู่:</span>
                              <select
                                value={item.category_id || defaultCategoryId || ''}
                                onChange={(e) => handleItemCategoryChange(item, e.target.value)}
                                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5 text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:border-sky-500"
                              >
                                {categories.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Pricing, Profit & Storefront Toggle */}
                      <div className="flex items-center gap-4 sm:gap-6 shrink-0 justify-between lg:justify-end border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100">
                        {/* Cost (ต้นทุน) */}
                        <div className="text-right">
                          <span className="block text-[11px] text-slate-400 font-medium">
                            ต้นทุน API
                          </span>
                          <span className="font-bold text-slate-700 text-sm">
                            ฿{item.cost.toFixed(2)}
                          </span>
                        </div>

                        {/* Selling Price (ราคาขายหน้าร้าน) */}
                        <div className="text-center">
                          <span className="block text-[11px] text-slate-400 font-medium mb-0.5">
                            ราคาขาย
                          </span>
                          <div className="relative inline-block">
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={item.selling_price || ''}
                              onChange={(e) => handlePriceChange(item.external_code, e.target.value)}
                              onBlur={() => handlePriceBlur(item)}
                              className="w-20 text-center font-bold text-sm bg-white border border-slate-300 rounded-lg py-1 px-2 text-slate-900 focus:outline-hidden focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                            />
                            <span className="text-[10px] text-slate-400 absolute right-1.5 top-1.5 pointer-events-none">
                              ฿
                            </span>
                          </div>
                        </div>

                        {/* Profit (กำไร) */}
                        <div className="text-right min-w-[70px]">
                          <span className="block text-[11px] text-slate-400 font-medium">
                            กำไร
                          </span>
                          <span
                            className={`inline-block text-xs font-bold px-2 py-0.5 rounded-md border ${
                              hasProfit
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-slate-100 text-slate-500 border-slate-200'
                            }`}
                          >
                            +฿{item.profit.toFixed(2)}
                          </span>
                        </div>

                        {/* Toggle On/Off for Storefront */}
                        <div className="flex flex-col items-center">
                          <button
                            type="button"
                            onClick={() => handleToggleItem(item)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-xs ${
                              item.is_active
                                ? 'bg-emerald-500 text-white border-emerald-500 shadow-emerald-500/20'
                                : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            {item.is_active ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-white" />
                                <span>เปิดหน้าร้าน</span>
                              </>
                            ) : (
                              <>
                                <Ban className="w-3.5 h-3.5 text-slate-400" />
                                <span>ปิดหน้าร้าน</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
