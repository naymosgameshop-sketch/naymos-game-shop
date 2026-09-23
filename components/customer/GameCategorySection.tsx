'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Gamepad2, Layers, Search, Sparkles, Loader2 } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { GameWithDetails } from '@/lib/games/queries';
import type { ProductCategory } from '@/types/game';
import { catalogKeys, fetchGamesByCategory, fetchCategories } from '@/lib/query/catalog';
import { GameCard } from './GameCard';
import { GameCardSkeleton } from './GameCardSkeleton';

interface GameCategorySectionProps {
  games: GameWithDetails[];
  categories?: ProductCategory[];
  title?: string;
  subtitle?: string;
  showViewAll?: boolean;
}

// 12 Skeleton cards for desktop/tablet/mobile grid layout
const SKELETON_COUNT = 12;

export function GameCategorySection({
  games: initialGames = [],
  categories: initialCategories = [],
  title = 'เติมเกม',
  subtitle = 'เลือกเกมที่คุณต้องการเติม — ระบบอัตโนมัติ รวดเร็ว ปลอดภัย 100%',
}: GameCategorySectionProps) {
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 1. Categories Query with TanStack Query Cache
  const { data: categories = initialCategories } = useQuery({
    queryKey: catalogKeys.categories(),
    queryFn: fetchCategories,
    initialData: initialCategories.length > 0 ? initialCategories : undefined,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  // 2. Active Category Games Query
  const {
    data: games,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: catalogKeys.games(selectedCategory),
    queryFn: () => fetchGamesByCategory(selectedCategory),
    initialData: selectedCategory === 'all' && initialGames.length > 0 ? initialGames : undefined,
    staleTime: 5 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
  });

  // 3. Controlled Background Prefetching
  useEffect(() => {
    if (!categories || categories.length === 0) return;
    let isCancelled = false;

    const runSequentialPrefetch = async () => {
      await new Promise((resolve) => setTimeout(resolve, 1500));

      for (const cat of categories) {
        if (isCancelled) break;
        const key = catalogKeys.games(cat.id);

        if (!queryClient.getQueryData(key)) {
          try {
            await queryClient.prefetchQuery({
              queryKey: key,
              queryFn: () => fetchGamesByCategory(cat.id),
              staleTime: 5 * 60 * 1000,
            });
          } catch {
            // Ignore background prefetch errors silently
          }
          await new Promise((resolve) => setTimeout(resolve, 800));
        }
      }
    };

    runSequentialPrefetch();

    return () => {
      isCancelled = true;
    };
  }, [categories, queryClient]);

  // 4. Instant On-Demand Prefetch on Hover
  const handleCategoryHover = useCallback(
    (categoryId: string) => {
      const key = catalogKeys.games(categoryId);
      if (!queryClient.getQueryData(key)) {
        queryClient.prefetchQuery({
          queryKey: key,
          queryFn: () => fetchGamesByCategory(categoryId),
          staleTime: 5 * 60 * 1000,
        });
      }
    },
    [queryClient]
  );

  // 5. Client Search Filter
  const activeGames = games ?? [];
  const filteredGames = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return activeGames;
    return activeGames.filter(
      (game) =>
        game.name.toLowerCase().includes(q) ||
        (game.category && game.category.toLowerCase().includes(q))
    );
  }, [activeGames, searchQuery]);

  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
      {/* Header Banner - Matching Blue Gradient Style like Digital Products */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-700 p-6 sm:p-10 text-white shadow-xl shadow-sky-500/10">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold text-sky-100 mb-3 border border-white/20">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Game Top-up Services</span>
            {isFetching && !isLoading && (
              <span className="inline-flex items-center gap-1 text-[10px] text-white bg-sky-500/50 px-2 py-0.5 rounded-full ml-1">
                <Loader2 className="w-2.5 h-2.5 animate-spin" />
                อัปเดต
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            {title}
          </h1>
          <p className="mt-2 text-sm sm:text-base text-sky-100/90 leading-relaxed">
            {subtitle}
          </p>
        </div>
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none no-scrollbar">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            onMouseEnter={() => handleCategoryHover('all')}
            className={`px-4 py-2 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap transition-all shadow-2xs cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-sky-500 text-white shadow-sm ring-2 ring-sky-300/40'
                : 'bg-white text-slate-600 border border-sky-100 hover:bg-sky-50 hover:text-sky-600'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              <span>ทั้งหมด</span>
            </span>
          </button>

          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                onMouseEnter={() => handleCategoryHover(cat.id)}
                className={`px-4 py-2 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap transition-all shadow-2xs cursor-pointer ${
                  isSelected
                    ? 'bg-sky-500 text-white shadow-sm ring-2 ring-sky-300/40'
                    : 'bg-white text-slate-600 border border-sky-100 hover:bg-sky-50 hover:text-sky-600'
                }`}
              >
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px] sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ค้นหาชื่อเกมหรือบริการ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 rounded-full border border-sky-100 bg-white text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-sky-400/30 focus:border-sky-500 shadow-2xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* GameGrid */}
      {isLoading ? (
        <div
          role="status"
          aria-label="กำลังโหลดรายการเกม"
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-5"
        >
          {Array.from({ length: SKELETON_COUNT }).map((_, idx) => (
            <GameCardSkeleton key={`skeleton-${idx}`} />
          ))}
        </div>
      ) : filteredGames.length === 0 ? (
        <div className="rounded-3xl border border-sky-100 bg-white p-12 text-center shadow-xs">
          <Gamepad2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-700 text-base">ไม่พบรายการที่ค้นหา</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? `ไม่พบผลการค้นหาสำหรับ "${searchQuery}" ในหมวดหมู่นี้`
              : 'ยังไม่มีรายการเกมในหมวดหมู่นี้'}
          </p>
          <button
            onClick={() => {
              setSelectedCategory('all');
              setSearchQuery('');
            }}
            className="mt-4 px-4 py-2 rounded-xl bg-sky-50 text-sky-600 hover:bg-sky-100 text-xs sm:text-sm font-semibold transition cursor-pointer"
          >
            ดูรายการทั้งหมด
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-5 transition-opacity duration-200">
          {filteredGames.map((game, index) => (
            <GameCard key={game.id} game={game} priority={index < 6} />
          ))}
        </div>
      )}
    </section>
  );
}
