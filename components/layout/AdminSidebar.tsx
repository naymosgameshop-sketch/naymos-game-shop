'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  CreditCard,
  Gamepad2,
  Package,
  Layers,
  Users,
  MessageSquare,
  Gift,
  Tag,
  Image as ImageIcon,
  Wallet,
  Coins,
  FileText,
  LifeBuoy,
  Settings,
  Landmark,
  ShieldCheck,
  Server,
  DollarSign,
  Smartphone,
  Music,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const NAV_GROUPS = [
  {
    title: 'OPERATIONS',
    items: [
      { href: '/admin', label: 'แดชบอร์ด', icon: LayoutDashboard },
      { href: '/admin/orders', label: 'Order Center', icon: ShoppingCart, hasBadge: true },
      { href: '/admin/payments', label: 'รายการชำระเงิน', icon: CreditCard },
    ],
  },
  {
    title: 'CATALOG',
    items: [
      { href: '/admin/games', label: 'จัดการเกม', icon: Gamepad2 },
      { href: '/admin/products', label: 'สินค้า & แพ็กเกจ', icon: Package },
      { href: '/admin/digital-products', label: 'แอปพรีเมียม / สินค้าดิจิทัล', icon: Smartphone },
      { href: '/admin/categories', label: 'หมวดหมู่สินค้า', icon: Layers },
    ],
  },
  {
    title: 'PROVIDERS',
    items: [
      { href: '/admin/providers', label: 'ผู้ให้บริการ & API', icon: Server },
    ],
  },
  {
    title: 'CUSTOMERS',
    items: [
      { href: '/admin/customers', label: 'จัดการลูกค้า', icon: Users },
      { href: '/admin/wallet', label: 'จัดการ Wallet', icon: Wallet },
      { href: '/admin/points', label: 'จัดการแต้มสะสม', icon: Coins },
      { href: '/admin/coupons', label: 'คูปองส่วนลด', icon: Tag },
    ],
  },
  {
    title: 'MARKETING',
    items: [
      { href: '/admin/promotions', label: 'โปรโมชั่น', icon: Gift },
      { href: '/admin/banners', label: 'แบนเนอร์', icon: ImageIcon },
    ],
  },
  {
    title: 'FINANCE',
    items: [
      { href: '/admin/reports', label: 'รายงานยอดขาย', icon: FileText },
      { href: '/admin/finance', label: 'การเงิน & กำไร', icon: DollarSign },
      { href: '/admin/bank', label: 'บัญชีธนาคาร/พร้อมเพย์', icon: Landmark },
    ],
  },
  {
    title: 'SYSTEM',
    items: [
      { href: '/admin/chat', label: 'แชทลูกค้า / บอท AI', icon: MessageSquare },
      { href: '/admin/support', label: 'ฝ่ายสนับสนุน', icon: LifeBuoy },
      { href: '/admin/music', label: 'จัดการเพลง BGM', icon: Music },
      { href: '/admin/settings', label: 'ตั้งค่าร้านค้า', icon: Settings },
    ],
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const [pendingCount, setPendingCount] = useState<number>(0);

  useEffect(() => {
    const supabase = createClient();

    async function loadCount() {
      const { count } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending', 'PENDING_PAYMENT', 'QUEUED', 'PAID', 'PROCESSING']);
      setPendingCount(count || 0);
    }

    loadCount();

    const channel = supabase
      .channel('admin-sidebar-badge')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          loadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 min-h-screen border-r border-slate-800">
      <div className="p-4 border-b border-slate-800 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-400">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <span className="font-extrabold text-sm text-white block">NayMos Admin</span>
          <span className="text-[10px] text-sky-400 font-mono">Backoffice Control</span>
        </div>
      </div>

      <nav className="p-3 space-y-4 overflow-y-auto flex-1">
        {NAV_GROUPS.map((group) => (
          <div key={group.title} className="space-y-1">
            <div className="px-3 text-[10px] font-bold text-slate-500 tracking-wider">
              {group.title}
            </div>
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={false}
                  className={`flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                    isActive
                      ? 'bg-sky-500 text-white shadow-xs'
                      : 'text-slate-400 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.hasBadge && pendingCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white animate-pulse">
                      {pendingCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
