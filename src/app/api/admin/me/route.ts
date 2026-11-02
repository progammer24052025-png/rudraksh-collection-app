import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie, verifyToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token = getSessionCookie(req);
  if (!token) return NextResponse.json({ authenticated: false });
  const session = await verifyToken(token);
  if (!session) return NextResponse.json({ authenticated: false });
  return NextResponse.json({
    authenticated: true,
    email: session.email,
    name: session.name,
  });
}
