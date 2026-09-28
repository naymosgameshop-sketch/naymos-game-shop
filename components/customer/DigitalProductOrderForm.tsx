'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  Sparkles, ShieldCheck, Zap, CheckCircle2, ArrowRight, Loader2, 
  AlertCircle, Info, ChevronRight, Minus, Plus, ShoppingCart, Check,
  Clock, Flame, HelpCircle
} from 'lucide-react';
import type { DigitalProduct, DigitalProductPackage } from '@/types/digital-product';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface DigitalProductOrderFormProps {
  product: DigitalProduct;
}

export function DigitalProductOrderForm({ product }: DigitalProductOrderFormProps) {
  const router = useRouter();
  const packages = useMemo(() => {
    return (product.packages || []).filter(p => p.is_active !== false);
  }, [product.packages]);

  const [selectedPkgId, setSelectedPkgId] = useState<string>(packages[0]?.id || '');
  const [quantity, setQuantity] = useState<number>(1);

  // Form Fields (Dynamic based on product configuration)
  const [contactEmail, setContactEmail] = useState('');
  const [contactPassword, setContactPassword] = useState('');
  const [contactNotes, setContactNotes] = useState('');

  // Mandatory Agreement Checkbox
  const [agreedTerms, setAgreedTerms] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedPkg = useMemo(() => {
    return packages.find(p => p.id === selectedPkgId) || packages[0];
  }, [packages, selectedPkgId]);

  const meta = (product as any)?.metadata || {};
  const askEmail = Boolean(meta.ask_email);
  const askPassword = Boolean(meta.ask_password);

  const unitPrice = Number(selectedPkg?.price || 0);
  const totalPrice = unitPrice * quantity;

  const handleQuantityChange = (delta: number) => {
    setQuantity(prev => Math.max(1, Math.min(99, prev + delta)));
  };

  const handleOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPkg) {
      setError('กรุณาเลือกแพ็กเกจที่ต้องการสั่งซื้อ');
      return;
    }
    if (!agreedTerms) {
      setError('กรุณากดยอมรับข้อตกลงการสั่งซื้อก่อนดำเนินการต่อ');
      return;
    }
    if (askEmail && !contactEmail.trim()) {
      setError('กรุณากรอกอีเมลสำหรับรับบริการ');
      return;
    }
    if (askPassword && !contactPassword.trim()) {
      setError('กรุณากรอกรหัสผ่านสำหรับรับบริการ');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/digital-products/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageId: selectedPkg.id,
          quantity,
          contactEmail: contactEmail.trim(),
          contactPhone: '',
          notes: contactNotes.trim(),
          customFields: {
            account_email: contactEmail.trim(),
            account_password: contactPassword.trim(),
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'ไม่สามารถสร้างคำสั่งซื้อได้ กรุณาลองใหม่อีกครั้ง');
      }

      const redirectUrl = data.order?.redirect_url || `/pay/${data.order?.order_number}`;
      router.push(redirectUrl);
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการสั่งซื้อ');
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <form onSubmit={handleOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Product Info & Package Selection */}
        <div className="lg:col-span-7 space-y-6">
          {/* Header Product Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-blue-100/80 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-blue-50/80 via-indigo-50/30 to-transparent rounded-full -mr-20 -mt-20 pointer-events-none" />

            <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-5">
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center p-2 text-white shadow-md shadow-blue-500/20 shrink-0">
                {product.icon || (product as any).image_url ? (
                  <img
                    src={product.icon || (product as any).image_url}
                    alt={product.name}
                    className="w-full h-full object-contain drop-shadow"
                  />
                ) : (
                  <Sparkles className="w-10 h-10 text-white" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-600 border border-blue-200">
                    <Sparkles className="w-3 h-3" />
                    แอปพรีเมียม
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">
                    <ShieldCheck className="w-3 h-3" />
                    แท้ถูกลิขสิทธิ์ 100%
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">
                  {product.name}
                </h1>
                <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                  {product.description || (product as any).short_description || 'บริการแอปสตรีมมิ่งและโปรแกรมพรีเมียม พร้อมใช้งานทันที'}
                </p>
              </div>
            </div>

            {/* Quick Guarantees Badge row */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-6 pt-6 border-t border-slate-100">
              <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Zap className="w-3.5 h-3.5" />
                </div>
                <span>ส่งไวอัตโนมัติ</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
                <span>ประกันตลอดอายุ</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                <div className="w-6 h-6 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <span>ดูแล 24 ชม.</span>
              </div>
            </div>
          </div>

          {/* Package Selection */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-blue-100/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <span className="w-2 h-6 bg-blue-600 rounded-full" />
                เลือกแพ็กเกจที่ต้องการ
              </h2>
              <span className="text-xs text-slate-400">
                {packages.length} ตัวเลือก
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {packages.map((pkg) => {
                const isSelected = selectedPkg?.id === pkg.id;
                return (
                  <button
                    key={pkg.id}
                    type="button"
                    onClick={() => setSelectedPkgId(pkg.id)}
                    className={`relative p-4 rounded-2xl border text-left transition-all duration-200 ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/40 shadow-sm ring-2 ring-blue-500/20'
                        : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold text-slate-800 text-base">{pkg.name}</div>
                        {pkg.duration && (
                          <div className="text-xs text-blue-600 font-medium mt-0.5">
                            ระยะเวลา: {pkg.duration}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-base font-bold text-blue-600">
                          ฿{Number(pkg.price).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="absolute top-2 right-2">
                        <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Additional Input Fields if required */}
          {(askEmail || askPassword) && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-blue-100/80 shadow-sm space-y-4">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <span className="w-2 h-6 bg-blue-600 rounded-full" />
                ข้อมูลสำหรับรับบริการ
              </h2>

              <div className="space-y-4 pt-1">
                {askEmail && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      อีเมลสำหรับรับบริการ <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="เช่น example@gmail.com"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                      required
                    />
                  </div>
                )}

                {askPassword && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      รหัสผ่านสำหรับรับบริการ <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      value={contactPassword}
                      onChange={(e) => setContactPassword(e.target.value)}
                      placeholder="กรอกรหัสผ่าน (หากมี)"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                      required
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Order Summary, Terms & CTA (Sticky on Desktop) */}
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
          {/* Order Summary Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-blue-100/80 shadow-sm space-y-6">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-4">
              <ShoppingCart className="w-5 h-5 text-blue-600" />
              สรุปรายการสั่งซื้อ
            </h2>

            {/* Selected Item Preview */}
            <div className="flex items-center gap-4 bg-slate-50/70 p-4 rounded-2xl border border-slate-100">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 p-1 flex items-center justify-center shrink-0">
                {product.icon || (product as any).image_url ? (
                  <img
                    src={product.icon || (product as any).image_url}
                    alt={product.name}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <Sparkles className="w-6 h-6 text-white" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-slate-800 text-sm truncate">
                  {product.name}
                </div>
                <div className="text-xs text-blue-600 font-medium">
                  {selectedPkg?.name || 'แพ็กเกจ'}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  ราคาต่อชิ้น: ฿{unitPrice.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Quantity Selector */}
            <div className="flex items-center justify-between py-2 border-y border-slate-100">
              <div>
                <span className="text-sm font-semibold text-slate-700 block">จำนวนสินค้า</span>
                <span className="text-xs text-slate-400">เลือกจำนวนที่ต้องการ</span>
              </div>
              <div className="flex items-center gap-3 bg-slate-100/80 p-1.5 rounded-xl border border-slate-200/60">
                <button
                  type="button"
                  onClick={() => handleQuantityChange(-1)}
                  disabled={quantity <= 1 || loading}
                  className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-600 hover:text-blue-600 disabled:opacity-40 transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="font-bold text-slate-800 text-sm w-6 text-center">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => handleQuantityChange(1)}
                  disabled={quantity >= 99 || loading}
                  className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-600 hover:text-blue-600 disabled:opacity-40 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Calculation Lines */}
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between text-slate-500">
                <span>ราคาต่อชิ้น</span>
                <span>฿{unitPrice.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>จำนวน</span>
                <span>{quantity} ชิ้น</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>ส่วนลด</span>
                <span className="text-emerald-600">฿0</span>
              </div>
              <div className="pt-3 border-t border-slate-100 flex justify-between items-baseline">
                <span className="text-base font-bold text-slate-800">ยอดรวมทั้งสิ้น</span>
                <span className="text-2xl font-extrabold text-blue-600">
                  ฿{totalPrice.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Terms Agreement Section */}
            <div className="bg-amber-50/70 border border-amber-200/70 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-amber-800 font-bold text-xs uppercase tracking-wider">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                ข้อตกลงและเงื่อนไขก่อนสั่งซื้อ
              </div>
              <ul className="text-xs text-amber-900/80 space-y-1.5 list-disc list-inside">
                <li>กรุณาตรวจสอบแพ็กเกจและข้อมูลให้ถูกต้อง</li>
                <li>สินค้าดิจิทัลไม่สามารถเปลี่ยนหรือคืนเงินได้หลังจัดส่งแล้ว</li>
                <li>จัดส่งข้อมูลการใช้งานทันทีในระบบหลังชำระเงิน</li>
              </ul>
              <label className="flex items-start gap-2.5 pt-2 border-t border-amber-200/60 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={agreedTerms}
                  onChange={(e) => setAgreedTerms(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-blue-600 border-amber-300 focus:ring-blue-500"
                />
                <span className="text-xs font-semibold text-slate-700 leading-tight">
                  ฉันได้อ่านและยอมรับข้อตกลงการสั่งซื้อเรียบร้อยแล้ว <span className="text-red-500">*</span>
                </span>
              </label>
            </div>

            {/* Error Message if any */}
            {error && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Action Button */}
            <button
              type="submit"
              disabled={loading || !agreedTerms}
              className="w-full py-4 px-6 rounded-2xl font-bold text-white shadow-lg transition-all duration-200 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-500/25 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>กำลังสร้างคำสั่งซื้อ...</span>
                </>
              ) : (
                <>
                  <span>ดำเนินการต่อ • ฿{totalPrice.toLocaleString()}</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
