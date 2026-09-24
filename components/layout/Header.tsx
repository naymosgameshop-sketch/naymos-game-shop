import { cache } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { User, ShoppingCart } from 'lucide-react';
import { getProfile } from '@/lib/auth/get-user';
import { createClient } from '@/lib/supabase/server';
import { HeaderNav } from './HeaderNav';
import { HeaderMusicButton } from '@/components/music/HeaderMusicButton';

const getActiveOrderCount = cache(async (userId: string): Promise<number> => {
  try {
    const supabase = await createClient();
    const { data: orders } = await supabase
      .from('orders')
      .select('id, status, player_data')
      .eq('user_id', userId)
      .in('status', ['pending', 'PENDING_PAYMENT', 'PAID', 'PROCESSING', 'SUCCESS']);

    if (orders && orders.length > 0) {
      return orders.filter((o) => {
        const pd = (o.player_data as Record<string, unknown>) || {};
        return pd.customer_confirmed !== true;
      }).length;
    }
    return 0;
  } catch {
    return 0;
  }
});

export async function Header() {
  let profile = null;
  let activeOrderCount = 0;

  try {
    profile = await getProfile();
    if (profile) {
      activeOrderCount = await getActiveOrderCount(profile.id);
    }
  } catch {
    profile = null;
    activeOrderCount = 0;
  }

  return (
    <header className="sticky top-0 z-50 border-b border-sky-100 bg-white/90 backdrop-blur-md shadow-xs">
      <div className="mx-auto max-w-7xl px-3 sm:px-6">
        <div className="flex h-16 sm:h-18 items-center justify-between gap-2 sm:gap-4">
          {/* Logo with Mascot */}
          <Link href="/" className="flex items-center shrink-0 group py-1" aria-label="NayMos GameShop หน้าหลัก">
            <div className="relative h-10 sm:h-12 w-auto shrink-0 flex items-center group-hover:scale-105 transition-transform duration-200">
              <img
                src="/images/logo.webp"
                alt="NayMos GameShop"
                className="h-10 sm:h-12 w-auto object-contain select-none"
              />
            </div>
          </Link>

          {/* Navigation Pills (Responsive desktop/tablet/mobile) */}
          <HeaderNav activeOrderCount={activeOrderCount} profile={profile} />

          {/* User actions */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <HeaderMusicButton />
            {profile ? (
              <Link
                href="/account"
                className="flex items-center gap-1.5 rounded-full bg-sky-50 border border-sky-200 px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-sky-900 hover:bg-sky-100 hover:border-sky-300 transition max-w-[140px] sm:max-w-[180px] shadow-xs"
              >
                <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-sky-600 shrink-0" />
                <span className="truncate">
                  {profile.full_name || profile.email?.split('@')[0] || 'บัญชีของฉัน'}
                </span>
                {profile.role === 'reseller' && (
                  <span className="hidden sm:inline-flex items-center rounded-full bg-emerald-100 px-1.5 py-0.2 text-[10px] font-bold text-emerald-700">
                    ตัวแทน
                  </span>
                )}
              </Link>
            ) : (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Link
                  href="/login"
                  className="flex items-center gap-1.5 rounded-full bg-white border border-sky-200 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-bold text-sky-700 hover:bg-sky-50 hover:border-sky-300 transition shadow-xs"
                >
                  <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-sky-500" />
                  <span>เข้าสู่ระบบ</span>
                </Link>
                <Link
                  href="/register"
                  className="hidden md:flex items-center gap-1 rounded-full bg-gradient-to-r from-sky-400 to-sky-600 px-3.5 py-1.5 sm:py-2 text-xs sm:text-sm font-bold text-white hover:from-sky-500 hover:to-sky-700 transition shadow-xs shadow-sky-200"
                >
                  <span>สมัครสมาชิก</span>
                </Link>
              </div>
            )}

            <Link
              href="/order-tracking"
              className="relative flex items-center justify-center rounded-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 p-2 sm:p-2.5 text-white transition shadow-sm shadow-sky-200"
              aria-label="ออเดอร์"
            >
              <ShoppingCart className="h-4 w-4" />
              {activeOrderCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[10px] font-black text-slate-900 border-2 border-white shadow-xs">
                  {activeOrderCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
