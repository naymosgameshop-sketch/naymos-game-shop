import type { CartItem, PlayerData } from "@/types/order";

export const MIN_CART_QUANTITY = 1;

function stablePlayerData(data: PlayerData): string {
  return JSON.stringify(Object.keys(data ?? {}).sort().reduce<Record<string, unknown>>((out, key) => {
    out[key] = data[key];
    return out;
  }, {}));
}

export function cartItemKey(item: Pick<CartItem, "productId" | "playerData">): string {
  return `${item.productId}:${stablePlayerData(item.playerData ?? {})}`;
}

export function normalizeCartItems(items: CartItem[]): CartItem[] {
  const merged = new Map<string, CartItem>();
  for (const item of items) {
    if (!item || typeof item.productId !== "string" || typeof item.gameId !== "string") continue;
    const quantity = Math.max(MIN_CART_QUANTITY, Math.floor(Number(item.quantity) || 0));
    const key = cartItemKey(item);
    const existing = merged.get(key);
    if (existing) existing.quantity += quantity;
    else merged.set(key, { ...item, quantity, playerData: { ...(item.playerData ?? {}) } });
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
