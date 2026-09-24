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
  Clock,
  Layers,
  Code2,
  Key,
  Globe,
  Sliders,
  Send,
  ArrowRightLeft,
  Gamepad2,
  Sparkles,
  Package,
  Wallet,
  Bot,
  Trash2,
  Search,
  Filter,
  ExternalLink,
} from 'lucide-react';
import { CentralProvider, ProviderHealthStatus } from '@/types/central-provider';

const CATEGORY_META: Record<string, { label: string; icon: any; color: string; badgeBg: string }> = {
  GAME_TOPUP: { label: 'ระบบเติมเกม', icon: Gamepad2, color: 'text-sky-400', badgeBg: 'bg-sky-500/10 text-sky-400 border-sky-400/30' },
  PREMIUM_APP: { label: 'แอปพรีเมียม', icon: Sparkles, color: 'text-violet-400', badgeBg: 'bg-violet-500/10 text-violet-400 border-violet-400/30' },
  DIGITAL_PRODUCT: { label: 'สินค้าดิจิทัล', icon: Package, color: 'text-pink-400', badgeBg: 'bg-pink-500/10 text-pink-400 border-pink-400/30' },
  PAYMENT: { label: 'ระบบชำระเงิน', icon: Wallet, color: 'text-emerald-400', badgeBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-400/30' },
  AI: { label: 'ระบบ AI ผู้ช่วย', icon: Bot, color: 'text-amber-400', badgeBg: 'bg-amber-500/10 text-amber-400 border-amber-400/30' },
  ALL: { label: 'ทั่วไป', icon: Globe, color: 'text-slate-300', badgeBg: 'bg-slate-700/50 text-slate-300 border-slate-600' },
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
    description: 'จำลองการตรวจสอบ Player ID และส่งไอเทมเกม (Free Fire, ROV, MLBB ฯลฯ) ตอบสนองทันทีโดยไม่ต้องต่อ Gateway ค่ายเกมจริง',
    samplePayload: '{
  "player_id": "987654321",
  "server_id": "SEA"
}',
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
    system: 'ระบบแอปพรีเมียม & สินค้าดิจิทัล',
    description: 'จำลองการส่งมอบคีย์และบัญชีอัตโนมัติ เช่น Spotify, Netflix, YouTube Premium',
    samplePayload: '{
  "package_id": "spotify-1m",
  "customer_email": "demo@naymos.com"
}',
  },
  {
    id: 'finshop-fallback',
    code: 'finshop',
    name: 'FinShop API',
    category: 'DIGITAL_PRODUCT',
    api_base_url: 'https://finshop.me/api/v1',
    environment: 'production',
    is_test_mode: false,
    is_active: true,
    health_status: 'UNKNOWN',
    system: 'ระบบแอปพรีเมียม & สินค้าดิจิทัล FinShop',
    description: 'บริการดึงสินค้า ส่งมอบคีย์ และแพ็กเกจแอปพรีเมียม (iQIYI, WeTV, VIU, Canva, HBO MAX ฯลฯ) อัตโนมัติ รองรับ Sync & Test API (ID: 66)',
    samplePayload: '{
  "product_id": 66,
  "customer": "naymos_user"
}',
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
    system: 'เกตเวย์เติมเกมอัตโนมัติ ByShop',
    description: 'เชื่อมต่อระบบเติมเกมอัตโนมัติความเร็วสูง ตรวจสอบชื่อผู้เล่น (Player ID) และตัดยอดส่งไอเทมเกมเข้าไอดีทันที',
    samplePayload: '{
  "player_id": "11223344",
  "game_id": "freefire"
}',
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
    description: 'สร้าง QR Code พร้อมเพย์มาตรฐาน EMVCo เบอร์ 0988251064 ภายในระบบโดยตรง ไม่เสียค่าธรรมเนียมภายนอก',
    samplePayload: '{
  "amount": 100,
  "order_number": "ORD-TEST-001"
}',
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
    system: 'ระบบผู้ช่วย AI & แชทบอท',
    description: 'เชื่อมต่อ Gemini 1.5 Flash / OpenAI / Groq ให้บริการบอทตอบคำถามลูกค้า',
    samplePayload: '{
  "message": "สอบถามโปรโมชั่นเติมเกมวันนี้หน่อยครับ"
}',
  },
];

export default function AdminProvidersHubPage() {
  const [activeTab, setActiveTab] = useState<'providers' | 'finshop' | 'routes' | 'sandbox' | 'logs'>('providers');
  const [providers, setProviders] = useState<CentralProvider[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  // Edit API Modal State
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
    priority: 1,
    timeout_ms: 10000,
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [editSuccessMsg, setEditSuccessMsg] = useState<string | null>(null);

  const openEditModal = (api: any) => {
    setEditingApi(api);
    setEditSuccessMsg(null);
    setEditFormData({
      name: api.name || '',
      code: api.code || '',
      category: api.category || api.type || 'GAME_TOPUP',
      api_base_url: api.api_base_url || '',
      api_key: '', // Do not prefill secret for security
      api_secret: '',
      environment: api.environment || (api.is_test_mode ? 'sandbox' : 'production'),
      is_active: api.is_active !== undefined ? api.is_active : true,
      priority: api.priority || 1,
      timeout_ms: api.timeout_ms || 10000,
    });
  };

  const handleSaveApiEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingApi) return;
    setSavingEdit(true);
    setEditSuccessMsg(null);

    try {
      const isDbRecord = editingApi.id && !editingApi.id.includes('fallback');
      let res;
      if (isDbRecord) {
        res = await fetch(`/api/admin/providers/${editingApi.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editFormData),
        });
      } else {
        // If it's a fallback item, insert into DB via POST
        res = await fetch('/api/admin/providers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...editFormData,
            type: editFormData.category,
            is_test_mode: editFormData.environment === 'sandbox',
          }),
        });
      }

      const data = await res.json();
      if (res.ok) {
        setEditSuccessMsg('บันทึกการแก้ไข API เรียบร้อยแล้ว (อัปเดตเรียลไทม์)');
        await fetchProviders();
        setTimeout(() => {
          setEditingApi(null);
        }, 1200);
      } else {
        alert(data.error || 'เกิดข้อผิดพลาดในการบันทึก');
      }
    } catch (err: any) {
      alert(err.message || 'เกิดข้อผิดพลาด');
    } finally {
      setSavingEdit(false);
    }
  };


  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedEnv, setSelectedEnv] = useState<string>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Partial<CentralProvider> | null>(null);

  // Sandbox State
  const [sandboxProviderId, setSandboxProviderId] = useState<string>('');
  const [sandboxAction, setSandboxAction] = useState<string>('validate_player');
  const [sandboxPayload, setSandboxPayload] = useState<string>('{\n  "player_id": "987654321",\n  "server_id": "SEA"\n}');
  const [sandboxResult, setSandboxResult] = useState<any>(null);
  const [sandboxRunning, setSandboxRunning] = useState(false);

  useEffect(() => {
    fetchProviders();
    fetchRoutes();
    fetchLogs();
  }, []);

  async function fetchProviders() {
    try {
      const res = await fetch('/api/admin/providers');
      const data = await res.json();
      if (data.providers) {
        setProviders(data.providers);
        if (!sandboxProviderId && data.providers.length > 0) {
          setSandboxProviderId(data.providers[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function fetchRoutes() {
    try {
      const res = await fetch('/api/admin/providers/routes');
      const data = await res.json();
      if (data.routes) setRoutes(data.routes);
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchLogs() {
    try {
      const res = await fetch('/api/admin/providers/logs?limit=40');
      const data = await res.json();
      if (data.transactions) setLogs(data.transactions);
    } catch (e) {
      console.error(e);
    }
  }

  async function triggerHealthCheck(id: string) {
    setTestingId(id);
    try {
      const res = await fetch(`/api/admin/providers/${id}/health`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        await fetchProviders();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setTestingId(null);
    }
  }

  async function toggleTestMode(provider: CentralProvider) {
    try {
      const res = await fetch(`/api/admin/providers/${provider.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_test_mode: !provider.is_test_mode }),
      });
      if (res.ok) fetchProviders();
    } catch (e) {
      console.error(e);
    }
  }

  async function handleDeleteProvider(provider: CentralProvider) {
    if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบ API Provider "${provider.name}" (${provider.code}) ออกจากระบบ?`)) {
      return;
    }
    setDeletingId(provider.id);
    try {
      const res = await fetch(`/api/admin/providers/${provider.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setProviders((prev) => prev.filter((p) => p.id !== provider.id));
        alert('ลบ API Provider สำเร็จแล้ว');
      } else {
        alert(data.error || 'ไม่สามารถลบได้');
      }
    } catch (err: any) {
      alert(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setDeletingId(null);
    }
  }

  function openLiveSandbox(providerId: string, category?: string) {
    setSandboxProviderId(providerId);
    if (category === 'GAME_TOPUP') {
      setSandboxAction('validate_player');
      setSandboxPayload('{\n  "player_id": "987654321",\n  "server_id": "SEA"\n}');
    } else if (category === 'PAYMENT') {
      setSandboxAction('create_qr');
      setSandboxPayload('{\n  "amount": 100,\n  "order_number": "TEST-QR-999"\n}');
    } else if (category === 'AI') {
      setSandboxAction('prompt');
      setSandboxPayload('{\n  "prompt": "ทดสอบระบบ AI Assistant"\n}');
    } else {
      setSandboxAction('execute');
      setSandboxPayload('{\n  "package_id": "demo-pkg",\n  "target": "user@example.com"\n}');
    }
    setActiveTab('sandbox');
  }

  async function handleSaveProvider(e: React.FormEvent) {
    e.preventDefault();
    if (!editingProvider?.name || !editingProvider?.code) return;

    try {
      const isEdit = !!editingProvider.id;
      const url = isEdit ? `/api/admin/providers/${editingProvider.id}` : '/api/admin/providers';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingProvider),
      });

      if (res.ok) {
        setIsModalOpen(false);
        setEditingProvider(null);
        fetchProviders();
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleRunSandbox() {
    setSandboxRunning(true);
    setSandboxResult(null);
    try {
      let parsed = {};
      try {
        parsed = JSON.parse(sandboxPayload);
      } catch (err) {
        alert('รูปแบบ JSON ใน Payload ไม่ถูกต้อง');
        setSandboxRunning(false);
        return;
      }

      const res = await fetch('/api/admin/providers/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider_id: sandboxProviderId,
          action: sandboxAction,
          payload: parsed,
        }),
      });
      const data = await res.json();
      setSandboxResult(data.result);
      fetchLogs();
    } catch (e) {
      console.error(e);
    } finally {
      setSandboxRunning(false);
    }
  }

  // Unified API List: Merge DB providers with built-in templates so every required API is always visible
  const hasDbProviders = providers.length > 0;
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

  // Filtered providers
  const filteredList = useMemo(() => {
    return displayList.filter((item: any) => {
      const cat = item.category || item.type || 'ALL';
      if (selectedCategory !== 'ALL' && cat !== selectedCategory) return false;
      const isTest = item.is_test_mode || item.environment === 'sandbox';
      if (selectedEnv === 'sandbox' && !isTest) return false;
      if (selectedEnv === 'production' && isTest) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = (item.name || '').toLowerCase().includes(q);
        const matchesCode = (item.code || '').toLowerCase().includes(q);
        const matchesUrl = (item.api_base_url || '').toLowerCase().includes(q);
        if (!matchesName && !matchesCode && !matchesUrl) return false;
      }
      return true;
    });
  }, [displayList, selectedCategory, selectedEnv, searchQuery]);

  const healthyCount = providers.filter((p) => p.health_status === 'HEALTHY').length;
  const sandboxCount = providers.filter((p) => p.is_test_mode || p.environment === 'sandbox').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900 border border-slate-700/80 p-6 rounded-2xl shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-400/30 flex items-center justify-center text-sky-400 shrink-0">
            <Server className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              Central API &amp; Providers Hub
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
              ศูนย์รวมการควบคุม API, ตรวจสอบ endpoint, สลับ Sandbox/Production และทดสอบผ่าน Live Console
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => {
              fetchProviders();
              fetchRoutes();
              fetchLogs();
            }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 border border-slate-700 text-slate-200 hover:text-white hover:bg-slate-700 transition"
          >
            <RefreshCw className="w-4 h-4" /> รีเฟรช
          </button>
          <button
            onClick={() => {
              setEditingProvider({
                name: '',
                code: '',
                category: 'GAME_TOPUP',
                type: 'ALL',
                environment: 'sandbox',
                is_test_mode: true,
                priority: 1,
                timeout_ms: 10000,
                max_retries: 2,
              });
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-sky-500 text-white hover:bg-sky-400 transition shadow-lg shadow-sky-500/20"
          >
            <Plus className="w-4 h-4" /> เพิ่ม Provider ใหม่
          </button>
        </div>
      </div>

      {/* API Inventory Overview Section */}
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-400/30 flex items-center justify-center text-sky-400">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                API ที่ใช้งานอยู่ &amp; API ทดลอง (แยกตามระบบ)
                {!hasDbProviders && !loading && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-400/30">
                    แสดงชุด API ทดลองเริ่มต้น (Default Sandbox)
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                รายการ API ทั้งหมดที่เชื่อมกับหน้าร้าน แยกตามหมวดหมู่และสถานะพร้อมใช้งาน
              </p>
            </div>
          </div>
        </div>

        {/* Detailed Grid of APIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {displayList.map((api: any) => {
            const cat = api.category || api.type || 'ALL';
            const meta = CATEGORY_META[cat] || CATEGORY_META.ALL;
            const Icon = meta.icon;
            const isTest = api.is_test_mode || api.environment === 'sandbox';
            const isActive = api.is_active !== false;

            return (
              <div
                key={api.id || api.code}
                className="bg-slate-900 border border-slate-700/90 hover:border-slate-500 rounded-2xl p-5 transition-all shadow-xl flex flex-col justify-between group hover:shadow-2xl"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 shadow-inner">
                        <Icon className={`w-5 h-5 ${meta.color}`} />
                      </div>
                      <div>
                        <h3 className="text-base font-extrabold text-white leading-snug group-hover:text-sky-300 transition-colors">
                          {api.name}
                        </h3>
                        <div className="text-xs font-mono text-sky-400 font-semibold">{api.code}</div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border shadow-sm ${
                          isTest
                            ? 'bg-amber-500/20 text-amber-300 border-amber-400/40'
                            : 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                        }`}
                      >
                        {isTest ? '⚡ SANDBOX' : '🟢 PRODUCTION'}
                      </span>
                      <span className="text-[11px] font-medium text-slate-400">
                        {meta.label}
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  {api.description && (
                    <p className="text-xs text-slate-300 mb-3 bg-slate-950/80 p-3 rounded-xl border border-slate-800 leading-relaxed">
                      {api.description}
                    </p>
                  )}

                  {/* Metadata fields */}
                  <div className="space-y-2 mb-4 text-xs bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400 font-medium">Endpoint:</span>
                      <span className="font-mono text-[11px] text-slate-200 bg-slate-900 px-2 py-0.5 rounded border border-slate-700/60 truncate max-w-[210px]" title={api.api_base_url}>
                        {api.api_base_url || 'internal://engine'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400 font-medium">สถานะ API:</span>
                      <span className={`text-[11px] font-bold flex items-center gap-1.5 ${
                        isActive ? 'text-emerald-400' : 'text-slate-500'
                      }`}>
                        <CheckCircle2 className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-400' : 'text-slate-600'}`} />
                        {isActive ? 'พร้อมรับออเดอร์ (Active)' : 'ปิดใช้งานชั่วคราว'}
                      </span>
                    </div>

                    {api.code === 'finshop' && (
                      <div className="flex items-center justify-between gap-2 text-[11px] pt-1 border-t border-slate-800">
                        <span className="text-slate-400">สินค้าทดสอบ:</span>
                        <span className="text-amber-400 font-mono font-bold">ID: 66 (฿0 THB)</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {/* Real-time Edit Button */}
                    <button
                      onClick={() => openEditModal(api)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-sky-600 hover:text-white text-slate-200 border border-slate-700 hover:border-sky-500 transition-all flex items-center gap-1.5 shadow-sm"
                      title="แก้ไขข้อมูล API แบบเรียลไทม์"
                    >
                      <Sliders className="w-3.5 h-3.5 text-sky-400" />
                      <span>แก้ไข API</span>
                    </button>

                    {/* Delete API Button */}
                    <button
                      onClick={() => handleDeleteProvider(api)}
                      disabled={deletingId === api.id}
                      className="p-1.5 rounded-xl text-rose-400 hover:text-white hover:bg-rose-600/30 border border-rose-500/40 transition text-xs flex items-center gap-1 font-semibold"
                      title="ลบ API ออกจากระบบ"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {api.code === 'finshop' ? (
                      <button
                        onClick={() => setActiveTab('finshop')}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600/30 text-emerald-300 hover:bg-emerald-600 hover:text-white border border-emerald-500/50 transition flex items-center gap-1.5 shadow-sm"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        จัดการ FinShop
                      </button>
                    ) : (
                      <button
                        onClick={() => openLiveSandbox(api.id, api.category)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-sky-600/30 text-sky-300 hover:bg-sky-600 hover:text-white border border-sky-400/50 transition flex items-center gap-1.5 shadow-sm"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        Live Sandbox
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-4 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">API ทั้งหมด</span>
            <Server className="w-4 h-4 text-sky-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-white">{displayList.length}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">ในระบบกลาง</div>
        </div>

        <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-4 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">สถานะปกติ (Healthy)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-400">{hasDbProviders ? healthyCount : displayList.length}</div>
          <div className="text-[11px] text-emerald-400/80 mt-0.5">พร้อมรับโหลด 100%</div>
        </div>

        <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-4 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">โหมด Sandbox / Test</span>
            <Sliders className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-amber-400">{hasDbProviders ? sandboxCount : 2}</div>
          <div className="text-[11px] text-amber-400/80 mt-0.5">จำลองความปลอดภัย</div>
        </div>

        <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-4 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">เส้นทาง Routing</span>
            <ArrowRightLeft className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-indigo-400">{routes.length}</div>
          <div className="text-[11px] text-indigo-400/80 mt-0.5">พร้อมระบบ Failover</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-700/80 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('providers')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 ${
            activeTab === 'providers'
              ? 'bg-sky-500/20 text-sky-400 border border-sky-400/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Server className="w-4 h-4" /> ตาราง Providers ทั้งหมด ({displayList.length})
        </button>
        <button
          onClick={() => setActiveTab('routes')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 ${
            activeTab === 'routes'
              ? 'bg-sky-500/20 text-sky-400 border border-sky-400/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" /> กฎ Routing &amp; Failover ({routes.length})
        </button>
        <button
          onClick={() => setActiveTab('sandbox')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 ${
            activeTab === 'sandbox'
              ? 'bg-sky-500/20 text-sky-400 border border-sky-400/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Play className="w-4 h-4" /> Live Sandbox Console
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 ${
            activeTab === 'logs'
              ? 'bg-sky-500/20 text-sky-400 border border-sky-400/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Activity className="w-4 h-4" /> API Transactions &amp; Logs ({logs.length})
        </button>
      </div>

      {/* TAB 1: Providers List with Filters */}
      {activeTab === 'providers' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-4 shadow-md flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ค้นหาชื่อ Provider, รหัส code หรือ endpoint..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-800/80 border border-slate-600 focus:border-sky-400 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-500 outline-none transition"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-slate-300 font-semibold">
                <Filter className="w-3.5 h-3.5 text-sky-400" />
                <span>หมวดระบบ:</span>
              </div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-slate-800 border border-slate-600 text-white rounded-xl px-3 py-1.5 text-xs outline-none focus:border-sky-400"
              >
                <option value="ALL">ทุกหมวดหมู่</option>
                <option value="GAME_TOPUP">ระบบเติมเกม</option>
                <option value="PREMIUM_APP">แอปพรีเมียม</option>
                <option value="DIGITAL_PRODUCT">สินค้าดิจิทัล</option>
                <option value="PAYMENT">ระบบชำระเงิน</option>
                <option value="AI">ระบบ AI</option>
              </select>

              <div className="flex items-center gap-1.5 text-xs text-slate-300 font-semibold ml-2">
                <span>สภาพแวดล้อม:</span>
              </div>
              <select
                value={selectedEnv}
                onChange={(e) => setSelectedEnv(e.target.value)}
                className="bg-slate-800 border border-slate-600 text-white rounded-xl px-3 py-1.5 text-xs outline-none focus:border-sky-400"
              >
                <option value="ALL">ทั้งหมด (Sandbox + Prod)</option>
                <option value="sandbox">Sandbox (ทดลอง)</option>
                <option value="production">Production (ใช้งานจริง)</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-300 font-bold border-b border-slate-700 uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">ผู้ให้บริการ / รหัส</th>
                    <th className="py-3.5 px-4">หมวดระบบ</th>
                    <th className="py-3.5 px-4">สภาพแวดล้อม</th>
                    <th className="py-3.5 px-4">Endpoint</th>
                    <th className="py-3.5 px-4">สถานะ &amp; Latency</th>
                    <th className="py-3.5 px-4 text-right">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredList.map((p: any) => {
                    const isHealthy = p.health_status === 'HEALTHY';
                    const isDegraded = p.health_status === 'DEGRADED';
                    const isDown = p.health_status === 'DOWN';
                    const isTest = p.is_test_mode || p.environment === 'sandbox';
                    const cat = p.category || p.type || 'ALL';
                    const meta = CATEGORY_META[cat] || CATEGORY_META.ALL;

                    return (
                      <tr key={p.id || p.code} className="hover:bg-slate-800/40 transition">
                        <td className="py-4 px-4">
                          <div className="font-bold text-white text-sm">{p.name}</div>
                          <div className="text-[11px] font-mono text-sky-400">{p.code}</div>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold border ${meta.badgeBg}`}>
                            {meta.label}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <button
                            onClick={() => hasDbProviders && toggleTestMode(p)}
                            disabled={!hasDbProviders}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition cursor-pointer ${
                              isTest
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                            }`}
                          >
                            {isTest ? '⚡ SANDBOX' : '🟢 PRODUCTION'}
                          </button>
                        </td>
                        <td className="py-4 px-4">
                          <div className="font-mono text-[11px] text-slate-300 max-w-[200px] truncate" title={p.api_base_url}>
                            {p.api_base_url || 'internal://engine'}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            {isHealthy && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                            {isDegraded && <AlertTriangle className="w-4 h-4 text-amber-400" />}
                            {isDown && <XCircle className="w-4 h-4 text-rose-400" />}
                            {!isHealthy && !isDegraded && !isDown && <Clock className="w-4 h-4 text-slate-500" />}
                            <span
                              className={`font-semibold ${
                                isHealthy
                                  ? 'text-emerald-400'
                                  : isDegraded
                                  ? 'text-amber-400'
                                  : isDown
                                  ? 'text-rose-400'
                                  : 'text-slate-400'
                              }`}
                            >
                              {p.health_status}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openLiveSandbox(p.id, p.category)}
                              className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-sky-500/20 text-sky-300 hover:bg-sky-500 hover:text-white border border-sky-400/30 transition flex items-center gap-1"
                              title="เปิดทดสอบใน Sandbox"
                            >
                              <Play className="w-3 h-3 fill-current" />
                              Sandbox
                            </button>
                            {hasDbProviders && (
                              <>
                                <button
                                  onClick={() => triggerHealthCheck(p.id)}
                                  disabled={testingId === p.id}
                                  className="px-2 py-1.5 rounded-lg text-[11px] font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 transition flex items-center gap-1 disabled:opacity-50"
                                >
                                  <RefreshCw className={`w-3.5 h-3.5 ${testingId === p.id ? 'animate-spin' : ''}`} />
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingProvider(p);
                                    setIsModalOpen(true);
                                  }}
                                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition"
                                >
                                  แก้ไข
                                </button>
                                <button
                                  onClick={() => handleDeleteProvider(p)}
                                  disabled={deletingId === p.id}
                                  className="px-2 py-1.5 rounded-lg text-[11px] font-semibold bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white border border-rose-500/30 transition flex items-center gap-1"
                                  title="ลบ Provider"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredList.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-10 px-4 text-center">
                        <p className="text-xs font-semibold text-slate-300">ไม่พบ API Provider ที่ตรงกับตัวกรอง</p>
                        <p className="text-[11px] text-slate-500 mt-1">ลองเปลี่ยนคำค้นหาหรือเลือกทุกหมวดหมู่</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Routes & Failover */}
      {activeTab === 'routes' && (
        <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-white">เส้นทางการเชื่อมต่อ (Routing Rules) &amp; ระบบสำรอง (Failover)</h3>
              <p className="text-xs text-slate-400">กำหนดว่าเกมหรือสินค้าหมวดใดจะถูกส่งต่อไปยัง Provider ใดเป็นหลัก และสำรองไปที่ใด</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-300 font-bold border-b border-slate-700 uppercase">
                <tr>
                  <th className="py-3 px-4">Route Key</th>
                  <th className="py-3 px-4">เป้าหมาย</th>
                  <th className="py-3 px-4">Provider หลัก</th>
                  <th className="py-3 px-4">Provider สำรอง (Failover)</th>
                  <th className="py-3 px-4">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {routes.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/30">
                    <td className="py-3 px-4 font-mono font-bold text-sky-400">{r.route_key || 'Default'}</td>
                    <td className="py-3 px-4 text-slate-300">{r.target_type}</td>
                    <td className="py-3 px-4 font-semibold text-white">{r.provider?.name || '-'}</td>
                    <td className="py-3 px-4 text-amber-400">{r.failover_provider?.name || 'ไม่มี (Auto-fallback to Mock)'}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                        พร้อมใช้งาน
                      </span>
                    </td>
                  </tr>
                ))}
                {routes.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      ยังไม่มีกฎ Routing พิเศษ — ระบบจะส่งต่อออเดอร์ไปยัง Provider ตามหมวดหมู่อัตโนมัติ
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Sandbox */}
      {activeTab === 'sandbox' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-400/30 flex items-center justify-center text-sky-400">
                <Play className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Live Sandbox Console</h3>
                <p className="text-xs text-slate-400">ทดสอบจำลองคำสั่งยิง API จริง / ดู Response และ Audit Log</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-200 font-bold block mb-1">เลือก Provider ที่จะทดสอบ</label>
                <select
                  value={sandboxProviderId}
                  onChange={(e) => setSandboxProviderId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-600 rounded-xl px-3 py-2.5 text-white outline-none focus:border-sky-400"
                >
                  {displayList.map((p: any) => (
                    <option key={p.id || p.code} value={p.id || p.code}>
                      {p.name} ({p.code}) — {p.environment || 'sandbox'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-200 font-bold block mb-1">คำสั่งจำลอง (Action)</label>
                <select
                  value={sandboxAction}
                  onChange={(e) => setSandboxAction(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-600 rounded-xl px-3 py-2.5 text-white outline-none focus:border-sky-400"
                >
                  <option value="validate_player">ตรวจสอบ Player ID (เช่น ROV, Free Fire)</option>
                  <option value="topup">จำลองส่งคำสั่งเติมเงิน (Topup Order)</option>
                  <option value="get_status">ตรวจสอบสถานะ Transaction</option>
                  <option value="create_qr">ทดสอบสร้าง QR พร้อมเพย์</option>
                  <option value="prompt">ทดสอบคำสั่ง AI Prompt</option>
                </select>
              </div>

              <div>
                <label className="text-slate-200 font-bold block mb-1">JSON Payload</label>
                <textarea
                  rows={5}
                  value={sandboxPayload}
                  onChange={(e) => setSandboxPayload(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 font-mono text-xs rounded-xl p-3 text-emerald-400 focus:border-sky-400 outline-none"
                />
              </div>

              <button
                onClick={handleRunSandbox}
                disabled={sandboxRunning}
                className="w-full py-2.5 rounded-xl bg-sky-500 font-bold text-white hover:bg-sky-400 transition flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-sky-500/20 text-xs"
              >
                {sandboxRunning ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> กำลังส่งข้อมูลจำลอง...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" /> ยิงทดสอบ API (Execute Sandbox)
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-6 shadow-xl flex flex-col">
            <h3 className="text-sm font-black text-white mb-2">ผลลัพธ์การทดสอบ (API Response)</h3>
            <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs overflow-auto text-slate-300">
              {sandboxResult ? (
                <pre>{JSON.stringify(sandboxResult, null, 2)}</pre>
              ) : (
                <div className="text-slate-500 italic h-full flex items-center justify-center">
                  เลือก Provider แล้วกดยิงทดสอบเพื่อดู Response สดตรงนี้
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Logs */}
      {activeTab === 'logs' && (
        <div className="bg-slate-900 border border-slate-700/80 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-black text-white">บันทึกประวัติการเรียก API (Sanitized Audit Logs)</h3>
            <span className="text-xs text-slate-400">บันทึกข้อมูลปลอดภัย ปิดบัง Secrets/Token อัตโนมัติ</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-300 font-bold border-b border-slate-700">
                <tr>
                  <th className="py-3 px-4">เวลา</th>
                  <th className="py-3 px-4">Provider</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">สถานะ</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Response Preview</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                      {new Date(log.created_at).toLocaleTimeString('th-TH')}
                    </td>
                    <td className="py-3 px-4 font-semibold text-white">{log.provider?.name || '-'}</td>
                    <td className="py-3 px-4 font-mono text-sky-400">{log.action_name}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.status === 'SUCCESS'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-rose-500/20 text-rose-400'
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono">{log.duration_ms}ms</td>
                    <td className="py-3 px-4 font-mono text-[10px] text-slate-400 truncate max-w-xs">
                      {JSON.stringify(log.response_payload_sanitized || log.error_message || {})}
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      ยังไม่มีประวัติการเรียก API ในขณะนี้
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">
              {editingProvider?.id ? 'แก้ไข Provider' : 'เพิ่ม Provider ใหม่'}
            </h3>
            <form onSubmit={handleSaveProvider} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-200 font-bold block mb-1">ชื่อผู้ให้บริการ</label>
                <input
                  type="text"
                  required
                  value={editingProvider?.name || ''}
                  onChange={(e) => setEditingProvider({ ...editingProvider, name: e.target.value })}
                  className="w-full bg-slate-800/80 border border-slate-600 focus:border-sky-400 rounded-xl px-3 py-2.5 text-white placeholder:text-slate-500 outline-none transition"
                  placeholder="เช่น Garena Topup Gateway"
                />
              </div>

              <div>
                <label className="text-slate-200 font-bold block mb-1">รหัสอ้างอิง (Unique Code)</label>
                <input
                  type="text"
                  required
                  disabled={!!editingProvider?.id}
                  value={editingProvider?.code || ''}
                  onChange={(e) => setEditingProvider({ ...editingProvider, code: e.target.value })}
                  className="w-full bg-slate-800/80 border border-slate-600 focus:border-sky-400 rounded-xl px-3 py-2.5 text-white placeholder:text-slate-500 outline-none transition disabled:opacity-50"
                  placeholder="เช่น garena-sea"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-200 font-bold block mb-1">หมวดหมู่</label>
                  <select
                    value={editingProvider?.category || 'GAME_TOPUP'}
                    onChange={(e: any) => setEditingProvider({ ...editingProvider, category: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-600 rounded-xl px-3 py-2.5 text-white outline-none focus:border-sky-400"
                  >
                    <option value="GAME_TOPUP">ระบบเติมเกม</option>
                    <option value="PREMIUM_APP">แอปพรีเมียม</option>
                    <option value="DIGITAL_PRODUCT">สินค้าดิจิทัล</option>
                    <option value="PAYMENT">ระบบชำระเงิน</option>
                    <option value="AI">ระบบ AI</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-200 font-bold block mb-1">สภาพแวดล้อม</label>
                  <select
                    value={editingProvider?.environment || 'sandbox'}
                    onChange={(e: any) => setEditingProvider({ ...editingProvider, environment: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-600 rounded-xl px-3 py-2.5 text-white outline-none focus:border-sky-400"
                  >
                    <option value="sandbox">Sandbox (ทดลอง)</option>
                    <option value="production">Production (ใช้งานจริง)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-200 font-bold block mb-1">API Base URL / Endpoint</label>
                <input
                  type="text"
                  value={editingProvider?.api_base_url || ''}
                  onChange={(e) => setEditingProvider({ ...editingProvider, api_base_url: e.target.value })}
                  className="w-full bg-slate-800/80 border border-slate-600 focus:border-sky-400 rounded-xl px-3 py-2.5 text-white placeholder:text-slate-500 outline-none transition"
                  placeholder="https://api.provider.com/v1"
                />
              </div>

              <div>
                <label className="text-slate-200 font-bold block mb-1">API Key / Secret (Masked)</label>
                <input
                  type="password"
                  value={editingProvider?.api_key || ''}
                  onChange={(e) => setEditingProvider({ ...editingProvider, api_key: e.target.value })}
                  className="w-full bg-slate-800/80 border border-slate-600 focus:border-sky-400 rounded-xl px-3 py-2.5 text-white placeholder:text-slate-500 outline-none transition"
                  placeholder="ใส่คีย์ใหม่เมื่อต้องการเปลี่ยน"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
                >
                  ยกเลิก
                </button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-sky-500 font-bold text-white hover:bg-sky-400 shadow-md">
                  บันทึก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function FinShopManagerSection({
  providers,
  onRefresh,
  onOpenSandbox,
}: {
  providers: CentralProvider[];
  onRefresh: () => void;
  onOpenSandbox: (p: CentralProvider) => void;
}) {
  const [finshopProducts, setFinshopProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [balanceData, setBalanceData] = useState<any | null>(null);
  const [checkingBalance, setCheckingBalance] = useState(false);
  const [reportTxId, setReportTxId] = useState('');
  const [reportText, setReportText] = useState('เข้าไม่ได้');
  const [reporting, setReporting] = useState(false);
  const [reportResult, setReportResult] = useState<string | null>(null);
  const [testConfirmOpen, setTestConfirmOpen] = useState(false);
  const [testExecuting, setTestExecuting] = useState(false);
  const [testResult, setTestResult] = useState<any | null>(null);

  const finshopProvider = providers.find((p) => p.code === 'finshop');

  const fetchFinshopProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/providers/finshop/products');
      const data = await res.json();
      if (data.products) {
        setFinshopProducts(data.products);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinshopProducts();
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch('/api/admin/providers/finshop/sync', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setSyncMessage(`Sync สำเร็จ! ดึงข้อมูลสินค้าเข้ามา ${data.synced_count} รายการ (สถานะปิดขายเริ่มต้น)`);
        fetchFinshopProducts();
      } else {
        setSyncMessage(`เกิดข้อผิดพลาด: ${data.error || 'Sync ไม่สำเร็จ'}`);
      }
    } catch (err: any) {
      setSyncMessage(`เกิดข้อผิดพลาด: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleCheckBalance = async () => {
    if (!finshopProvider) return;
    setCheckingBalance(true);
    try {
      const res = await fetch(`/api/admin/providers/${finshopProvider.id}/health`, { method: 'POST' });
      const data = await res.json();
      setBalanceData(data);
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setCheckingBalance(false);
    }
  };

  const handleExecuteTest66 = async () => {
    if (!finshopProvider) return;
    setTestExecuting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/admin/providers/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider_id: finshopProvider.id,
          action: 'purchase',
          payload: {
            product_id: 66,
            customer: 'naymos_sandbox_tester',
          },
        }),
      });
      const data = await res.json();
      setTestResult(data);
    } catch (err: any) {
      setTestResult({ error: err.message });
    } finally {
      setTestExecuting(false);
      setTestConfirmOpen(false);
    }
  };

  const handleSendReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportTxId) return;
    setReporting(true);
    setReportResult(null);
    try {
      const res = await fetch('/api/admin/providers/finshop/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaction_id: reportTxId,
          report_text: reportText,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setReportResult('ส่งรายงานปัญหาไปยัง FinShop สำเร็จแล้ว');
        setReportTxId('');
      } else {
        setReportResult(`เกิดข้อผิดพลาด: ${data.error}`);
      }
    } catch (err: any) {
      setReportResult(`เกิดข้อผิดพลาด: ${err.message}`);
    } finally {
      setReporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Control */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-white">FinShop Central Provider</h3>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                  DIGITAL PRODUCT
                </span>
                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                  finshopProvider?.is_active
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                }`}>
                  {finshopProvider?.is_active ? 'เปิดใช้งาน (Active)' : 'ปิดใช้งาน (Inactive)'}
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-1">
                เชื่อมต่อระบบสินค้าดิจิทัลและแอปพรีเมียมอัตโนมัติ (Base URL: https://finshop.me/api/v1)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleCheckBalance}
              disabled={checkingBalance || !finshopProvider}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-medium border border-slate-700 transition"
            >
              <RefreshCw className={`w-4 h-4 ${checkingBalance ? 'animate-spin' : ''}`} />
              ตรวจ Balance / Health
            </button>
            <button
              onClick={handleSync}
              disabled={syncing || !finshopProvider}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold transition shadow-lg shadow-emerald-600/20"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              Sync Products
            </button>
          </div>
        </div>

        {/* Balance & Status Bar */}
        {balanceData && (
          <div className="mt-4 p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-sm">
            <div className="flex items-center gap-3">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span className="text-slate-300">ผลการตรวจสถานะ: <strong>{balanceData.result?.message || balanceData.status}</strong></span>
            </div>
            <div className="text-slate-400">
              Latency: <span className="text-white font-mono">{balanceData.result?.latency_ms || 0}ms</span>
            </div>
          </div>
        )}

        {syncMessage && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-sm">
            {syncMessage}
          </div>
        )}
      </div>

      {/* Test Product ID 66 Sandbox Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-xs font-mono font-bold rounded bg-sky-500/20 text-sky-400 border border-sky-400/30">
                SANDBOX / TEST ONLY
              </span>
              <h4 className="text-base font-bold text-white">ทดสอบคำสั่งซื้อสินค้าปลอดภัย (Product ID: 66)</h4>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              ทดสอบยิงคำสั่งซื้อสินค้าจำลอง <strong>Test API (ID: 66) ราคา ฿0</strong> ไปยัง FinShop เพื่อตรวจสอบ Response และ Flow จัดส่ง
            </p>
          </div>
          <button
            onClick={() => setTestConfirmOpen(true)}
            disabled={testExecuting || !finshopProvider}
            className="flex items-center gap-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-sm font-semibold transition shadow-lg shadow-sky-600/20 whitespace-nowrap"
          >
            <Play className="w-4 h-4" />
            ทดสอบซื้อสินค้า ID: 66 (฿0)
          </button>
        </div>

        {/* Confirmation Modal */}
        {testConfirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl">
              <h3 className="text-lg font-bold text-white">ยืนยันการทดสอบสั่งซื้อ</h3>
              <p className="text-sm text-slate-300 mt-2">
                คุณกำลังจะส่งคำสั่งซื้อทดสอบไปยัง FinShop API:
              </p>
              <div className="mt-3 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono space-y-1">
                <div>Product: <span className="text-sky-400">Test API</span></div>
                <div>Product ID: <span className="text-emerald-400">66</span></div>
                <div>Price / Cost: <span className="text-white">฿0 THB</span></div>
                <div>Customer: <span className="text-amber-400">naymos_sandbox_tester</span></div>
              </div>
              <div className="mt-5 flex justify-end gap-3">
                <button
                  onClick={() => setTestConfirmOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleExecuteTest66}
                  disabled={testExecuting}
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold"
                >
                  {testExecuting ? 'กำลังสั่งซื้อ...' : 'ยืนยันสั่งซื้อทดสอบ'}
                </button>
              </div>
            </div>
          </div>
        )}

        {testResult && (
          <div className="mt-4 p-4 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-xs font-mono text-slate-400 mb-2">ผลลัพธ์การทดสอบ:</div>
            <pre className="text-xs text-slate-200 overflow-x-auto p-2 bg-slate-900/60 rounded">
              {JSON.stringify(testResult, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* FinShop Synced Products Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-base font-bold text-white">รายการสินค้าที่ Sync จาก FinShop ({finshopProducts.length})</h4>
            <p className="text-xs text-slate-400 mt-0.5">
              ราคาที่แสดงคือ <strong>ต้นทุน (Cost)</strong> จาก FinShop ราคาขายหน้าร้านจะกำหนดในระบบ Packages ของ NayMos
            </p>
          </div>
          <button
            onClick={fetchFinshopProducts}
            disabled={loading}
            className="p-2 text-slate-400 hover:text-white rounded-lg bg-slate-800 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950 text-slate-400 text-xs uppercase font-medium">
              <tr>
                <th className="py-3 px-4">รหัสสินค้า (External ID)</th>
                <th className="py-3 px-4">ชื่อสินค้าใน FinShop</th>
                <th className="py-3 px-4">ต้นทุน (Cost)</th>
                <th className="py-3 px-4">คงเหลือ (Stock)</th>
                <th className="py-3 px-4">สถานะเปิดขาย</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {finshopProducts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    {loading ? 'กำลังโหลดข้อมูล...' : 'ยังไม่มีสินค้าที่ Sync เข้ามา กรุณากดปุ่ม Sync Products'}
                  </td>
                </tr>
              ) : (
                finshopProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 px-4 font-mono text-sky-400 font-semibold">{p.external_product_code}</td>
                    <td className="py-3 px-4 text-white font-medium">{p.external_name}</td>
                    <td className="py-3 px-4 font-mono text-emerald-400 font-semibold">฿{p.cost}</td>
                    <td className="py-3 px-4 text-slate-300 font-mono">{p.metadata?.stock ?? '-'}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        p.is_active
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}>
                        {p.is_active ? 'เปิดขายแล้ว' : 'ปิดขาย (Synced)'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transaction Report Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h4 className="text-base font-bold text-white mb-2">รายงานปัญหาคำสั่งซื้อ (Report Transaction)</h4>
        <p className="text-xs text-slate-400 mb-4">
          กรณีลูกค้ารายงานปัญหาบัญชีใช้งานไม่ได้ สามารถส่ง Transaction ID ไปยัง FinShop เพื่อให้ระบบตรวจสอบ
        </p>

        <form onSubmit={handleSendReport} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Transaction ID</label>
            <input
              type="text"
              value={reportTxId}
              onChange={(e) => setReportTxId(e.target.value)}
              placeholder="เช่น 8881"
              required
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">ข้อความแจ้งปัญหา</label>
            <input
              type="text"
              value={reportText}
              onChange={(e) => setReportText(e.target.value)}
              placeholder="เช่น เข้าไม่ได้ หรือ รหัสผ่านไม่ถูกต้อง"
              required
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={reporting || !reportTxId}
              className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-sm font-semibold transition"
            >
              {reporting ? 'กำลังส่งรายงาน...' : 'ส่งรายงานปัญหา (Report)'}
            </button>
          </div>
        </form>

        {reportResult && (
          <div className="mt-4 p-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200">
            {reportResult}
          </div>
        )}
      </div>
    </div>

      {/* Real-Time API Edit Modal */}
      {editingApi && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-sky-400" />
                  แก้ไข API แบบเรียลไทม์
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  แก้ไขข้อมูล API ของ {editingApi.name} ({editingApi.code}) ข้อมูลจะบันทึกและมีผลทันที
                </p>
              </div>
              <button
                onClick={() => setEditingApi(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                ✕
              </button>
            </div>

            {editSuccessMsg && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                {editSuccessMsg}
              </div>
            )}

            <form onSubmit={handleSaveApiEdit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">ชื่อ Provider / API</label>
                  <input
                    type="text"
                    required
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl text-white text-sm focus:outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">รหัส Code (ห้ามซ้ำ)</label>
                  <input
                    type="text"
                    required
                    value={editFormData.code}
                    onChange={(e) => setEditFormData({ ...editFormData, code: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl text-sky-400 font-mono text-sm focus:outline-none transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">หมวดหมู่ระบบ</label>
                  <select
                    value={editFormData.category}
                    onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl text-white text-sm focus:outline-none transition"
                  >
                    <option value="GAME_TOPUP">ระบบเติมเกม (GAME_TOPUP)</option>
                    <option value="PREMIUM_APP">แอปพรีเมียม (PREMIUM_APP)</option>
                    <option value="DIGITAL_PRODUCT">สินค้าดิจิทัล (DIGITAL_PRODUCT)</option>
                    <option value="PAYMENT">ระบบชำระเงิน (PAYMENT)</option>
                    <option value="AI">ระบบ AI ผู้ช่วย (AI)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">โหมดระบบ (Environment)</label>
                  <select
                    value={editFormData.environment}
                    onChange={(e) => setEditFormData({ ...editFormData, environment: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl text-white text-sm focus:outline-none transition"
                  >
                    <option value="sandbox">Sandbox (ทดลอง)</option>
                    <option value="production">Production (ใช้งานจริง)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Endpoint (API Base URL)</label>
                <input
                  type="text"
                  required
                  value={editFormData.api_base_url}
                  onChange={(e) => setEditFormData({ ...editFormData, api_base_url: e.target.value })}
                  placeholder="https://api.provider.com/v1"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl text-white font-mono text-sm focus:outline-none transition"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    API Key <span className="text-slate-500 font-normal">(เว้นว่างถ้าไม่ต้องการเปลี่ยน)</span>
                  </label>
                  <input
                    type="password"
                    value={editFormData.api_key}
                    onChange={(e) => setEditFormData({ ...editFormData, api_key: e.target.value })}
                    placeholder="••••••••••••"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl text-white font-mono text-sm focus:outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    API Secret / Token <span className="text-slate-500 font-normal">(เว้นว่างถ้าไม่เปลี่ยน)</span>
                  </label>
                  <input
                    type="password"
                    value={editFormData.api_secret}
                    onChange={(e) => setEditFormData({ ...editFormData, api_secret: e.target.value })}
                    placeholder="••••••••••••"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl text-white font-mono text-sm focus:outline-none transition"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <div>
                  <div className="text-xs font-bold text-white">สถานะเปิดรับออเดอร์ (Is Active)</div>
                  <div className="text-[11px] text-slate-400">เปิดหรือปิดการทำงานของ API นี้ในระบบกลาง</div>
                </div>
                <input
                  type="checkbox"
                  checked={editFormData.is_active}
                  onChange={(e) => setEditFormData({ ...editFormData, is_active: e.target.checked })}
                  className="w-5 h-5 rounded border-slate-700 text-sky-500 focus:ring-0 cursor-pointer accent-sky-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingApi(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-bold shadow-lg shadow-sky-600/30 transition flex items-center gap-2"
                >
                  {savingEdit ? 'กำลังบันทึก...' : 'บันทึกข้อมูลเรียลไทม์'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
  );
}
