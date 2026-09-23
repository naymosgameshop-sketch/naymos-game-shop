import { normalizeCartItems } from "@/lib/orders/cart";
import { createClient } from "@/lib/supabase/server";
import type { CartItem } from "@/types/order";

type CreateMultiOrderInput = {
  items: CartItem[];
  couponCode?: string | null;
  pointsToUse?: number;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ERROR_MESSAGES: Record<string, string> = {
  AUTHENTICATION_REQUIRED: "กรุณาเข้าสู่ระบบก่อนสั่งซื้อ",
  CART_EMPTY: "ตะกร้าว่าง กรุณาเลือกแพ็กเกจอย่างน้อย 1 รายการ",
  INVALID_POINTS: "จำนวนแต้มที่ต้องการใช้ไม่ถูกต้อง",
  PROFILE_NOT_FOUND: "ไม่พบข้อมูลผู้ใช้ในระบบ กรุณาติดต่อผู้ดูแล",
  INVALID_QUANTITY: "จำนวนแพ็กเกจไม่ถูกต้อง",
  INVALID_PRODUCT: "ไม่พบแพ็กเกจที่เลือก หรือแพ็กเกจถูกปิดใช้งานชั่วคราว",
  PRODUCT_GAME_MISMATCH: "แพ็กเกจไม่ตรงกับเกมที่เลือก กรุณาเลือกใหม่อีกครั้ง",
  INVALID_PLAYER_DATA: "ข้อมูลผู้เล่นไม่ถูกต้อง",
  MISSING_REQUIRED_FIELD: "กรุณากรอกข้อมูลผู้เล่นให้ครบถ้วน",
  UNKNOWN_PLAYER_FIELD: "ข้อมูลผู้เล่นบางรายการไม่ตรงกับที่ระบบกำหนด",
  DUPLICATE_CART_ITEM: "พบรายการซ้ำในตะกร้า กรุณาลบรายการซ้ำแล้วลองใหม่",
};

function toReadableError(error: unknown): Error {
  if (error && typeof error === "object") {
    const e = error as { message?: string; code?: string; details?: string; hint?: string };
    const raw = e.message || e.code || "";
    if (raw.includes("invalid input syntax for type uuid")) {
      return new Error("แพ็กเกจที่เลือกไม่พร้อมใช้งาน (ระบบอาจกำลังแสดงข้อมูลตัวอย่าง) กรุณาลองใหม่ภายหลัง");
    }
    const matched = Object.keys(ERROR_MESSAGES).find((key) => raw.startsWith(key));
    if (matched) {
      const suffix = raw.slice(matched.length).replace(/^:\s*/, "").trim();
      return new Error(suffix ? `${ERROR_MESSAGES[matched]} (${suffix})` : ERROR_MESSAGES[matched]);
    }
    if (raw) return new Error(raw);
  }
  return new Error("สร้างคำสั่งซื้อไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
}

export async function createMultiItemOrder(input: CreateMultiOrderInput) {
  const items = normalizeCartItems(input.items);
  if (items.length === 0) throw new Error("ตะกร้าว่าง กรุณาเลือกแพ็กเกจอย่างน้อย 1 รายการ");

  // Guard: products/games must be real DB rows (UUID). Mock/placeholder ids cannot be ordered.
  const invalidItem = items.find((item) => !UUID_RE.test(item.productId) || !UUID_RE.test(item.gameId));
  if (invalidItem) {
    throw new Error("แพ็กเกจที่เลือกไม่พร้อมใช้งาน (ระบบอาจกำลังแสดงข้อมูลตัวอย่าง) กรุณาลองใหม่ภายหลัง");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_multi_item_order", {
    p_items: items,
    p_coupon_code: input.couponCode ?? null,
    p_points_to_use: input.pointsToUse ?? 0,
  });
  if (error) throw toReadableError(error);
  return data;
}
