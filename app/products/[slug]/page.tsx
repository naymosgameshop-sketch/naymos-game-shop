import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Sparkles, ShieldCheck, Zap, CheckCircle2 } from 'lucide-react';
import { CustomerLayout } from '@/components/customer/CustomerLayout';
import { getActiveDigitalProducts } from '@/lib/digital-products/queries';
import { DigitalProductOrderForm } from '@/components/customer/DigitalProductOrderForm';

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
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4 h-fit">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white text-3xl font-black shadow-md overflow-hidden">
              {product.icon ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.icon} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                product.name.slice(0, 1)
              )}
            </div>
            <div>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-sky-50 text-sky-600 border border-sky-200">
                {product.category_type === 'PREMIUM_APP' ? 'แอปพรีเมียม' : 'สินค้าดิจิทัล'}
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
                <ShieldCheck className="w-4 h-4 text-sky-500" /> ปลอดภัย ไร้ความเสี่ยง 100%
              </div>
            </div>
          </div>

          {/* Right: Interactive Order Form */}
          <div className="md:col-span-2">
            <DigitalProductOrderForm product={product} />
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
}
