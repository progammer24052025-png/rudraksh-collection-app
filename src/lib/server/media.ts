/**
 * The store's photo storage.
 *
 * Photos uploaded in admin used to stay on the device that picked them, and
 * brand logos were kept as text inside the brand list (making it 7 MB). Now
 * every picture is stored once, on its own, under `media/{id}` in the
 * database, and served at `/media/{id}` with a year-long cache — so Vercel's
 * CDN answers almost every request and the database is read only once per
 * photo. Catalogue records hold just the short `/media/{id}` address.
 *
 * Database rules keep `media` server-only; only admins can upload (checked in
 * the upload route) and anyone can view through the public address.
 */
import { randomBytes } from "node:crypto";

import { adminDelete, adminGet, adminKeys, adminSet } from "@/lib/server/rtdb-admin";

export type MediaRecord = {
  type: string;
  /** Base64 of the file's bytes. */
  data: string;
  bytes: number;
  name?: string;
  created_at: string;
};

/**
 * After compression a product photo is ~100–300 KB. The higher ceiling is for
 * logos moved from old records, which were saved uncompressed (up to ~1.3 MB).
 */
export const MAX_MEDIA_BYTES = 2_500_000;
export const MEDIA_TYPES = new Set(["image/webp", "image/png", "image/jpeg", "image/gif", "image/svg+xml"]);
export const MEDIA_PREFIX = "/media/";

export const isMediaUrl = (value: unknown): value is string =>
  typeof value === "string" && /^\/media\/[A-Za-z0-9_-]{16,40}$/.test(value);
export const mediaIdOf = (url: string) => url.slice(MEDIA_PREFIX.length);

/** Checks that the bytes really are the image type they claim to be. */
function matchesType(type: string, bytes: Buffer): boolean {
  const head = bytes.subarray(0, 16);
  switch (type) {
    case "image/png":
      return head.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    case "image/jpeg":
      return head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
    case "image/gif":
      return head.subarray(0, 4).toString("ascii") === "GIF8";
    case "image/webp":
      return head.subarray(0, 4).toString("ascii") === "RIFF" && head.subarray(8, 12).toString("ascii") === "WEBP";
    case "image/svg+xml": {
      const text = bytes.subarray(0, 2048).toString("utf8").toLowerCase();
      return text.includes("<svg");
    }
    default:
      return false;
  }
}

/** The raster type the bytes really are, whatever the label says. */
function sniffType(bytes: Buffer): string | null {
  for (const type of ["image/png", "image/jpeg", "image/gif", "image/webp"]) {
    if (matchesType(type, bytes)) return type;
  }
  return null;
}

export type StoreResult = { ok: true; url: string; bytes: number } | { ok: false; error: string };

/** Validates and stores one picture, returning its permanent address. */
export async function storeMedia(input: { type: string; base64: string; name?: string }): Promise<StoreResult> {
  let type = input.type.toLowerCase().trim();
  if (!MEDIA_TYPES.has(type)) return { ok: false, error: "Only WebP, PNG, JPEG, GIF or SVG images can be stored." };

  let bytes: Buffer;
  try {
    bytes = Buffer.from(input.base64, "base64");
  } catch {
    return { ok: false, error: "That image could not be read." };
  }
  if (!bytes.length) return { ok: false, error: "That image is empty." };
  if (bytes.length > MAX_MEDIA_BYTES) return { ok: false, error: "That image is too large even after compression." };
  if (!matchesType(type, bytes)) {
    // Old records often label a PNG as JPEG. A real picture of another allowed
    // raster type is stored and served as what it actually is; anything that
    // is not a recognisable picture is still refused.
    const actual = type === "image/svg+xml" ? null : sniffType(bytes);
    if (!actual) return { ok: false, error: "That file is not the image type it claims to be." };
    type = actual;
  }

  const id = randomBytes(15).toString("base64url");
  const record: MediaRecord = {
    type,
    data: bytes.toString("base64"),
    bytes: bytes.length,
    ...(input.name ? { name: input.name.slice(0, 120) } : {}),
    created_at: new Date().toISOString(),
  };
  await adminSet(`media/${id}`, record);
  return { ok: true, url: `${MEDIA_PREFIX}${id}`, bytes: bytes.length };
}

/** Moves a `data:` URL into storage. Anything else is returned unchanged. */
export async function dataUrlToMedia(value: unknown, name?: string): Promise<{ value: unknown; moved: boolean }> {
  if (typeof value !== "string") return { value, moved: false };
  const match = value.match(/^data:([a-z0-9.+/-]+);base64,(.+)$/i);
  if (!match) return { value, moved: false };
  const stored = await storeMedia({ type: match[1], base64: match[2], name });
  return stored.ok ? { value: stored.url, moved: true } : { value, moved: false };
}

export async function readMedia(id: string): Promise<MediaRecord | null> {
  if (!/^[A-Za-z0-9_-]{16,40}$/.test(id)) return null;
  return adminGet<MediaRecord>(`media/${id}`);
}

export async function deleteMedia(urls: Iterable<string>): Promise<number> {
  let removed = 0;
  for (const url of urls) {
    if (!isMediaUrl(url)) continue;
    await adminDelete(`media/${mediaIdOf(url)}`).then(
      () => (removed += 1),
      () => {},
    );
  }
  return removed;
}

/** Every `/media/…` address still used anywhere in the catalogue. */
export async function referencedMedia(): Promise<Set<string>> {
  const [products, brands, categories, banners] = await Promise.all([
    adminGet<Record<string, unknown>>("products"),
    adminGet<Record<string, unknown>>("brands"),
    adminGet<Record<string, unknown>>("categories"),
    adminGet<Record<string, unknown>>("banners"),
  ]);
  const used = new Set<string>();
  const walk = (value: unknown) => {
    if (isMediaUrl(value)) used.add(value);
    else if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === "object") Object.values(value).forEach(walk);
  };
  [products, brands, categories, banners].forEach(walk);
  return used;
}

/**
 * Deletes stored pictures nothing points at any more (left behind when a photo
 * is removed from a product, or an upload is abandoned). Recent uploads are
 * kept, since the product they belong to may not be saved yet.
 */
export async function sweepUnusedMedia(olderThanMs = 24 * 3600_000): Promise<number> {
  const ids = await adminKeys("media");
  if (!ids.length) return 0;
  const used = await referencedMedia();
  let removed = 0;
  for (const id of ids) {
    if (used.has(`${MEDIA_PREFIX}${id}`)) continue;
    const created = await adminGet<string>(`media/${id}/created_at`).catch(() => null);
    if (created && Date.now() - Date.parse(created) < olderThanMs) continue;
    await adminDelete(`media/${id}`).then(
      () => (removed += 1),
      () => {},
    );
  }
  return removed;
}
