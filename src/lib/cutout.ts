/**
 * Photo → cloth, in the browser.
 *
 * Product photos arrive on a plain studio backdrop. This module erases the
 * background that touches the frame and leaves the garment behind with a soft
 * edge, so the rail can hang the piece from a hanger instead of pasting a
 * rectangle onto it.
 *
 * No dependencies and no network: the pixels never leave the page, and the
 * result is a transparent WebP data URL (or PNG where WebP cannot be encoded).
 */

export type CutoutBounds = { minX: number; minY: number; maxX: number; maxY: number };

export type CutoutResult = { url: string; width: number; height: number };

/** Fallback colour tolerance when the backdrop is too noisy to measure. */
const BASE_TOLERANCE = 16;

/** A luma step this sharp is treated as the garment's silhouette, not backdrop. */
const EDGE_LIMIT = 16;

/** Largest edge fed to the canvas; bigger photos are downscaled first. */
const MAX_EDGE = 1100;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

/**
 * The backdrop colour is the *most common* colour on the frame, not the average:
 * a garment that runs off one edge would otherwise drag the average into a tone
 * that matches neither the backdrop nor the cloth.
 */
function borderStats(data: Uint8ClampedArray, width: number, height: number) {
  const buckets = new Map<number, { r: number; g: number; b: number; count: number }>();
  const visit = (index: number) => {
    const offset = index * 4;
    if (data[offset + 3] === 0) return;
    const r = data[offset];
    const g = data[offset + 1];
    const b = data[offset + 2];
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.r += r;
      bucket.g += g;
      bucket.b += b;
      bucket.count += 1;
      return;
    }
    buckets.set(key, { r, g, b, count: 1 });
  };
  for (let x = 0; x < width; x += 1) {
    visit(x);
    visit((height - 1) * width + x);
  }
  for (let y = 1; y < height - 1; y += 1) {
    visit(y * width);
    visit(y * width + width - 1);
  }

  let best: { r: number; g: number; b: number; count: number } | null = null;
  for (const bucket of buckets.values()) {
    if (!best || bucket.count > best.count) best = bucket;
  }
  if (!best) return { colour: [255, 255, 255] as const, sigma: 0 };

  const red = best.r / best.count;
  const green = best.g / best.count;
  const blue = best.b / best.count;
  let variance = 0;
  const spread = (index: number) => {
    const offset = index * 4;
    const dr = data[offset] - red;
    const dg = data[offset + 1] - green;
    const db = data[offset + 2] - blue;
    variance += (dr * dr + dg * dg + db * db) / 3;
  };
  for (let x = 0; x < width; x += 1) {
    spread(x);
    spread((height - 1) * width + x);
  }
  for (let y = 1; y < height - 1; y += 1) {
    spread(y * width);
    spread(y * width + width - 1);
  }
  return {
    colour: [Math.round(red), Math.round(green), Math.round(blue)] as const,
    sigma: Math.sqrt(variance / Math.max(1, 2 * width + 2 * (height - 2))),
  };
}

/** Per-pixel luma gradient magnitude, used to stop the fill at the garment edge. */
function edgeMap(data: Uint8ClampedArray, width: number, height: number) {
  const luma = new Float32Array(width * height);
  for (let index = 0; index < width * height; index += 1) {
    const offset = index * 4;
    luma[index] = 0.299 * data[offset] + 0.587 * data[offset + 1] + 0.114 * data[offset + 2];
  }
  const edges = new Float32Array(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const left = luma[y * width + Math.max(0, x - 1)];
      const right = luma[y * width + Math.min(width - 1, x + 1)];
      const up = luma[Math.max(0, y - 1) * width + x];
      const down = luma[Math.min(height - 1, y + 1) * width + x];
      const gx = right - left;
      const gy = down - up;
      edges[y * width + x] = Math.sqrt(gx * gx + gy * gy);
    }
  }
  return edges;
}

/**
 * Flood-fill the backdrop inwards from the frame. Colour that is close to the
 * border colour, connected to the border, and not separated from it by a
 * garment edge is removed — so a cream garment on a white backdrop keeps its
 * body while the white around it goes.
 */
export function backgroundMask(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  options: { tolerance?: number; edgeLimit?: number } = {},
) {
  const total = width * height;
  const { colour, sigma } = borderStats(data, width, height);
  const tolerance = clamp(options.tolerance ?? sigma * 3 + BASE_TOLERANCE, 8, 64);
  const edgeLimit = options.edgeLimit ?? EDGE_LIMIT;
  const localLimit = clamp(tolerance * 0.5, 5, 22) ** 2 * 3;
  const [red, green, blue] = colour;
  const limit = tolerance * tolerance * 3;
  const removed = new Uint8Array(total);
  const queue = new Int32Array(total);
  const edges = edgeMap(data, width, height);
  let head = 0;
  let tail = 0;

  const distanceTo = (index: number, r: number, g: number) => {
    const offset = index * 4;
    const dr = data[offset] - r;
    const dg = data[offset + 1] - g;
    const db = data[offset + 2] - blue;
    return dr * dr + dg * dg + db * db;
  };

  /**
   * Backdrop may drift (vignette, uneven studio light), so a pixel also counts
   * as backdrop when it matches the neighbours that were already cleared. The
   * step is deliberately small, which walks a gradient but not a garment edge.
   */
  const nearRemoved = (index: number, x: number, y: number) => {
    let r = 0;
    let g = 0;
    let b = 0;
    let count = 0;
    const add = (neighbour: number) => {
      if (!removed[neighbour]) return;
      const offset = neighbour * 4;
      r += data[offset];
      g += data[offset + 1];
      b += data[offset + 2];
      count += 1;
    };
    if (x > 0) add(index - 1);
    if (x < width - 1) add(index + 1);
    if (y > 0) add(index - width);
    if (y < height - 1) add(index + width);
    if (!count) return false;
    const offset = index * 4;
    const dr = data[offset] - r / count;
    const dg = data[offset + 1] - g / count;
    const db = data[offset + 2] - b / count;
    return dr * dr + dg * dg + db * db <= localLimit;
  };

  const seed = (index: number) => {
    if (removed[index]) return;
    if (data[index * 4 + 3] === 0) {
      removed[index] = 1;
      queue[tail] = index;
      tail += 1;
      return;
    }
    const x = index % width;
    const y = (index - x) / width;
    if (edges[index] > edgeLimit) return;
    if (distanceTo(index, red, green) > limit && !nearRemoved(index, x, y)) return;
    removed[index] = 1;
    queue[tail] = index;
    tail += 1;
  };

  for (let x = 0; x < width; x += 1) {
    seed(x);
    seed((height - 1) * width + x);
  }
  for (let y = 0; y < height; y += 1) {
    seed(y * width);
    seed(y * width + width - 1);
  }

  while (head < tail) {
    const index = queue[head];
    head += 1;
    const x = index % width;
    const y = (index - x) / width;
    if (x > 0) seed(index - 1);
    if (x < width - 1) seed(index + 1);
    if (y > 0) seed(index - width);
    if (y < height - 1) seed(index + width);
  }

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  let kept = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (removed[y * width + x]) continue;
      kept += 1;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  const bounds: CutoutBounds | null = maxX < 0 ? null : { minX, minY, maxX, maxY };
  return { removed, bounds, kept, total, tolerance, colour };
}

/**
 * Punch the backdrop out of the pixel buffer and soften the seam, so the edge
 * blends into the rail instead of showing a cut-out fringe.
 */
export function applyCutout(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  removed: Uint8Array,
) {
  const total = width * height;
  for (let index = 0; index < total; index += 1) {
    if (removed[index]) data[index * 4 + 3] = 0;
  }
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      if (removed[index]) continue;
      let touch = 0;
      if (x > 0 && removed[index - 1]) touch += 1;
      if (x < width - 1 && removed[index + 1]) touch += 1;
      if (y > 0 && removed[index - width]) touch += 1;
      if (y < height - 1 && removed[index + width]) touch += 1;
      if (!touch) continue;
      const alpha = index * 4 + 3;
      data[alpha] = Math.round(data[alpha] * (touch > 1 ? 0.5 : 0.72));
    }
  }
}

/**
 * Which frame edges the kept pixels still touch. A real cut-out leaves the
 * backdrop behind, so if the piece is still touching three or more edges the
 * fill has most likely erased the garment and kept the studio instead.
 */
function edgesTouched(data: Uint8ClampedArray, width: number, height: number) {
  let count = 0;
  const solid = (index: number) => data[index * 4 + 3] > 8;
  let top = false;
  let bottom = false;
  let left = false;
  let right = false;
  for (let x = 0; x < width; x += 1) {
    if (!top && solid(x)) top = true;
    if (!bottom && solid((height - 1) * width + x)) bottom = true;
  }
  for (let y = 0; y < height; y += 1) {
    if (!left && solid(y * width)) left = true;
    if (!right && solid(y * width + width - 1)) right = true;
  }
  if (top) count += 1;
  if (bottom) count += 1;
  if (left) count += 1;
  if (right) count += 1;
  return count;
}

function opaqueBounds(data: Uint8ClampedArray, width: number, height: number) {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  let kept = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] <= 8) continue;
      kept += 1;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  return { bounds: maxX < 0 ? null : ({ minX, minY, maxX, maxY } as CutoutBounds), kept };
}

/**
 * One pass of the above, with a second, tighter attempt when the first one ate
 * almost the whole frame (a garment close in tone to its backdrop), and a loose
 * pass that takes the studio drop shadow with the backdrop.
 */
export function cutoutPixels(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  options: { tolerance?: number } = {},
) {
  let mask = backgroundMask(data, width, height, options);
  if (mask.kept / mask.total < 0.06) {
    const tighter = Math.max(6, mask.tolerance / 2.5);
    mask = backgroundMask(data, width, height, { tolerance: tighter });
  }
  const fraction = mask.kept / mask.total;
  if (!mask.bounds || fraction > 0.985 || fraction < 0.06) return null;

  const loose = backgroundMask(data, width, height, {
    tolerance: Math.max(mask.tolerance * 2.4, 26),
  });
  if (loose.bounds) {
    let extra = 0;
    const band = new Uint8Array(loose.removed.length);
    for (let index = 0; index < band.length; index += 1) {
      if (!loose.removed[index] || mask.removed[index]) continue;
      band[index] = 1;
      extra += 1;
    }
    // A shadow band that big means the loose pass started eating the piece.
    if (extra / mask.total < 0.35) {
      for (let index = 0; index < band.length; index += 1) {
        if (band[index]) mask.removed[index] = 1;
      }
    }
  }

  applyCutout(data, width, height, mask.removed);
  if (edgesTouched(data, width, height) >= 3) return null;
  const opaque = opaqueBounds(data, width, height);
  if (!opaque.bounds || opaque.kept / mask.total < 0.02) return null;
  return { ...mask, bounds: opaque.bounds, kept: opaque.kept };
}

/** True when the browser can read this image's pixels without a CORS block. */
export function isSameOrigin(src: string) {
  if (!src) return false;
  if (!/^(https?:)?\/\//i.test(src)) return true;
  if (typeof window === "undefined") return false;
  try {
    return new URL(src, window.location.href).origin === window.location.origin;
  } catch {
    return false;
  }
}

const cache = new Map<string, Promise<CutoutResult | null>>();

function loadImage(src: string, anonymous: boolean) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    if (anonymous) image.crossOrigin = "anonymous";
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load that image"));
    image.src = src;
  });
}

async function render(src: string, maxEdge: number, tolerance?: number): Promise<CutoutResult | null> {
  const image = await loadImage(src, !isSameOrigin(src));
  const naturalWidth = image.naturalWidth || image.width;
  const naturalHeight = image.naturalHeight || image.height;
  if (!naturalWidth || !naturalHeight) return null;

  const scale = Math.min(1, maxEdge / Math.max(naturalWidth, naturalHeight));
  const width = Math.max(1, Math.round(naturalWidth * scale));
  const height = Math.max(1, Math.round(naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;
  context.drawImage(image, 0, 0, width, height);

  // A cross-origin image without a permissive header taints the canvas and this
  // throws: the caller then keeps the plain photo.
  const frame = context.getImageData(0, 0, width, height);
  const mask = cutoutPixels(frame.data, width, height, { tolerance });
  if (!mask?.bounds) return null;
  context.putImageData(frame, 0, 0);

  const padX = Math.round((mask.bounds.maxX - mask.bounds.minX + 1) * 0.02) + 1;
  const padY = Math.round((mask.bounds.maxY - mask.bounds.minY + 1) * 0.02) + 1;
  const sx = Math.max(0, mask.bounds.minX - padX);
  const sy = Math.max(0, mask.bounds.minY - padY);
  const sw = Math.min(width, mask.bounds.maxX + padX + 1) - sx;
  const sh = Math.min(height, mask.bounds.maxY + padY + 1) - sy;

  const crop = document.createElement("canvas");
  crop.width = sw;
  crop.height = sh;
  const cropContext = crop.getContext("2d");
  if (!cropContext) return null;
  cropContext.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);

  return { url: crop.toDataURL("image/webp", 0.92), width: sw, height: sh };
}

/**
 * Cut the backdrop away and return the garment as a transparent image.
 *
 * Returns `null` when the image is cross-origin without CORS, when the canvas
 * is unavailable, or when the photo does not look like a garment on a plain
 * backdrop. Results are cached per URL for the session.
 */
export function cutoutFor(
  src: string,
  options: { force?: boolean; tolerance?: number; maxEdge?: number } = {},
) {
  if (!src) return Promise.resolve(null);
  if (!options.force && !isSameOrigin(src)) return Promise.resolve(null);
  const maxEdge = options.maxEdge ?? MAX_EDGE;
  const key = `${src}|${options.tolerance ?? "auto"}|${maxEdge}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const job = render(src, maxEdge, options.tolerance).catch(() => null);
  cache.set(key, job);
  return job;
}
