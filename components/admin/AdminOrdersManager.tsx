'use client';

import { useState, useEffect, useMemo } from 'react';
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
  Smartphone,
  ListOrdered,
  FileCheck,
  Loader2,
  ShieldCheck,
  Server,
  ExternalLink,
  Zap,
  RefreshCw,
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
  
  // P0: Top-level separation: GAME_TOPUP vs DIGITAL_PRODUCT
  const [mainTypeTab, setMainTypeTab] = useState<'GAME_TOPUP' | 'DIGITAL_PRODUCT'>('GAME_TOPUP');
  const [activeSubTab, setActiveSubTab] = useState<'pending' | 'queued' | 'processing' | 'completed' | 'issues'>('queued');
  
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [slipModalUrl, setSlipModalUrl] = useState<string | null>(null);

  const [processingId, setProcessingId] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [fulfillLoadingId, setFulfillLoadingId] = useState<string | null>(null);
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
            setOrders((prev) => prev.map((o) => (o.id === payload.new.id ? payload.new : o)));
          } else if (payload.eventType === 'DELETE') {
            setOrders((prev) => prev.filter((o) => o.id === payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // P0: Queue position must be calculated from database reality:
  // payment_confirmed_at ASC, created_at ASC tie-breaker
  // Never calculate queue number from filtered array index!
  const queuePositions = useMemo(() => {
    const posMap: Record<string, number> = {};

    // Group active queue items by order_type
    const queuedGames = orders
      .filter((o) => (o.order_type !== 'DIGITAL_PRODUCT') && ['QUEUED', 'PAID', 'PROCESSING'].includes(o.status))
      .sort((a, b) => {
        const timeA = new Date(a.payment_confirmed_at || a.created_at).getTime();
        const timeB = new Date(b.payment_confirmed_at || b.created_at).getTime();
        if (timeA !== timeB) return timeA - timeB;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });

    queuedGames.forEach((o, index) => {
      posMap[o.id] = index + 1;
    });

    const queuedDigitals = orders
      .filter((o) => (o.order_type === 'DIGITAL_PRODUCT') && ['QUEUED', 'PAID', 'PROCESSING'].includes(o.status))
      .sort((a, b) => {
        const timeA = new Date(a.payment_confirmed_at || a.created_at).getTime();
        const timeB = new Date(b.payment_confirmed_at || b.created_at).getTime();
        if (timeA !== timeB) return timeA - timeB;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });

    queuedDigitals.forEach((o, index) => {
      posMap[o.id] = index + 1;
    });

    return posMap;
  }, [orders]);

  // Filter orders by mainTypeTab and activeSubTab and search
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const isDigital = order.order_type === 'DIGITAL_PRODUCT' || !!order.digital_package_id;
      if (mainTypeTab === 'DIGITAL_PRODUCT' && !isDigital) return false;
      if (mainTypeTab === 'GAME_TOPUP' && isDigital) return false;

      // Filter by subTab
      const st = (order.status || '').toUpperCase();
      if (activeSubTab === 'pending' && !['PENDING_PAYMENT', 'PENDING'].includes(st)) return false;
      if (activeSubTab === 'queued' && !['QUEUED', 'PAID'].includes(st)) return false;
      if (activeSubTab === 'processing' && st !== 'PROCESSING') return false;
      if (activeSubTab === 'completed' && !['SUCCESS', 'COMPLETED'].includes(st)) return false;
      if (activeSubTab === 'issues' && !['FAILED', 'PROVIDER_ERROR', 'UNKNOWN', 'CANCELLED', 'REFUNDED'].includes(st)) return false;

      // Filter by search query (Search does NOT affect queue position!)
      if (search.trim()) {
        const q = search.toLowerCase();
        const numMatch = order.order_number?.toLowerCase().includes(q);
        const nameMatch = (order.player_data?.product_name || '').toLowerCase().includes(q);
        const userMatch = (profilesMap[order.user_id]?.email || '').toLowerCase().includes(q);
        return numMatch || nameMatch || userMatch;
      }

      return true;
    });
  }, [orders, mainTypeTab, activeSubTab, search, profilesMap]);

  // Handle provider fulfillment trigger for Digital Product
  const handleFulfillDigital = async (orderId: string) => {
    setFulfillLoadingId(orderId);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/fulfill`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.message || data.error || 'เกิดข้อผิดพลาดในการจัดส่งสินค้า');
      } else {
        alert('จัดส่งสินค้าสำเร็จเรียบร้อยแล้ว!');
      }
    } catch (err: any) {
      alert(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setFulfillLoadingId(null);
    }
  };

  // Handle Game Manual Complete
  const handleCompleteManualGame = async (order: any) => {
    setCompletingId(order.id);
    try {
      const res = await fetch('/api/admin/orders/complete-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: order.id }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.message || 'ไม่สามารถยืนยันการเติมได้');
      } else {
        alert('ยืนยันการเติมเกมสำเร็จแล้ว');
      }
    } catch (err: any) {
      alert(err.message || 'เกิดข้อผิดพลาด');
    } finally {
      setCompletingId(null);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Level Category Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-sky-100 pb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setMainTypeTab('GAME_TOPUP'); setActiveSubTab('queued'); }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold transition shadow-xs ${
              mainTypeTab === 'GAME_TOPUP'
                ? 'bg-sky-500 text-white shadow-sky-200'
                : 'bg-white text-slate-600 hover:bg-sky-50 border border-sky-100'
            }`}
          >
            <Gamepad2 className="w-4 h-4" />
            <span>🎮 เติมเกม</span>
          </button>
          <button
            onClick={() => { setMainTypeTab('DIGITAL_PRODUCT'); setActiveSubTab('queued'); }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold transition shadow-xs ${
              mainTypeTab === 'DIGITAL_PRODUCT'
                ? 'bg-sky-500 text-white shadow-sky-200'
                : 'bg-white text-slate-600 hover:bg-sky-50 border border-sky-100'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>📱 แอป / สินค้าดิจิทัล</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหา Order No. / ชื่อสินค้า..."
            className="w-full pl-9 pr-4 py-2 bg-white rounded-xl border border-sky-100 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-400 shadow-xs"
          />
        </div>
      </div>

      {/* Sub-tabs for Status */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-100">
        {[
          { key: 'queued', label: mainTypeTab === 'GAME_TOPUP' ? 'รอคิวเติม' : 'รอจัดส่ง', icon: Clock },
          { key: 'processing', label: mainTypeTab === 'GAME_TOPUP' ? 'กำลังเติม' : 'กำลังจัดส่ง', icon: PlayCircle },
          { key: 'pending', label: 'รอชำระเงิน', icon: FileCheck },
          { key: 'completed', label: 'สำเร็จ', icon: CheckCircle2 },
          { key: 'issues', label: 'มีปัญหา / ขัดข้อง', icon: AlertTriangle },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveSubTab(tab.key as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                isActive
                  ? 'bg-slate-800 text-white'
                  : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Orders List */}
      <div className="space-y-3">
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-sky-100 p-12 text-center text-slate-400 text-sm">
            ไม่มีคำสั่งซื้อในสถานะนี้
          </div>
        ) : (
          filteredOrders.map((order) => {
            const queueNum = queuePositions[order.id];
            const isDigital = order.order_type === 'DIGITAL_PRODUCT' || !!order.digital_package_id;
            const pd = order.player_data || {};

            return (
              <div
                key={order.id}
                className="bg-white rounded-2xl border border-sky-100 p-5 shadow-xs hover:border-sky-200 transition space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-slate-800 text-sm">{order.order_number}</span>
                    {queueNum !== undefined && (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-100 text-sky-700">
                        คิวที่ #{queueNum}
                      </span>
                    )}
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      order.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-700' :
                      order.status === 'PROCESSING' ? 'bg-amber-100 text-amber-700' :
                      order.status === 'PROVIDER_ERROR' ? 'bg-rose-100 text-rose-700' :
                      order.status === 'UNKNOWN' ? 'bg-purple-100 text-purple-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">
                    {new Date(order.created_at).toLocaleString('th-TH')}
                  </div>
                </div>

                {/* Details Tailored by Type */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-1">
                      {isDigital ? '📱 สินค้าดิจิทัล' : '🎮 เกม & แพ็กเกจ'}
                    </span>
                    <p className="font-bold text-slate-700">
                      {pd.product_name || gamesMap[order.game_id]?.name || 'สินค้าทั่วไป'}
                    </p>
                    <p className="text-slate-500">
                      {pd.package_name || productsMap[order.product_id]?.name || '-'}
                    </p>
                    {pd.quantity && (
                      <p className="text-slate-500">จำนวน: {pd.quantity} ชิ้น</p>
                    )}
                  </div>

                  <div>
                    <span className="text-slate-400 block mb-1">
                      {isDigital ? '👤 ข้อมูลลูกค้า / บัญชี' : '🕹️ ข้อมูลผู้เล่น (UID)'}
                    </span>
                    {isDigital ? (
                      <div className="space-y-1">
                        <p className="text-slate-700">ลูกค้า: {profilesMap[order.user_id]?.email || order.user_id || 'Guest'}</p>
                        {pd.customer_info?.contact && (
                          <p className="text-slate-500">ติดต่อ: {pd.customer_info.contact}</p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {pd.uid && <p className="font-mono text-slate-800">UID: {pd.uid}</p>}
                        {pd.server && <p className="text-slate-500">Server: {pd.server}</p>}
                      </div>
                    )}
                  </div>

                  <div>
                    <span className="text-slate-400 block mb-1">💳 ยอดชำระ & สถานะจัดส่ง</span>
                    <p className="font-bold text-sky-600 text-sm">฿{Number(order.total || order.amount || 0).toLocaleString()}</p>
                    {order.status === 'SUCCESS' && pd.delivered_info && (
                      <div className="mt-2 p-2 bg-emerald-50 rounded-lg border border-emerald-100 text-emerald-800 text-[11px]">
                        <strong>ข้อมูลจัดส่ง:</strong> {pd.delivered_info}
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-50">
                  {isDigital ? (
                    /* Digital Actions: NEVER allow Manual Complete! */
                    ['PAID', 'QUEUED', 'PROCESSING', 'PROVIDER_ERROR'].includes(order.status) && (
                      <button
                        onClick={() => handleFulfillDigital(order.id)}
                        disabled={fulfillLoadingId === order.id}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold bg-sky-500 text-white hover:bg-sky-600 disabled:opacity-50 transition shadow-xs"
                      >
                        {fulfillLoadingId === order.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Zap className="w-3.5 h-3.5" />
                        )}
                        <span>ส่ง Provider Fulfillment ทันที</span>
                      </button>
                    )
                  ) : (
                    /* Game Actions: Allow Start & Manual Complete */
                    <>
                      {order.status === 'PROCESSING' && (
                        <button
                          onClick={() => handleCompleteManualGame(order)}
                          disabled={completingId === order.id}
                          className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50 transition shadow-xs"
                        >
                          {completingId === order.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                          <span>ยืนยันการเติมสำเร็จ</span>
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
