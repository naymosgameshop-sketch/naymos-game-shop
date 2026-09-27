import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, ShieldCheck, Zap, FileText, Info } from 'lucide-react';
import { CustomerLayout } from '@/components/layout/CustomerLayout';
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
export const revalidate = 0;

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const products = await getActiveDigitalProducts();
  const product = products.find((p) => p.slug === slug);

  if (!product) {
    notFound();
  }

  const meta = (product as any)?.metadata || {};
  const instructions = meta.instructions || meta.details;

  // Parse checklist / feature highlights from description or details
  const rawDescription = product.description || meta.details || meta.instructions || 'บริการสตรีมมิ่งคุณภาพสูง\nความคมชัดระดับ 4K\nรับชมได้ทันทีหลังชำระเงิน\nรับประกันตลอดอายุการใช้งาน';
  const checklistItems = rawDescription
    .split('\n')
    .map((line: string) => line.trim())
    .filter((line: string) => line.length > 0);

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
          {/* Left Column: รายละเอียดสินค้าทั้งหมด */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-5 h-fit">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white text-3xl font-black shadow-md overflow-hidden shrink-0">
                {product.icon ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={product.icon} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  product.name.slice(0, 1)
                )}
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-sky-50 text-sky-600 border border-sky-200">
                  {product.category_type === 'PREMIUM_APP' ? 'แอปพรีเมียม' : 'สินค้าดิจิทัล'}
                </span>
                <h1 className="text-xl font-black text-slate-900 leading-tight">{product.name}</h1>
              </div>
            </div>

            {/* รายละเอียดสินค้า */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-sky-600" /> รายละเอียดสินค้า
              </h3>
              <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-4 space-y-2 text-xs">
                {checklistItems.map((item: string, idx: number) => (
                  <div key={idx} className="flex items-start gap-2.5 text-slate-700">
                    <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">
                      ✓
                    </span>
                    <span className="leading-relaxed">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Extra instructions / guidance from admin */}
            {instructions && (
              <div className="p-3.5 rounded-2xl bg-sky-50/60 border border-sky-100 text-xs text-slate-700 space-y-1">
                <span className="font-bold text-sky-900 flex items-center gap-1.5 text-[11px]">
                  <Info className="w-3.5 h-3.5 text-sky-600" /> คำแนะนำเพิ่มเติมจากทางร้าน:
                </span>
                <p className="text-[11px] leading-relaxed whitespace-pre-line text-slate-600">
                  {instructions}
                </p>
              </div>
            )}

            {/* Trust Badges */}
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

          {/* Right Column: ฟอร์มสั่งซื้อและดำเนินการชำระเงิน */}
          <div className="md:col-span-2">
            <DigitalProductOrderForm product={product} />
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
}
