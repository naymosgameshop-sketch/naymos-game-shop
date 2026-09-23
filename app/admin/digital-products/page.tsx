import type { Metadata } from 'next';
import { Smartphone, Plus, Layers, Zap, CheckCircle2, XCircle, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { getActiveDigitalProducts, getDigitalProductCategories } from '@/lib/digital-products/queries';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'จัดการแอปพรีเมียม & สินค้าดิจิทัล | Admin' };
export const dynamic = 'force-dynamic';

export default async function AdminDigitalProductsPage() {
  const [products, categories] = await Promise.all([
    getActiveDigitalProducts(),
    getDigitalProductCategories(),
  ]);

  // Also query providers for routing info
  let providers: any[] = [];
  try {
    const supabase = await createClient();
    const { data } = await supabase.from('providers').select('id, name, code, is_active');
    providers = data || [];
  } catch {
    // fallback
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-sky-100 shadow-2xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 text-sky-700 text-xs font-semibold mb-2 border border-sky-100">
            <Smartphone className="w-3.5 h-3.5 text-sky-500" />
            <span>Digital Products & Premium Apps Backoffice</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800">
            จัดการแอปพรีเมียม & สินค้าดิจิทัล
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            ควบคุมรายการสินค้า แพ็กเกจ ราคาตัวแทน และการเชื่อมต่อ Provider API
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/products"
            target="_blank"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-sky-200 bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-bold transition"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>ดูหน้าเว็บจริง</span>
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-sky-100 shadow-2xs">
          <div className="text-xs font-semibold text-slate-500">สินค้าดิจิทัลทั้งหมด</div>
          <div className="text-2xl font-black text-slate-800 mt-1">{products.length} รายการ</div>
          <div className="text-[11px] text-sky-600 mt-1 font-medium">พร้อมให้บริการบนหน้าเว็บ</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-sky-100 shadow-2xs">
          <div className="text-xs font-semibold text-slate-500">หมวดหมู่สินค้า</div>
          <div className="text-2xl font-black text-slate-800 mt-1">{categories.length} หมวด</div>
          <div className="text-[11px] text-slate-400 mt-1">แอปพรีเมียม, ดิจิทัล ฯลฯ</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-sky-100 shadow-2xs">
          <div className="text-xs font-semibold text-slate-500">ผู้ให้บริการ API ที่เชื่อมต่อ</div>
          <div className="text-2xl font-black text-emerald-600 mt-1">{providers.length} ราย</div>
          <div className="text-[11px] text-slate-400 mt-1">รองรับ Multi-provider Failover</div>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-sky-100 shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-sky-100 flex items-center justify-between">
          <h2 className="font-bold text-slate-800 text-sm sm:text-base">
            รายการสินค้าดิจิทัล ({products.length})
          </h2>
          <span className="text-xs text-slate-400">ระบบ API รองรับการส่งงานอัตโนมัติ</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-sky-50/50 text-slate-600 border-b border-sky-100 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">สินค้า</th>
                <th className="py-3 px-4">หมวดหมู่</th>
                <th className="py-3 px-4">จำนวนแพ็กเกจ</th>
                <th className="py-3 px-4">ราคาเริ่มต้น</th>
                <th className="py-3 px-4">สถานะ</th>
                <th className="py-3 px-4 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sky-50">
              {products.map((prod) => (
                <tr key={prod.id} className="hover:bg-sky-50/30 transition">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center overflow-hidden shrink-0">
                        {prod.icon ? (
                          <img src={prod.icon} alt={prod.name} className="w-full h-full object-cover" />
                        ) : (
                          <Smartphone className="w-5 h-5 text-sky-500" />
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-slate-800">{prod.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">/{prod.slug}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2.5 py-1 rounded-full bg-sky-100/70 text-sky-700 font-semibold text-[11px]">
                      {prod.category_type === 'PREMIUM_APP' ? 'แอปพรีเมียม' : 'สินค้าดิจิทัล'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {prod.packages.map((pkg) => (
                        <span key={pkg.id} className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-medium">
                          {pkg.name} (฿{pkg.price})
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-sky-600">
                    ฿{prod.minPrice.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      เปิดขาย
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <Link
                      href={`/admin/providers`}
                      className="px-3 py-1.5 rounded-lg border border-sky-200 bg-white hover:bg-sky-50 text-sky-600 font-bold text-[11px] transition shadow-2xs inline-flex items-center gap-1"
                    >
                      <Zap className="w-3 h-3 text-sky-500" />
                      <span>ตั้งค่า API Provider</span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
