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
    health_status: 'HEALTHY',
    system: 'ระบบเติมเกมอัตโนมัติ',
    description: 'จำลองการตรวจสอบ Player ID และส่งไอเทมเกม (Free Fire, ROV, MLBB ฯลฯ) ตอบสนองทันทีโดยไม่ต้องต่อ Gateway ค่ายเกมจริง',
    samplePayload: '{\n  "player_id": "987654321",\n  "server_id": "SEA"\n}',
  },
  {
    id: 'mock-digital-goods-fallback',
    code: 'mock-digital-goods',
    name: 'Sandbox Premium Apps Provider',
    category: 'PREMIUM_APP',
    api_base_url: 'https://mock.naymos.local/v1/digital',
    environment: 'sandbox',
    is_test_mode: true,
    health_status: 'HEALTHY',
    system: 'ระบบแอปพรีเมียม & สินค้าดิจิทัล',
    description: 'จำลองการส่งมอบคีย์และบัญชีอัตโนมัติ เช่น Spotify, Netflix, YouTube Premium',
    samplePayload: '{\n  "package_id": "spotify-1m",\n  "customer_email": "demo@naymos.com"\n}',
  },
  {
    id: 'local-promptpay-fallback',
    code: 'local-promptpay',
    name: 'PromptPay EMVCo Local Engine',
    category: 'PAYMENT',
    api_base_url: 'internal://payments/promptpay',
    environment: 'production',
    is_test_mode: false,
    health_status: 'HEALTHY',
    system: 'ระบบชำระเงิน & QR พร้อมเพย์',
    description: 'สร้าง QR Code พร้อมเพย์มาตรฐาน EMVCo เบอร์ 0988251064 ภายในระบบโดยตรง ไม่เสียค่าธรรมเนียมภายนอก',
    samplePayload: '{\n  "amount": 100,\n  "order_number": "ORD-TEST-001"\n}',
  },
  {
    id: 'ai-gateway-fallback',
    code: 'ai-gateway',
    name: 'AI Assistant Unified Gateway',
    category: 'AI',
    api_base_url: 'https://generativelanguage.googleapis.com',
    environment: 'production',
    is_test_mode: false,
    health_status: 'HEALTHY',
    system: 'ระบบผู้ช่วย AI & แชทบอท',
    description: 'เชื่อมต่อ Gemini 1.5 Flash / OpenAI / Groq ให้บริการบอทตอบคำถามลูกค้า',
    samplePayload: '{\n  "message": "สอบถามโปรโมชั่นเติมเกมวันนี้หน่อยครับ"\n}',
  },
];

export default function AdminProvidersHubPage() {
  const [activeTab, setActiveTab] = useState<'providers' | 'routes' | 'sandbox' | 'logs'>('providers');
  const [providers, setProviders] = useState<CentralProvider[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  // Determine active dataset: Use DB providers if any; fallback only when empty & not loading
  const hasDbProviders = providers.length > 0;
  const displayList = hasDbProviders ? providers : BUILT_IN_TRIAL_APIS;

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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayList.map((api: any) => {
            const cat = api.category || api.type || 'ALL';
            const meta = CATEGORY_META[cat] || CATEGORY_META.ALL;
            const Icon = meta.icon;
            const isTest = api.is_test_mode || api.environment === 'sandbox';

            return (
              <div
                key={api.id || api.code}
                className="bg-slate-800/70 border border-slate-700 hover:border-slate-600 rounded-xl p-4 transition shadow-md flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-700">
                        <Icon className={`w-4 h-4 ${meta.color}`} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white leading-tight">{api.name}</h3>
                        <div className="text-[11px] font-mono text-sky-400">{api.code}</div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span
                        className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                          isTest
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                        }`}
                      >
                        {isTest ? '⚡ Sandbox (ทดลอง)' : '🟢 Production'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {meta.label}
                      </span>
                    </div>
                  </div>

                  {api.description && (
                    <p className="text-xs text-slate-300 mb-3 bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/80">
                      {api.description}
                    </p>
                  )}

                  <div className="space-y-1.5 mb-3 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 text-[11px] w-20 shrink-0 font-semibold">Endpoint:</span>
                      <span className="font-mono text-[11px] text-slate-200 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 truncate">
                        {api.api_base_url || 'internal://engine'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 text-[11px] w-20 shrink-0 font-semibold">สถานะระบบ:</span>
                      <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> พร้อมรับออเดอร์
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-700/60 mt-1">
                  <div className="text-[11px] text-slate-400">
                    โหมด: <span className="font-bold text-slate-200">{isTest ? 'ทดลองส่งของจำลอง' : 'ส่งของจริง'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasDbProviders && (
                      <button
                        onClick={() => handleDeleteProvider(api)}
                        disabled={deletingId === api.id}
                        className="p-1.5 rounded-lg text-rose-400 hover:text-white hover:bg-rose-500/20 border border-rose-500/30 transition text-xs flex items-center gap-1 font-semibold"
                        title="ลบ Provider ออกจากระบบ"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">ลบ</span>
                      </button>
                    )}
                    <button
                      onClick={() => openLiveSandbox(api.id, api.category)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-sky-500/20 text-sky-300 hover:bg-sky-500 hover:text-white border border-sky-400/40 transition flex items-center gap-1.5 shadow-sm"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      เปิด Live Sandbox
                    </button>
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
