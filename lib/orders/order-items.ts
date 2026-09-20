import type { OrderItem } from "@/types/order";

export function getOrderItems(order: { order_items?: OrderItem[]; items?: OrderItem[] }): OrderItem[] {
  return order.order_items ?? order.items ?? [];
}
