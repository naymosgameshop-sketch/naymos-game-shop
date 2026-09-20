import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeCartItems } from "@/lib/orders/cart";
import type { CartItem } from "@/types/order";

type ProductRow = {
  id: string;
  game_id: string;
  price: number | string;
  reseller_price: number | string | null;
  cost: number | string;
  is_active: boolean;
};

type CreateMultiOrderInput = {
  userId: string;
  items: CartItem[];
  couponCode?: string | null;
  pointsToUse?: number;
};

export async function createMultiItemOrder(input: CreateMultiOrderInput) {
  const items = normalizeCartItems(input.items);
  if (items.length === 0) throw new Error("Cart is empty");
  const admin = createAdminClient();
  const productIds = Array.from(new Set(items.map((item) => item.productId)));
  const { data: products, error } = await admin.from("products").select("id,game_id,price,reseller_price,cost,is_active").in("id", productIds);
  if (error) throw error;
  const byId = new Map((products as ProductRow[]).map((p) => [p.id, p]));
  const normalized = items.map((item) => {
    const product = byId.get(item.productId);
    if (!product || !product.is_active || product.game_id !== item.gameId) throw new Error("Invalid product");
    const unitPrice = Number(product.price);
    const subtotal = unitPrice * item.quantity;
    return { item, product, unitPrice, subtotal };
  });
  const subtotal = normalized.reduce((sum, row) => sum + row.subtotal, 0);
  const discount = 0;
  const total = subtotal - discount;
  const { data: order, error: orderError } = await admin.from("orders").insert({ user_id: input.userId, game_id: normalized[0].item.gameId, product_id: normalized[0].item.productId, player_data: normalized[0].item.playerData, subtotal, discount, fee: 0, total, status: "PENDING_PAYMENT" }).select("*").single();
  if (orderError || !order) throw orderError ?? new Error("Order creation failed");
  const { error: itemError } = await admin.from("order_items").insert(normalized.map(({ item, product, unitPrice, subtotal: itemSubtotal }) => ({ order_id: order.id, product_id: product.id, game_id: product.game_id, quantity: item.quantity, unit_price: unitPrice, cost_price: Number(product.cost), subtotal: itemSubtotal, player_data: item.playerData, status: "PENDING" })));
  if (itemError) throw itemError;
  return { order, items: normalized };
}
