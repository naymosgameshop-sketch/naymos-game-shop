'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';

const navItems = [
  { href: '/', label: 'หน้าหลัก' },
  { href: '/games', label: 'เกมทั้งหมด' },
  { href: '/promotions', label: 'โปรโมชั่น' },
  { href: '/faq', label: 'คำถามที่พบบ่อย' },
  { href: '/how-to', label: 'วิธีใช้งาน' },
];

export function HeaderNav() {
  const pathname = usePathname();
  const items = useMemo(() => navItems, []);
  return <nav className="w-full overflow-x-auto border-b border-sky-100 bg-white"><div className="mx-auto flex min-h-12 max-w-7xl items-center justify-center gap-2 px-3 py-2 sm:gap-3 sm:px-6"><div className="flex min-w-max items-center justify-center gap-2 sm:gap-3">{items.map((item) => <Link key={item.href} href={item.href} className={`whitespace-nowrap rounded-xl px-3 py-2 text-xs font-semibold transition sm:px-4 sm:text-sm ${pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href)) ? 'bg-sky-100 text-sky-800' : 'text-slate-600 hover:bg-sky-50'}`}>{item.label}</Link>)}</div></div></nav>;
}
