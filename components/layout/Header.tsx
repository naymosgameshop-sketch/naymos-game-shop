import { cache } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { User, ShoppingCart } from 'lucide-react';
import { getProfile } from '@/lib/auth/get-user';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { createClient } from '@/lib/supabase/server';
import { HeaderNav } from './HeaderNav';

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
          <Link href="/" className="flex items-center gap-2 sm:gap-2.5 shrink-0 group">
            <div className="relative h-10 sm:h-12 w-auto shrink-0 flex items-center group-hover:scale-105 transition-transform duration-200">
              <img
                src="/images/logo.webp"
                alt="NayMos GameShop"
                className="h-10 sm:h-12 w-auto object-contain select-none"
              />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-base sm:text-lg tracking-tight text-sky-950 flex items-center gap-1">
                NayMos <span className="text-sky-500 font-black">GameShop</span>
              </span>
              <span className="hidden sm:inline text-[10px] text-sky-600 font-medium tracking-wide">
                บริการเติมเกมออนไลน์ 100%
              </span>
            </div>
          </Link>

          {/* Navigation Pills (Responsive desktop/tablet/mobile) */}
          <HeaderNav activeOrderCount={activeOrderCount} profile={profile} />

          {/* User actions */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {profile ? (
              <>
                <Link
                  href="/account"
                  className="flex items-center gap-1.5 rounded-full bg-sky-50 border border-sky-200 px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-sky-900 hover:bg-sky-100 hover:border-sky-300 transition max-w-[130px] sm:max-w-[160px] shadow-xs"
                >
                  <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-sky-600 shrink-0" />
                  <span className="truncate">
                    {profile.full_name || profile.email?.split('@')[0] || 'บัญชีของฉัน'}
                  </span>
                </Link>
                {(profile.role === 'admin' || profile.role === 'super_admin') && (
                  <Link
                    href="/admin"
                    className="hidden lg:inline-flex rounded-full bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800 transition shadow-xs"
                  >
                    หลังบ้าน
                  </Link>
                )}
                {profile.role === 'reseller' && (
                  <span className="hidden lg:inline-flex items-center rounded-full bg-emerald-50 border border-emerald-300 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 shadow-xs">
                    ตัวแทน
                  </span>
                )}
                <LogoutButton />
              </>
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
