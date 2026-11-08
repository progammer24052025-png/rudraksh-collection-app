// ─────────────────────────────────────────────────────────────
// Static store configuration — the fallback used when the store has
// not yet saved its contact details in Admin → Settings.
// Anything left empty is hidden from the UI rather than shown as a
// broken link, and can be filled in from the admin dashboard.
// ─────────────────────────────────────────────────────────────

export const storeConfig = {
  name: "Rudraksh Collection",
  legalName: "Rudraksh Collection",
  tagline: "Little Moments, Beautifully Dressed",
  category: "Children's Wear",
  location: "Vadodara, Gujarat, India",
  city: "Vadodara",
  state: "Gujarat",
  country: "India",
  googleRating: 4.84,
  googleReviewCount: null as number | null,

  // ── Contact details (edit in Admin → Settings) ──
  address: "",
  phone: "",
  whatsapp: "",
  email: "hello@rudrakshcollection.in",
  openingHours: "",
  googleMapsUrl: "",
  instagram: "",

  // ── Commerce ──
  freeShippingThreshold: 999,
  shippingFee: 99,
  codAvailable: true,
  razorpayEnabled: false,
  returnWindowDays: 7,
  dispatchDays: "1–2 business days",
  deliveryDays: "3–7 business days",
  currency: "INR",
  gstin: "",
};

export const brands = [
  { slug: "macho", name: "Macho" },
  { slug: "james-harper", name: "James & Harper" },
  { slug: "hamper", name: "Hamper" },
  { slug: "essa", name: "Essa" },
  { slug: "bodycare", name: "Bodycare" },
  { slug: "lux-lyra", name: "Lux Lyra" },
  { slug: "comfort", name: "Comfort" },
  { slug: "shilpa", name: "Shilpa" },
  { slug: "hi-rich", name: "Hi-Rich" },
  { slug: "hackucha", name: "Hackucha" },
  { slug: "topas", name: "Topas" },
  { slug: "top-gear", name: "Top-Gear" },
] as const;

export const collections = [
  { slug: "boys-wear", name: "Boys' Wear" },
  { slug: "girls-wear", name: "Girls' Wear" },
  { slug: "baby-toddler", name: "Baby & Toddler" },
  { slug: "everyday-essentials", name: "Everyday Essentials" },
  { slug: "casual-wear", name: "Casual Wear" },
  { slug: "occasion-wear", name: "Occasion Wear" },
] as const;

/** The three departments the catalogue is browsed by. */
export const departments = [
  { slug: "men", name: "Men" },
  { slug: "women", name: "Women" },
  { slug: "kids", name: "Kids" },
] as const;

/**
 * Categories the admin can seed in one click (Admin → Catalog → Categories).
 * Departments hang nothing under them; the six collections are nested where
 * they belong, and the three cross-audience collections sit under all three.
 */
export const categorySeed = [
  { slug: "men", name: "Men", parent_slugs: [] as string[], sort_order: 10 },
  { slug: "women", name: "Women", parent_slugs: [] as string[], sort_order: 20 },
  { slug: "kids", name: "Kids", parent_slugs: [] as string[], sort_order: 30 },
  { slug: "boys-wear", name: "Boys' Wear", parent_slugs: ["kids"], sort_order: 10 },
  { slug: "girls-wear", name: "Girls' Wear", parent_slugs: ["kids"], sort_order: 20 },
  { slug: "baby-toddler", name: "Baby & Toddler", parent_slugs: ["kids"], sort_order: 30 },
  {
    slug: "everyday-essentials",
    name: "Everyday Essentials",
    parent_slugs: ["men", "women", "kids"],
    sort_order: 40,
  },
  { slug: "casual-wear", name: "Casual Wear", parent_slugs: ["men", "women", "kids"], sort_order: 50 },
  { slug: "occasion-wear", name: "Occasion Wear", parent_slugs: ["men", "women", "kids"], sort_order: 60 },
] as const;

export const collectionImages: Record<string, string> = {
  men: "https://images.unsplash.com/photo-1516257984-b1b4d707412e?w=900&h=1125&fit=crop",
  women: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=900&h=1125&fit=crop",
  kids: "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=900&h=1125&fit=crop",
  "boys-wear": "https://images.unsplash.com/photo-1503919545889-aef636e10ad4?w=900&h=1125&fit=crop",
  "girls-wear": "https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?w=900&h=1125&fit=crop",
  "baby-toddler": "https://images.unsplash.com/photo-1522771930-78848d9293e8?w=900&h=1125&fit=crop",
  "everyday-essentials": "https://images.unsplash.com/photo-1514090458221-65bb69cf63e6?w=900&h=1125&fit=crop",
  "casual-wear": "https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=900&h=1125&fit=crop",
  "occasion-wear": "https://images.unsplash.com/photo-1519689680058-324335c77eba?w=900&h=1125&fit=crop",
};

export type CollectionSlug = (typeof collections)[number]["slug"];
export type BrandSlug = (typeof brands)[number]["slug"];

export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.NODE_ENV === "development"
    ? "http://localhost:3000"
    : "https://rudraksh-collection-app-beta.vercel.app");
