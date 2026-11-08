// ─────────────────────────────────────────────────────────────
// Category tree + brand classifier.
//
// Categories live in Firebase RTDB under /categories and may hang under one
// or more departments (Men / Women / Kids), so "Everyday Essentials" can be
// shared by all three. Everything here is pure — no network, no React — so the
// admin screens, the storefront and the tests all agree on one implementation.
// ─────────────────────────────────────────────────────────────

import type { Category } from "./types";
import { categorySeed } from "./config";

export const DEPARTMENTS = [
  { slug: "men", name: "Men" },
  { slug: "women", name: "Women" },
  { slug: "kids", name: "Kids" },
] as const;

export type CategorySuggestion = {
  slug: string;
  name: string;
  score: number;
  reasons: string[];
};

export type BrandClassificationInput = {
  name?: string | null;
  description?: string | null;
  tags?: string[] | null;
  /** Categories already used by this brand's products — the strongest signal. */
  productCategorySlugs?: string[] | null;
};

/** Words that appear in almost every category name and carry no signal. */
const STOPWORDS = new Set([
  "and",
  "the",
  "for",
  "with",
  "from",
  "wear",
  "wears",
  "collection",
  "collections",
  "clothing",
  "clothes",
  "range",
  "all",
  "shop",
  "store",
  "fashion",
  "style",
  "new",
]);

/**
 * Vocabulary per category slug. Unknown slugs still work — the classifier also
 * reads the category's own name, so an admin-created category classifies
 * itself without a code change.
 */
const SYNONYMS: Record<string, string[]> = {
  men: ["men", "mens", "man", "gents", "gentlemen", "male", "unisex", "shirt", "trouser", "pant", "jeans", "kurta", "dhoti", "sherwani", "blazer", "formal"],
  women: ["women", "womens", "woman", "ladies", "lady", "female", "saree", "sari", "kurti", "lehenga", "dupatta", "blouse", "anarkali", "salwar", "unisex"],
  // Deliberately narrower than the departments below it: "newborn" and
  // "toddler" belong to Baby & Toddler, so a specific bio lands there first.
  kids: ["kids", "kid", "children", "child", "boys", "girls", "school", "playschool", "cartoon", "cotton"],
  "boys-wear": ["boys", "boy", "brother", "son"],
  "girls-wear": ["girls", "girl", "sister", "daughter", "frock", "dress"],
  "baby-toddler": ["baby", "babies", "infant", "newborn", "toddler", "onesie", "romper", "swaddle", "bib", "bibs", "0-6m", "6-12m"],
  "everyday-essentials": ["essentials", "essential", "basics", "basic", "innerwear", "vest", "sock", "socks", "school", "daily", "everyday", "pack", "multipack"],
  "casual-wear": ["casual", "play", "playwear", "tshirt", "shorts", "denim", "jeans", "comfort", "relaxed", "lounge"],
  "occasion-wear": ["occasion", "party", "festive", "festival", "wedding", "ethnic", "traditional", "celebration", "birthday", "diwali", "eid", "kurta", "sherwani", "lehenga", "saree", "frock"],
};

const MIN_SCORE = 2.5;
const MAX_SUGGESTIONS = 3;

/** Crude, symmetric stemming so "girls" matches "girl" and "newborns" "newborn". */
function stem(word: string): string {
  if (word.length > 3 && word.endsWith("s")) return word.slice(0, -1);
  return word;
}

function words(text: string | null | undefined): Set<string> {
  const out = new Set<string>();
  if (!text) return out;
  const cleaned = text
    .toLowerCase()
    .replace(/['’`]/g, "")
    .split(/[^a-z0-9]+/);
  for (const raw of cleaned) {
    if (raw.length < 2) continue;
    if (STOPWORDS.has(raw)) continue;
    out.add(stem(raw));
  }
  return out;
}

function keywordsFor(category: Pick<Category, "slug" | "name">): Set<string> {
  const out = new Set<string>();
  for (const word of words(category.name)) out.add(word);
  for (const word of words(category.slug.replace(/-/g, " "))) out.add(word);
  for (const synonym of SYNONYMS[category.slug] ?? []) {
    for (const word of words(synonym)) out.add(word);
  }
  return out;
}

// ── Tree helpers ────────────────────────────────────────────

export function parentSlugsOf(
  category: Pick<Category, "parent_slugs" | "parent_slug">,
): string[] {
  const multi = (category.parent_slugs ?? []).filter(Boolean);
  if (multi.length) return [...new Set(multi)];
  return category.parent_slug ? [category.parent_slug] : [];
}

/** Fills defaults and folds the legacy single-parent field into `parent_slugs`. */
export function normaliseCategory(category: Category): Category {
  return {
    ...category,
    parent_slugs: parentSlugsOf(category),
    status: category.status ?? "active",
    sort_order: category.sort_order ?? 99,
  };
}

export function sortCategories(list: Category[]): Category[] {
  return [...list].sort(
    (a, b) =>
      (a.sort_order ?? 99) - (b.sort_order ?? 99) || a.name.localeCompare(b.name),
  );
}

export function activeCategories(list: Category[]): Category[] {
  return list.filter((category) => (category.status ?? "active") !== "hidden");
}

/** Categories with no parent that exists in the list — the departments. */
export function topLevelCategories(list: Category[]): Category[] {
  const slugs = new Set(list.map((category) => category.slug));
  return sortCategories(
    activeCategories(list).filter((category) =>
      parentSlugsOf(category).every((parent) => !slugs.has(parent)),
    ),
  );
}

export function childrenOf(list: Category[], slug: string): Category[] {
  return sortCategories(
    activeCategories(list).filter((category) => parentSlugsOf(category).includes(slug)),
  );
}

/** The category plus every category beneath it — used for department filtering. */
export function categoryDescendantSlugs(list: Category[], slug: string): string[] {
  const seen = new Set<string>([slug]);
  let frontier = [slug];
  while (frontier.length) {
    const next: string[] = [];
    for (const parent of frontier) {
      for (const child of childrenOf(list, parent)) {
        if (seen.has(child.slug)) continue;
        seen.add(child.slug);
        next.push(child.slug);
      }
    }
    frontier = next;
  }
  return [...seen];
}

export function categoryMatchesSlug(
  list: Category[],
  productCategorySlug: string | null | undefined,
  selectedSlug: string,
): boolean {
  if (!productCategorySlug) return false;
  if (productCategorySlug === selectedSlug) return true;
  return categoryDescendantSlugs(list, selectedSlug).includes(productCategorySlug);
}

/** Breadcrumb from the top-most parent down to the category. */
export function categoryPath(list: Category[], slug: string): Category[] {
  const bySlug = new Map(list.map((category) => [category.slug, category]));
  const chain: Category[] = [];
  const seen = new Set<string>();
  let current = bySlug.get(slug);
  while (current && !seen.has(current.slug)) {
    seen.add(current.slug);
    chain.unshift(current);
    const parent = parentSlugsOf(current).find((item) => bySlug.has(item));
    current = parent ? bySlug.get(parent) : undefined;
  }
  return chain;
}

export function categoryLabel(list: Category[], slug: string | null | undefined): string | null {
  if (!slug) return null;
  return list.find((category) => category.slug === slug)?.name ?? null;
}

export function findCategory(
  list: Category[],
  slugOrId: string | null | undefined,
): Category | undefined {
  if (!slugOrId) return undefined;
  return list.find((category) => category.id === slugOrId || category.slug === slugOrId);
}

/** The starter catalogue the admin seeds with one click. */
export function buildSeedCategories(now: string = new Date().toISOString()): Category[] {
  return categorySeed.map((seed) => ({
    id: seed.slug,
    slug: seed.slug,
    name: seed.name,
    parent_slugs: [...seed.parent_slugs],
    status: "active",
    sort_order: seed.sort_order,
    created_at: now,
  }));
}

// ── Brand classification ────────────────────────────────────

/**
 * Suggests categories for a brand from its name, bio, tags and the categories
 * its products already use. Deterministic and credential-free: every suggested
 * slug is an existing category, and an admin can always override it.
 */
export function detectBrandCategories(
  input: BrandClassificationInput,
  categories: Category[],
): CategorySuggestion[] {
  const nameWords = words(input.name);
  const bioWords = words(input.description);
  const tagWords = new Set<string>();
  for (const tag of input.tags ?? []) {
    for (const word of words(tag)) tagWords.add(word);
  }
  const productSlugs = new Set((input.productCategorySlugs ?? []).filter(Boolean));

  // A word unique to one category ("newborn", "lehenga") is a much stronger
  // signal than one shared by several ("girls", "frock"). Weight accordingly.
  const keywordOwners = new Map<string, number>();
  for (const category of categories) {
    for (const keyword of keywordsFor(category)) {
      keywordOwners.set(keyword, (keywordOwners.get(keyword) ?? 0) + 1);
    }
  }
  const weightFor = (word: string) => ((keywordOwners.get(word) ?? 0) <= 1 ? 3 : 1.5);

  const scored: CategorySuggestion[] = [];

  for (const category of categories) {
    const keywords = keywordsFor(category);
    if (!keywords.size) continue;

    let score = 0;
    const reasons: string[] = [];

    const nameHits = [...nameWords].filter((word) => keywords.has(word)).slice(0, 2);
    if (nameHits.length) {
      score += nameHits.reduce((sum, word) => sum + weightFor(word) * 2, 0);
      reasons.push(`name mentions “${nameHits.join(", ")}”`);
    }

    const bioHits = [...bioWords].filter((word) => keywords.has(word)).slice(0, 2);
    if (bioHits.length) {
      score += bioHits.reduce((sum, word) => sum + weightFor(word), 0);
      reasons.push(`bio mentions “${bioHits.join(", ")}”`);
    }

    const tagHits = [...tagWords].filter((word) => keywords.has(word)).slice(0, 2);
    if (tagHits.length) {
      score += tagHits.reduce((sum, word) => sum + weightFor(word), 0);
      reasons.push(`tags mention “${tagHits.join(", ")}”`);
    }

    if (productSlugs.has(category.slug)) {
      score += 6;
      reasons.push("products already use this category");
    } else {
      const childHit = [...productSlugs].some((slug) =>
        categoryDescendantSlugs(categories, category.slug).includes(slug),
      );
      if (childHit) {
        score += 3;
        reasons.push("products sit in a collection under it");
      }
    }

    if (score >= MIN_SCORE) {
      scored.push({ slug: category.slug, name: category.name, score, reasons });
    }
  }

  return scored
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, MAX_SUGGESTIONS);
}

/** Convenience wrapper: the slugs of `detectBrandCategories`. */
export function suggestCategorySlugs(
  input: BrandClassificationInput,
  categories: Category[],
): string[] {
  return detectBrandCategories(input, categories).map((suggestion) => suggestion.slug);
}
