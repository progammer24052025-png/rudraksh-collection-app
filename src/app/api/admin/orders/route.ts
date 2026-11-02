import { NextRequest, NextResponse } from "next/server";
import { getOrders, updateOrderStatus } from "@/lib/db";
import { getSessionCookie, verifyToken } from "@/lib/auth";

async function requireAdmin(req: NextRequest): Promise<boolean> {
  const token = getSessionCookie(req);
  if (!token) return false;
  const session = await verifyToken(token);
  return !!session;
}

export async function GET(req: NextRequest) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const status = req.nextUrl.searchParams.get("status") || undefined;
    const orders = await getOrders(status);
    return NextResponse.json({ orders });
  } catch (err) {
    console.error("Admin orders GET error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id, order_status, payment_status } = await req.json();
    await updateOrderStatus(id, order_status, payment_status);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Admin orders PUT error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
