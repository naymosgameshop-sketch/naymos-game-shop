import type { CartItem, PlayerData } from "@/types/order";

export const MIN_CART_QUANTITY = 1;

export function normalizeCartItems(items: CartItem[]): CartItem[] {
  const merged = new Map<string, CartItem>();

  for (const item of items) {
    if (!item || typeof item.productId !== "string" || typeof item.gameId !== "string") continue;
    const quantity = Math.max(MIN_CART_QUANTITY, Math.floor(Number(item.quantity) || 0));
    const key = item.productId;
    const existing = merged.get(key);
    if (existing) {
      existing.quantity += quantity;
      if (Object.keys(existing.playerData ?? {}).length === 0) {
        existing.playerData = (item.playerData ?? {}) as PlayerData;
      }
    } else {
      merged.set(key, {
        productId: item.productId,
        gameId: item.gameId,
        quantity,
        playerData: (item.playerData ?? {}) as PlayerData,
      });
    }
  }

  return Array.from(merged.values());
}

export function addToCart(items: CartItem[], item: CartItem): CartItem[] {
  return normalizeCartItems([...items, item]);
}

export function updateCartQuantity(items: CartItem[], productId: string, quantity: number): CartItem[] {
  if (quantity < MIN_CART_QUANTITY) return items.filter((item) => item.productId !== productId);
  return items.map((item) => item.productId === productId ? { ...item, quantity: Math.floor(quantity) } : item);
}

export function removeFromCart(items: CartItem[], productId: string): CartItem[] {
  return items.filter((item) => item.productId !== productId);
}

export function cartItemCount(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}
