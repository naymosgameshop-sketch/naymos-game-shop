import type { CartItem, PlayerData } from "@/types/order";

export const MIN_CART_QUANTITY = 1;

function stablePlayerData(data: PlayerData): string {
  return JSON.stringify(Object.keys(data ?? {}).sort().reduce<Record<string, unknown>>((out, key) => {
    out[key] = data[key];
    return out;
  }, {}));
}

export function cartItemKey(item: Pick<CartItem, "productId" | "playerData">): string {
  return ;
}

export function normalizeCartItems(items: (CartItem | Record<string, any>)[]): CartItem[] {
  const merged = new Map<string, CartItem>();
  for (const raw of items) {
    if (!raw || typeof raw !== "object") continue;
    const productId = typeof raw.productId === "string" ? raw.productId : (typeof raw.product_id === "string" ? raw.product_id : null);
    const gameId = typeof raw.gameId === "string" ? raw.gameId : (typeof raw.game_id === "string" ? raw.game_id : null);
    if (!productId || !gameId) continue;

    const quantity = Math.max(MIN_CART_QUANTITY, Math.floor(Number(raw.quantity) || 0));
    const rawPlayerData = raw.playerData ?? raw.player_data ?? {};
    const playerData = (typeof rawPlayerData === "object" && rawPlayerData !== null ? rawPlayerData : {}) as PlayerData;

    const item: CartItem = {
      productId,
      gameId,
      quantity,
      playerData,
    };
    const key = cartItemKey(item);
    const existing = merged.get(key);
    if (existing) existing.quantity += quantity;
    else merged.set(key, item);
  }
  return Array.from(merged.values());
}

export function addToCart(items: CartItem[], item: CartItem): CartItem[] {
  return normalizeCartItems([...items, item]);
}

export function updateCartQuantity(items: CartItem[], productId: string, quantity: number, playerData: PlayerData = {}): CartItem[] {
  const key = cartItemKey({ productId, playerData });
  if (quantity < MIN_CART_QUANTITY) return items.filter((item) => cartItemKey(item) !== key);
  return items.map((item) => cartItemKey(item) === key ? { ...item, quantity: Math.floor(quantity) } : item);
}

export function removeFromCart(items: CartItem[], productId: string, playerData: PlayerData = {}): CartItem[] {
  const key = cartItemKey({ productId, playerData });
  return items.filter((item) => cartItemKey(item) !== key);
}

export function cartItemCount(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}
