import { NextRequest, NextResponse } from "next/server";
import { getAdminByEmail, createSession, createAdmin } from "@/lib/db";
import { verifyPassword, hashPassword, signToken, SESSION_COOKIE, SESSION_DURATION } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    let admin = await getAdminByEmail(email);

    // Bootstrap: create default admin on first login attempt
    if (!admin && email === "admin@rudrakshcollection.in" && password.length >= 8) {
      const hash = await hashPassword(password);
      await createAdmin(email, hash, "Store Owner");
      admin = await getAdminByEmail(email);
    }

    if (!admin) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const valid = await verifyPassword(password, admin.password_hash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = await signToken({
      adminId: admin.id,
      email: admin.email,
      exp: Date.now() + SESSION_DURATION,
    });

    await createSession(token, admin.id, new Date(Date.now() + SESSION_DURATION));

    const res = NextResponse.json({ ok: true, email: admin.email, name: admin.name });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: SESSION_DURATION / 1000,
      path: "/",
    });
    return res;
  } catch (err) {
    console.error("Admin login error:", err);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
