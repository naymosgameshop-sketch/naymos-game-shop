import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createPublicClient, createClient } from "@/lib/supabase/server";
import { MOCK_GAMES, type MockGame } from "@/lib/data/games";
import type { Game, GameField, Product, ProductCategory } from "@/types/game";

export type GameWithDetails = Game & {
  game_fields: GameField[];
  products: Product[];
  color: string;
};

const COLOR_MAP: Record<string, string> = {
  "free-fire": "from-orange-600 to-red-700",
  rov: "from-blue-600 to-indigo-700",
  "mobile-legends": "from-cyan-600 to-blue-700",
  valorant: "from-red-600 to-rose-800",
  "genshin-impact": "from-amber-500 to-orange-600",
  "pubg-mobile": "from-yellow-600 to-amber-800",
};

const GAME_SELECT_COLUMNS = "id, slug, name, description, category, product_category_id, icon, banner, is_active, sort_order, created_at, updated_at";
const GAME_FIELDS_COLUMNS = "id, game_id, name, label, type, placeholder, required, options, sort_order";
const PRODUCTS_COLUMNS = "id, game_id, name, description, amount, currency, price, cost, reseller_price, provider_product_id, is_active, sort_order";
const SAFE_PRODUCTS_COLUMNS = "id, game_id, name, description, amount, currency, price, is_active, sort_order";

function mockToGameWithDetails(m: MockGame, index: number): GameWithDetails {
  return {
    id: `mock-${m.slug}`,
    slug: m.slug,
    name: m.name,
    description: m.description,
    category: m.category,
    product_category_id: null,
    product_category: null,
    icon: null,
    banner: null,
    is_active: true,
    sort_order: index,
    color: m.color,
    game_fields: (m.fields || []).map((f: any, i: number) => ({
      id: `mock-gf-${m.slug}-${i}`,
      game_id: `mock-${m.slug}`,
      name: f.name,
      label: f.label,
      type: "text" as const,
      placeholder: f.placeholder,
      required: f.required,
      sort_order: i,
    })),
    products: (m.packages || []).map((p: any, i: number) => ({
      id: `mock-prod-${m.slug}-${i}`,
      game_id: `mock-${m.slug}`,
      name: p.name,
      description: null,
      amount: p.amount ? Number(p.amount) : null,
      currency: "THB",
      price: p.price,
      cost: p.price * 0.9,
      reseller_price: null,
      provider_product_id: null,
      is_active: true,
      sort_order: i,
    })),
  };
}

function getMockPackagesForGame(slug: string, gameId: string): Product[] {
  const mock = MOCK_GAMES.find((m) => m.slug === slug);
  if (!mock || !mock.packages) return [];
  return mock.packages.map((p: any, i: number) => ({
    id: `mock-prod-${slug}-${i}`,
    game_id: gameId,
    name: p.name,
    description: null,
    amount: p.amount ? Number(p.amount) : null,
    currency: "THB",
    price: p.price,
    cost: p.price * 0.9,
    reseller_price: null,
    provider_product_id: null,
    is_active: true,
    sort_order: i,
  }));
}

const getCachedProductCategories = unstable_cache(
  async (): Promise<ProductCategory[]> => {
    try {
      const supabase = createPublicClient();
      if (!supabase) {
        return [
          { id: "cat-uid", slug: "topup-uid", name: "เติมเกมแบบ UID", is_active: true, sort_order: 1 },
          { id: "cat-id-pass", slug: "topup-id-pass", name: "เติมเกมแบบ ID-Pass", is_active: true, sort_order: 2 },
        ];
      }
      const { data, error } = await supabase
        .from("product_categories")
        .select("id, slug, name, icon, is_active, sort_order, created_at, updated_at")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });

      if (error || !data) {
        return [
          { id: "cat-uid", slug: "topup-uid", name: "เติมเกมแบบ UID", is_active: true, sort_order: 1 },
          { id: "cat-id-pass", slug: "topup-id-pass", name: "เติมเกมแบบ ID-Pass", is_active: true, sort_order: 2 },
        ];
      }
      return data as ProductCategory[];
    } catch {
      return [
        { id: "cat-uid", slug: "topup-uid", name: "เติมเกมแบบ UID", is_active: true, sort_order: 1 },
        { id: "cat-id-pass", slug: "topup-id-pass", name: "เติมเกมแบบ ID-Pass", is_active: true, sort_order: 2 },
      ];
    }
  },
  ["product-categories-active"],
  { revalidate: 120, tags: ["categories"] }
);

export const getProductCategories = cache(async (): Promise<ProductCategory[]> => {
  return getCachedProductCategories();
});

export const getAllProductCategoriesAdmin = cache(async (): Promise<ProductCategory[]> => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("product_categories")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error || !data) return [];
    return data as ProductCategory[];
  } catch {
    return [];
  }
});

const getCachedActiveGames = unstable_cache(
  async (): Promise<GameWithDetails[]> => {
    try {
      const supabase = createPublicClient();
      if (!supabase) {
        return MOCK_GAMES.map((m, i) => mockToGameWithDetails(m, i));
      }

      const [gamesRes, categories] = await Promise.all([
        supabase
          .from("games")
          .select(GAME_SELECT_COLUMNS)
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),
        getCachedProductCategories(),
      ]);

      const gamesData = gamesRes.data;
      if (gamesRes.error || !gamesData || gamesData.length === 0) {
        return MOCK_GAMES.map((m, i) => mockToGameWithDetails(m, i));
      }

      return enrichGames(supabase, gamesData, categories);
    } catch {
      return MOCK_GAMES.map((m, i) => mockToGameWithDetails(m, i));
    }
  },
  ["active-games-catalog"],
  { revalidate: 60, tags: ["games"] }
);

export const getActiveGames = cache(async (): Promise<GameWithDetails[]> => {
  return getCachedActiveGames();
});

async function enrichGames(
  supabase: any,
  rawGamesData: any[],
  categories: ProductCategory[] = []
): Promise<GameWithDetails[]> {
  const gamesData = rawGamesData as any[];
  const gameIds = gamesData.map((g) => g.id);

  let [fieldsRes, productsRes] = await Promise.all([
    supabase
      .from("game_fields")
      .select(GAME_FIELDS_COLUMNS)
      .in("game_id", gameIds)
      .order("sort_order", { ascending: true }),
    supabase
      .from("products")
      .select(PRODUCTS_COLUMNS)
      .in("game_id", gameIds)
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
  ]);

  if (productsRes.error) {
    productsRes = await supabase
      .from("products")
      .select(SAFE_PRODUCTS_COLUMNS)
      .in("game_id", gameIds)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
  }

  const fieldsByGame: Record<string, GameField[]> = {};
  (fieldsRes.data ?? []).forEach((f: GameField) => {
    if (!fieldsByGame[f.game_id]) fieldsByGame[f.game_id] = [];
    fieldsByGame[f.game_id].push(f);
  });

  const productsByGame: Record<string, Product[]> = {};
  (productsRes.data ?? []).forEach((p: Product) => {
    if (!productsByGame[p.game_id]) productsByGame[p.game_id] = [];
    productsByGame[p.game_id].push(p);
  });

  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  return gamesData.map((g) => {
    let prods = productsByGame[g.id] ?? [];
    if (prods.length === 0) {
      prods = getMockPackagesForGame(g.slug, g.id);
    }
    return {
      ...g,
      product_category: g.product_category_id ? categoryMap.get(g.product_category_id) ?? null : null,
      color: COLOR_MAP[g.slug] ?? "from-sky-500 to-blue-600",
      game_fields: fieldsByGame[g.id] ?? [],
      products: prods,
    };
  });
}

const getCachedGameBySlug = unstable_cache(
  async (slug: string): Promise<GameWithDetails | null> => {
    try {
      const supabase = createPublicClient();
      if (!supabase) {
        const mockIndex = MOCK_GAMES.findIndex((m) => m.slug === slug);
        if (mockIndex !== -1) {
          return mockToGameWithDetails(MOCK_GAMES[mockIndex], mockIndex);
        }
        return null;
      }

      const [gameRes, categories] = await Promise.all([
        supabase
          .from("games")
          .select(GAME_SELECT_COLUMNS)
          .eq("slug", slug)
          .maybeSingle(),
        getCachedProductCategories(),
      ]);

      const game = gameRes.data as any;
      if (gameRes.error || !game) {
        const mockIndex = MOCK_GAMES.findIndex((m) => m.slug === slug);
        if (mockIndex !== -1) {
          return mockToGameWithDetails(MOCK_GAMES[mockIndex], mockIndex);
        }
        return null;
      }

      let [fieldsRes, productsRes] = await Promise.all([
        supabase
          .from("game_fields")
          .select(GAME_FIELDS_COLUMNS)
          .eq("game_id", game.id)
          .order("sort_order", { ascending: true }),
        supabase
          .from("products")
          .select(PRODUCTS_COLUMNS)
          .eq("game_id", game.id)
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),
      ]);

      if (productsRes.error) {
        productsRes = await supabase
          .from("products")
          .select(SAFE_PRODUCTS_COLUMNS)
          .eq("game_id", game.id)
          .eq("is_active", true)
          .order("sort_order", { ascending: true });
      }

      let products: Product[] = productsRes.data ?? [];
      if (products.length === 0) {
        products = getMockPackagesForGame(game.slug, game.id);
      }

      const categoryMap = new Map(categories.map((c) => [c.id, c]));
      const product_category = game.product_category_id ? categoryMap.get(game.product_category_id) ?? null : null;

      return {
        ...game,
        product_category,
        color: COLOR_MAP[game.slug] ?? "from-sky-500 to-blue-600",
        game_fields: fieldsRes.data ?? [],
        products,
      };
    } catch {
      const mockIndex = MOCK_GAMES.findIndex((m) => m.slug === slug);
      if (mockIndex !== -1) {
        return mockToGameWithDetails(MOCK_GAMES[mockIndex], mockIndex);
      }
      return null;
    }
  },
  ["game-detail-by-slug"],
  { revalidate: 60, tags: ["games"] }
);

export const getGameBySlug = cache(async (slug: string): Promise<GameWithDetails | null> => {
  return getCachedGameBySlug(slug);
});

export const getAllGamesAdmin = cache(async (): Promise<Game[]> => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("games")
      .select("*, product_category:product_categories(*)")
      .order("sort_order", { ascending: true });

    if (error || !data) {
      const fallback = await supabase
        .from("games")
        .select("*")
        .order("sort_order", { ascending: true });
      return (fallback.data as Game[]) ?? [];
    }
    return data as Game[];
  } catch {
    return [];
  }
});

export const getGameMetadata = cache(async (slug: string): Promise<{ name: string; description: string | null } | null> => {
  const game = await getGameBySlug(slug);
  if (!game) return null;
  return { name: game.name, description: game.description ?? null };
});
