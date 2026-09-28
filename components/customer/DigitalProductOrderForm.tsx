'use client';

import { useState, useMemo } from 'react';
import { 
  Sparkles, ShieldCheck, Zap, ArrowRight, Loader2, 
  AlertCircle, Check, Minus, Plus, ShoppingCart, 
  Clock, CheckCircle2, ChevronRight
} from 'lucide-react';
import type { DigitalProduct, DigitalProductPackage } from '@/types/digital-product';
import { useRouter } from 'next/navigation';

interface DigitalProductOrderFormProps {
  product: DigitalProduct;
}

export function DigitalProductOrderForm({ product }: DigitalProductOrderFormProps) {
  const router = useRouter();
  const packages = useMemo(() => {
    return (product.packages || []).filter((p) => p.is_active !== false);
  }, [product.packages]);

  const [selectedPkgId, setSelectedPkgId] = useState<string>(packages[0]?.id || '');
  const [quantity, setQuantity] = useState<number>(1);

  // Form Fields for custom requirements
  const [contactEmail, setContactEmail] = useState('');
  const [contactPassword, setContactPassword] = useState('');
  const [contactNotes, setContactNotes] = useState('');

  // Mandatory Terms Agreement
  const [agreedTerms, setAgreedTerms] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedPkg = useMemo(() => {
    return packages.find((p) => p.id === selectedPkgId) || packages[0];
  }, [packages, selectedPkgId]);

  const meta = (product as any)?.metadata || {};
  const askEmail = Boolean(meta.ask_email);
  const askPassword = Boolean(meta.ask_password);

  const unitPrice = Number(selectedPkg?.price || 0);
  const totalPrice = unitPrice * quantity;

  const handleQuantityChange = (delta: number) => {
    setQuantity((prev) => Math.max(1, Math.min(99, prev + delta)));
  };

  const handleOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPkg) {
      setError('กรุณาเลือกแพ็กเกจที่ต้องการสั่งซื้อ');
      return;
    }
    if (!agreedTerms) {
      setError('กรุณากดยอมรับข้อตกลงก่อนดำเนินการสั่งซื้อ');
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
          productId: product.id,
          packageId: selectedPkg.id,
          quantity,
          agreedToTerms: true,
          customerInfo: {
            email: contactEmail.trim(),
            notes: contactNotes.trim(),
          },
          customFields: {
            account_email: contactEmail.trim(),
            account_password: contactPassword.trim(),
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || 'ไม่สามารถสร้างคำสั่งซื้อได้ กรุณาลองใหม่อีกครั้ง');
      }

      const redirectUrl = data.payment_url || (data.order_number ? `/pay/${data.order_number}` : `/pay/${data.order_id}`);
      router.push(redirectUrl);
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการสั่งซื้อ กรุณาลองใหม่อีกครั้ง');
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      <form onSubmit={handleOrder} className="space-y-6">
        {/* Step 1: Package Selection */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-sky-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-sky-50">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-full bg-sky-500 text-white text-xs font-black flex items-center justify-center shadow-xs">
                1
              </span>
              <h2 className="text-base font-bold text-slate-800">
                เลือกแพ็กเกจที่ต้องการ
              </h2>
            </div>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-600">
              {packages.length} ตัวเลือก
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {packages.map((pkg) => {
              const isSelected = selectedPkg?.id === pkg.id;
              return (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => setSelectedPkgId(pkg.id)}
                  className={`group relative p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? 'border-sky-500 bg-gradient-to-br from-sky-50/80 to-blue-50/40 shadow-sm ring-2 ring-sky-400/30'
                      : 'border-slate-200/80 bg-white hover:border-sky-300 hover:bg-sky-50/30'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="space-y-1">
                      <span className="font-bold text-slate-800 text-sm block group-hover:text-sky-600 transition">
                        {pkg.name}
                      </span>
                      {pkg.duration && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-600 bg-white/90 px-2 py-0.5 rounded-md border border-sky-100">
                          <Clock className="w-3 h-3 text-sky-500" />
                          {pkg.duration}
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-base font-black text-sky-600">
                        ฿{Number(pkg.price).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="absolute top-2.5 right-2.5">
                      <span className="w-4 h-4 rounded-full bg-sky-500 text-white flex items-center justify-center shadow-xs">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Quantity & Custom Input Fields */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-sky-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-sky-50">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-full bg-sky-500 text-white text-xs font-black flex items-center justify-center shadow-xs">
                2
              </span>
              <h2 className="text-base font-bold text-slate-800">
                ระบุจำนวนและข้อมูลเพิ่มเติม
              </h2>
            </div>
          </div>

          <div className="flex items-center justify-between p-3.5 bg-slate-50/80 rounded-2xl border border-slate-100">
            <div>
              <span className="text-sm font-bold text-slate-800 block">จำนวนที่ต้องการซื้อ</span>
              <span className="text-xs text-slate-400">เลือกจำนวนแพ็กเกจ (ชิ้น)</span>
            </div>
            <div className="flex items-center gap-3 bg-white p-1 rounded-xl border border-sky-200/60 shadow-xs">
              <button
                type="button"
                onClick={() => handleQuantityChange(-1)}
                disabled={quantity <= 1 || loading}
                className="w-8 h-8 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-600 flex items-center justify-center disabled:opacity-40 transition"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="font-extrabold text-slate-800 text-sm w-8 text-center font-mono">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => handleQuantityChange(1)}
                disabled={quantity >= 99 || loading}
                className="w-8 h-8 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-600 flex items-center justify-center disabled:opacity-40 transition"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Dynamic input for account credentials if requested */}
          {(askEmail || askPassword) && (
            <div className="space-y-3 pt-2">
              {askEmail && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    อีเมลสำหรับรับบริการ / เปิดใช้งาน <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="example@gmail.com"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-400"
                    required
                  />
                </div>
              )}
              {askPassword && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    รหัสผ่านสำหรับรับบริการ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={contactPassword}
                    onChange={(e) => setContactPassword(e.target.value)}
                    placeholder="กรอกรหัสผ่านบัญชี"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-400"
                    required
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Step 3: Order Summary, Terms & Action */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-sky-100 shadow-sm space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-sky-50">
            <span className="w-7 h-7 rounded-full bg-sky-500 text-white text-xs font-black flex items-center justify-center shadow-xs">
              3
            </span>
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-sky-500" />
              สรุปรายการสั่งซื้อ
            </h2>
          </div>

          {/* Real-time Order Summary Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-sky-50/60 to-slate-50 border border-sky-100 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700">{product.name}</span>
              <span className="font-semibold text-sky-600">{selectedPkg?.name || '-'}</span>
            </div>

            <div className="space-y-1.5 text-xs text-slate-500 pt-2 border-t border-sky-100/60">
              <div className="flex justify-between">
                <span>ราคาต่อชิ้น</span>
                <span className="font-semibold text-slate-700">฿{unitPrice.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>จำนวนสินค้า</span>
                <span className="font-semibold text-slate-700">{quantity} ชิ้น</span>
              </div>
              <div className="flex justify-between">
                <span>ส่วนลด</span>
                <span className="font-semibold text-emerald-600">฿0</span>
              </div>
            </div>

            <div className="flex justify-between items-baseline pt-2 border-t border-sky-200/60">
              <span className="text-sm font-bold text-slate-800">ยอดรวมชำระ</span>
              <span className="text-2xl font-black text-sky-600">
                ฿{totalPrice.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Terms Agreement Warning Box */}
          <div className="rounded-2xl p-4 bg-amber-50/80 border border-amber-200/80 space-y-2.5">
            <div className="flex items-center gap-2 text-amber-800 font-bold text-xs">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>ข้อตกลงและเงื่อนไขการสั่งซื้อ</span>
            </div>
            <ul className="text-[11px] text-amber-900/80 space-y-1 list-disc list-inside leading-relaxed">
              <li>กรุณาตรวจสอบข้อมูลสินค้าและแพ็กเกจให้ถูกต้องก่อนชำระเงิน</li>
              <li>สินค้าดิจิทัลไม่สามารถเปลี่ยนหรือขอคืนเงินได้หลังจากระบบดำเนินการส่งมอบแล้ว</li>
              <li>ระบบจะจัดส่งข้อมูลการใช้งานให้ทันทีในหน้ารายละเอียดคำสั่งซื้อหลังตรวจสอบยอดชำระ</li>
            </ul>
            <label className="flex items-start gap-2.5 pt-2.5 border-t border-amber-200/70 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={agreedTerms}
                onChange={(e) => setAgreedTerms(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-sky-600 border-amber-300 focus:ring-sky-500"
              />
              <span className="text-xs font-bold text-slate-800 leading-tight">
                ฉันได้อ่านและยอมรับข้อตกลงการสั่งซื้อเรียบร้อยแล้ว <span className="text-rose-500">*</span>
              </span>
            </label>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-600 flex items-start gap-2 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !agreedTerms}
            className="w-full py-4 px-6 rounded-2xl font-black text-sm text-white shadow-md transition-all duration-200 flex items-center justify-center gap-2 bg-gradient-to-r from-sky-500 via-blue-600 to-sky-600 hover:from-sky-400 hover:to-blue-500 shadow-sky-500/25 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>กำลังสร้างคำสั่งซื้อ...</span>
              </>
            ) : (
              <>
                <span>ดำเนินการต่อ • ฿{totalPrice.toLocaleString()}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
