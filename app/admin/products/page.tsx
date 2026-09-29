import type { Metadata } from 'next';
import Link from 'next/link';
import { listProductsAdmin } from '@/lib/admin/products';
import { getAllGamesAdmin } from '@/lib/games/queries';
import { getDigitalProductsAdmin } from '@/lib/digital-products/queries';
import { ProductRowActions } from '@/components/admin/ProductRowActions';
import { ProductCreateForm } from '@/components/admin/ProductCreateForm';
import { Gamepad2, Smartphone, Package, ExternalLink, Plus } from 'lucide-react';

export const metadata: Metadata = { title: 'สินค้า & แพ็กเกจ' };
export const dynamic = 'force-dynamic';

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const currentTab = resolvedSearchParams.tab === 'digital' ? 'digital' : 'game';

  const [gameProducts, games, digitalProducts] = await Promise.all([
    listProductsAdmin(),
    getAllGamesAdmin(),
    getDigitalProductsAdmin().catch(() => []),
  ]);

  const byGame = new Map<string, typeof gameProducts>();
  for (const p of gameProducts) {
    const key = p.game_name ?? 'ไม่ระบุเกม';
    const list = byGame.get(key) ?? [];
    list.push(p);
    byGame.set(key, list);
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">สินค้า & แพ็กเกจ (Product & Package Manager)</h1>
          <p className="text-sm text-slate-400">
            แยกการจัดการแพ็กเกจเติมเกม และแอปพรีเมียม / สินค้าดิจิทัล พร้อมควบคุมสถานะเปิดขายและตรวจสอบความพร้อม
          </p>
        </div>

        {currentTab === 'digital' && (
          <Link
            href="/admin/digital-products"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-sky-500 text-white hover:bg-sky-600 transition shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>จัดการสินค้าแม่ดิจิทัล</span>
          </Link>
        )}
      </div>

      {/* Top 2 Tabs */}
      <div className="flex items-center gap-2 border-b border-sky-100 pb-2">
        <Link
          href="/admin/products?tab=game"
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold transition shadow-xs ${
            currentTab === 'game'
              ? 'bg-sky-500 text-white shadow-sky-200'
              : 'bg-white text-slate-600 hover:bg-sky-50 border border-sky-100'
          }`}
        >
          <Gamepad2 className="w-4 h-4" />
          <span>🎮 เติมเกม ({gameProducts.length} แพ็ก)</span>
        </Link>

        <Link
          href="/admin/products?tab=digital"
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold transition shadow-xs ${
            currentTab === 'digital'
              ? 'bg-sky-500 text-white shadow-sky-200'
              : 'bg-white text-slate-600 hover:bg-sky-50 border border-sky-100'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          <span>📱 แอป / สินค้าดิจิทัล ({digitalProducts.length} รายการ)</span>
        </Link>
      </div>

      {currentTab === 'game' ? (
        <div className="space-y-8">
          <ProductCreateForm games={games.map((g: any) => ({ id: g.id, name: g.name }))} />

          {gameProducts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-sky-200 bg-white/80 p-10 text-center text-sm text-slate-400">
              ยังไม่มีแพ็กเกจเติมเกม
            </div>
          ) : (
            <div className="space-y-8">
              {[...byGame.entries()].map(([gameName, items]) => (
                <section key={gameName} className="bg-white rounded-3xl border border-sky-100 p-5 sm:p-6 shadow-xs">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                      <span className="inline-block h-2.5 w-2.5 rounded-full bg-sky-500" />
                      {gameName}
                      <span className="text-xs text-slate-400 font-normal">({items.length} แพ็ก)</span>
                    </h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-sky-50 text-slate-400">
                          <th className="py-2">ชื่อแพ็กเกจ</th>
                          <th className="py-2">ราคาขาย (NayMos)</th>
                          <th className="py-2">ราคาตัวแทน</th>
                          <th className="py-2">สถานะหน้าร้าน</th>
                          <th className="py-2 text-right">จัดการ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-sky-50">
                        {items.map((p: any) => (
                          <tr key={p.id}>
                            <td className="py-3 font-semibold text-slate-700">{p.name}</td>
                            <td className="py-3 font-bold text-sky-600">฿{Number(p.price).toLocaleString()}</td>
                            <td className="py-3 text-slate-500">
                              {p.reseller_price != null ? `฿${Number(p.reseller_price).toLocaleString()}` : '—'}
                            </td>
                            <td className="py-3">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                p.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                              }`}>
                                {p.is_active ? 'เปิดขาย' : 'ปิดขาย'}
                              </span>
                            </td>
                            <td className="py-3 text-right">
                              <ProductRowActions {...p} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Digital Products Tab */
        <div className="space-y-6">
          {digitalProducts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-sky-200 bg-white/80 p-10 text-center text-sm text-slate-400">
              ยังไม่มีข้อมูลสินค้าดิจิทัล
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {digitalProducts.map((dp: any) => (
                <div key={dp.id} className="bg-white rounded-3xl border border-sky-100 p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm">{dp.name}</h3>
                      <span className="text-[10px] text-sky-600 font-mono">/{dp.slug}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      dp.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'
                    }`}>
                      {dp.is_active ? 'เปิดขาย' : 'ปิดขาย'}
                    </span>
                  </div>

                  {dp.packages && dp.packages.length > 0 ? (
                    <div className="space-y-2 pt-2 border-t border-slate-50 text-xs">
                      {dp.packages.map((pkg: any) => (
                        <div key={pkg.id} className="flex items-center justify-between py-1 bg-slate-50 px-2.5 rounded-lg">
                          <span className="text-slate-700 font-medium truncate max-w-[150px]">{pkg.name}</span>
                          <span className="font-bold text-sky-600">฿{Number(pkg.price).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">ยังไม่มีแพ็กเกจย่อย</p>
                  )}

                  <div className="pt-2 flex justify-end">
                    <Link
                      href={`/admin/digital-products`}
                      className="text-xs text-sky-600 hover:text-sky-700 font-bold flex items-center gap-1"
                    >
                      <span>จัดการแพ็กเกจย่อย</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
