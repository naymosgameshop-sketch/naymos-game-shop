export type OrderStatus =
  | "PENDING_PAYMENT"
  | "PAID"
  | "QUEUED"
  | "PROCESSING"
  | "SUCCESS"
  | "FAILED"
  | "REFUND_PENDING"
  | "REFUNDED"
  | "CANCELLED";

export type OrderItemStatus = "PENDING" | "PROCESSING" | "SUCCESS" | "FAILED";

export type PlayerData = Record<string, unknown>;

export interface CartItem {
  productId: string;
  gameId: string;
  quantity: number;
  playerData: PlayerData;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  gameId: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  subtotal: number;
  playerData: PlayerData;
  status: OrderItemStatus;
  createdAt: string;
  updatedAt: string;
}
