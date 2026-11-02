import { NextRequest, NextResponse } from "next/server";
import { getAllSettings, setSetting } from "@/lib/db";
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
    const settings = await getAllSettings();
    return NextResponse.json({ settings });
  } catch (err) {
    console.error("Admin settings GET error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    for (const [key, value] of Object.entries(body)) {
      await setSetting(key, String(value));
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Admin settings PUT error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
