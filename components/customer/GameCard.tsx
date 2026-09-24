'use client';

import React, { memo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Gamepad2, Ban } from 'lucide-react';
import type { GameWithDetails } from '@/lib/games/queries';

interface GameCardProps {
  game: GameWithDetails;
  priority?: boolean;
}

export const GameCard = memo(function GameCard({ game, priority = false }: GameCardProps) {
  // Provider Availability & Package Stock Check
  const isProviderDown =
    game.provider_availability && game.provider_availability !== 'available';
  const products = game.products || [];
  const hasProducts = products.length > 0;

  // Check if all packages are out of stock
  const allPackagesOutOfStock =
    hasProducts &&
    products.every(
      (p) =>
        p.availability === 'out_of_stock' ||
        (p.stock !== null && p.stock !== undefined && p.stock <= 0)
    );

  // Check if all packages are unavailable
  const allPackagesUnavailable =
    hasProducts &&
    products.every(
      (p) =>
        p.availability === 'out_of_stock' ||
        p.availability === 'provider_error' ||
        p.availability === 'unavailable' ||
        !p.is_active ||
        (p.stock !== null && p.stock !== undefined && p.stock <= 0)
    );

  const isUnavailable =
    isProviderDown || allPackagesOutOfStock || allPackagesUnavailable;

  const statusLabel = isProviderDown
    ? game.provider_availability === 'provider_error'
      ? 'ระบบต้นทางปิดปรับปรุง'
      : 'ไม่พร้อมให้บริการ'
    : allPackagesOutOfStock
    ? 'สินค้าหมดชั่วคราว'
    : 'ไม่พร้อมให้บริการ';

  return (
    <Link
      href={`/games/${game.slug}`}
      prefetch={!isUnavailable}
      className={`group relative flex flex-col bg-white rounded-xl sm:rounded-2xl border p-2 sm:p-2.5 transition-all duration-300 ${
        isUnavailable
          ? 'border-slate-200/90 shadow-none hover:border-slate-300 cursor-pointer'
          : 'border-sky-100/90 hover:border-sky-300 hover:shadow-lg hover:shadow-sky-500/10 hover:-translate-y-0.5'
      }`}
    >
      <div className="relative aspect-square w-full rounded-lg sm:rounded-xl overflow-hidden bg-gradient-to-br from-sky-50/80 to-blue-50/80 border border-sky-100/50 flex items-center justify-center">
        {game.icon ? (
          <Image
            src={game.icon}
            alt={game.name}
            fill
            unoptimized
            loading={priority ? 'eager' : 'lazy'}
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 25vw, 15vw"
            className={`object-cover transition-transform duration-500 ${
              isUnavailable
                ? 'grayscale contrast-75 brightness-90'
                : 'group-hover:scale-105'
            }`}
          />
        ) : (
          <Gamepad2
            className={`w-8 h-8 sm:w-10 sm:h-10 transition-transform ${
              isUnavailable ? 'text-slate-400 grayscale' : 'text-sky-400 group-hover:scale-110'
            }`}
          />
        )}

        {/* Grayscale overlay & status badge if unavailable */}
        {isUnavailable && (
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px] flex flex-col items-center justify-center p-2 text-center">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-rose-600/95 text-white text-[10px] sm:text-xs font-bold shadow-md">
              <Ban className="w-3 h-3" />
              {statusLabel}
            </span>
          </div>
        )}

        {game.product_category?.name && !isUnavailable && (
          <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-white/95 backdrop-blur-xs text-[9px] sm:text-[10px] font-bold text-sky-700 shadow-2xs border border-sky-100/60">
            {game.product_category.name}
          </div>
        )}
      </div>

      <div className="mt-2 sm:mt-2.5 flex flex-col flex-1 px-1 pb-1">
        <h3
          className={`font-bold text-xs sm:text-sm line-clamp-1 transition-colors ${
            isUnavailable ? 'text-slate-500' : 'text-slate-800 group-hover:text-sky-600'
          }`}
        >
          {game.name}
        </h3>
        <div className="flex items-center justify-between mt-1 text-[10px] sm:text-[11px] text-slate-400">
          <span className="line-clamp-1">{game.category || 'เติมเกมออนไลน์'}</span>
          {isUnavailable ? (
            <span className="text-rose-500 font-medium">ไม่พร้อมให้บริการ</span>
          ) : (
            <span className="text-sky-600 font-semibold group-hover:translate-x-0.5 transition-transform">
              เติมเงิน &rarr;
            </span>
          )}
        </div>
      </div>
    </Link>
  );
});
