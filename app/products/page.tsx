import { CustomerLayout } from '@/components/layout/CustomerLayout';
import type { Metadata } from 'next';
import {
  getActiveDigitalProducts,
  getDigitalProductCategories,
} from '@/lib/digital-products/queries';
import { DigitalProductCatalog } from '@/components/customer/DigitalProductCatalog';

export const metadata: Metadata = {
  title: 'รายการสินค้า | NayMos GameShop',
  description: 'รายการสินค้าดิจิทัลและแอปพรีเมียมทั้งหมดจาก NayMos GameShop สะดวก รวดเร็ว ปลอดภัย 100% ให้บริการ 24 ชม.',
};

export const revalidate = 60;

export default async function ProductsPage() {
  const [products, categories] = await Promise.all([
    getActiveDigitalProducts(),
    getDigitalProductCategories(),
  ]);

  return (
    <CustomerLayout>
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <DigitalProductCatalog products={products} categories={categories} />
      </div>
    </CustomerLayout>
  );
}
