import { NextRequest, NextResponse } from "next/server";
import { getProducts, upsertProduct, deleteProduct } from "@/lib/db";
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
    const sp = req.nextUrl.searchParams;
    const filters: Parameters<typeof getProducts>[0] = { limit: 200 };
    if (sp.get("search")) filters.search = sp.get("search")!;
    if (sp.get("brand")) filters.brand = sp.get("brand")!;
    const result = await getProducts(filters);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Admin products GET error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    await upsertProduct(body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Admin products POST error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await req.json();
    await deleteProduct(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Admin products DELETE error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
