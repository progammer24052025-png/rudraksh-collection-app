import { NextResponse } from "next/server";
import { runSeed } from "@/lib/seed";

export async function POST() {
  try {
    const result = await runSeed();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("Seed error:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
