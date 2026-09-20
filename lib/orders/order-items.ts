import type { OrderItem } from "@/types/order";

export type LegacyOrder = {
  id: string;
  product_id?: string | null;
  game_id?: string | null;
  player_data?: Record<string, unknown> | null;
  subtotal?: number | string | null;
  created_at?: string;
  updated_at?: string;
  order_items?: OrderItem[];
  items?: OrderItem[];
};

export function getOrderWithItems(order: LegacyOrder): LegacyOrder & { items: OrderItem[] } {
  const existing = order.order_items ?? order.items ?? [];
  if (existing.length > 0) return { ...order, items: existing };
  if (!order.product_id || !order.game_id) return { ...order, items: [] };
  const subtotal = Number(order.subtotal ?? 0);
  return {
    ...order,
    items: [{
      id: `legacy:${order.id}`,
      orderId: order.id,
      productId: order.product_id,
      gameId: order.game_id,
      quantity: 1,
      unitPrice: subtotal,
      costPrice: 0,
      subtotal,
      playerData: order.player_data ?? {},
      status: "PENDING",
      createdAt: order.created_at ?? "",
      updatedAt: order.updated_at ?? "",
    }],
  };
}
