import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createPublicClient, createClient } from "@/lib/supabase/server";
import { MOCK_GAMES, GAME_COVERS, type MockGame } from "@/lib/data/games";
import type { Game, GameField, Product, ProductCategory } from "@/types/game";

export type GameWithDetails = Game & {
  game_fields: GameField[];
  products: Product[];
  color: string;
};

const COLOR_MAP: Record<string, string> = {
  "free-fire": "from-orange-600 to-red-700",
  "rov": "from-blue-600 to-indigo-700",
  "mobile-legends": "from-cyan-600 to-blue-700",
  "valorant": "from-red-600 to-rose-800",
  "genshin-impact": "from-amber-500 to-orange-600",
  "pubg-mobile": "from-yellow-600 to-amber-800",
};

const GAME_SELECT_COLUMNS = "id, slug, name, description, category, product_category_id, icon, banner, is_active, provider_availability, provider_error_message, sort_order, created_at, updated_at";
const GAME_FIELDS_COLUMNS = "id, game_id, name, label, type, placeholder, required, options, sort_order";
const PRODUCTS_COLUMNS = "id, game_id, name, description, amount, currency, price, cost, reseller_price, provider_product_id, is_active, availability, stock, provider_status_reason, last_provider_check_at, sort_order";
const SAFE_PRODUCTS_COLUMNS = "id, game_id, name, description, amount, currency, price, is_active, availability, stock, sort_order";

function mockToGameWithDetails(m: MockGame, index: number): GameWithDetails {
  return {
    id: `mock-${m.slug}`,
    slug: m.slug,
    name: m.name,
    description: m.description,
    category: m.category,
    product_category_id: null,
    product_category: null,
    icon: m.icon || GAME_COVERS[m.slug] || null,
    banner: null,
    is_active: true,
    provider_availability: 'available',
    provider_error_message: null,
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
      reseller_price: Math.round(p.price * 0.95),
      provider_product_id: null,
      is_active: true,
      availability: 'available' as const,
      stock: 100,
      provider_status_reason: null,
      last_provider_check_at: null,
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
    reseller_price: Math.round(p.price * 0.95),
    provider_product_id: null,
    is_active: true,
    availability: 'available' as const,
    stock: 100,
    provider_status_reason: null,
    last_provider_check_at: null,
    sort_order: i,
  }));
}

const getCachedProductCategories = unstable_cache(
  async (): Promise<ProductCategory[]> => {
    try {
      const supabase = createPublicClient();
      const { data, error } = await supabase
        .from("product_categories")
        .select("id, slug, name, description, is_active, sort_order, created_at, updated_at")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error || !data) return [];
      return data;
    } catch {
      return [];
    }
  },
  ["product-categories-active"],
  { revalidate: 3600, tags: ["product-categories"] }
);

export async function getProductCategories(): Promise<ProductCategory[]> {
  return getCachedProductCategories();
}

export async function getAllProductCategoriesAdmin(): Promise<ProductCategory[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("product_categories")
      .select("id, slug, name, description, is_active, sort_order, created_at, updated_at")
      .order("sort_order", { ascending: true });
    if (error || !data) return [];
    return data;
  } catch {
    return [];
  }
}

// Storefront query: filters by Admin Store Visibility (is_active = true)
export const getActiveGames = cache(async (): Promise<GameWithDetails[]> => {
  return unstable_cache(
    async (): Promise<GameWithDetails[]> => {
      try {
        const supabase = createPublicClient();
        const { data: dbGames, error } = await supabase
          .from("games")
          .select(
            `${GAME_SELECT_COLUMNS}, product_category:product_categories(id, slug, name, description, is_active, sort_order), game_fields(${GAME_FIELDS_COLUMNS}), products(${SAFE_PRODUCTS_COLUMNS})`
          )
          .eq("is_active", true)
          .order("sort_order", { ascending: true });

        if (!error && dbGames && dbGames.length > 0) {
          return dbGames.map((g: any) => {
            const fields = (g.game_fields || []).sort(
              (a: any, b: any) => a.sort_order - b.sort_order
            );
            let products = (g.products || []).sort(
              (a: any, b: any) => a.sort_order - b.sort_order
            );
            if (products.length === 0) {
              products = getMockPackagesForGame(g.slug, g.id);
            }
            return {
              ...g,
              icon: g.icon || GAME_COVERS[g.slug] || null,
              game_fields: fields,
              products,
              color: COLOR_MAP[g.slug] || "from-sky-600 to-blue-700",
            };
          });
        }
      } catch {
        // Fallback to mock data if DB unavailable
      }
      return MOCK_GAMES.map(mockToGameWithDetails);
    },
    ["active-games-catalog-v3"],
    { revalidate: 60, tags: ["games"] }
  )();
});

export const getGameBySlug = cache(
  async (slug: string): Promise<GameWithDetails | null> => {
    return unstable_cache(
      async (s: string): Promise<GameWithDetails | null> => {
        try {
          const supabase = createPublicClient();
          const { data, error } = await supabase
            .from("games")
            .select(
              `${GAME_SELECT_COLUMNS}, product_category:product_categories(id, slug, name, description, is_active, sort_order), game_fields(${GAME_FIELDS_COLUMNS}), products(${SAFE_PRODUCTS_COLUMNS})`
            )
            .eq("slug", s)
            .maybeSingle();

          if (!error && data) {
            const fields = (data.game_fields || []).sort(
              (a: any, b: any) => a.sort_order - b.sort_order
            );
            let products = (data.products || []).sort(
              (a: any, b: any) => a.sort_order - b.sort_order
            );
            if (products.length === 0) {
              products = getMockPackagesForGame(s, data.id);
            }
            return {
              ...data,
              icon: data.icon || GAME_COVERS[s] || null,
              game_fields: fields,
              products,
              color: COLOR_MAP[s] || "from-sky-600 to-blue-700",
            };
          }
        } catch {
          // Fallback to mock
        }
        const mockIdx = MOCK_GAMES.findIndex((m) => m.slug === s);
        if (mockIdx !== -1) {
          return mockToGameWithDetails(MOCK_GAMES[mockIdx], mockIdx);
        }
        return null;
      },
      [`game-by-slug-v3-${slug}`],
      { revalidate: 60, tags: [`game-${slug}`] }
    )(slug);
  }
);

export async function getAllGamesAdmin(): Promise<GameWithDetails[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("games")
      .select(
        `${GAME_SELECT_COLUMNS}, product_category:product_categories(id, slug, name, description, is_active, sort_order), game_fields(${GAME_FIELDS_COLUMNS}), products(${PRODUCTS_COLUMNS})`
      )
      .order("sort_order", { ascending: true });

    if (!error && data) {
      return data.map((g: any) => ({
        ...g,
        icon: g.icon || GAME_COVERS[g.slug] || null,
        game_fields: (g.game_fields || []).sort(
          (a: any, b: any) => a.sort_order - b.sort_order
        ),
        products: (g.products || []).sort(
          (a: any, b: any) => a.sort_order - b.sort_order
        ),
        color: COLOR_MAP[g.slug] || "from-sky-600 to-blue-700",
      }));
    }
  } catch {
    // Return empty array
  }
  return [];
}
