import { normalizeCartItems } from "@/lib/orders/cart";
import { createClient } from "@/lib/supabase/server";
import type { CartItem } from "@/types/order";

type CreateMultiOrderInput = {
  items: CartItem[];
  couponCode?: string | null;
  pointsToUse?: number;
};

export async function createMultiItemOrder(input: CreateMultiOrderInput) {
  const items = normalizeCartItems(input.items);
  if (items.length === 0) throw new Error("Cart is empty");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_multi_item_order", {
    p_items: items,
    p_coupon_code: input.couponCode ?? null,
    p_points_to_use: input.pointsToUse ?? 0,
  });
  if (error) throw error;
  return data;
}
