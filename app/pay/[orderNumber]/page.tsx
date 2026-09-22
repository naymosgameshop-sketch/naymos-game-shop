import { CustomerLayout } from '@/components/layout/CustomerLayout';
import { PaymentPanel } from '@/components/customer/PaymentPanel';
import type { Metadata } from 'next';

type Props = {
  params: Promise<{ orderNumber: string }>;
};

export const metadata: Metadata = {
  title: 'ชำระเงิน | NayMos GameShop',
  description: 'สแกน QR Code เพื่อชำระเงินและอัปโหลดสลิปยืนยัน',
};

export const dynamic = 'force-dynamic';

export default async function PayPage({ params }: Props) {
  const { orderNumber } = await params;

  return (
    <CustomerLayout>
      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        <PaymentPanel orderNumber={orderNumber} />
      </div>
    </CustomerLayout>
  );
}
