import { CustomerLayout } from '@/components/layout/CustomerLayout';
import type { Metadata } from 'next';
import { getActiveGames, getProductCategories } from '@/lib/games/queries';
import { GameCategorySection } from '@/components/customer/GameCategorySection';

export const metadata: Metadata = {
  title: 'รายการสินค้า | NayMos GameShop',
  description: 'รายการสินค้าและบริการทั้งหมดจาก NayMos GameShop สะดวก รวดเร็ว ปลอดภัย 100% ให้บริการ 24 ชม.',
};

export const revalidate = 60;

export default async function ProductsPage() {
  const [games, categories] = await Promise.all([
    getActiveGames(),
    getProductCategories(),
  ]);

  return (
    <CustomerLayout>
      <div className="py-6 sm:py-8">
        <GameCategorySection
          games={games}
          categories={categories}
          title="รายการสินค้า"
          subtitle="เลือกสินค้าหรือบริการที่คุณต้องการ — ระบบอัตโนมัติ รวดเร็ว ปลอดภัย 100%"
          showViewAll={false}
        />
      </div>
    </CustomerLayout>
  );
}