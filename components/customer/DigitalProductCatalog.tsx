'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, Sparkles, Smartphone, Package, ShieldCheck, Zap } from 'lucide-react';
import type { DigitalProduct, DigitalProductCategory } from '@/types/digital-product';

interface DigitalProductCatalogProps {
  products: DigitalProduct[];
  categories: DigitalProductCategory[];
}

export function DigitalProductCatalog({ products, categories }: DigitalProductCatalogProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat =
        selectedCategory === 'all' ||
        p.category_id === selectedCategory ||
        p.category_type.toLowerCase() === selectedCategory.toLowerCase();
      const matchSearch =
        !searchQuery.trim() ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCat && matchSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-700 p-6 sm:p-10 text-white shadow-xl shadow-sky-500/10">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold text-sky-100 mb-3 border border-white/20">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Digital Products & Premium Services</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            รายการสินค้า & แอปพรีเมียม
          </h1>
          <p className="mt-2 text-sm sm:text-base text-sky-100/90 leading-relaxed">
            บริการแอปพรีเมียมและสินค้าดิจิทัลแท้ 100% สั่งซื้อง่าย รับสิทธิ์รวดเร็ว ปลอดภัยตลอด 24 ชั่วโมง
          </p>
        </div>
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
              selectedCategory === 'all'
                ? 'bg-sky-500 text-white shadow-sm ring-2 ring-sky-300/40'
                : 'bg-white text-slate-600 border border-sky-100 hover:bg-sky-50 hover:text-sky-600'
            }`}
          >
            ทั้งหมด
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? 'bg-sky-500 text-white shadow-sm ring-2 ring-sky-300/40'
                  : 'bg-white text-slate-600 border border-sky-100 hover:bg-sky-50 hover:text-sky-600'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px] sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ค้นหาสินค้า เช่น YouTube, Spotify..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-full border border-sky-100 bg-white text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-sky-400/30 focus:border-sky-500 shadow-2xs"
          />
        </div>
      </div>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <div className="rounded-3xl border border-sky-100 bg-white p-12 text-center shadow-xs">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-700 text-base">ไม่พบสินค้าในหมวดนี้</h3>
          <p className="text-xs text-slate-400 mt-1">ลองเปลี่ยนคำค้นหาหรือเลือกหมวดหมู่อื่น</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {filteredProducts.map((prod) => (
            <div
              key={prod.id}
              className="group bg-white rounded-2xl border border-sky-100/80 hover:border-sky-300 hover:shadow-lg transition-all duration-200 overflow-hidden flex flex-col justify-between"
            >
              <div className="p-5">
                <div className="flex items-start gap-3.5">
                  <div className="w-14 h-14 rounded-2xl overflow-hidden bg-sky-50 border border-sky-100 shrink-0 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                    {prod.icon ? (
                      <img src={prod.icon} alt={prod.name} className="w-full h-full object-cover" />
                    ) : (
                      <Smartphone className="w-6 h-6 text-sky-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="inline-block px-2 py-0.5 rounded-md bg-sky-50 text-[10px] font-bold text-sky-700 border border-sky-100 mb-1">
                      {prod.category_type === 'PREMIUM_APP' ? 'แอปพรีเมียม' : 'ดิจิทัล'}
                    </span>
                    <h3 className="font-bold text-slate-800 text-sm sm:text-base truncate group-hover:text-sky-600 transition-colors">
                      {prod.name}
                    </h3>
                  </div>
                </div>

                <p className="mt-3 text-xs text-slate-500 line-clamp-2 leading-relaxed min-h-[32px]">
                  {prod.description || 'บริการดิจิทัลคุณภาพ รวดเร็ว ปลอดภัย'}
                </p>

                {/* Packages Pill Preview */}
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {prod.packages.slice(0, 2).map((pkg) => (
                    <span
                      key={pkg.id}
                      className="text-[11px] font-medium px-2 py-0.5 rounded-lg bg-slate-50 border border-slate-100 text-slate-600"
                    >
                      {pkg.name}
                    </span>
                  ))}
                  {prod.packages.length > 2 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-lg bg-sky-50 text-sky-600">
                      +{prod.packages.length - 2}
                    </span>
                  )}
                </div>
              </div>

              {/* Price & Action Footer */}
              <div className="p-4 bg-sky-50/40 border-t border-sky-100/60 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">เริ่มต้นเพียง</span>
                  <span className="text-base sm:text-lg font-black text-sky-600">
                    ฿{prod.minPrice.toLocaleString()}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => alert(`คุณเลือก: ${prod.name}\nระบบกำลังจัดเตรียมหน้าสั่งซื้อสำหรับสินค้านี้`)}
                  className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold shadow-xs transition flex items-center gap-1.5"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>สั่งซื้อ</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
