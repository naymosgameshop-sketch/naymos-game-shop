'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Search, Sparkles, Smartphone, Package, ShieldCheck, Zap, Ban } from 'lucide-react';
import type { DigitalProduct, DigitalProductCategory } from '@/types/digital-product';

interface DigitalProductCatalogProps {
  products: DigitalProduct[];
  categories: DigitalProductCategory[];
}

export function DigitalProductCatalog({ products, categories }: DigitalProductCatalogProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      const matchCategory =
        selectedCategory === 'all' || prod.category_id === selectedCategory;
      const matchSearch =
        searchQuery.trim() === '' ||
        prod.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (prod.short_description &&
          prod.short_description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCategory && matchSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Category Pills & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
              selectedCategory === 'all'
                ? 'bg-sky-500 text-white shadow-xs shadow-sky-500/20'
                : 'bg-white/80 hover:bg-white text-slate-600 border border-slate-200/60'
            }`}
          >
            ทั้งหมด
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? 'bg-sky-500 text-white shadow-xs shadow-sky-500/20'
                  : 'bg-white/80 hover:bg-white text-slate-600 border border-slate-200/60'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาแอพพรีเมียม หรือสินค้า..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/80 border border-slate-200/80 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-sky-500 focus:bg-white transition-all shadow-2xs"
          />
        </div>
      </div>

      {/* Product Grid */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white rounded-3xl border border-sky-100 p-12 text-center text-slate-400">
          <Package className="w-12 h-12 mx-auto mb-3 text-sky-300 stroke-1" />
          <p className="text-base font-semibold text-slate-600">ไม่พบสินค้าในหมวดหมู่นี้</p>
          <p className="text-xs text-slate-400 mt-1">ลองเปลี่ยนคำค้นหาหรือเลือกหมวดหมู่อื่นดูนะครับ</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
          {filteredProducts.map((prod) => {
            const hasPackages = prod.packages && prod.packages.length > 0;
            const allUnavailable = !hasPackages || prod.packages.every(
              (pkg: any) =>
                pkg.availability === 'out_of_stock' ||
                pkg.availability === 'provider_error' ||
                pkg.availability === 'unavailable' ||
                pkg.is_active === false ||
                (pkg.stock !== null && pkg.stock !== undefined && pkg.stock <= 0)
            );

            const statusLabel = allUnavailable ? 'สินค้าหมดชั่วคราว' : 'พร้อมจัดส่ง';

            return (
              <div
                key={prod.id}
                className={`group relative flex flex-col bg-white rounded-2xl border transition-all duration-300 overflow-hidden shadow-2xs ${
                  allUnavailable
                    ? 'border-slate-200 shadow-none'
                    : 'border-sky-100/90 hover:border-sky-300 hover:shadow-lg hover:shadow-sky-500/10 hover:-translate-y-0.5'
                }`}
              >
                {/* Header Image / Icon Area */}
                <div className="relative aspect-video w-full bg-gradient-to-br from-sky-50 to-blue-50 border-b border-sky-50 flex items-center justify-center overflow-hidden">
                  {prod.image_url ? (
                    <Image
                      src={prod.image_url}
                      alt={prod.name}
                      fill
                      unoptimized
                      className={`object-cover transition-transform duration-500 ${
                        allUnavailable ? 'grayscale contrast-75 brightness-90' : 'group-hover:scale-105'
                      }`}
                    />
                  ) : (
                    <div className="p-4 rounded-2xl bg-white shadow-xs border border-sky-100">
                      <Smartphone className={`w-8 h-8 ${allUnavailable ? 'text-slate-400 grayscale' : 'text-sky-500'}`} />
                    </div>
                  )}

                  {/* Badge */}
                  {prod.badge && !allUnavailable && (
                    <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-lg bg-sky-500 text-white text-[10px] font-bold shadow-xs flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5" />
                      {prod.badge}
                    </span>
                  )}

                  {/* Out of stock grayscale overlay */}
                  {allUnavailable && (
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px] flex flex-col items-center justify-center p-2 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-600/95 text-white text-[10px] sm:text-xs font-bold shadow-md">
                        <Ban className="w-3.5 h-3.5" />
                        {statusLabel}
                      </span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className={`font-bold text-sm sm:text-base line-clamp-1 transition-colors ${
                      allUnavailable ? 'text-slate-500' : 'text-slate-800 group-hover:text-sky-600'
                    }`}>
                      {prod.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {prod.short_description || 'บริการแอพแท้ ถูกลิขสิทธิ์ รับประกันตลอดการใช้งาน'}
                    </p>

                    {/* Packages Preview */}
                    <div className="mt-3 flex flex-wrap gap-1">
                      {prod.packages.slice(0, 2).map((pkg) => (
                        <span
                          key={pkg.id}
                          className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200/60 text-slate-600"
                        >
                          {pkg.name}
                        </span>
                      ))}
                      {prod.packages.length > 2 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-sky-50 text-sky-600">
                          +{prod.packages.length - 2}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Price & Action Footer */}
                <div className="p-3.5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">เริ่มต้นเพียง</span>
                    <span className={`text-sm sm:text-base font-extrabold ${
                      allUnavailable ? 'text-slate-500' : 'text-sky-600'
                    }`}>
                      ฿{prod.minPrice.toLocaleString()}
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={allUnavailable}
                    onClick={() => {
                      if (!allUnavailable) {
                        alert(`คุณเลือก: ${prod.name}\nระบบกำลังจัดเตรียมหน้าสั่งซื้อสำหรับสินค้านี้`);
                      }
                    }}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 ${
                      allUnavailable
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        : 'bg-sky-600 hover:bg-sky-700 text-white'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>{allUnavailable ? 'สินค้าหมด' : 'สั่งซื้อ'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
