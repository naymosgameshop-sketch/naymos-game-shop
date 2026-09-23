import type { Metadata } from 'next';
import Link from 'next/link';
import { Layers, Gamepad2, Smartphone, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { CustomerLayout } from '@/components/customer/CustomerLayout';
import { getDigitalProductCategories } from '@/lib/digital-products/queries';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'หมวดหมู่สินค้าทั้งหมด | NayMos GameShop',
  description: 'เลือกชมหมวดหมู่บริการเติมเกมออนไลน์ และแอปพรีเมียมราคาพิเศษ',
};

export const dynamic = 'force-dynamic';

export default async function CategoriesPage() {
  let gameCategories: any[] = [];
  let digitalCategories: any[] = [];

  try {
    const supabase = await createClient();
    const { data: gCats } = await supabase
      .from('product_categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    gameCategories = gCats || [];
  } catch (e) {
    console.error('Failed to load game categories:', e);
  }

  try {
    digitalCategories = await getDigitalProductCategories();
  } catch (e) {
    console.error('Failed to load digital categories:', e);
  }

  return (
    <CustomerLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-sky-600 via-blue-600 to-indigo-700 p-8 text-white shadow-xl">
          <div className="relative z-10 max-w-2xl space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/20 backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5" /> รวมหมวดหมู่บริการทั้งหมด
            </span>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight">
              เลือกดูสินค้าตามหมวดหมู่
            </h1>
            <p className="text-sm sm:text-base text-sky-100 font-medium">
              บริการเติมเกมมือถือ/พีซี และแอปพรีเมียมบันเทิงชั้นนำ จัดส่งรวดเร็ว ปลอดภัย 100%
            </p>
          </div>
        </div>

        {/* Section 1: Digital & Premium Apps Categories */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-400/30 flex items-center justify-center text-purple-600">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900">แอปพรีเมียม & บันเทิง (Digital Apps)</h2>
                <p className="text-xs text-slate-500">YouTube, Spotify, Netflix และไอเทมดิจิทัล</p>
              </div>
            </div>
            <Link
              href="/products"
              className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1"
            >
              ดูทั้งหมด <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {digitalCategories.map((cat) => (
              <Link
                key={cat.id}
                href={`/products?category=${cat.id}`}
                className="group bg-white border border-slate-200 hover:border-purple-400 p-5 rounded-2xl shadow-xs hover:shadow-lg transition-all duration-200 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-purple-50 text-purple-600 border border-purple-100">
                      หมวดดิจิทัล
                    </span>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 group-hover:translate-x-1 transition" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-purple-600 transition">
                    {cat.name}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-2">
                    {cat.description || 'บริการแอปพรีเมียมและสินค้าราคาประหยัด'}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Section 2: Game Topup Categories */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-400/30 flex items-center justify-center text-sky-600">
                <Gamepad2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900">หมวดหมู่เติมเกมออนไลน์ (Game Top-up)</h2>
                <p className="text-xs text-slate-500">เกมมือถือ, PC, Garena, Riot Games และอื่น ๆ</p>
              </div>
            </div>
            <Link
              href="/games"
              className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1"
            >
              ดูทั้งหมด <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {gameCategories.length === 0 ? (
              <div className="col-span-full py-8 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-slate-200">
                เข้าสู่หน้าบริการเติมเกมเพื่อเลือกดูเกมทั้งหมด
              </div>
            ) : (
              gameCategories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/games?category=${cat.id}`}
                  className="group bg-white border border-slate-200 hover:border-sky-400 p-5 rounded-2xl shadow-xs hover:shadow-lg transition-all duration-200 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-sky-50 text-sky-600 border border-sky-100">
                        เกมออนไลน์
                      </span>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-sky-600 group-hover:translate-x-1 transition" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-sky-600 transition">
                      {cat.name}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2">
                      {cat.description || 'บริการเติมเกมสะดวกรวดเร็ว ระบบอัตโนมัติ'}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
}
