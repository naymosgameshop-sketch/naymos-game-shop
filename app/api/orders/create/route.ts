import { NextResponse } from "next/server";
import { createMultiItemOrder } from "@/lib/orders/create-multi-order";
import { getSessionUser } from "@/lib/auth/get-user";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อนสั่งซื้อ" }, { status: 401 });
  try {
    const body = await request.json();
    const result = await createMultiItemOrder({
      items: Array.isArray(body.items) ? body.items : [],
      couponCode: body.couponCode,
      pointsToUse: body.pointsToUse,
    });
    return NextResponse.json({ order: result }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === "string"
          ? error
          : typeof error === "object" && error !== null && "message" in error
            ? String((error as { message: unknown }).message)
            : "สร้างคำสั่งซื้อไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
    return NextResponse.json({ error: message || "Unable to create order" }, { status: 400 });
  }
}
