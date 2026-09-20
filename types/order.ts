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

export interface Order {
  id: string;
  order_number: string;
  user_id?: string | null;
  guest_email?: string | null;
  guest_phone?: string | null;
  game_id: string;
  product_id: string;
  amount: number;
  total: number;
  subtotal?: number;
  discount?: number;
  status: OrderStatus;
  player_data: Record<string, any>;
  payment_confirmed_at?: string | null;
  processing_started_at?: string | null;
  completed_at?: string | null;
  processing_admin_id?: string | null;
  completed_admin_id?: string | null;
  created_at: string;
  updated_at: string;
}
