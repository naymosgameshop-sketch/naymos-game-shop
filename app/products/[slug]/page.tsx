import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Sparkles, ShieldCheck, Zap, CheckCircle2 } from 'lucide-react';
import { CustomerLayout } from '@/components/customer/CustomerLayout';
import { getActiveDigitalProducts } from '@/lib/digital-products/queries';
import { createClient } from '@/lib/supabase/server';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const products = await getActiveDigitalProducts();
  const product = products.find((p) => p.slug === slug);
  if (!product) return { title: 'ไม่พบสินค้า | NayMos GameShop' };
  return {
    title: `${product.name} | NayMos GameShop`,
    description: product.description || 'สั่งซื้อแอปพรีเมียมและสินค้าดิจิทัลราคาพิเศษ',
  };
}

export const dynamic = 'force-dynamic';

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const products = await getActiveDigitalProducts();
  const product = products.find((p) => p.slug === slug);

  if (!product) {
    notFound();
  }

  return (
    <CustomerLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <Link
          href="/products"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-sky-600 transition"
        >
          <ArrowLeft className="w-4 h-4" /> กลับหน้ารายการสินค้า
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left: Product Info Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-black shadow-md">
              {product.name.slice(0, 1)}
            </div>
            <div>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-purple-50 text-purple-600 border border-purple-200">
                {product.category_type}
              </span>
              <h1 className="text-xl font-black text-slate-900 mt-2">{product.name}</h1>
              <p className="text-xs text-slate-500 mt-1">{product.description || 'บริการจัดส่งอัตโนมัติ รวดเร็ว ปลอดภัย'}</p>
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-2 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> รับประกันการใช้งานตลอดอายุแพ็กเกจ
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" /> จัดส่งทันทีหลังชำระเงิน
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-sky-500" /> ปลอดภัย ไร้ความเสี่ยง
              </div>
            </div>
          </div>

          {/* Right: Packages & Selection */}
          <div className="md:col-span-2 space-y-4">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600" /> เลือกแพ็กเกจที่ต้องการ
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {product.packages.map((pkg) => (
                  <div
                    key={pkg.id}
                    className="border border-slate-200 hover:border-purple-400 hover:bg-purple-50/30 p-4 rounded-2xl transition cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{pkg.name}</div>
                      {pkg.duration && (
                        <div className="text-[11px] text-slate-400 mt-0.5">ระยะเวลา: {pkg.duration}</div>
                      )}
                    </div>
                    <div className="mt-4 pt-2 border-t border-slate-100 flex items-baseline justify-between">
                      <span className="text-xs text-slate-400">ราคา</span>
                      <span className="text-base font-black text-purple-600">฿{pkg.price}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Order Notice */}
              <div className="mt-6 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-2">
                <div className="font-bold text-slate-800">ขั้นตอนการรับสินค้า:</div>
                <p>1. เลือกแพ็กเกจที่ต้องการ</p>
                <p>2. ชำระเงินผ่านระบบ PromptPay QR อัตโนมัติ</p>
                <p>3. รับข้อมูลบัญชีหรือลิงก์คำเชิญได้ทันทีที่หน้าติดตามคำสั่งซื้อ</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
}
