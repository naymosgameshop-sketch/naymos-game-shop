'use client';

import { useState, useEffect } from 'react';
import {
  Search,
  CheckCircle2,
  Clock,
  PlayCircle,
  Copy,
  Check,
  Eye,
  X,
  AlertTriangle,
  User,
  Gamepad2,
  ListOrdered,
  FileCheck,
  Loader2,
  ShieldCheck,
  Server,
  ExternalLink,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { AdminOrderRowActions } from './AdminOrderRowActions';

export function AdminOrdersManager({
  initialOrders,
  gamesMap,
  productsMap,
  profilesMap,
}: {
  initialOrders: any[];
  gamesMap: Record<string, any>;
  productsMap: Record<string, any>;
  profilesMap: Record<string, any>;
}) {
  const [orders, setOrders] = useState(initialOrders);
  const [activeTab, setActiveTab] = useState<'pending' | 'queued' | 'processing' | 'completed'>('queued');
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [slipModalUrl, setSlipModalUrl] = useState<string | null>(null);

  // Package fulfillment checklist state: orderId -> { itemKey -> boolean }
  const [checkedPacks, setCheckedPacks] = useState<Record<string, Record<string, boolean>>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [confirmModalOrder, setConfirmModalOrder] = useState<any | null>(null);

  // Setup Supabase Realtime on orders table
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('admin-orders-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setOrders((prev) => [payload.new, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setOrders((prev) =>
              prev.map((o) => (o.id === payload.new.id ? { ...o, ...payload.new } : o))
            );
            setSelectedOrder((prev: any) =>
              prev && prev.id === payload.new.id ? { ...prev, ...payload.new } : prev
            );
          } else if (payload.eventType === 'DELETE') {
            setOrders((prev) => prev.filter((o) => o.id === payload.old.id));
            setSelectedOrder((prev: any) => (prev && prev.id === payload.old.id ? null : prev));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Categorize orders strictly according to the new workflow
  const pendingPaymentOrders = orders.filter(
    (o) => o.status === 'pending' || o.status === 'PENDING_PAYMENT' || o.status === 'awaiting_payment'
  );

  // Queued orders sorted by payment confirmation time (FIFO)
  const queuedOrders = orders
    .filter((o) => o.status === 'QUEUED' || (o.status === 'PAID' && !o.processing_started_at))
    .sort((a, b) => {
      const timeA = new Date(a.payment_confirmed_at || a.created_at).getTime();
      const timeB = new Date(b.payment_confirmed_at || b.created_at).getTime();
      return timeA - timeB;
    });

  const processingOrders = orders.filter(
    (o) => o.status === 'PROCESSING' || o.status === 'processing'
  );

  const completedOrders = orders.filter(
    (o) => o.status === 'SUCCESS' || o.status === 'completed'
  );

  const currentList =
    activeTab === 'pending'
      ? pendingPaymentOrders
      : activeTab === 'queued'
      ? queuedOrders
      : activeTab === 'processing'
      ? processingOrders
      : completedOrders;

  const filteredOrders = currentList.filter((o) => {
    const q = search.toLowerCase();
    const g = gamesMap[o.game_id]?.name || '';
    const u = profilesMap[o.user_id]?.full_name || profilesMap[o.user_id]?.email || '';
    return (
      o.order_number?.toLowerCase().includes(q) ||
      g.toLowerCase().includes(q) ||
      u.toLowerCase().includes(q)
    );
  });

  function handleCopy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  function toggleCheckItem(orderId: string, itemKey: string) {
    setCheckedPacks((prev) => {
      const orderChecks = prev[orderId] || {};
      return {
        ...prev,
        [orderId]: {
          ...orderChecks,
          [itemKey]: !orderChecks[itemKey],
        },
      };
    });
  }

  function getOrderItems(order: any) {
    const pd = (order.player_data as Record<string, any>) || {};
    if (Array.isArray(pd._order_items) && pd._order_items.length > 0) {
      return pd._order_items;
    }
    const p = productsMap[order.product_id];
    return [
      {
        product_id: order.product_id,
        name: p?.name || 'แพ็กเกจมาตรฐาน',
        quantity: 1,
        price: Number(order.amount || order.total || 0),
        cost: Number(p?.cost || 0),
      },
    ];
  }

  function areAllPacksChecked(order: any) {
    const items = getOrderItems(order);
    const checks = checkedPacks[order.id] || {};
    for (let i = 0; i < items.length; i++) {
      const qty = items[i].quantity || 1;
      for (let q = 1; q <= qty; q++) {
        if (!checks[`${i}_${q}`]) return false;
      }
    }
    return true;
  }

  // Admin starts processing Queue 1
  async function handleStartProcessing(order: any, queueIndex: number) {
    if (queueIndex !== 0) {
      alert('ระบบเติมตามลำดับคิว กรุณาดำเนินการคิวที่ 1 ก่อนครับ');
      return;
    }

    setProcessingId(order.id);
    try {
      const res = await fetch('/api/admin/orders/start-processing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: order.id }),
      });
      const data = await res.json();
      if (data.success) {
        setOrders((prev) =>
          prev.map((o) => (o.id === order.id ? { ...o, status: 'PROCESSING' } : o))
        );
        setActiveTab('processing');
        setSelectedOrder(order);
      } else {
        alert(data.message || 'ไม่สามารถเริ่มเติมได้');
      }
    } catch {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setProcessingId(null);
    }
  }

  // Admin completes fulfillment after ticking all packages
  async function executeComplete(order: any) {
    setCompletingId(order.id);
    try {
      const items = getOrderItems(order);
      const res = await fetch('/api/admin/orders/complete-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: order.id,
          fulfilled_items: items,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setOrders((prev) =>
          prev.map((o) => (o.id === order.id ? { ...o, status: 'SUCCESS' } : o))
        );
        setSelectedOrder(null);
        setConfirmModalOrder(null);
        setActiveTab('completed');
      } else {
        alert(data.message || 'ไม่สามารถเปลี่ยนสถานะได้');
      }
    } catch {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setCompletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header and 4 Workflow Filter Tabs */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-sky-950">จัดการออเดอร์ & ระบบคิวเติมเกม</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            ระบบจัดคิวตามเวลาชำระเงินจริง (FIFO) และการตรวจสอบแพ็กเกจเติมมือ
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-sky-50 rounded-2xl border border-sky-100">
          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'pending'
                ? 'bg-white text-amber-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            1. รอชำระเงิน ({pendingPaymentOrders.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('queued')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'queued'
                ? 'bg-white text-sky-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ListOrdered className="w-3.5 h-3.5" />
            2. รอคิวการเติม ({queuedOrders.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('processing')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'processing'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PlayCircle className="w-3.5 h-3.5" />
            3. กำลังดำเนินการเติม ({processingOrders.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('completed')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'completed'
                ? 'bg-white text-emerald-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            4. เติมสำเร็จ ({completedOrders.length})
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ค้นหาเลขออเดอร์, ชื่อเกม หรือลูกค้า..."
          className="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-sky-100 text-xs text-slate-800 outline-none focus:border-sky-400 shadow-xs"
        />
      </div>

      {/* Orders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredOrders.map((o, idx) => {
          const game = gamesMap[o.game_id];
          const profile = profilesMap[o.user_id];
          const items = getOrderItems(o);
          const pd = (o.player_data as Record<string, any>) || {};
          const slip = pd.slip_image || pd.payment_slip || pd._slip_url || null;
          const uid = pd.uid || pd.player_id || pd.id || Object.values(pd)[0] || '-';

          const totalCost = items.reduce(
            (s: number, it: any) => s + Number(it.cost || 0) * (it.quantity || 1),
            0
          );
          const totalRevenue = Number(o.total || o.amount || 0);
          const profit = totalRevenue - totalCost;

          const isQueueTab = activeTab === 'queued';
          const queueNumber = idx + 1;
          const isFirstInQueue = idx === 0;

          return (
            <div
              key={o.id}
              className={`rounded-2xl border bg-white p-4 space-y-3.5 shadow-xs transition flex flex-col justify-between ${
                isQueueTab && isFirstInQueue
                  ? 'border-sky-400 ring-2 ring-sky-200/60'
                  : 'border-sky-100 hover:border-sky-300'
              }`}
            >
              <div className="space-y-2.5">
                {/* Header: Order ID, Queue Tag, & Date */}
                <div className="flex items-start justify-between gap-2 pb-2 border-b border-sky-50">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-bold text-sky-950 block">
                        {o.order_number}
                      </span>
                      {isQueueTab && (
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                            isFirstInQueue
                              ? 'bg-sky-500 text-white animate-pulse'
                              : 'bg-sky-100 text-sky-800'
                          }`}
                        >
                          คิวที่ {queueNumber}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {o.payment_confirmed_at
                        ? `ชำระเมื่อ: ${new Date(o.payment_confirmed_at).toLocaleTimeString('th-TH')}`
                        : new Date(o.created_at).toLocaleString('th-TH')}
                    </span>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                      o.status === 'SUCCESS' || o.status === 'completed'
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                        : o.status === 'PROCESSING' || o.status === 'processing'
                        ? 'bg-blue-50 text-blue-600 border border-blue-200 animate-pulse'
                        : o.status === 'QUEUED' || o.status === 'PAID'
                        ? 'bg-sky-50 text-sky-700 border border-sky-200'
                        : 'bg-amber-50 text-amber-600 border border-amber-200'
                    }`}
                  >
                    {o.status === 'PROCESSING'
                      ? 'กำลังดำเนินการเติม'
                      : o.status === 'QUEUED' || o.status === 'PAID'
                      ? `รอคิว (คิว ${queueNumber})`
                      : o.status === 'SUCCESS' || o.status === 'completed'
                      ? 'สำเร็จ'
                      : 'รอชำระเงิน'}
                  </span>
                </div>

                {/* Game & Customer info */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-sky-50 border border-sky-100 overflow-hidden shrink-0">
                    {game?.icon || game?.banner ? (
                      <img
                        src={game.icon || game.banner}
                        alt={game.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-sky-400">
                        <Gamepad2 className="w-6 h-6" />
                      </div>
                    )}
                  </div>
                  <div className="overflow-hidden flex-1">
                    <h4 className="font-bold text-xs text-sky-950 truncate">
                      {game?.name || 'เกม'}
                    </h4>
                    <p className="text-[11px] text-slate-500 truncate flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-400 shrink-0" />
                      {profile?.full_name || profile?.email || o.guest_email || 'ลูกค้าทั่วไป'}
                    </p>
                  </div>
                </div>

                {/* Player UID highlight with copy button */}
                <div className="bg-sky-50/60 rounded-xl p-2.5 border border-sky-100 flex items-center justify-between gap-2">
                  <div className="overflow-hidden">
                    <span className="text-[10px] text-slate-500 block">UID ผู้เล่น:</span>
                    <span className="font-mono font-bold text-xs text-sky-950 truncate block">
                      {String(uid)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(String(uid), `card_${o.id}`)}
                    className="p-1.5 rounded-lg bg-white border border-sky-200 text-sky-700 hover:bg-sky-50 transition shrink-0"
                    title="คัดลอก UID"
                  >
                    {copiedKey === `card_${o.id}` ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                {/* Package summary */}
                <div className="space-y-1 text-xs text-slate-600">
                  <span className="text-[10px] text-slate-400 font-medium">
                    รายการแพ็กเกจ ({items.length} รายการ):
                  </span>
                  <div className="bg-slate-50 rounded-lg p-2 space-y-1">
                    {items.map((it: any, iIdx: number) => (
                      <div key={iIdx} className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-700 truncate pr-2">
                          • {it.name} <span className="font-bold text-sky-700">×{it.quantity || 1}</span>
                        </span>
                        <span className="font-mono text-slate-600">
                          ฿{Number(it.price * (it.quantity || 1)).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Financial summary: Total, Cost, Profit */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-sky-50 text-center">
                  <div className="bg-sky-50/40 p-1.5 rounded-lg">
                    <span className="text-[9px] text-slate-400 block">ยอดขาย</span>
                    <span className="text-xs font-bold text-sky-900 font-mono">
                      ฿{totalRevenue.toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-1.5 rounded-lg">
                    <span className="text-[9px] text-slate-400 block">ต้นทุน</span>
                    <span className="text-xs font-medium text-slate-600 font-mono">
                      ฿{totalCost.toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-emerald-50/50 p-1.5 rounded-lg">
                    <span className="text-[9px] text-emerald-600 block">กำไร</span>
                    <span className="text-xs font-bold text-emerald-700 font-mono">
                      ฿{profit.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Slip preview link */}
                {slip && (
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setSlipModalUrl(slip)}
                      className="inline-flex items-center gap-1.5 text-[11px] font-bold text-sky-600 hover:text-sky-800"
                    >
                      <Eye className="w-3.5 h-3.5" /> ดูสลิปลูกค้า
                    </button>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="pt-3 border-t border-sky-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedOrder(o)}
                  className="px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold text-xs transition"
                >
                  รายละเอียด
                </button>

                {/* If in QUEUED tab -> show "เริ่มเติม" button (active only for Queue 1) */}
                {isQueueTab ? (
                  <button
                    type="button"
                    disabled={!isFirstInQueue || processingId === o.id}
                    onClick={() => handleStartProcessing(o, idx)}
                    className="px-4 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5"
                    title={isFirstInQueue ? 'เริ่มเติมคิวนี้' : 'ต้องเติมคิวแรกก่อน'}
                  >
                    {processingId === o.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <PlayCircle className="w-3.5 h-3.5" />
                    )}
                    {isFirstInQueue ? 'เริ่มเติม (คิว 1)' : `รอคิวที่ ${queueNumber}`}
                  </button>
                ) : (
                  <AdminOrderRowActions order={o} />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredOrders.length === 0 && (
        <div className="p-12 text-center rounded-2xl bg-white border border-sky-100 text-slate-400 text-xs">
          ไม่พบออเดอร์ในหมวดหมู่นี้
        </div>
      )}

      {/* Order Detail Modal with Package Checklist */}
      {selectedOrder && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-white rounded-3xl border border-sky-100 shadow-2xl p-6 relative max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-sky-100">
              <div>
                <h3 className="font-extrabold text-base text-sky-950">
                  รายละเอียดออเดอร์: {selectedOrder.order_number}
                </h3>
                <span className="text-xs text-slate-400">
                  สร้างเมื่อ: {new Date(selectedOrder.created_at).toLocaleString('th-TH')}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 overflow-y-auto space-y-4 pr-1 flex-1">
              {/* Customer and Game summary */}
              <div className="grid grid-cols-2 gap-3 bg-sky-50/50 p-4 rounded-2xl border border-sky-100 text-xs">
                <div>
                  <span className="text-slate-400 block mb-0.5">ลูกค้า:</span>
                  <span className="font-bold text-sky-950 block">
                    {profilesMap[selectedOrder.user_id]?.username ||
                      profilesMap[selectedOrder.user_id]?.email ||
                      selectedOrder.guest_email ||
                      'ลูกค้าทั่วไป'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    ID: {selectedOrder.user_id || 'guest'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">เกม:</span>
                  <span className="font-bold text-sky-950 block">
                    {gamesMap[selectedOrder.game_id]?.name || 'เกม'}
                  </span>
                </div>
              </div>

              {/* Player UID & Game Fields */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-sky-950 block">ข้อมูลผู้เล่นสำหรับเติมเกม:</span>
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/70 space-y-2 text-xs">
                  {Object.entries((selectedOrder.player_data as Record<string, any>) || {})
                    .filter(
                      ([k]) =>
                        !['_order_items', '_fulfilled_items', 'slip_image', 'payment_slip', '_slip_url'].includes(k)
                    )
                    .map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between gap-2">
                        <span className="text-slate-500 font-medium">{k}:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900">{String(v)}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(String(v), `modal_${k}`)}
                            className="p-1 rounded bg-white border border-slate-200 text-sky-600 hover:bg-sky-50"
                            title="คัดลอก"
                          >
                            {copiedKey === `modal_${k}` ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Checklist of Packages for Manual Fulfillment */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-sky-950">
                    รายการแพ็กเกจที่ต้องเติม (ติ๊กให้ครบก่อนกดเติมสำเร็จ):
                  </span>
                  <span className="text-[11px] font-bold text-sky-600">
                    {areAllPacksChecked(selectedOrder) ? '✓ ตรวจสอบครบแล้ว' : 'ยังเติมไม่ครบ'}
                  </span>
                </div>

                <div className="space-y-2">
                  {getOrderItems(selectedOrder).map((item: any, itemIdx: number) => {
                    const qty = item.quantity || 1;
                    return (
                      <div
                        key={itemIdx}
                        className="p-3 bg-white border border-sky-200 rounded-xl space-y-2 shadow-2xs"
                      >
                        <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                          <span>{item.name}</span>
                          <span className="font-mono text-sky-700">จำนวน: {qty} แพ็ก</span>
                        </div>

                        {/* Sub-checklist per unit */}
                        <div className="space-y-1.5 pl-2 pt-1 border-t border-slate-100">
                          {Array.from({ length: qty }).map((_, unitIdx) => {
                            const unitKey = `${itemIdx}_${unitIdx + 1}`;
                            const isChecked = !!checkedPacks[selectedOrder.id]?.[unitKey];
                            return (
                              <label
                                key={unitIdx}
                                className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer select-none"
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleCheckItem(selectedOrder.id, unitKey)}
                                  className="w-4 h-4 rounded text-sky-600 border-sky-300 focus:ring-sky-500"
                                />
                                <span>
                                  เติมแพ็กที่ #{unitIdx + 1} เรียบร้อยแล้ว
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Provider API Fulfillment Details (BYShop / FinShop) */}
              {Boolean(
                (selectedOrder.player_data as any)?.provider_order_id ||
                (selectedOrder.player_data as any)?.orderid ||
                (selectedOrder.player_data as any)?.transaction_id ||
                (selectedOrder.player_data as any)?.product_info ||
                (selectedOrder.player_data as any)?.delivered_info
              ) && (
                <div className="p-3.5 rounded-2xl bg-sky-50/80 border border-sky-100 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sky-950 flex items-center gap-1.5">
                      <Server className="w-4 h-4 text-sky-600" />
                      <span>ข้อมูลคำสั่งซื้อจาก Provider API</span>
                    </span>
                    <span className="font-mono text-[10px] bg-sky-100 text-sky-800 px-2 py-0.5 rounded-full font-bold">
                      {(selectedOrder.player_data as any)?.provider_name || 'API Provider'}
                    </span>
                  </div>
                  {((selectedOrder.player_data as any)?.provider_order_id || (selectedOrder.player_data as any)?.orderid || (selectedOrder.player_data as any)?.transaction_id) && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">รหัสคำสั่งซื้อ API (Order ID):</span>
                      <span className="font-mono font-bold text-slate-800">
                        #{(selectedOrder.player_data as any)?.provider_order_id || (selectedOrder.player_data as any)?.orderid || (selectedOrder.player_data as any)?.transaction_id}
                      </span>
                    </div>
                  )}
                  {((selectedOrder.player_data as any)?.product_info || (selectedOrder.player_data as any)?.delivered_info) && (
                    <div className="space-y-1">
                      <span className="text-slate-500 text-[11px]">ข้อมูลสินค้า / รหัสที่ได้รับ:</span>
                      <div className="p-2 bg-white rounded-xl border border-sky-100 font-mono text-[11px] text-slate-800 flex items-center justify-between">
                        <span className="truncate flex-1">
                          {(selectedOrder.player_data as any)?.product_info || (selectedOrder.player_data as any)?.delivered_info}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Slip view */}
              {((selectedOrder.player_data as any)?._slip_url ||
                (selectedOrder.player_data as any)?.slip_image) && (
                <div className="pt-2 border-t border-sky-100">
                  <span className="text-xs font-bold text-sky-950 block mb-2">สลิปการโอนเงิน:</span>
                  <img
                    src={
                      (selectedOrder.player_data as any)?._slip_url ||
                      (selectedOrder.player_data as any)?.slip_image
                    }
                    alt="Slip"
                    className="max-h-60 rounded-xl border border-sky-200 object-contain mx-auto bg-slate-50"
                  />
                </div>
              )}
            </div>

            {/* Modal Footer with Completion Button */}
            <div className="pt-3 border-t border-sky-100 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
              >
                ปิด
              </button>

              {(selectedOrder.status === 'PROCESSING' || selectedOrder.status === 'processing') && (
                <button
                  type="button"
                  disabled={!areAllPacksChecked(selectedOrder) || completingId === selectedOrder.id}
                  onClick={() => setConfirmModalOrder(selectedOrder)}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold text-white shadow-xs transition flex items-center gap-1.5"
                >
                  {completingId === selectedOrder.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <FileCheck className="w-3.5 h-3.5" />
                  )}
                  ยืนยันเติมสำเร็จ
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog before marking completed */}
      {confirmModalOrder && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl border border-sky-100 shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-sky-950">ยืนยันการเติมสำเร็จ?</h3>
                <p className="text-xs text-slate-500">ออเดอร์: {confirmModalOrder.order_number}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-sky-50/50 p-3.5 rounded-2xl border border-sky-100">
              คุณได้ตรวจสอบและเติมแพ็กเกจทั้งหมดในออเดอร์นี้ครบถ้วนแล้วใช่หรือไม่? เมื่อกดยืนยัน ออเดอร์จะย้ายไปยังสถานะสำเร็จ และระบบจะแจ้งเตือนลูกค้าทันที
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModalOrder(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={completingId === confirmModalOrder.id}
                onClick={() => executeComplete(confirmModalOrder)}
                className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-xs font-bold text-white shadow-xs"
              >
                {completingId === confirmModalOrder.id ? 'กำลังบันทึก...' : 'ยืนยันเติมสำเร็จ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Slip Preview Modal */}
      {slipModalUrl && (
        <div className="fixed inset-0 z-[170] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="relative max-w-lg w-full bg-white rounded-3xl p-4 shadow-2xl space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-800">สลิปการชำระเงิน</span>
              <button
                type="button"
                onClick={() => setSlipModalUrl(null)}
                className="p-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <img src={slipModalUrl} alt="Slip Full" className="w-full max-h-[75vh] object-contain rounded-xl" />
          </div>
        </div>
      )}
    </div>
  );
}
