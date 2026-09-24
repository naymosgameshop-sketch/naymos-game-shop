import type { Metadata } from 'next';
import { listProductsAdmin } from '@/lib/admin/products';
import { getAllGamesAdmin } from '@/lib/games/queries';
import { ProductRowActions } from '@/components/admin/ProductRowActions';
import { ProductCreateForm } from '@/components/admin/ProductCreateForm';

export const metadata: Metadata = { title: 'จัดการแพ็กเกจ' };
export const dynamic = 'force-dynamic';

export default async function AdminProductsPage() {
  const [products, games] = await Promise.all([
    listProductsAdmin(),
    getAllGamesAdmin(),
  ]);

  const byGame = new Map<string, typeof products>();
  for (const p of products) {
    const key = p.game_name ?? 'ไม่ระบุเกม';
    const list = byGame.get(key) ?? [];
    list.push(p);
    byGame.set(key, list);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Package Manager (จัดการแพ็กเกจ)</h1>
        <p className="text-sm text-slate-400">
          แสดงข้อมูล Provider, ต้นทุน, ราคาขาย NayMos, สต็อก และสถานะเปิดขาย · ทั้งหมด {products.length} แพ็ก
        </p>
      </div>

      <ProductCreateForm
        games={games.map((g) => ({ id: g.id, name: g.name }))}
      />

      {products.length === 0 ? (
        <div className="rounded-xl border border-dashed border-sky-200 bg-white/80 p-10 text-center text-sm text-slate-400">
          ยังไม่มีแพ็กเกจ — เพิ่มด้านบน หรือรัน 003_games_seed.sql
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

              <div className="rounded-2xl border border-sky-100 overflow-x-auto">
                <table className="w-full text-sm min-w-[950px] table-fixed">
                  <thead className="bg-sky-50/50 text-slate-600 text-xs font-semibold text-left">
                    <tr>
                      <th className="w-[20%] px-4 py-3">ชื่อแพ็ก</th>
                      <th className="w-[15%] px-4 py-3">Provider / External ID</th>
                      <th className="w-[10%] px-4 py-3 text-center">Stock</th>
                      <th className="w-[12%] px-4 py-3 text-center">Provider Status</th>
                      <th className="w-[10%] px-4 py-3 text-center">Store Status</th>
                      <th className="w-[33%] px-4 py-3">ต้นทุน / ราคาขาย / ราคาส่ง / จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sky-50">
                    {items.map((p) => {
                      const provStatus = p.availability || 'available';
                      const stockVal = p.stock;

                      return (
                        <tr key={p.id} className="hover:bg-sky-50/20 transition">
                          {/* Package Name */}
                          <td className="px-4 py-3 text-slate-800 font-semibold truncate" title={p.name}>
                            <div className="truncate">{p.name}</div>
                          </td>

                          {/* Provider & External ID */}
                          <td className="px-4 py-3 text-xs">
                            <div className="font-semibold text-slate-700">{p.provider_code || 'Direct'}</div>
                            <div className="text-[11px] font-mono text-slate-400 truncate">
                              ID: {p.external_product_code || '—'}
                            </div>
                          </td>

                          {/* Stock */}
                          <td className="px-4 py-3 text-center text-xs font-semibold">
                            {stockVal !== null && stockVal !== undefined ? (
                              <span className={stockVal > 0 ? 'text-slate-700' : 'text-rose-600 font-bold'}>
                                {stockVal}
                              </span>
                            ) : (
                              <span className="text-slate-400">∞</span>
                            )}
                          </td>

                          {/* Provider Status */}
                          <td className="px-4 py-3 text-center text-xs">
                            {provStatus === 'available' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                🟢 Available
                              </span>
                            )}
                            {provStatus === 'out_of_stock' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                🔴 Out of Stock
                              </span>
                            )}
                            {provStatus === 'provider_error' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold bg-rose-50 text-rose-700 border border-rose-200" title={p.provider_status_reason || ''}>
                                🔴 Provider Error
                              </span>
                            )}
                            {provStatus === 'unavailable' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                ⚪ Unavailable
                              </span>
                            )}
                            {provStatus === 'unknown' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-500 border border-slate-200">
                                🟡 Unknown
                              </span>
                            )}
                          </td>

                          {/* Store Status */}
                          <td className="px-4 py-3 text-center text-xs">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full font-bold ${
                                p.is_active
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-slate-100 text-slate-500 border border-slate-200'
                              }`}
                            >
                              {p.is_active ? '🟢 เปิดขาย' : '⚪ ปิดแพ็ก'}
                            </span>
                          </td>

                          {/* Actions: Price, Cost, Toggle, Delete */}
                          <td className="px-4 py-3">
                            <ProductRowActions
                              id={p.id}
                              name={p.name}
                              price={p.price}
                              cost={p.cost}
                              reseller_price={p.reseller_price}
                              is_active={p.is_active}
                              availability={p.availability}
                              stock={p.stock}
                              provider_code={p.provider_code}
                              external_product_code={p.external_product_code}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
