'use client';

import { useState, useEffect } from 'react';
import { Sparkles, ShieldCheck, Zap, CheckCircle2, QrCode, ArrowRight, Loader2, Copy, Check, AlertCircle, UploadCloud } from 'lucide-react';
import { PromptPayQRCard } from './PromptPayQRCard';
import type { DigitalProduct, DigitalProductPackage } from '@/types/digital-product';
import { useRouter } from 'next/navigation';

export function DigitalProductOrderForm({ product }: { product: DigitalProduct }) {
  const router = useRouter();
  const packages = (product.packages || []).filter(p => p.is_active !== false);
  const [selectedPkgId, setSelectedPkgId] = useState<string>(packages[0]?.id || '');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [customFields, setCustomFields] = useState<Record<string, string>>({});

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderCreated, setOrderCreated] = useState<any | null>(null);
  const [copiedOrder, setCopiedOrder] = useState(false);

  // Store PromptPay settings
  const [store, setStore] = useState({ promptpay_id: '0988251064', account_name: 'ศักดาวิชญ์ คำใจ', bank_name: 'พร้อมเพย์' });

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

  const handleOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPkg) {
      setError('กรุณาเลือกแพ็กเกจ');
      return;
    }
    if (!contactEmail.trim() && !contactPhone.trim()) {
      setError('กรุณากรอกอีเมลหรือเบอร์โทรศัพท์สำหรับจัดส่ง');
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
          contactPhone: contactPhone.trim(),
          notes: notes.trim(),
          customFields,
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
          <p className="text-xs text-slate-500">สแกน QR Code ด้านล่างเพื่อชำระเงินผ่านแอปธนาคาร</p>
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
            <div className="font-black text-slate-900 text-lg text-purple-600">฿{orderCreated.price?.toLocaleString()}</div>
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
            className="flex-1 py-3 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition"
          >
            ไปที่หน้าติดตามคำสั่งซื้อ <ArrowRight className="w-4 h-4" />
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

  return (
    <form onSubmit={handleOrder} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-6">
      <div>
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-600" /> เลือกแพ็กเกจที่ต้องการ
        </h2>
        <p className="text-xs text-slate-400 mt-1">คลิกเลือกแพ็กเกจที่คุณต้องการซื้อ</p>
      </div>

      {/* Package Selection Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {packages.map((pkg) => {
          const isSelected = selectedPkg?.id === pkg.id;
          return (
            <div
              key={pkg.id}
              onClick={() => setSelectedPkgId(pkg.id)}
              className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'border-sky-500 bg-sky-50/50 shadow-xs ring-2 ring-sky-500/20'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-sm">{pkg.name}</span>
                  {isSelected && <span className="w-2 h-2 rounded-full bg-sky-600" />}
                </div>
                {pkg.duration && (
                  <div className="text-[11px] text-slate-400 mt-0.5">ระยะเวลา: {pkg.duration}</div>
                )}
              </div>
              <div className="mt-4 pt-2 border-t border-slate-100 flex items-baseline justify-between">
                <span className="text-xs text-slate-400">ราคา</span>
                <span className="text-base font-black text-sky-600">฿{pkg.price?.toLocaleString()}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Customer Contact Inputs */}
      <div className="space-y-3 pt-4 border-t border-slate-100">
        <h3 className="text-xs font-bold text-slate-800">ข้อมูลผู้รับสินค้า / บัญชี</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              อีเมลสำหรับรับสินค้า <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="example@gmail.com"
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              เบอร์โทรศัพท์ (สำรอง)
            </label>
            <input
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="08X-XXX-XXXX"
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        {/* Dynamic Fields if any */}
        {(product.fields || []).map((f) => (
          <div key={f.id}>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              {f.label} {f.required && <span className="text-rose-500">*</span>}
            </label>
            <input
              type={f.type || 'text'}
              placeholder={f.placeholder || ''}
              value={customFields[f.name] || ''}
              onChange={(e) => setCustomFields({ ...customFields, [f.name]: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500"
            />
          </div>
        ))}

        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1">
            หมายเหตุเพิ่มเติม (ถ้ามี)
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="ข้อมูลเพิ่มเติม เช่น ลิงก์โปรไฟล์ / รหัสสำหรับต่ออายุ"
            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500"
          />
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Submit Button */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={loading || !selectedPkg}
          className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white font-black text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> กำลังสร้างคำสั่งซื้อ...
            </>
          ) : (
            <>
              <QrCode className="w-4 h-4" /> สั่งซื้อและชำระเงิน (฿{selectedPkg?.price?.toLocaleString() || 0})
            </>
          )}
        </button>
      </div>

      {/* Notice */}
      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 space-y-1">
        <div className="font-bold text-slate-700">การรับประกันและจัดส่ง:</div>
        <p>• จัดส่งอัตโนมัติหรือดำเนินการทันทีหลังชำระเงินเรียบร้อย</p>
        <p>• รับประกันตลอดอายุการใช้งานของแพ็กเกจ มีแอดมินคอยดูแล 24 ชม.</p>
      </div>
    </form>
  );
}
