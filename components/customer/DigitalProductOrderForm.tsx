'use client';

import { useState, useEffect } from 'react';
import { 
  Sparkles, ShieldCheck, Zap, CheckCircle2, QrCode, ArrowRight, Loader2, 
  Copy, Check, AlertCircle, Info, FileText, ChevronDown, ChevronUp, Lock, Mail
} from 'lucide-react';
import { PromptPayQRCard } from './PromptPayQRCard';
import type { DigitalProduct, DigitalProductPackage } from '@/types/digital-product';
import { useRouter } from 'next/navigation';

export function DigitalProductOrderForm({ product }: { product: DigitalProduct }) {
  const router = useRouter();
  const packages = (product.packages || []).filter(p => p.is_active !== false);
  const [selectedPkgId, setSelectedPkgId] = useState<string>(packages[0]?.id || '');

  // Form Fields (Only shown if enabled in product metadata)
  const [contactEmail, setContactEmail] = useState('');
  const [contactPassword, setContactPassword] = useState('');
  const [contactNotes, setContactNotes] = useState('');

  // Mandatory Agreement Checkbox
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderCreated, setOrderCreated] = useState<any | null>(null);
  const [copiedOrder, setCopiedOrder] = useState(false);

  // Store PromptPay settings
  const [store, setStore] = useState({ 
    promptpay_id: '0988251064', 
    account_name: 'ศักดาวิชญ์ คำใจ', 
    bank_name: 'พร้อมเพย์' 
  });

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((j) => {
        if (j?.success && j?.settings) {
          setStore({
            promptpay_id: j.settings.promptpay_id || '0988251064',
            account_name: j.settings.account_name || 'ศักดาวิชญ์ คำใจ',
            bank_name: j.settings.bank_name || 'พร้อมเพย์',
          });
        }
      })
      .catch(() => {});
  }, []);

  const selectedPkg = packages.find(p => p.id === selectedPkgId) || packages[0];

  const meta = (product as any)?.metadata || {};
  const askEmail = Boolean(meta.ask_email);
  const askPassword = Boolean(meta.ask_password);
  const termsContent = meta.terms || '1. สินค้าเป็นแอปพรีเมียมตามระยะเวลาที่ระบุในแพ็กเกจ\n2. ห้ามเปลี่ยนรหัสผ่าน หรือแก้ไขข้อมูลบัญชีโดยไม่ได้รับอนุญาต\n3. ทางร้านรับประกันการใช้งานตลอดอายุของแพ็กเกจ\n4. เมื่อชำระเงินแล้ว ระบบจะจัดส่งรหัสหรือข้อมูลบัญชีให้ในประวัติการสั่งซื้อ';

  // Parse description/features into checklist items
  const rawDescription = product.description || meta.details || meta.instructions || 'บริการสตรีมมิ่งคุณภาพสูง\nความคมชัดระดับ 4K\nรับชมได้ทันทีหลังชำระเงิน\nรับประกันตลอดอายุการใช้งาน';
  const checklistItems = rawDescription
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  const handleOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPkg) {
      setError('กรุณาเลือกแพ็กเกจ');
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
          contactEmail: contactEmail.trim(),
          contactPhone: '',
          notes: contactNotes.trim(),
          customFields: {
            account_email: contactEmail.trim(),
            account_password: contactPassword.trim(),
            agreed_terms: true,
          },
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setOrderCreated(data.order);
      } else {
        setError(data.error || 'เกิดข้อผิดพลาดในการสร้างคำสั่งซื้อ');
      }
    } catch {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setLoading(false);
    }
  };

  const copyOrderNumber = () => {
    if (!orderCreated?.order_number) return;
    navigator.clipboard.writeText(orderCreated.order_number);
    setCopiedOrder(true);
    setTimeout(() => setCopiedOrder(false), 2000);
  };

  if (orderCreated) {
    return (
      <div className="bg-white border border-sky-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 mb-1">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-black text-slate-900">สั่งซื้อสำเร็จ กรุณาชำระเงิน</h2>
          <p className="text-xs text-slate-500">
            โอนเงินตามยอดที่ระบุ และรอแอดมินยืนยันยอดเพื่อส่งรหัสเข้าใน <span className="font-bold text-sky-600">ประวัติการสั่งซื้อ</span> ทันที
          </p>
        </div>

        {/* Order Details Banner */}
        <div className="bg-sky-50 border border-sky-100 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div>
            <span className="text-slate-500">หมายเลขคำสั่งซื้อ:</span>
            <div className="font-mono font-bold text-sky-700 text-sm flex items-center gap-1.5 mt-0.5">
              {orderCreated.order_number}
              <button
                type="button"
                onClick={copyOrderNumber}
                className="text-slate-400 hover:text-sky-600 transition"
                title="คัดลอก"
              >
                {copiedOrder ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
          <div className="sm:text-right">
            <span className="text-slate-500">ยอดชำระ:</span>
            <div className="font-black text-lg text-emerald-600">฿{orderCreated.price?.toLocaleString()}</div>
          </div>
        </div>

        {/* PromptPay QR */}
        <div className="flex justify-center">
          <PromptPayQRCard
            amount={orderCreated.price}
            orderNumber={orderCreated.order_number}
            promptpayId={store.promptpay_id}
            accountName={store.account_name}
            bankName={store.bank_name}
            showDetails={true}
          />
        </div>

        {/* Action Button */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => router.push(`/order-tracking?number=${orderCreated.order_number}`)}
            className="flex-1 py-3 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-sm"
          >
            ไปที่หน้าติดตามคำสั่งซื้อ / รับสินค้า <ArrowRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setOrderCreated(null)}
            className="py-3 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs transition"
          >
            สั่งซื้อรายการอื่น
          </button>
        </div>
      </div>
    );
  }

  const stockCount = selectedPkg?.stock ?? selectedPkg?.stock_quantity ?? 99;
  const isOutOfStock = stockCount <= 0;

  return (
    <form onSubmit={handleOrder} className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-xs space-y-6">
      {/* Package Selector (If multiple packages exist) */}
      {packages.length > 1 && (
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-sky-500" /> เลือกแพ็กเกจ:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {packages.map((pkg) => {
              const isSelected = selectedPkg?.id === pkg.id;
              return (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => setSelectedPkgId(pkg.id)}
                  className={`p-2.5 rounded-2xl border text-left transition-all ${
                    isSelected
                      ? 'border-sky-500 bg-sky-50/70 ring-2 ring-sky-300/40 text-sky-950 font-bold'
                      : 'border-slate-200 hover:border-sky-300 text-slate-700'
                  }`}
                >
                  <div className="text-xs font-bold truncate">{pkg.name}</div>
                  <div className="text-xs text-emerald-600 font-mono mt-0.5">฿{Number(pkg.price).toLocaleString()}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Product Details Section (Matching FinShop UI checklist) */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <FileText className="w-4 h-4 text-sky-600" /> รายละเอียดสินค้า
        </h3>
        
        <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-4 space-y-2 text-xs">
          {checklistItems.map((item, idx) => (
            <div key={idx} className="flex items-start gap-2.5 text-slate-700">
              <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">
                ✓
              </span>
              <span className="leading-relaxed">{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Optional Inputs (Only rendered if toggled in admin) */}
      {(askEmail || askPassword) && (
        <div className="p-4 rounded-2xl bg-sky-50/60 border border-sky-100 space-y-3">
          <div className="text-xs font-bold text-sky-950 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-sky-600" /> ข้อมูลสำหรับการรับบริการ
          </div>
          {askEmail && (
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-slate-400" /> อีเมลของคุณ <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="example@gmail.com"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-sky-500 bg-white"
              />
            </div>
          )}
          {askPassword && (
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-slate-400" /> รหัสผ่านของคุณ <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                required
                value={contactPassword}
                onChange={(e) => setContactPassword(e.target.value)}
                placeholder="กรอกรหัสผ่าน"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-sky-500 bg-white"
              />
            </div>
          )}
        </div>
      )}

      {/* Mandatory Terms & Conditions Checkbox */}
      <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-2">
        <label className="flex items-start gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={agreedTerms}
            onChange={(e) => setAgreedTerms(e.target.checked)}
            className="w-4 h-4 mt-0.5 rounded text-sky-600 border-amber-300 focus:ring-sky-500"
          />
          <span className="text-xs text-slate-800 font-semibold leading-relaxed">
            ฉันได้อ่านและยอมรับ <span className="text-sky-700 underline font-bold" onClick={(e) => { e.preventDefault(); setShowTermsModal(true); }}>ข้อตกลงการสั่งซื้อและเงื่อนไข</span> เรียบร้อยแล้ว <span className="text-red-500">*</span>
          </span>
        </label>
      </div>

      {/* Terms Modal */}
      {showTermsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-xl border border-slate-100">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-sky-600" /> ข้อตกลงและเงื่อนไขการสั่งซื้อ
            </h4>
            <div className="max-h-60 overflow-y-auto p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-700 whitespace-pre-line leading-relaxed">
              {termsContent}
            </div>
            <button
              type="button"
              onClick={() => {
                setAgreedTerms(true);
                setShowTermsModal(false);
              }}
              className="w-full py-2.5 rounded-xl bg-sky-600 text-white font-bold text-xs hover:bg-sky-700 transition"
            >
              รับทราบและยอมรับข้อตกลง
            </button>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-red-600 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Stock and Price Row (Matching FIN Shop Footer) */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
        <div className="text-xs text-slate-500 font-medium">
          คงเหลือ: <span className="font-bold text-slate-800 font-mono">{stockCount}</span> ชิ้น
        </div>
        <div className="text-right">
          <span className="text-xl sm:text-2xl font-black text-rose-600 font-mono">
            ฿{Number(selectedPkg?.price || 0).toLocaleString()}
          </span>
          <span className="text-xs text-slate-400 ml-1">/ ชิ้น</span>
        </div>
      </div>

      {/* Submit Button (Red/Coral like FIN Shop) */}
      <button
        type="submit"
        disabled={loading || isOutOfStock || !agreedTerms}
        className={`w-full py-3.5 px-4 rounded-2xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-sm ${
          isOutOfStock
            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
            : !agreedTerms
            ? 'bg-rose-400 text-white/80 cursor-not-allowed'
            : 'bg-rose-600 hover:bg-rose-700 active:scale-[0.99] text-white shadow-rose-200'
        }`}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> กำลังดำเนินการ...
          </>
        ) : isOutOfStock ? (
          'สินค้าหมดชั่วคราว'
        ) : (
          'ดำเนินการต่อ'
        )}
      </button>
    </form>
  );
}
