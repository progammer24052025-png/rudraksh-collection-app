import { NextRequest, NextResponse } from "next/server";
import { getProducts } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const filters: Parameters<typeof getProducts>[0] = {};
    if (sp.get("brand")) filters.brand = sp.get("brand")!;
    if (sp.get("category")) filters.category = sp.get("category")!;
    if (sp.get("search")) filters.search = sp.get("search")!;
    if (sp.get("minPrice")) filters.minPrice = Number(sp.get("minPrice"));
    if (sp.get("maxPrice")) filters.maxPrice = Number(sp.get("maxPrice"));
    if (sp.get("featured") === "1") filters.featured = true;
    if (sp.get("limit")) filters.limit = Number(sp.get("limit"));
    if (sp.get("offset")) filters.offset = Number(sp.get("offset"));

    const result = await getProducts(filters);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Products GET error:", err);
    return NextResponse.json({ error: "Failed to load products" }, { status: 500 });
  }
}
