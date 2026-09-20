import { NextResponse } from "next/server";
import { createMultiItemOrder } from "@/lib/orders/create-multi-order";
import { getSessionUser } from "@/lib/auth/get-user";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  try {
    const body = await request.json();
    const result = await createMultiItemOrder({ items: Array.isArray(body.items) ? body.items : [], couponCode: body.couponCode, pointsToUse: body.pointsToUse });
    return NextResponse.json({ order: result }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create order" }, { status: 400 });
  }
}
