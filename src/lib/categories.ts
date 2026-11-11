// ─────────────────────────────────────────────────────────────
// Category tree helpers.
//
// Categories live in Realtime Database as a flat map, but the store is
// browsed as a shallow tree: departments (Men / Women / Kids) at the top
// and collections hanging beneath one or more of them. Everything here is
// a pure function over the flat list, so pages can derive the tree
// without another database read.
//
//   { id, slug, name, parent_slugs: ["kids"], sort_order }
//
// Two historical shapes are still honoured: `parent_slug` (single value,
// written by older records) and records whose key differs from the slug.
// ─────────────────────────────────────────────────────────────

import { categorySeed } from "./config";
import type { Category } from "./types";

/** Normalises the legacy single `parent_slug` into the `parent_slugs` list. */
export function parentSlugsOf(
  category: Pick<Category, "parent_slugs" | "parent_slug"> | null | undefined,
): string[] {
  if (!category) return [];
  const many = Array.isArray(category.parent_slugs) ? category.parent_slugs : [];
  const legacy = category.parent_slug ? [category.parent_slug] : [];
  return Array.from(
    new Set(
      [...many, ...legacy]
        .map((slug) => (slug ?? "").toString().trim())
        .filter(Boolean),
    ),
  );
}

/**
 * Fills in the fields the rest of the app assumes are present.
 * Kept single-argument on purpose: it is used directly as `list.map(fn)`.
 */
export function normaliseCategory(category: Category): Category {
  const slug = (category.slug || category.id || "").trim();
  return {
    ...category,
    id: category.id || slug,
    slug,
    name: (category.name || slug).trim(),
    status: category.status === "hidden" ? "hidden" : "active",
    sort_order: typeof category.sort_order === "number" ? category.sort_order : 99,
    parent_slugs: parentSlugsOf(category),
    parent_slug: category.parent_slug ?? null,
  };
}

/** Display order: `sort_order`, then alphabetical. */
export function sortCategories(categories: Category[]): Category[] {
  return [...categories].sort(
    (a, b) =>
      (a.sort_order ?? 99) - (b.sort_order ?? 99) || (a.name ?? "").localeCompare(b.name ?? ""),
  );
}

export function activeCategories(categories: Category[]): Category[] {
  return categories.filter((category) => category.status !== "hidden");
}

/** Departments — categories that hang under nothing. */
export function topLevelCategories(categories: Category[]): Category[] {
  return sortCategories(categories.filter((category) => parentSlugsOf(category).length === 0));
}

/** Collections directly beneath one parent, in display order. */
export function childrenOf(categories: Category[], parentSlug: string): Category[] {
  const slug = (parentSlug ?? "").trim();
  if (!slug) return [];
  return sortCategories(
    categories.filter((category) => parentSlugsOf(category).includes(slug)),
  );
}

/**
 * The category itself plus every descendant, so filtering by "Kids" also
 * finds products filed under "Boys' Wear". Cycle-safe: a record that
 * (wrongly) lists itself as a parent cannot loop.
 */
export function categoryDescendantSlugs(categories: Category[], slug: string): string[] {
  const target = (slug ?? "").trim();
  if (!target) return [];

  const out: string[] = [];
  const seen = new Set<string>();
  const queue = [target];

  while (queue.length) {
    const current = queue.shift() as string;
    if (seen.has(current)) continue;
    seen.add(current);
    out.push(current);
    for (const child of childrenOf(categories, current)) {
      if (!seen.has(child.slug)) queue.push(child.slug);
    }
  }

  return out;
}

/** True when a product's category resolves to `targetSlug` or one of its children. */
export function categoryMatchesSlug(
  categories: Category[],
  candidate: string | null | undefined,
  targetSlug: string | null | undefined,
): boolean {
  if (!candidate || !targetSlug) return false;
  return categoryDescendantSlugs(categories, targetSlug).includes(candidate);
}

/**
 * The starter catalogue from `config.ts`, shaped as complete records.
 * Used as the fallback tree before the admin has seeded anything, so the
 * storefront never renders an empty navigation. Never written to the
 * database from here — the admin seeds deliberately (one click).
 */
export function buildSeedCategories(): Category[] {
  return categorySeed.map((seed) => ({
    id: seed.slug,
    slug: seed.slug,
    name: seed.name,
    parent_slugs: [...seed.parent_slugs],
    parent_slug: null,
    image: null,
    description: null,
    sort_order: seed.sort_order,
    status: "active" as const,
    // Fixed epoch: a placeholder is never "new", so any accidental sort keeps
    // these in the order configured above.
    created_at: "1970-01-01T00:00:00.000Z",
  }));
}

// ── Brand → category detection ────────────────────────────────
// A brand's bio is a decent signal for where it belongs, and the products
// already filed under it are a better one. Both feed one suggestion list
// that an admin can accept or ignore.

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  men: ["men", "mens", "gents", "gentlemen", "unisex"],
  women: ["women", "womens", "ladies", "unisex"],
  kids: ["kids", "kid", "children", "child", "junior", "school"],
  "boys-wear": ["boys", "boy"],
  "girls-wear": ["girls", "girl"],
  "baby-toddler": ["baby", "toddler", "infant", "newborn", "onesie", "romper"],
  "everyday-essentials": ["everyday", "daily", "basics", "essential", "innerwear", "socks"],
  "casual-wear": ["casual", "denim", "tee", "tees", "tshirt", "playwear"],
  "occasion-wear": ["occasion", "party", "festive", "wedding", "ethnic", "celebration"],
};

/** Whole-word match, so "women" never counts as "men". */
function mentionsWord(text: string, word: string): boolean {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i").test(text);
}

export type BrandCategorySuggestion = {
  slug: string;
  name: string;
  /** Human-readable reasons, shown in Admin → Catalog → Brands. */
  reasons: string[];
};

export function detectBrandCategories(
  input: { name?: string | null; description?: string | null; productCategorySlugs?: string[] },
  categories: Category[],
): BrandCategorySuggestion[] {
  const text = `${input.name ?? ""} ${input.description ?? ""}`.trim();
  const alreadyFiled = new Set((input.productCategorySlugs ?? []).filter(Boolean));
  const suggestions: BrandCategorySuggestion[] = [];

  for (const category of activeCategories(categories)) {
    const reasons: string[] = [];

    if (alreadyFiled.has(category.slug)) {
      reasons.push("products already in this category");
    }

    const keywords = CATEGORY_KEYWORDS[category.slug] ?? [];
    const named = (category.name ?? "").toLowerCase();
    const hits = keywords.filter((word) => mentionsWord(text, word));
    if (named && text.toLowerCase().includes(named)) {
      reasons.push(`bio mentions “${category.name}”`);
    } else if (hits.length) {
      reasons.push(`bio mentions “${hits[0]}”`);
    }

    if (reasons.length) {
      suggestions.push({ slug: category.slug, name: category.name, reasons });
    }
  }

  return suggestions;
}
