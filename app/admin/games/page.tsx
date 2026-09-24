import type { Metadata } from 'next';
import Link from 'next/link';
import { getAllGamesAdmin, getAllProductCategoriesAdmin } from '@/lib/games/queries';
import { createClient } from '@/lib/supabase/server';
import { GameRowActions } from '@/components/admin/GameRowActions';
import { GameCreateForm } from '@/components/admin/GameCreateForm';

export const metadata: Metadata = { title: 'จัดการเกมและสินค้า' };
export const dynamic = 'force-dynamic';

export default async function AdminGamesPage() {
  const [games, categories] = await Promise.all([
    getAllGamesAdmin(),
    getAllProductCategoriesAdmin(),
  ]);

  const counts: Record<string, number> = {};
  try {
    const supabase = await createClient();
    const { data } = await supabase.from('products').select('game_id');
    (data ?? []).forEach((p) => {
      counts[p.game_id] = (counts[p.game_id] ?? 0) + 1;
    });
  } catch {
    // ignore
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Games & Products</h1>
        <p className="text-sm text-slate-400">
          รายการเกมและสินค้าที่เปิดให้บริการ · {games.length} รายการ (แยกสถานะ Provider และการแสดงผลบนหน้าเว็บ)
        </p>
      </div>

      <GameCreateForm categories={categories} />

      <div className="rounded-3xl border border-sky-100 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-sky-50/50 text-xs font-semibold text-slate-600 border-b border-sky-100">
              <tr>
                <th className="px-5 py-3.5">เกม / สินค้า</th>
                <th className="px-5 py-3.5">หมวดหมู่</th>
                <th className="px-5 py-3.5">แพ็กเกจ</th>
                <th className="px-5 py-3.5 text-center">สถานะ Provider</th>
                <th className="px-5 py-3.5 text-center">สถานะหน้าร้าน</th>
                <th className="px-5 py-3.5 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sky-50">
              {games.map((g) => {
                const provStatus = g.provider_availability || 'available';
                return (
                  <tr key={g.id} className="hover:bg-sky-50/30 transition">
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-800">{g.name}</div>
                      <div className="text-xs font-mono text-slate-400">{g.slug}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-600 border border-sky-100">
                        {g.product_category?.name || 'ทั่วไป'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/admin/products?game_id=${g.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 hover:underline"
                      >
                        {counts[g.id] ?? 0} แพ็กเกจ
                      </Link>
                    </td>
                    {/* Provider Availability Badge */}
                    <td className="px-5 py-3.5 text-center">
                      {provStatus === 'available' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          🟢 พร้อม
                        </span>
                      )}
                      {provStatus === 'out_of_stock' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          🔴 หมด
                        </span>
                      )}
                      {provStatus === 'provider_error' && (
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 cursor-help"
                          title={g.provider_error_message || 'API Provider เกิดข้อผิดพลาด'}
                        >
                          🔴 Provider Error
                        </span>
                      )}
                      {provStatus === 'unavailable' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          🟡 ปิดบริการ
                        </span>
                      )}
                      {provStatus === 'unknown' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-500 border border-slate-200">
                          🟡 รอตรวจ
                        </span>
                      )}
                    </td>
                    {/* Storefront Visibility Badge */}
                    <td className="px-5 py-3.5 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          g.is_active
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}
                      >
                        {g.is_active ? '🟢 แสดงอยู่' : '⚪ ซ่อนอยู่'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <GameRowActions
                        id={g.id}
                        name={g.name}
                        icon={g.icon}
                        is_active={g.is_active}
                        provider_availability={g.provider_availability}
                        provider_error_message={g.provider_error_message}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
