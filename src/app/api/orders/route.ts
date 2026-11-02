import { NextRequest, NextResponse } from "next/server";
import { createOrder, getOrders } from "@/lib/db";
import { getSessionCookie, verifyToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { customer_name, phone, email, address, city, state, pincode, items, subtotal, shipping, total, payment_method, notes } = body;

    if (!customer_name || !phone || !address || !city || !state || !pincode) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    const order = await createOrder({
      customer_name, phone, email, address, city, state, pincode,
      items, subtotal: subtotal ?? 0, shipping: shipping ?? 0, total: total ?? 0,
      payment_method: payment_method === "razorpay" ? "razorpay" : "cod",
      notes,
    });

    return NextResponse.json({ ok: true, order });
  } catch (err) {
    console.error("Order POST error:", err);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const token = getSessionCookie(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const session = await verifyToken(token);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const status = req.nextUrl.searchParams.get("status") || undefined;
    const orders = await getOrders(status);
    return NextResponse.json({ orders });
  } catch (err) {
    console.error("Orders GET error:", err);
    return NextResponse.json({ error: "Failed to load orders" }, { status: 500 });
  }
}
