import { getCloudflareContext } from "@opennextjs/cloudflare";
import { ensureSchema } from "./db";
import type { Product, Brand, Category } from "./types";

type Env = { DB: D1Database };

// ── Seed brands ─────────────────────────────────────────
const BRANDS: Pick<Brand, "name" | "slug">[] = [
  { name: "Macho", slug: "macho" },
  { name: "James", slug: "james" },
  { name: "Hamper", slug: "hamper" },
  { name: "Essa", slug: "essa" },
  { name: "Bodycare", slug: "bodycare" },
  { name: "Lux Lyra", slug: "lux-lyra" },
  { name: "Comfort", slug: "comfort" },
  { name: "Shilpa", slug: "shilpa" },
  { name: "Hi-Rich", slug: "hi-rich" },
  { name: "Hackucha", slug: "hackucha" },
  { name: "Topas", slug: "topas" },
  { name: "Top-Gear", slug: "top-gear" },
];

const CATEGORIES: Pick<Category, "name" | "slug">[] = [
  { name: "Boys' Wear", slug: "boys-wear" },
  { name: "Girls' Wear", slug: "girls-wear" },
  { name: "Baby & Toddler", slug: "baby-toddler" },
  { name: "Everyday Essentials", slug: "everyday-essentials" },
  { name: "Casual Wear", slug: "casual-wear" },
  { name: "Occasion Wear", slug: "occasion-wear" },
];

// ── Sample products (clearly labelled) ──────────────────
// All images are stock photos from Unsplash, used as SAMPLE placeholders.
const SAMPLE_PRODUCTS: Array<Omit<Product, "id" | "created_at" | "updated_at" | "brand_name" | "brand_slug" | "category_name" | "category_slug"> & { brandSlug: string; categorySlug: string }> = [
  {
    name: "SAMPLE — Boys' Cotton Casual Shirt",
    slug: "sample-macho-boys-cotton-shirt",
    brandSlug: "macho", categorySlug: "boys-wear",
    description: "Comfortable cotton casual shirt for boys. Soft fabric, easy care. SAMPLE product for demonstration — replace with real inventory.",
    price: 599, sale_price: null, sku: "MACH-B01",
    sizes: ["2-3Y", "4-5Y", "6-7Y", "8-9Y"],
    colors: [{ name: "Sky Blue", hex: "#87CEEB" }, { name: "White", hex: "#FFFFFF" }],
    images: ["https://images.unsplash.com/photo-1503919545889-aef636e10ad4?w=600&h=800&fit=crop"],
    fabric: "100% Cotton", care: "Machine wash cold", stock: 50, status: "active",
    is_sample: true, is_featured: true,
  },
  {
    name: "SAMPLE — Girls' Floral Summer Dress",
    slug: "sample-james-girls-floral-dress",
    brandSlug: "james", categorySlug: "girls-wear",
    description: "Light and breezy floral print summer dress for girls. Perfect for warm days. SAMPLE product for demonstration.",
    price: 749, sale_price: 599, sku: "JAME-G01",
    sizes: ["2-3Y", "4-5Y", "6-7Y", "8-9Y"],
    colors: [{ name: "Pink Floral", hex: "#FFB6C1" }, { name: "Yellow Floral", hex: "#FFFACD" }],
    images: ["https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?w=600&h=800&fit=crop"],
    fabric: "Cotton Blend", care: "Machine wash gentle", stock: 40, status: "active",
    is_sample: true, is_featured: true,
  },
  {
    name: "SAMPLE — Baby Soft Romper Set",
    slug: "sample-hamper-baby-romper-set",
    brandSlug: "hamper", categorySlug: "baby-toddler",
    description: "Ultra-soft romper set for babies. Gentle on delicate skin. SAMPLE product for demonstration.",
    price: 899, sale_price: null, sku: "HAM-B01",
    sizes: ["0-6M", "6-12M", "12-18M"],
    colors: [{ name: "Mint", hex: "#98FB98" }, { name: "Lavender", hex: "#E6E6FA" }],
    images: ["https://images.unsplash.com/photo-1522771930-78848d9293e8?w=600&h=800&fit=crop"],
    fabric: "Organic Cotton", care: "Machine wash cold, tumble dry low", stock: 30, status: "active",
    is_sample: true, is_featured: true,
  },
  {
    name: "SAMPLE — Boys' Denim Jeans",
    slug: "sample-essa-boys-denim-jeans",
    brandSlug: "essa", categorySlug: "casual-wear",
    description: "Durable denim jeans for boys with adjustable waist. SAMPLE product for demonstration.",
    price: 899, sale_price: 749, sku: "ESS-B01",
    sizes: ["4-5Y", "6-7Y", "8-9Y", "10-11Y"],
    colors: [{ name: "Blue", hex: "#4169E1" }, { name: "Dark Blue", hex: "#00008B" }],
    images: ["https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=600&h=800&fit=crop"],
    fabric: "Cotton Denim", care: "Machine wash cold", stock: 45, status: "active",
    is_sample: true, is_featured: false,
  },
  {
    name: "SAMPLE — Girls' Cotton Leggings",
    slug: "sample-bodycare-girls-leggings",
    brandSlug: "bodycare", categorySlug: "everyday-essentials",
    description: "Stretchy cotton leggings for girls. Comfortable for all-day wear. SAMPLE product for demonstration.",
    price: 399, sale_price: null, sku: "BODY-G01",
    sizes: ["2-3Y", "4-5Y", "6-7Y", "8-9Y"],
    colors: [{ name: "Black", hex: "#000000" }, { name: "Navy", hex: "#000080" }, { name: "Grey", hex: "#808080" }],
    images: ["https://images.unsplash.com/photo-1471286174890-9c112ffca5b4?w=600&h=800&fit=crop"],
    fabric: "Cotton Spandex", care: "Machine wash cold", stock: 60, status: "active",
    is_sample: true, is_featured: false,
  },
  {
    name: "SAMPLE — Boys' Graphic T-Shirt",
    slug: "sample-lux-lyra-boys-tee",
    brandSlug: "lux-lyra", categorySlug: "casual-wear",
    description: "Fun graphic print t-shirt for boys. Soft cotton, vibrant print. SAMPLE product for demonstration.",
    price: 449, sale_price: 349, sku: "LUX-B01",
    sizes: ["4-5Y", "6-7Y", "8-9Y", "10-11Y"],
    colors: [{ name: "Red", hex: "#DC143C" }, { name: "Green", hex: "#228B22" }],
    images: ["https://images.unsplash.com/photo-1514090458221-65bb69cf63e6?w=600&h=800&fit=crop"],
    fabric: "100% Cotton", care: "Machine wash cold", stock: 55, status: "active",
    is_sample: true, is_featured: true,
  },
  {
    name: "SAMPLE — Girls' Party Frock",
    slug: "sample-comfort-girls-party-frock",
    brandSlug: "comfort", categorySlug: "occasion-wear",
    description: "Beautiful party frock for girls with gentle tulle layers. Special occasion wear. SAMPLE product for demonstration.",
    price: 1299, sale_price: 1099, sku: "COMF-G01",
    sizes: ["2-3Y", "4-5Y", "6-7Y"],
    colors: [{ name: "Rose Pink", hex: "#FF69B4" }, { name: "Cream", hex: "#FFFDD0" }],
    images: ["https://images.unsplash.com/photo-1519689680058-324335c77eba?w=600&h=800&fit=crop"],
    fabric: "Polyester Tulle", care: "Dry clean recommended", stock: 25, status: "active",
    is_sample: true, is_featured: true,
  },
  {
    name: "SAMPLE — Boys' Formal Set",
    slug: "sample-shilpa-boys-formal-set",
    brandSlug: "shilpa", categorySlug: "occasion-wear",
    description: "Smart formal shirt and pants set for boys. Perfect for functions and events. SAMPLE product for demonstration.",
    price: 1499, sale_price: null, sku: "SHIL-B01",
    sizes: ["4-5Y", "6-7Y", "8-9Y", "10-11Y"],
    colors: [{ name: "White", hex: "#FFFFFF" }, { name: "Light Blue", hex: "#ADD8E6" }],
    images: ["https://images.unsplash.com/photo-1476234251651-f353703a034d?w=600&h=800&fit=crop"],
    fabric: "Cotton Blend", care: "Machine wash cold", stock: 20, status: "active",
    is_sample: true, is_featured: false,
  },
  {
    name: "SAMPLE — Baby Winter Onesie",
    slug: "sample-hi-rich-baby-onesie",
    brandSlug: "hi-rich", categorySlug: "baby-toddler",
    description: "Warm fleece onesie for babies. Cozy for cold weather. SAMPLE product for demonstration.",
    price: 799, sale_price: 649, sku: "HIR-B01",
    sizes: ["0-6M", "6-12M", "12-18M", "18-24M"],
    colors: [{ name: "Bear Brown", hex: "#8B4513" }, { name: "Cloud White", hex: "#F0F8FF" }],
    images: ["https://images.unsplash.com/photo-1596870230751-ebdfce98ec42?w=600&h=800&fit=crop"],
    fabric: "Fleece", care: "Machine wash gentle", stock: 35, status: "active",
    is_sample: true, is_featured: false,
  },
  {
    name: "SAMPLE — Girls' Cotton Kurta",
    slug: "sample-hackucha-girls-kurta",
    brandSlug: "hackucha", categorySlug: "girls-wear",
    description: "Traditional cotton kurta for girls. Comfortable and elegant. SAMPLE product for demonstration.",
    price: 699, sale_price: null, sku: "HACK-G01",
    sizes: ["4-5Y", "6-7Y", "8-9Y", "10-11Y"],
    colors: [{ name: "Maroon", hex: "#800020" }, { name: "Teal", hex: "#008080" }],
    images: ["https://images.unsplash.com/photo-1607453998774-d533f65dac99?w=600&h=800&fit=crop"],
    fabric: "Cotton", care: "Machine wash cold", stock: 40, status: "active",
    is_sample: true, is_featured: false,
  },
  {
    name: "SAMPLE — Boys' Sports Shorts",
    slug: "sample-topas-boys-sports-shorts",
    brandSlug: "topas", categorySlug: "casual-wear",
    description: "Lightweight sports shorts for boys. Breathable and quick-dry. SAMPLE product for demonstration.",
    price: 399, sale_price: 329, sku: "TOPA-B01",
    sizes: ["4-5Y", "6-7Y", "8-9Y", "10-11Y"],
    colors: [{ name: "Black", hex: "#000000" }, { name: "Navy", hex: "#000080" }],
    images: ["https://images.unsplash.com/photo-1622290291468-a28f7a7dc6a8?w=600&h=800&fit=crop"],
    fabric: "Polyester", care: "Machine wash cold", stock: 50, status: "active",
    is_sample: true, is_featured: false,
  },
  {
    name: "SAMPLE — Girls' Ethnic Lehenga",
    slug: "sample-top-gear-girls-lehenga",
    brandSlug: "top-gear", categorySlug: "occasion-wear",
    description: "Festive ethnic lehenga for girls. Beautiful embroidery. SAMPLE product for demonstration.",
    price: 1999, sale_price: 1699, sku: "TOPG-G01",
    sizes: ["4-5Y", "6-7Y", "8-9Y"],
    colors: [{ name: "Red", hex: "#DC143C" }, { name: "Gold", hex: "#FFD700" }],
    images: ["https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=600&h=800&fit=crop"],
    fabric: "Silk Blend", care: "Dry clean only", stock: 15, status: "active",
    is_sample: true, is_featured: true,
  },
  {
    name: "SAMPLE — Boys' Hoodie",
    slug: "sample-macho-boys-hoodie",
    brandSlug: "macho", categorySlug: "everyday-essentials",
    description: "Cozy hoodie for boys. Perfect for layering. SAMPLE product for demonstration.",
    price: 849, sale_price: null, sku: "MACH-B02",
    sizes: ["4-5Y", "6-7Y", "8-9Y", "10-11Y"],
    colors: [{ name: "Grey", hex: "#808080" }, { name: "Black", hex: "#000000" }],
    images: ["https://images.unsplash.com/photo-1566004100631-35d015d6a491?w=600&h=800&fit=crop"],
    fabric: "Cotton Fleece", care: "Machine wash cold", stock: 45, status: "active",
    is_sample: true, is_featured: false,
  },
  {
    name: "SAMPLE — Girls' Sleepwear Set",
    slug: "sample-james-girls-sleepwear",
    brandSlug: "james", categorySlug: "everyday-essentials",
    description: "Soft cotton sleepwear set for girls. Comfortable for bedtime. SAMPLE product for demonstration.",
    price: 549, sale_price: 449, sku: "JAME-G02",
    sizes: ["2-3Y", "4-5Y", "6-7Y", "8-9Y"],
    colors: [{ name: "Lavender", hex: "#E6E6FA" }, { name: "Mint", hex: "#98FB98" }],
    images: ["https://images.unsplash.com/photo-1560506840-ec149e08291a?w=600&h=800&fit=crop"],
    fabric: "Cotton", care: "Machine wash cold", stock: 55, status: "active",
    is_sample: true, is_featured: false,
  },
  {
    name: "SAMPLE — Baby Knit Set",
    slug: "sample-essa-baby-knit-set",
    brandSlug: "essa", categorySlug: "baby-toddler",
    description: "Handcrafted knit set for babies. Includes top and bottom. SAMPLE product for demonstration.",
    price: 1099, sale_price: null, sku: "ESS-B02",
    sizes: ["0-6M", "6-12M", "12-18M"],
    colors: [{ name: "Cream", hex: "#FFFDD0" }, { name: "Sage", hex: "#9CAF88" }],
    images: ["https://images.unsplash.com/photo-1519457431-4446432c7892?w=600&h=800&fit=crop"],
    fabric: "Merino Wool Blend", care: "Hand wash cold", stock: 20, status: "active",
    is_sample: true, is_featured: false,
  },
];

export async function runSeed(): Promise<{ brands: number; categories: number; products: number }> {
  await ensureSchema();
  const { env } = getCloudflareContext<Env>();
  const db = env.DB;

  // Upsert brands
  for (const b of BRANDS) {
    await db.prepare(`INSERT OR IGNORE INTO brands (id,name,slug) VALUES (?,?,?)`)
      .bind(crypto.randomUUID(), b.name, b.slug).run();
  }

  // Upsert categories
  for (const c of CATEGORIES) {
    await db.prepare(`INSERT OR IGNORE INTO categories (id,name,slug) VALUES (?,?,?)`)
      .bind(crypto.randomUUID(), c.name, c.slug).run();
  }

  // Get brand/category IDs
  const brandRows = await db.prepare("SELECT id,slug FROM brands").all();
  const catRows = await db.prepare("SELECT id,slug FROM categories").all();
  const brandMap = new Map((brandRows.results as { id: string; slug: string }[]).map(r => [r.slug, r.id]));
  const catMap = new Map((catRows.results as { id: string; slug: string }[]).map(r => [r.slug, r.id]));

  // Insert products
  let productCount = 0;
  for (const p of SAMPLE_PRODUCTS) {
    const existing = await db.prepare("SELECT id FROM products WHERE slug=?").bind(p.slug).first();
    if (existing) continue;
    await db.prepare(`INSERT INTO products (id,name,slug,brand_id,category_id,description,price,sale_price,sku,sizes,colors,images,fabric,care,stock,status,is_sample,is_featured)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .bind(crypto.randomUUID(), p.name, p.slug,
        brandMap.get(p.brandSlug) ?? null, catMap.get(p.categorySlug) ?? null,
        p.description, p.price, p.sale_price, p.sku,
        JSON.stringify(p.sizes), JSON.stringify(p.colors), JSON.stringify(p.images),
        p.fabric, p.care, p.stock, p.status,
        p.is_sample ? 1 : 0, p.is_featured ? 1 : 0).run();
    productCount++;
  }

  return { brands: BRANDS.length, categories: CATEGORIES.length, products: productCount };
}
