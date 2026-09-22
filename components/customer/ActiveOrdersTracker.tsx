'use client';

export type ActiveOrder = {
  id: string;
  order_number: string;
  status: string;
  total?: number;
  amount?: number;
  created_at: string;
  payment_confirmed_at?: string | null;
  game_id?: string;
  product_id?: string;
  player_data?: Record<string, any>;
};



import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Clock,
  PlayCircle,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ChevronRight,
  ListOrdered,
  Sparkles,
  CreditCard,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export function ActiveOrdersTracker({
  initialOrders = [],
  userId,
}: {
  initialOrders?: any[];
  userId?: string;
}) {
  const [orders, setOrders] = useState<any[]>(initialOrders);
  const [allQueuedOrders, setAllQueuedOrders] = useState<{ id: string; payment_confirmed_at: string }[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Fetch all currently queued orders to calculate dynamic queue positions
  useEffect(() => {
    const supabase = createClient();

    async function loadQueuedOrders() {
      const { data } = await supabase
        .from('orders')
        .select('id, payment_confirmed_at, created_at')
        .in('status', ['QUEUED', 'PAID'])
        .order('payment_confirmed_at', { ascending: true, nullsFirst: false });

      if (data) {
        setAllQueuedOrders(data as any);
      }
    }

    loadQueuedOrders();

    // Subscribe to realtime changes on orders table
    const channel = supabase
      .channel('customer-orders-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            if (userId && payload.new.user_id === userId) {
              setOrders((prev) => [payload.new, ...prev]);
            }
          } else if (payload.eventType === 'UPDATE') {
            setOrders((prev) =>
              prev.map((o) => (o.id === payload.new.id ? { ...o, ...payload.new } : o))
            );
          } else if (payload.eventType === 'DELETE') {
            setOrders((prev) => prev.filter((o) => o.id === payload.old.id));
          }
          // Refresh queued list on any order state change
          loadQueuedOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  function copyText(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  // Calculate dynamic queue position for an order (1-indexed)
  function getQueuePosition(order: any): number {
    const sorted = [...allQueuedOrders].sort((a, b) => {
      const tA = new Date(a.payment_confirmed_at || 0).getTime();
      const tB = new Date(b.payment_confirmed_at || 0).getTime();
      return tA - tB;
    });
    const idx = sorted.findIndex((o) => o.id === order.id);
    return idx >= 0 ? idx + 1 : 1;
  }

  if (orders.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-sky-950 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-sky-500" />
          ออเดอร์ของฉัน (ติดตามสถานะ Realtime)
        </h3>
        <Link href="/order-tracking" className="text-xs text-sky-600 hover:text-sky-800 font-medium flex items-center gap-0.5">
          ดูทั้งหมด <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {orders.map((o) => {
          const isPending = o.status === 'pending' || o.status === 'PENDING_PAYMENT';
          const isQueued = o.status === 'QUEUED' || (o.status === 'PAID' && !o.processing_started_at);
          const isProcessing = o.status === 'PROCESSING' || o.status === 'processing';
          const isCompleted = o.status === 'SUCCESS' || o.status === 'completed';

          const queuePos = isQueued ? getQueuePosition(o) : null;
          const pd = (o.player_data as Record<string, any>) || {};
          const uid = pd.uid || pd.player_id || pd.id || Object.values(pd)[0] || '';

          return (
            <div
              key={o.id}
              className={`rounded-2xl p-4 border bg-white shadow-xs transition space-y-3 ${
                isProcessing
                  ? 'border-blue-300 ring-2 ring-blue-100 bg-blue-50/20'
                  : isQueued
                  ? 'border-sky-300 bg-sky-50/20'
                  : isCompleted
                  ? 'border-emerald-200'
                  : 'border-amber-200'
              }`}
            >
              {/* Top: Order number & copy */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-xs font-bold text-slate-800">{o.order_number}</span>
                  <button
                    type="button"
                    onClick={() => copyText(o.order_number, o.id)}
                    className="p-1 rounded text-slate-400 hover:text-sky-600"
                    title="คัดลอกหมายเลขออเดอร์"
                  >
                    {copiedId === o.id ? (
                      <Check className="w-3 h-3 text-emerald-500" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>

                <span className="font-mono font-bold text-xs text-sky-700">
                  ฿{Number(o.total || o.amount).toLocaleString()}
                </span>
              </div>

              {/* Status Banner with Deterministic Pure CSS animations */}
              <div className="rounded-xl p-3 border">
                {isPending && (
                  <div className="flex items-center justify-between text-amber-700 bg-amber-50/80 -m-3 p-3 rounded-xl border border-amber-200">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 shrink-0" />
                      <div className="text-xs">
                        <span className="font-bold block">รอชำระเงิน</span>
                        <span className="text-[11px] text-amber-600">กรุณาชำระเงินและอัปโหลดสลิปเพื่อเข้าคิว</span>
                      </div>
                    </div>
                    <Link
                      href={`/pay/${o.order_number}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition shadow-2xs shrink-0 ml-2"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      ชำระเงิน
                    </Link>
                  </div>
                )}

                {isQueued && (
                  <div className="flex items-center justify-between text-sky-800 bg-sky-50/90 -m-3 p-3 rounded-xl border border-sky-200">
                    <div className="flex items-center gap-2.5">
                      <ListOrdered className="w-4 h-4 text-sky-600 shrink-0" />
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-sky-950">
                          <span>รอคิวการเติม</span>
                          {/* Lightweight 3 dots bounce animation */}
                          <span className="inline-flex items-center gap-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-bounce" />
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-bounce [animation-delay:0.2s]" />
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-bounce [animation-delay:0.4s]" />
                          </span>
                        </div>
                        <span className="text-[11px] text-sky-700 font-semibold block mt-0.5">
                          ขณะนี้คุณอยู่คิวที่ <span className="font-bold text-sky-950 text-xs">{queuePos}</span>
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-sky-200 text-sky-700">
                      คิว {queuePos}
                    </span>
                  </div>
                )}

                {isProcessing && (
                  <div className="flex items-center gap-2.5 text-blue-800 bg-blue-50/90 -m-3 p-3 rounded-xl border border-blue-200">
                    <PlayCircle className="w-4 h-4 text-blue-600 shrink-0 animate-spin" />
                    <div className="text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-blue-950">
                        <span>แอดมินกำลังดำเนินการเติม</span>
                        <span className="inline-flex items-center gap-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" />
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:0.2s]" />
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:0.4s]" />
                        </span>
                      </div>
                      <span className="text-[11px] text-blue-700">กำลังเติมไอเทมเข้าบัญชีเกมของคุณ โปรดรอสักครู่ครับ</span>
                    </div>
                  </div>
                )}

                {isCompleted && (
                  <div className="flex items-center gap-2 text-emerald-800 bg-emerald-50/90 -m-3 p-3 rounded-xl border border-emerald-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div className="text-xs">
                      <span className="font-bold block text-emerald-950">เติมสำเร็จเรียบร้อย</span>
                      <span className="text-[11px] text-emerald-700">ไอเทมเข้าไอดีเรียบร้อยแล้ว ขอบคุณที่ใช้บริการครับ</span>
                    </div>
                  </div>
                )}
              </div>

              {/* UID Info */}
              {uid && (
                <div className="flex items-center justify-between text-xs text-slate-600 pt-1 border-t border-slate-100">
                  <span className="text-[11px] text-slate-400">UID ผู้เล่น:</span>
                  <span className="font-mono font-medium text-slate-800">{String(uid)}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}