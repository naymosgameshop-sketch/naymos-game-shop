'use client';

import { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { CentralProvider, ProviderHealthStatus } from '@/types/central-provider';

export default function AdminProvidersHubPage() {
  const [activeTab, setActiveTab] = useState<'providers' | 'routes' | 'sandbox' | 'logs'>('providers');
  const [providers, setProviders] = useState<CentralProvider[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingId, setTestingId] = useState<string | null>(null);

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

  const healthyCount = providers.filter((p) => p.health_status === 'HEALTHY').length;
  const sandboxCount = providers.filter((p) => p.is_test_mode || p.environment === 'sandbox').length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-400/30 flex items-center justify-center text-sky-400">
            <Server className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white">Central API & Providers Hub</h1>
            <p className="text-xs sm:text-sm text-slate-400">
              ศูนย์กลางควบคุมการเชื่อมต่อ API, ระบบ Failover, เครือข่ายการส่งต่อออเดอร์ และ Sandbox จำลอง
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              fetchProviders();
              fetchRoutes();
              fetchLogs();
            }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition"
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

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">ผู้ให้บริการทั้งหมด</span>
            <Server className="w-4 h-4 text-sky-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-white">{providers.length}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">เชื่อมต่อในระบบกลาง</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">สถานะปกติ (Healthy)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-400">{healthyCount}</div>
          <div className="text-[11px] text-emerald-500/80 mt-0.5">พร้อมรับโหลด 100%</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">โหมด Sandbox / Test</span>
            <Sliders className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-amber-400">{sandboxCount}</div>
          <div className="text-[11px] text-amber-500/80 mt-0.5">จำลองความปลอดภัย</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">เส้นทาง Routing</span>
            <ArrowRightLeft className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-indigo-400">{routes.length}</div>
          <div className="text-[11px] text-indigo-500/80 mt-0.5">พร้อมระบบ Failover</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('providers')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'providers'
              ? 'bg-sky-500/20 text-sky-400 border border-sky-400/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Server className="w-4 h-4" /> ผู้ให้บริการ ({providers.length})
        </button>
        <button
          onClick={() => setActiveTab('routes')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'routes'
              ? 'bg-sky-500/20 text-sky-400 border border-sky-400/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" /> กฎ Routing & Failover ({routes.length})
        </button>
        <button
          onClick={() => setActiveTab('sandbox')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'sandbox'
              ? 'bg-sky-500/20 text-sky-400 border border-sky-400/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Play className="w-4 h-4" /> Live Sandbox Console
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'logs'
              ? 'bg-sky-500/20 text-sky-400 border border-sky-400/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Activity className="w-4 h-4" /> API Transactions & Logs ({logs.length})
        </button>
      </div>

      {/* TAB 1: Providers List */}
      {activeTab === 'providers' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">ผู้ให้บริการ / รหัส</th>
                  <th className="py-3.5 px-4">หมวดหมู่</th>
                  <th className="py-3.5 px-4">สภาพแวดล้อม</th>
                  <th className="py-3.5 px-4">สถานะ & Latency</th>
                  <th className="py-3.5 px-4">Credentials</th>
                  <th className="py-3.5 px-4 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {providers.map((p) => {
                  const isHealthy = p.health_status === 'HEALTHY';
                  const isDegraded = p.health_status === 'DEGRADED';
                  const isDown = p.health_status === 'DOWN';

                  return (
                    <tr key={p.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-4 px-4">
                        <div className="font-bold text-white text-sm">{p.name}</div>
                        <div className="text-[11px] font-mono text-sky-400">{p.code}</div>
                        {p.api_base_url && (
                          <div className="text-[10px] text-slate-500 truncate max-w-xs mt-0.5">
                            {p.api_base_url}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                          {p.category || p.type}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleTestMode(p)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition cursor-pointer ${
                              p.is_test_mode
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-400/30'
                                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-400/30'
                            }`}
                          >
                            {p.is_test_mode ? 'SANDBOX' : 'PRODUCTION'}
                          </button>
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
                          {p.health_response_ms && (
                            <span className="text-[10px] text-slate-500 font-mono">
                              ({p.health_response_ms}ms)
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-400">
                          <Key className="w-3.5 h-3.5 text-slate-500" />
                          <span>{p.credentials_preview || 'ปลอดภัย (Masked)'}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => triggerHealthCheck(p.id)}
                            disabled={testingId === p.id}
                            className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-slate-800 text-sky-400 hover:bg-slate-700 transition flex items-center gap-1 disabled:opacity-50"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${testingId === p.id ? 'animate-spin' : ''}`} />
                            ตรวจสถานะ
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
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Routes & Failover */}
      {activeTab === 'routes' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-bold text-white">เส้นทางการกระจายคำสั่งซื้อ (Smart Routing)</h2>
              <p className="text-xs text-slate-400">
                กำหนดว่าสินค้าแต่ละประเภทจะถูกส่งไปที่ Provider ใด และถ้าล้มเหลวจะสลับไปยัง Failover Provider ใดอัตโนมัติ
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {routes.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-xs">
                ยังไม่มีการผูก Route พิเศษ — ระบบจะใช้ Priority Provider ของแต่ละหมวดหมู่อัตโนมัติ
              </div>
            ) : (
              routes.map((r) => (
                <div
                  key={r.id}
                  className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <div className="font-bold text-white text-sm">{r.route_key || 'Default Route'}</div>
                    <div className="text-xs text-slate-400 flex items-center gap-2">
                      <span>ประเภท: {r.target_type}</span>
                      <span>•</span>
                      <span>Priority: {r.priority}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-xs font-semibold text-emerald-400">Primary: {r.provider?.name}</div>
                      {r.failover_provider && (
                        <div className="text-[11px] text-amber-400">Failover: {r.failover_provider.name}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Sandbox Console */}
      {activeTab === 'sandbox' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Play className="w-4 h-4 text-sky-400" /> เครื่องมือจำลองการเรียก API (Sandbox Console)
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">เลือก Provider</label>
                <select
                  value={sandboxProviderId}
                  onChange={(e) => setSandboxProviderId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                >
                  {providers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.code}) [{p.is_test_mode ? 'SANDBOX' : 'PROD'}]
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Action</label>
                <select
                  value={sandboxAction}
                  onChange={(e) => setSandboxAction(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="validate_player">validate_player (ตรวจสอบไอดีผู้เล่น)</option>
                  <option value="topup">topup (จำลองการเติมเกม)</option>
                  <option value="deliver_package">deliver_package (จำลองการส่งรหัสแอปพรีเมียม)</option>
                  <option value="check_balance">check_balance (ตรวจสอบยอดเงินคงเหลือ)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Request Payload (JSON)</label>
                <textarea
                  value={sandboxPayload}
                  onChange={(e) => setSandboxPayload(e.target.value)}
                  rows={6}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-emerald-400 focus:outline-none focus:border-sky-500"
                />
              </div>

              <button
                onClick={handleRunSandbox}
                disabled={sandboxRunning}
                className="w-full py-2.5 rounded-xl font-bold text-xs bg-sky-500 hover:bg-sky-400 text-white transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {sandboxRunning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                ส่งคำขอทดสอบไปยัง Sandbox
              </button>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Code2 className="w-4 h-4 text-emerald-400" /> ผลลัพธ์การทำงาน (Execution Output)
            </h2>
            {sandboxResult ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300">HTTP Status: {sandboxResult.http_status}</span>
                  <span className="text-sky-400 font-mono">{sandboxResult.duration_ms} ms</span>
                </div>
                <pre className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs font-mono text-slate-300 overflow-x-auto max-h-96">
                  {JSON.stringify(sandboxResult, null, 2)}
                </pre>
              </div>
            ) : (
              <div className="text-slate-500 text-xs text-center py-20">
                กดปุ่ม "ส่งคำขอทดสอบ" เพื่อดูผลการจำลองการทำงาน
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: Logs */}
      {activeTab === 'logs' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">เวลา</th>
                  <th className="py-3 px-4">Provider</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Latency</th>
                  <th className="py-3 px-4">Sanitized Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                      {new Date(log.created_at).toLocaleTimeString('th-TH')}
                    </td>
                    <td className="py-3 px-4 font-bold text-white">{log.provider?.name || log.route_key}</td>
                    <td className="py-3 px-4 text-sky-400 font-mono">{log.action_name}</td>
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
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">
              {editingProvider?.id ? 'แก้ไข Provider' : 'เพิ่ม Provider ใหม่'}
            </h3>
            <form onSubmit={handleSaveProvider} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">ชื่อผู้ให้บริการ</label>
                <input
                  type="text"
                  required
                  value={editingProvider?.name || ''}
                  onChange={(e) => setEditingProvider({ ...editingProvider, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  placeholder="เช่น Garena Topup Gateway"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">รหัสอ้างอิง (Unique Code)</label>
                <input
                  type="text"
                  required
                  disabled={!!editingProvider?.id}
                  value={editingProvider?.code || ''}
                  onChange={(e) => setEditingProvider({ ...editingProvider, code: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white disabled:opacity-50"
                  placeholder="เช่น garena-sea"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">หมวดหมู่</label>
                  <select
                    value={editingProvider?.category || 'GAME_TOPUP'}
                    onChange={(e: any) => setEditingProvider({ ...editingProvider, category: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="GAME_TOPUP">เติมเกม</option>
                    <option value="PREMIUM_APP">แอปพรีเมียม</option>
                    <option value="DIGITAL_PRODUCT">สินค้าดิจิทัล</option>
                    <option value="PAYMENT">ชำระเงิน</option>
                    <option value="AI">AI</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">สภาพแวดล้อม</label>
                  <select
                    value={editingProvider?.environment || 'sandbox'}
                    onChange={(e: any) => setEditingProvider({ ...editingProvider, environment: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="sandbox">Sandbox</option>
                    <option value="production">Production</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">API Base URL</label>
                <input
                  type="text"
                  value={editingProvider?.api_base_url || ''}
                  onChange={(e) => setEditingProvider({ ...editingProvider, api_base_url: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  placeholder="https://api.provider.com/v1"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">API Key / Secret (Masked)</label>
                <input
                  type="password"
                  value={editingProvider?.api_key || ''}
                  onChange={(e) => setEditingProvider({ ...editingProvider, api_key: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
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
                <button type="submit" className="px-4 py-2 rounded-xl bg-sky-500 font-bold text-white hover:bg-sky-400">
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
