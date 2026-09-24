'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Trash2, Check, Power, AlertCircle } from 'lucide-react';
import { useConfirm } from '@/components/ui/ConfirmDialog';

type Props = {
  id: string;
  name?: string;
  price: number;
  cost: number;
  reseller_price?: number | null;
  is_active: boolean;
  availability?: string;
  stock?: number | null;
  provider_code?: string | null;
  external_product_code?: string | null;
};

export function ProductRowActions({
  id,
  name,
  price,
  cost,
  reseller_price,
  is_active,
  availability = 'available',
  stock,
  provider_code,
  external_product_code,
}: Props) {
  const router = useRouter();
  const confirm = useConfirm();
  const [p, setP] = useState(String(price));
  const [c, setC] = useState(String(cost));
  const [rp, setRp] = useState(reseller_price != null ? String(reseller_price) : '');
  const [active, setActive] = useState(is_active);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setP(String(price));
  }, [price]);

  useEffect(() => {
    setC(String(cost));
  }, [cost]);

  useEffect(() => {
    setRp(reseller_price != null ? String(reseller_price) : '');
  }, [reseller_price]);

  useEffect(() => {
    setActive(is_active);
  }, [is_active]);

  async function save(next: { price?: number; cost?: number; reseller_price?: number | null; is_active?: boolean }) {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/admin/products/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          price: next.price ?? Number(p),
          cost: next.cost ?? Number(c),
          reseller_price:
            next.reseller_price !== undefined
              ? next.reseller_price
              : rp.trim() === ''
              ? null
              : Number(rp),
          is_active: next.is_active ?? active,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setErrorMsg(data.message ?? 'บันทึกไม่สำเร็จ');
      } else {
        setSaved(true);
        if (next.is_active !== undefined) setActive(next.is_active);
        router.refresh();
        setTimeout(() => setSaved(false), 2000);
      }
    } catch {
      setErrorMsg('เชื่อมต่อไม่สำเร็จ');
    }
    setLoading(false);
  }

  const label = name ?? 'แพ็กเกจนี้';

  async function togglePackageState() {
    const next = !active;
    if (active) {
      const ok = await confirm({
        title: `ปิดแพ็กเกจ "${label}"?`,
        description: 'ลูกค้าจะไม่สามารถเลือกซื้อแพ็กเกจนี้บนหน้าเว็บได้ แต่ข้อมูลยังคงอยู่ในระบบ',
        confirmText: 'ปิดแพ็ก',
        cancelText: 'ยกเลิก',
        tone: 'danger',
      });
      if (!ok) return;
    }
    await save({ is_active: next });
  }

  async function remove() {
    const ok = await confirm({
      title: 'ลบแพ็กเกจนี้ถาวร?',
      description: `"${label}" จะถูกลบออกอย่างถาวรและกู้คืนไม่ได้ หากมีออเดอร์เก่าอ้างอิงอยู่ ระบบจะแนะนำให้ปิดแพ็กแทน`,
      confirmText: 'ลบถาวร',
      cancelText: 'ยกเลิก',
      tone: 'danger',
    });
    if (!ok) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/admin/products/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, hard: true }),
      });
      const data = await res.json();
      if (!data.success) {
        setErrorMsg(data.message ?? 'ลบไม่สำเร็จ');
      } else {
        router.refresh();
      }
    } catch {
      setErrorMsg('เชื่อมต่อไม่สำเร็จ');
    }
    setLoading(false);
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 w-full">
      {/* Price Editors: Cost (ต้นทุน), Selling Price (ราคาขาย NayMos), Reseller Price */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-500 font-semibold">ต้นทุน (API)</span>
          <input
            type="number"
            value={c}
            onChange={(e) => setC(e.target.value)}
            onBlur={() => {
              const n = Number(c);
              if (!Number.isNaN(n) && n >= 0 && n !== cost) void save({ cost: n });
            }}
            className="w-16 sm:w-20 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700 font-medium focus:border-sky-400 focus:outline-none"
            min={0}
            step={1}
            title="ต้นทุน API (อัปเดตอัตโนมัติจาก Provider)"
          />
        </div>

        <div className="flex flex-col">
          <span className="text-[10px] text-sky-700 font-bold">ราคาขาย NayMos</span>
          <input
            type="number"
            value={p}
            onChange={(e) => setP(e.target.value)}
            onBlur={() => {
              const n = Number(p);
              if (!Number.isNaN(n) && n >= 0 && n !== price) void save({ price: n });
            }}
            className="w-16 sm:w-20 rounded-lg border border-sky-300 bg-white px-2 py-1 text-xs text-slate-900 font-bold focus:border-sky-500 focus:ring-1 focus:ring-sky-400 focus:outline-none"
            min={0}
            step={1}
            title="ราคาขายหน้าร้าน NayMos (Sync จะไม่เขียนทับราคานี้)"
          />
        </div>

        <div className="flex flex-col">
          <span className="text-[10px] text-emerald-600 font-semibold">ราคาส่ง</span>
          <input
            type="number"
            value={rp}
            onChange={(e) => setRp(e.target.value)}
            onBlur={() => {
              const val = rp.trim() === '' ? null : Number(rp);
              if (val !== (reseller_price ?? null)) void save({ reseller_price: val });
            }}
            className="w-16 sm:w-20 rounded-lg border border-emerald-300 bg-emerald-50/30 px-2 py-1 text-xs text-emerald-700 font-semibold focus:border-emerald-500 focus:outline-none"
            min={0}
            step={1}
            placeholder="ตัวแทน"
            title="ราคาส่งตัวแทน"
          />
        </div>
      </div>

      {/* Package Controls: Toggle Package, Delete */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          disabled={loading}
          onClick={togglePackageState}
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer ${
            active
              ? 'border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
              : 'border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
          }`}
          title={active ? 'ปิดแพ็กเกจนี้' : 'เปิดขายแพ็กเกจนี้'}
        >
          <Power className="w-3 h-3" />
          {active ? 'ปิดแพ็ก' : 'เปิดขาย'}
        </button>

        <button
          type="button"
          disabled={loading}
          onClick={() => void remove()}
          title="ลบแพ็กเกจนี้ถาวร"
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-400 hover:text-rose-600 hover:border-rose-200 transition"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>

      {/* Status Indicators */}
      <div className="w-14 flex items-center justify-start shrink-0">
        {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-500" />}
        {!loading && saved && (
          <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600 font-bold">
            <Check className="h-3 w-3" /> บันทึก
          </span>
        )}
        {!loading && errorMsg && (
          <span className="text-[10px] text-rose-600 truncate" title={errorMsg}>
            พลาด
          </span>
        )}
      </div>
    </div>
  );
}
