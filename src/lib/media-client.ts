"use client";

/**
 * Uploading photos from admin.
 *
 * Every picture is shrunk in the browser first (longest side 1600 px, WebP),
 * which keeps uploads quick on a phone connection and storage small, then sent
 * to /api/admin/media. The returned `/media/…` address works on every device.
 */
import { getFirebaseAuth } from "@/lib/firebase";

const MAX_EDGE = 1600;

async function loadImage(file: Blob): Promise<CanvasImageSource & { width: number; height: number; close?: () => void }> {
  try {
    return await createImageBitmap(file);
  } catch {
    // Some browsers cannot decode every format into a bitmap; an <img> can.
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.decoding = "async";
      image.src = url;
      await image.decode();
      return image;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

/** Shrinks any raster image to WebP. Small images keep their size. */
export async function compressToWebp(file: Blob, maxEdge = MAX_EDGE, quality = 0.82): Promise<Blob> {
  const source = await loadImage(file);
  const scale = Math.min(1, maxEdge / Math.max(source.width, source.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(source.width * scale));
  canvas.height = Math.max(1, Math.round(source.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser cannot prepare images.");
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  source.close?.();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
  if (!blob) throw new Error("Could not compress this image.");
  return blob;
}

async function toBase64(blob: Blob): Promise<string> {
  const buffer = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (let i = 0; i < buffer.length; i += 0x8000) {
    binary += String.fromCharCode(...buffer.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

/**
 * Uploads one picture and returns its permanent address. SVG logos are sent
 * as they are (they stay sharp at any size); everything else is compressed.
 */
export async function uploadImage(file: Blob, name?: string): Promise<string> {
  const isSvg = file.type === "image/svg+xml";
  const blob = isSvg ? file : await compressToWebp(file);
  const token = await getFirebaseAuth().currentUser?.getIdToken();
  if (!token) throw new Error("Please sign in to admin again.");

  const response = await fetch("/api/admin/media", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({ type: isSvg ? "image/svg+xml" : "image/webp", data: await toBase64(blob), name }),
  });
  const data = (await response.json().catch(() => ({}))) as { ok?: boolean; url?: string; error?: string };
  if (!response.ok || !data.ok || !data.url) throw new Error(data.error || "The photo could not be uploaded.");
  return data.url;
}

/** Server-side catalogue actions: complete deletes and page refreshes. */
export async function catalogAction<T extends Record<string, unknown>>(
  body: { action: "delete-product"; id: string } | { action: "delete-brand"; id: string; confirmName: string } | { action: "refresh" },
): Promise<T & { ok: boolean; error?: string }> {
  const token = await getFirebaseAuth().currentUser?.getIdToken();
  if (!token) throw new Error("Please sign in to admin again.");
  const response = await fetch("/api/admin/catalog", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const data = (await response.json().catch(() => ({}))) as T & { ok: boolean; error?: string };
  if (!data.ok) throw new Error(data.error || "That could not be completed.");
  return data;
}
