import { createClient } from '@/lib/supabase/server';

export type AdminProductRow = {
  id: string;
  name: string;
  price: number; // NayMos Selling Price
  cost: number; // Provider Cost
  reseller_price?: number | null;
  is_active: boolean; // Storefront Status: true = active, false = disabled
  availability?: 'available' | 'out_of_stock' | 'provider_error' | 'unavailable' | 'unknown';
  stock?: number | null;
  provider_product_id?: string | null;
  provider_code?: string | null;
  external_product_code?: string | null;
  provider_status_reason?: string | null;
  sort_order: number;
  game_id: string;
  game_name?: string;
  created_at: string;
};

export async function listProductsAdmin(limit = 300): Promise<AdminProductRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('products')
    .select('id, name, price, cost, reseller_price, is_active, availability, stock, provider_product_id, provider_status_reason, sort_order, game_id, created_at')
    .order('sort_order', { ascending: true })
    .limit(limit);

  if (error || !data) return [];

  const gameIds = [...new Set(data.map((p) => p.game_id))];
  const names: Record<string, string> = {};
  if (gameIds.length) {
    const { data: games } = await supabase.from('games').select('id, name').in('id', gameIds);
    (games ?? []).forEach((g) => {
      names[g.id] = g.name;
    });
  }

  // Get provider details if linked via provider_product_id
  const provProdIds = data.map((p) => p.provider_product_id).filter(Boolean);
  const provDetails: Record<string, { code: string; external_code: string; stock?: number; avail?: string }> = {};

  if (provProdIds.length > 0) {
    try {
      const { data: ppData } = await supabase
        .from('provider_products')
        .select('id, external_product_code, stock, availability, provider:providers(code)')
        .in('id', provProdIds);

      (ppData ?? []).forEach((pp: any) => {
        provDetails[pp.id] = {
          code: pp.provider?.code || 'external',
          external_code: pp.external_product_code,
          stock: pp.stock,
          avail: pp.availability,
        };
      });
    } catch {
      // Ignore if join fails
    }
  }

  return data.map((p) => {
    const pd = p.provider_product_id ? provDetails[p.provider_product_id] : null;
    return {
      id: p.id,
      name: p.name,
      price: Number(p.price || 0),
      cost: Number(p.cost || 0),
      reseller_price: p.reseller_price != null ? Number(p.reseller_price) : null,
      is_active: p.is_active ?? true,
      availability: (pd?.avail as any) || p.availability || 'available',
      stock: p.stock ?? pd?.stock ?? null,
      provider_product_id: p.provider_product_id || null,
      provider_code: pd?.code || (p.provider_product_id ? 'API' : 'Mock/Manual'),
      external_product_code: pd?.external_code || null,
      provider_status_reason: p.provider_status_reason || null,
      sort_order: p.sort_order ?? 0,
      game_id: p.game_id,
      game_name: names[p.game_id],
      created_at: p.created_at,
    };
  });
}
