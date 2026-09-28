import { CustomerLayout } from '@/components/layout/CustomerLayout';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/auth/get-user';
import { listOrdersForCurrentUser } from '@/lib/orders/queries';
import { orderStatusColor, orderStatusLabel } from '@/lib/orders/status';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'ประวัติออเดอร์' };
export const dynamic = 'force-dynamic';

export default async function AccountOrdersPage() {
  const profile = await getProfile();
  if (!profile) {
    redirect('/login?next=/account/orders');
  }

  const orders = await listOrdersForCurrentUser(50);
  const gameIds = [...new Set(orders.map((o) => o.game_id).filter(Boolean))];
  const productIds = [...new Set(orders.map((o) => o.product_id).filter(Boolean))];
  const names: Record<string, string> = {};

  try {
    const supabase = await createClient();
    if (gameIds.length) {
      const { data: games } = await supabase.from('games').select('id, name').in('id', gameIds);
      (games ?? []).forEach((g) => {
        names[`g:${g.id}`] = g.name;
      });
    }
    if (productIds.length) {
      const { data: products } = await supabase
        .from('products')
        .select('id, name')
        .in('id', productIds);
      (products ?? []).forEach((p) => {
        names[`p:${p.id}`] = p.name;
      });
    }
  } catch {
    // ignore
  }

  return (
    <CustomerLayout>
      <div className="mx-auto max-w-3xl px-4 py-12">
        <nav className="text-sm text-slate-400 mb-6">
          <Link href="/account" className="hover:text-red-400">
            บัญชีของฉัน
          </Link>
          <span className="mx-2">/</span>
          <span className="text-slate-600">ประวัติออเดอร์</span>
        </nav>

        <h1 className="text-2xl font-bold mb-2">ประวัติออเดอร์</h1>
        <p className="text-slate-500 text-sm mb-8">
          ออเดอร์ทั้งหมด · {orders.length} รายการ
        </p>

        {orders.length === 0 ? (
          <div className="rounded-2xl border border-sky-100 bg-white/95 shadow-sm shadow-sky-100/50/50 p-12 text-center text-slate-400">
            ยังไม่มีประวัติออเดอร์
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((o) => {
              const gName = names[`g:${o.game_id}`] ?? 'เกม';
              const pName = names[`p:${o.product_id}`] ?? 'แพ็กเกจ';
              const isWaitingPayment = o.status === 'pending' || o.status === 'PENDING_PAYMENT';
              const isProcessing = o.status === 'PAID' || o.status === 'PROCESSING';
              const isCompleted = o.status === 'SUCCESS' || o.status === 'completed';

              return (
                <Link
                  key={o.id}
                  href="/order-tracking"
                  className="block rounded-2xl border border-sky-100 bg-white/95 shadow-sm shadow-sky-100/50/80 hover:border-zinc-700 p-4 transition-all"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {isWaitingPayment && (
                          <span className="inline-flex items-center gap-1.5 text-xs text-amber-400 font-medium">
                            <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                            ต้องชำระเงิน
                          </span>
                        )}
                        {isProcessing && (
                          <span className="inline-flex items-center gap-1.5 text-xs text-blue-400 font-medium">
                            <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse" />
                            รอดำเนินการเติม
                          </span>
                        )}
                        {isCompleted && (
                          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400" />
                            เติมเสร็จแล้ว
                          </span>
                        )}
                        <span className="font-mono text-sm font-semibold text-white ml-2">
                          {o.order_number}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        {gName} · {pName}
                      </p>
                      <p suppressHydrationWarning className="text-[11px] text-slate-400">
                        {new Date(o.created_at).toLocaleString('th-TH')}
                      </p>
                    </div>

                    <div className="text-right space-y-1">
                      <p className="font-bold text-sm text-slate-800">฿{Number(o.total || 0).toLocaleString()}</p>
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold ${orderStatusColor(
                          o.status
                        )}`}
                      >
                        {orderStatusLabel(o.status)}
                      </span>
                    </div>
                  </div>

                  {/* Delivered Credentials / Goods Box for customer */}
                  {Boolean((o.player_data as any)?.delivered_info) && (
                    <div className="mt-3 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs space-y-1.5" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                          ✓ ข้อมูลบัญชี / รหัสสินค้าที่ได้รับ:
                        </span>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                          จัดส่งสำเร็จ
                        </span>
                      </div>
                      <div className="p-2.5 bg-white rounded-lg border border-emerald-200 font-mono text-emerald-950 font-semibold select-all break-all whitespace-pre-wrap">
                        {(o.player_data as any)?.delivered_info}
                      </div>
                      <p className="text-[10px] text-emerald-600">
                        กดคัดลอกหรือบันทึกข้อมูลเพื่อนำไปใช้งานได้ทันที
                      </p>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </CustomerLayout>
  );
}
