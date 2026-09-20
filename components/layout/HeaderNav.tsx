'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Gamepad2,
  Gift,
  HelpCircle,
  FileQuestion,
  Clock,
  Menu,
  X,
  User,
  LogIn,
  UserPlus,
  ShieldAlert,
} from 'lucide-react';

interface HeaderNavProps {
  activeOrderCount?: number;
  profile?: { id: string; email?: string | null; full_name?: string | null; role?: string | null } | null;
}

export function HeaderNav({ activeOrderCount = 0, profile }: HeaderNavProps) {
  const pathname = usePathname() || '';
  const [mobileOpen, setMobileOpen] = useState(false);

  const isHomeActive = pathname === '/';
  const isGamesActive = pathname === '/games' || pathname.startsWith('/games/');
  const isTrackingActive = pathname === '/order-tracking' || pathname.startsWith('/order-tracking/');
  const isPromotionsActive = pathname === '/promotions' || pathname.startsWith('/promotions/');
  const isHowToActive = pathname === '/how-to' || pathname.startsWith('/how-to/');
  const isFaqActive = pathname === '/faq' || pathname.startsWith('/faq/');

  // Ordered strictly according to user requirements:
  // 1. หน้าหลัก 2. เกมทั้งหมด 3. ติดตามออเดอร์ 4. โปรโมชั่น 5. วิธีการเติม 6. คำถาม
  const navItems = [
    {
      href: '/',
      label: 'หน้าหลัก',
      icon: Home,
      isActive: isHomeActive,
    },
    {
      href: '/games',
      label: 'รายการทั้งหมด',
      icon: Gamepad2,
      isActive: isGamesActive,
    },
    {
      href: '/order-tracking',
      label: 'ติดตามออเดอร์',
      icon: Clock,
      isActive: isTrackingActive,
      badge: activeOrderCount,
    },
    {
      href: '/promotions',
      label: 'โปรโมชั่น',
      icon: Gift,
      isActive: isPromotionsActive,
    },
    {
      href: '/how-to',
      label: 'วิธีการเติม',
      icon: HelpCircle,
      isActive: isHowToActive,
    },
    {
      href: '/faq',
      label: 'คำถาม',
      icon: FileQuestion,
      isActive: isFaqActive,
    },
  ];

  return (
    <>
      {/* Desktop & Tablet Navigation (Single line, no broken text) */}
      <nav className="hidden md:flex items-center gap-1 lg:gap-1.5 overflow-x-auto py-1 scrollbar-none">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`whitespace-nowrap shrink-0 px-2.5 py-1.5 lg:px-3 lg:py-1.5 rounded-full text-xs lg:text-sm font-semibold transition-all duration-150 flex items-center gap-1 lg:gap-1.5 select-none ${
                item.isActive
                  ? 'bg-sky-500 text-white font-bold shadow-xs shadow-sky-200 ring-2 ring-sky-300/40'
                  : 'text-slate-600 hover:bg-sky-50 hover:text-sky-600'
              }`}
            >
              {Icon && (
                <Icon
                  className={`w-3.5 h-3.5 lg:w-4 lg:h-4 shrink-0 transition-colors ${
                    item.isActive ? 'text-white' : 'text-sky-500'
                  }`}
                />
              )}
              <span className="whitespace-nowrap">{item.label}</span>
              {typeof item.badge === 'number' && item.badge > 0 && (
                <span
                  className={`inline-flex items-center justify-center px-1.5 py-0.2 text-[10px] font-black rounded-full shrink-0 ${
                    item.isActive
                      ? 'bg-white text-sky-600 shadow-2xs'
                      : 'bg-sky-500 text-white animate-bounce'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Mobile Hamburger Button */}
      <div className="flex md:hidden items-center">
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-xl text-slate-700 hover:text-sky-600 hover:bg-sky-50 border border-sky-100 transition-colors"
          aria-label="เมนูหลัก"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Drawer / Dropdown Menu */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-x-0 top-18 bg-white/95 backdrop-blur-md border-b border-sky-100 shadow-xl z-40 p-4 animate-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col gap-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    item.isActive
                      ? 'bg-sky-500 text-white font-bold shadow-xs'
                      : 'text-slate-700 hover:bg-sky-50 hover:text-sky-600'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {Icon && (
                      <Icon
                        className={`w-4 h-4 ${
                          item.isActive ? 'text-white' : 'text-sky-500'
                        }`}
                      />
                    )}
                    <span>{item.label}</span>
                  </div>
                  {typeof item.badge === 'number' && item.badge > 0 && (
                    <span
                      className={`inline-flex items-center justify-center px-2 py-0.5 text-xs font-black rounded-full ${
                        item.isActive
                          ? 'bg-white text-sky-600'
                          : 'bg-sky-500 text-white'
                      }`}
                    >
                      {item.badge} ออเดอร์
                    </span>
                  )}
                </Link>
              );
            })}

            {!profile && (
              <div className="pt-3 mt-2 border-t border-sky-100 grid grid-cols-2 gap-2">
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-sky-200 text-xs font-bold text-sky-700 bg-sky-50/50 hover:bg-sky-100 transition"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>เข้าสู่ระบบ</span>
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-gradient-to-r from-sky-400 to-sky-600 text-xs font-bold text-white shadow-xs transition"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>สมัครสมาชิก</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
