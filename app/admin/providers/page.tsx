'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Key,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Server,
  Activity,
  DollarSign,
  TrendingUp,
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
  has_credentials?: boolean;
  credentials_preview?: string | null;
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
        let provs: Provider[] = data.providers || [];
        setProviders(provs);

        const currentCategoryProvs = provs.filter((p) => {
          if (p.category !== activeTab) return false;
          if (activeTab === 'PREMIUM_APP') {
            const c = (p.code || '').toLowerCase();
            return c === 'finshop' || c === 'byshop';
          }
          return true;
        });

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
    const matched = providers.filter((p) => {
      if (p.category !== tab) return false;
      if (tab === 'PREMIUM_APP') {
        const c = (p.code || '').toLowerCase();
        return c === 'finshop' || c === 'byshop';
      }
      return true;
    });

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
        body: JSON.stringify({ is_active: true, category: provider.category, name: provider.name }),
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
    const keyToSave = apiKeyInput.trim();
    try {
      const res = await fetch(`/api/admin/providers/${currentProvider.id || currentProvider.code}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: keyToSave, name: currentProvider.name }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showFeedback('บันทึก API Key สำเร็จ และเชื่อมต่อกับระบบแล้ว!', 'success');
        setApiKeyInput('');
        if (data.provider) {
          setCurrentProvider(data.provider);
          setProviders((prev) =>
            prev.map((p) => (p.id === data.provider.id || p.code === data.provider.code ? { ...p, ...data.provider } : p))
          );
        }
        loadProviderDetails(currentProvider.id || currentProvider.code);
      } else {
        showFeedback(data.error || 'บันทึก API Key ล้มเหลว', 'error');
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

  // Real API Sync
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

  // Toggle Single Item
  const handleToggleItem = async (item: ProviderItem) => {
    if (!currentProvider) return;
    const nextState = !item.is_active;

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
        setItems((prev) =>
          prev.map((i) => (i.external_code === item.external_code ? { ...i, is_active: !nextState } : i))
        );
        showFeedback('เกิดข้อผิดพลาดในการอัปเดตสถานะสินค้า', 'error');
      }
    } catch {
      setItems((prev) =>
        prev.map((i) => (i.external_code === item.external_code ? { ...i, is_active: !nextState } : i))
      );
      showFeedback('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
    }
  };

  // Bulk Toggle
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
        showFeedback('ไม่สามารถเปลี่ยนสถานะทั้งหมดได้', 'error');
      }
    } catch {
      showFeedback('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
    } finally {
      setUpdatingBulk(false);
    }
  };

  // Filter items by search query
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.external_code.toLowerCase().includes(q)
    );
  }, [items, searchQuery]);

  const activeCount = useMemo(() => items.filter((i) => i.is_active).length, [items]);

  // Providers in current tab
  const categoryProviders = useMemo(() => {
    return providers.filter((p) => {
      if (p.category !== activeTab) return false;
      if (activeTab === 'PREMIUM_APP') {
        const c = (p.code || '').toLowerCase();
        return c === 'finshop' || c === 'byshop';
      }
      return true;
    });
  }, [providers, activeTab]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Toast Feedback Notification */}
      {feedback && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold flex items-center gap-2 transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-sky-100 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-sky-500 text-white shadow-xs">
              <Server className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              จัดการผู้ให้บริการ API & ซิงค์สินค้า
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            เชื่อมต่อ API แอพพรีเมี่ยม (FinShop & BYShop), ตรวจสอบยอดเงิน และซิงค์สต็อกสินค้าเข้าหน้าร้านอัตโนมัติ
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadProviders}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition shadow-xs disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-sky-500 ${loading ? 'animate-spin' : ''}`} />
            <span>รีเฟรชข้อมูล</span>
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1">
        <button
          onClick={() => handleTabChange('PREMIUM_APP')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap ${
            activeTab === 'PREMIUM_APP'
              ? 'bg-sky-500 text-white shadow-xs'
              : 'text-slate-600 hover:text-sky-600 hover:bg-sky-50/50'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          <span>แอพพรีเมี่ยม (FinShop & BYShop)</span>
        </button>

        <button
          onClick={() => handleTabChange('GAME_TOPUP')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap ${
            activeTab === 'GAME_TOPUP'
              ? 'bg-sky-500 text-white shadow-xs'
              : 'text-slate-600 hover:text-sky-600 hover:bg-sky-50/50'
          }`}
        >
          <Gamepad2 className="w-4 h-4" />
          <span>ระบบเติมเกม</span>
        </button>

        <button
          onClick={() => handleTabChange('PAYMENT')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap ${
            activeTab === 'PAYMENT'
              ? 'bg-sky-500 text-white shadow-xs'
              : 'text-slate-600 hover:text-sky-600 hover:bg-sky-50/50'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>ระบบชำระเงิน</span>
        </button>

        <button
          onClick={() => handleTabChange('AI')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap ${
            activeTab === 'AI'
              ? 'bg-sky-500 text-white shadow-xs'
              : 'text-slate-600 hover:text-sky-600 hover:bg-sky-50/50'
          }`}
        >
          <Bot className="w-4 h-4" />
          <span>ระบบ AI</span>
        </button>
      </div>

      {/* Provider Selector Cards in current category */}
      <div className="bg-white rounded-2xl border border-sky-100 shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
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
                      ? 'bg-sky-50/60 border-sky-500 shadow-sm ring-1 ring-sky-500'
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
                {/* API Key input with status preview */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-sky-500" />
                      <span>API Key ({currentProvider.name})</span>
                    </label>
                    {currentProvider.has_credentials ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span>บันทึกแล้ว ({currentProvider.credentials_preview || '••••••••'})</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        <AlertCircle className="w-3 h-3 text-amber-600" />
                        <span>ยังไม่ได้บันทึก Key</span>
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type={showApiKey ? 'text' : 'password'}
                        value={apiKeyInput}
                        onChange={(e) => setApiKeyInput(e.target.value)}
                        placeholder={
                          currentProvider.has_credentials
                            ? 'กรอกคีย์ใหม่เมื่อต้องการเปลี่ยน...'
                            : 'วาง API Key เพื่อบันทึก...'
                        }
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
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleSaveDefaultCategory}
                      disabled={savingCategory}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition shrink-0"
                    >
                      {savingCategory ? 'กำลังบันทึก...' : 'ใช้หมวดนี้'}
                    </button>
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    สินค้าที่เปิดใหม่จะถูกจัดเข้าหมวดนี้บนหน้าเว็บ
                  </span>
                </div>
              </div>

              {/* Sync Button & Summary */}
              <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSyncProducts}
                    disabled={syncing}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-sky-500 text-white hover:bg-sky-600 transition shadow-xs disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                    <span>{syncing ? 'กำลังซิงค์ข้อมูลจาก API...' : 'ซิงค์ข้อมูลจาก API'}</span>
                  </button>

                  <span className="text-xs text-slate-500">
                    มีสินค้าทั้งหมด <strong className="text-slate-800">{items.length}</strong> รายการ
                  </span>
                </div>

                {items.length > 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleBulkToggle(true)}
                      disabled={updatingBulk}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition"
                    >
                      เปิดขายทั้งหมด ({items.length})
                    </button>
                    <button
                      onClick={() => handleBulkToggle(false)}
                      disabled={updatingBulk}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition"
                    >
                      ปิดทั้งหมด
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Product Items Table Section */}
          <div className="bg-white rounded-2xl border border-sky-100 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Package className="w-4 h-4 text-sky-500" />
                  <span>รายการสินค้าจาก API ({filteredItems.length} รายการ)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  เปิดขายบนหน้าเว็บได้ทันที หรือกำหนดราคาขายเพื่อคำนวณกำไร
                </p>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ค้นหาชื่อ หรือ รหัสสินค้า..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:border-sky-500"
                />
              </div>
            </div>

            {/* Empty State when no items synced */}
            {items.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-500 flex items-center justify-center mx-auto border border-sky-100">
                  <Package className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">
                  ยังไม่มีรายการสินค้าจาก API นี้
                </h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  กรุณากรอก API Key ด้านบนให้ถูกต้อง แล้วกดปุ่ม &quot;ซิงค์ข้อมูลจาก API&quot; เพื่อดึงรายการสินค้า ราคาต้นทุน และสต็อกสดจริงจากผู้ให้บริการ
                </p>
                <button
                  onClick={handleSyncProducts}
                  disabled={syncing}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-sky-500 text-white hover:bg-sky-600 transition shadow-xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                  <span>ซิงค์ข้อมูลจาก API ตอนนี้</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-100 uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="py-3 px-4">สินค้า</th>
                      <th className="py-3 px-3 text-right">ต้นทุน API</th>
                      <th className="py-3 px-3 text-right">ราคาขายหน้าร้าน</th>
                      <th className="py-3 px-3 text-right">กำไร</th>
                      <th className="py-3 px-3 text-center">สต็อก</th>
                      <th className="py-3 px-3 text-center">สถานะสต็อก</th>
                      <th className="py-3 px-4 text-center">เปิดขายหน้าร้าน</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredItems.map((item) => {
                      const isOutOfStock = item.stock <= 0 || item.availability === 'out_of_stock';

                      return (
                        <tr
                          key={item.external_code}
                          className={`hover:bg-sky-50/40 transition ${
                            !item.is_active ? 'opacity-70 bg-slate-50/30' : ''
                          }`}
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              {item.image ? (
                                <img
                                  src={item.image}
                                  alt={item.name}
                                  className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center font-bold text-xs shrink-0">
                                  APP
                                </div>
                              )}
                              <div>
                                <div className="font-bold text-slate-900 text-sm">
                                  {item.name}
                                </div>
                                <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                                  <span className="font-mono bg-slate-100 px-1.5 py-0.2 rounded text-[10px]">
                                    รหัส #{item.external_code}
                                  </span>
                                  <span>{item.duration || '30 วัน'}</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-3 text-right font-mono text-slate-600">
                            ฿{item.cost.toLocaleString()}
                          </td>

                          <td className="py-3 px-3 text-right">
                            <div className="inline-flex items-center justify-end gap-1 font-mono">
                              <span className="text-slate-400">฿</span>
                              <input
                                type="number"
                                value={item.selling_price}
                                onChange={(e) => {
                                  const val = Number(e.target.value) || 0;
                                  setItems((prev) =>
                                    prev.map((i) =>
                                      i.external_code === item.external_code
                                        ? {
                                            ...i,
                                            selling_price: val,
                                            profit: Math.max(0, val - i.cost),
                                            profit_margin: val > 0 ? Math.round(((val - i.cost) / val) * 100) : 0,
                                          }
                                        : i
                                    )
                                  );
                                }}
                                onBlur={() => {
                                  // Auto-save edited price
                                  fetch(`/api/admin/providers/${currentProvider.id || currentProvider.code}/items`, {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ items: [item] }),
                                  });
                                }}
                                className="w-20 px-2 py-1 text-right font-bold text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                              />
                            </div>
                          </td>

                          <td className="py-3 px-3 text-right">
                            <div className="font-mono font-bold text-emerald-600">
                              +฿{item.profit.toLocaleString()}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {item.profit_margin}% margin
                            </div>
                          </td>

                          <td className="py-3 px-3 text-center font-mono">
                            <span
                              className={`px-2 py-0.5 rounded-md font-bold text-xs ${
                                item.stock > 10
                                  ? 'bg-slate-100 text-slate-700'
                                  : item.stock > 0
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {item.stock}
                            </span>
                          </td>

                          <td className="py-3 px-3 text-center">
                            {isOutOfStock ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                                สินค้าหมด
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                พร้อมส่ง
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => handleToggleItem(item)}
                              className={`p-1.5 rounded-xl transition ${
                                item.is_active
                                  ? 'text-sky-600 hover:text-sky-700'
                                  : 'text-slate-300 hover:text-slate-400'
                              }`}
                              title={item.is_active ? 'ปิดการขายบนหน้าเว็บ' : 'เปิดขายบนหน้าเว็บ'}
                            >
                              {item.is_active ? (
                                <ToggleRight className="w-7 h-7" />
                              ) : (
                                <ToggleLeft className="w-7 h-7" />
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
