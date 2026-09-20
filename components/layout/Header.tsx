'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => { const onScroll = () => setScrolled(window.scrollY > 8); window.addEventListener('scroll', onScroll); return () => window.removeEventListener('scroll', onScroll); }, []);
  return <header className={`sticky top-0 z-40 border-b border-sky-100/70 bg-white/95 backdrop-blur ${scrolled ? 'shadow-sm' : ''}`}><div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6"><Link href="/" className="text-lg font-extrabold text-sky-700">NayMos</Link><nav className="hidden items-center gap-2 md:flex"><Link href="/" className={pathname === '/' ? 'rounded-xl bg-sky-100 px-3 py-2 text-sm font-semibold text-sky-800' : 'rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-sky-50'}>หน้าหลัก</Link><Link href="/games" className={pathname.startsWith('/games') ? 'rounded-xl bg-sky-100 px-3 py-2 text-sm font-semibold text-sky-800' : 'rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-sky-50'}>เกม</Link></nav></div></header>;
}
