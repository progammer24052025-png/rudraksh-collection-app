import { NextResponse } from "next/server";
import { deleteSession } from "@/lib/db";
import { SESSION_COOKIE } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const cookie = req.headers.get("cookie") || "";
    const match = cookie.match(/admin_session=([^;]+)/);
    if (match) await deleteSession(match[1]);

    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, maxAge: 0, path: "/" });
    return res;
  } catch {
    return NextResponse.json({ ok: true });
  }
}
