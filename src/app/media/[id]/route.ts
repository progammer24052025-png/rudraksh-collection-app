/**
 * Serves a stored photo at /media/{id}.
 *
 * Each address is permanent and its picture never changes, so it is cached
 * for a year by browsers and by Vercel's CDN; the database is read only the
 * first time a photo is requested.
 */
import { readMedia } from "@/lib/server/media";
import { isSecureCheckout } from "@/lib/server/rtdb-admin";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isSecureCheckout()) return new Response("Not available", { status: 503 });

  const record = await readMedia(id).catch(() => null);
  if (!record?.data || !record.type) {
    return new Response("Not found", { status: 404, headers: { "cache-control": "public, max-age=60" } });
  }

  const body = Buffer.from(record.data, "base64");
  return new Response(body, {
    headers: {
      "content-type": record.type,
      "content-length": String(body.length),
      "cache-control": "public, max-age=31536000, s-maxage=31536000, immutable",
      "x-content-type-options": "nosniff",
      // An SVG opened on its own must not be able to run anything.
      "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      "x-robots-tag": "noindex",
    },
  });
}
