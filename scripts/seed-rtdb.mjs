#!/usr/bin/env node
/**
 * Seeds the Firebase Realtime Database with the starter catalogue.
 *
 *   npm run seed            # write catalogue + settings (existing orders untouched)
 *   npm run seed -- --force # also overwrite settings that already exist
 *
 * Reads NEXT_PUBLIC_FIREBASE_PROJECT_ID / NEXT_PUBLIC_FIREBASE_DATABASE_URL /
 * NEXT_PUBLIC_FIREBASE_DB_ROOT from .env. Nothing secret is written or logged.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv() {
  try {
    const raw = readFileSync(resolve(root, ".env"), "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const index = trimmed.indexOf("=");
      if (index === -1) continue;
      const key = trimmed.slice(0, index).trim();
      const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    /* .env is optional when the variables are already exported */
  }
}

loadEnv();

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const databaseUrl =
  process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ||
  (projectId ? `https://${projectId}-default-rtdb.firebaseio.com` : "");
const dbRoot = process.env.NEXT_PUBLIC_FIREBASE_DB_ROOT || "rudraksh";
const force = process.argv.includes("--force");

if (!databaseUrl) {
  console.error("Missing NEXT_PUBLIC_FIREBASE_DATABASE_URL (or PROJECT_ID) in .env");
  process.exit(1);
}

const now = new Date().toISOString();
const img = (id) => `https://images.unsplash.com/${id}?w=800&h=1000&fit=crop`;

// ── Brands ────────────────────────────────────────────────
const BRANDS = [
  { slug: "macho", name: "Macho", description: "Everyday boys' wear built for play." },
  { slug: "james-harper", name: "James & Harper", description: "Casual denim and cotton staples for kids." },
  { slug: "hamper", name: "Hamper", description: "Party and occasion outfits for little ones." },
  { slug: "essa", name: "Essa", description: "Soft knitwear and baby essentials." },
  { slug: "bodycare", name: "Bodycare", description: "Gentle cotton basics for babies." },
  { slug: "lux-lyra", name: "Lux Lyra", description: "Comfortable leggings and everyday knits." },
  { slug: "comfort", name: "Comfort", description: "Pyjamas, vests and sleepwear." },
  { slug: "shilpa", name: "Shilpa", description: "Traditional and festive ethnic wear." },
  { slug: "hi-rich", name: "Hi-Rich", description: "Smart-casual sets for boys and girls." },
  { slug: "hackucha", name: "Hackucha", description: "Socks and small essentials." },
  { slug: "topas", name: "Topas", description: "Joggers, track pants and activewear." },
  { slug: "top-gear", name: "Top-Gear", description: "Denim and rugged everyday wear." },
];

// ── Collections ───────────────────────────────────────────
const CATEGORIES = [
  { slug: "boys-wear", name: "Boys' Wear", image: img("photo-1503919545889-aef636e10ad4") },
  { slug: "girls-wear", name: "Girls' Wear", image: img("photo-1518831959646-742c3a14ebf7") },
  { slug: "baby-toddler", name: "Baby & Toddler", image: img("photo-1522771930-78848d9293e8") },
  { slug: "everyday-essentials", name: "Everyday Essentials", image: img("photo-1514090458221-65bb69cf63e6") },
  { slug: "casual-wear", name: "Casual Wear", image: img("photo-1519238263530-99bdd11df2ea") },
  { slug: "occasion-wear", name: "Occasion Wear", image: img("photo-1519689680058-324335c77eba") },
];

const SIZES = {
  baby: ["0-6M", "6-12M", "12-18M", "18-24M"],
  toddler: ["2-3Y", "4-5Y"],
  kids: ["2-3Y", "4-5Y", "6-7Y", "8-9Y", "10-11Y"],
};

const C = {
  white: { name: "White", hex: "#FFFFFF" },
  blue: { name: "Blue", hex: "#2F6FED" },
  navy: { name: "Navy", hex: "#1F2A44" },
  pink: { name: "Pink", hex: "#F4A6B8" },
  peach: { name: "Peach", hex: "#F7C8A8" },
  mint: { name: "Mint", hex: "#A8DCC4" },
  cream: { name: "Cream", hex: "#F6EEDC" },
  sage: { name: "Sage", hex: "#9CAF88" },
  maroon: { name: "Maroon", hex: "#7B2233" },
  mustard: { name: "Mustard", hex: "#D9A02B" },
  grey: { name: "Grey", hex: "#9AA0A6" },
  lavender: { name: "Lavender", hex: "#D6C7EA" },
  red: { name: "Red", hex: "#C0392B" },
  green: { name: "Green", hex: "#2E7D5B" },
};

// ── Products ──────────────────────────────────────────────
const PRODUCTS = [
  {
    slug: "boys-cotton-casual-shirt",
    name: "Boys' Cotton Casual Shirt",
    brand: "macho",
    category: "boys-wear",
    description:
      "A soft, breathable cotton shirt with a relaxed collar and full sleeves. Easy to button, easy to wash — made for school mornings and weekend outings alike.",
    price: 599, sale_price: 499, sku: "MC-BSH-01",
    sizes: SIZES.kids, colors: [C.white, C.blue], fabric: "100% cotton", care: "Machine wash cold",
    stock: 42, featured: true,
    images: [img("photo-1596755094514-f87e34085b2c"), img("photo-1620799140408-edc6dcb6d633")],
  },
  {
    slug: "boys-slim-fit-denim-jeans",
    name: "Boys' Slim Fit Denim Jeans",
    brand: "top-gear",
    category: "boys-wear",
    description:
      "Stretch denim that moves with them. Five-pocket styling, adjustable waist and reinforced knees for climbing, running and everything in between.",
    price: 999, sale_price: 849, sku: "TG-BDN-02",
    sizes: SIZES.kids, colors: [C.navy, C.blue], fabric: "98% cotton, 2% elastane", care: "Machine wash cold, inside out",
    stock: 30, featured: true,
    images: [img("photo-1476703993599-0035a21b17a9"), img("photo-1541099649105-f69ad21f3246")],
  },
  {
    slug: "boys-graphic-print-tshirt",
    name: "Boys' Graphic Print T-Shirt",
    brand: "james-harper",
    category: "casual-wear",
    description:
      "A soft cotton tee with a playful print and a comfortable round neck. Pre-shrunk so it keeps its shape wash after wash.",
    price: 399, sale_price: 329, sku: "JM-BTS-03",
    sizes: SIZES.kids, colors: [C.white, C.mustard, C.green], fabric: "100% combed cotton", care: "Machine wash cold",
    stock: 58, featured: false,
    images: [img("photo-1523381210434-271e8be1f52b"), img("photo-1576566588028-4147f3842f27")],
  },
  {
    slug: "boys-festive-kurta-set",
    name: "Boys' Festive Kurta Set",
    brand: "shilpa",
    category: "occasion-wear",
    description:
      "A smart kurta with matching pyjama in a soft cotton blend. Subtle detailing at the placket makes it perfect for festivals and family functions.",
    price: 1299, sale_price: 1099, sku: "SH-BKS-04",
    sizes: SIZES.kids, colors: [C.cream, C.maroon], fabric: "Cotton blend", care: "Gentle machine wash",
    stock: 18, featured: true,
    images: [img("photo-1503454537195-1dcabb73ffb9"), img("photo-1490427712608-588e68359dbd")],
  },
  {
    slug: "girls-cotton-frock",
    name: "Girls' Cotton Frock",
    brand: "essa",
    category: "girls-wear",
    description:
      "A breezy cotton frock with a gathered waist and soft lining. Comfortable enough for all-day play, pretty enough for a birthday party.",
    price: 699, sale_price: 599, sku: "ES-GFR-05",
    sizes: SIZES.kids, colors: [C.pink, C.peach, C.mint], fabric: "100% cotton", care: "Machine wash cold",
    stock: 36, featured: true,
    images: [img("photo-1518831959646-742c3a14ebf7"), img("photo-1519689680058-324335c77eba")],
  },
  {
    slug: "girls-printed-leggings-pack-of-2",
    name: "Girls' Printed Leggings — Pack of 2",
    brand: "lux-lyra",
    category: "everyday-essentials",
    description:
      "Two pairs of soft, stretchy leggings with a wide comfortable waistband. Colourfast dyes keep the prints bright through repeated washing.",
    price: 549, sale_price: 449, sku: "LL-GLG-06",
    sizes: SIZES.kids, colors: [C.pink, C.navy], fabric: "Cotton elastane", care: "Machine wash cold",
    stock: 64, featured: false,
    images: [img("photo-1503919545889-aef636e10ad4"), img("photo-1483985988355-763728e1935b")],
  },
  {
    slug: "girls-party-gown",
    name: "Girls' Party Gown",
    brand: "hamper",
    category: "occasion-wear",
    description:
      "A layered party gown with a soft tulle skirt and lined bodice. Light on the shoulders, so she can dance all evening without fussing.",
    price: 1699, sale_price: 1399, sku: "HP-GPG-07",
    sizes: SIZES.kids, colors: [C.pink, C.lavender, C.cream], fabric: "Polyester tulle with cotton lining", care: "Hand wash cold",
    stock: 14, featured: true,
    images: [img("photo-1519689680058-324335c77eba"), img("photo-1518831959646-742c3a14ebf7")],
  },
  {
    slug: "girls-cotton-top-skirt-set",
    name: "Girls' Cotton Top & Skirt Set",
    brand: "hi-rich",
    category: "girls-wear",
    description:
      "A coordinated two-piece with a printed cotton top and a flared skirt with an elastic waist. Easy to mix and match with the rest of her wardrobe.",
    price: 899, sale_price: null, sku: "HR-GTS-08",
    sizes: SIZES.kids, colors: [C.mint, C.peach], fabric: "100% cotton", care: "Machine wash cold",
    stock: 26, featured: false,
    images: [img("photo-1519238263530-99bdd11df2ea"), img("photo-1514090458221-65bb69cf63e6")],
  },
  {
    slug: "baby-knit-set",
    name: "Baby 3-Piece Knit Set",
    brand: "essa",
    category: "baby-toddler",
    description:
      "A gentle knit top, bottom and cap set in a soft wool blend. Designed to slip on easily and stay snug without pressing on delicate skin.",
    price: 1199, sale_price: 999, sku: "ES-BKS-09",
    sizes: SIZES.baby, colors: [C.cream, C.sage], fabric: "Merino wool blend", care: "Hand wash cold",
    stock: 22, featured: true,
    images: [img("photo-1522771930-78848d9293e8"), img("photo-1607453998774-d533f65dac99")],
  },
  {
    slug: "baby-cotton-bodysuit-pack-of-3",
    name: "Baby Cotton Bodysuit — Pack of 3",
    brand: "bodycare",
    category: "baby-toddler",
    description:
      "Three soft bodysuits with envelope necks and press-studs for quick changes. Gentle on skin and easy on tired parents.",
    price: 799, sale_price: 649, sku: "BC-BBS-10",
    sizes: SIZES.baby, colors: [C.white, C.mint, C.peach], fabric: "100% cotton", care: "Machine wash warm",
    stock: 48, featured: false,
    images: [img("photo-1543854589-fdd815f176e0"), img("photo-1596870230751-ebdfce98ec42")],
  },
  {
    slug: "toddler-cotton-pyjama-set",
    name: "Toddler Cotton Pyjama Set",
    brand: "comfort",
    category: "baby-toddler",
    description:
      "A relaxed pyjama set with a soft elastic waist. Breathable cotton keeps little sleepers comfortable through the night.",
    price: 649, sale_price: 549, sku: "CF-TPJ-11",
    sizes: SIZES.toddler, colors: [C.blue, C.grey], fabric: "100% cotton", care: "Machine wash cold",
    stock: 40, featured: false,
    images: [img("photo-1556905055-8f358a7a47b2"), img("photo-1543157145-f78c636d023d")],
  },
  {
    slug: "baby-soft-booties",
    name: "Baby Soft Booties",
    brand: "essa",
    category: "baby-toddler",
    description:
      "Soft-soled booties with a gentle elastic cuff that stays on without pinching. A thoughtful gift for a new arrival.",
    price: 349, sale_price: 299, sku: "ES-BBT-12",
    sizes: ["0-6M", "6-12M"], colors: [C.cream, C.pink], fabric: "Cotton knit", care: "Hand wash",
    stock: 55, featured: false,
    images: [img("photo-1522771930-78848d9293e8"), img("photo-1543854589-fdd815f176e0")],
  },
  {
    slug: "kids-cotton-vest-pack-of-5",
    name: "Kids' Cotton Vest — Pack of 5",
    brand: "comfort",
    category: "everyday-essentials",
    description:
      "Five everyday cotton vests with soft seams and a comfortable fit. An everyday staple that holds its shape wash after wash.",
    price: 499, sale_price: null, sku: "CF-KVS-13",
    sizes: SIZES.kids, colors: [C.white], fabric: "100% cotton", care: "Machine wash warm",
    stock: 90, featured: false,
    images: [img("photo-1521572163474-6864b10a1a91"), img("photo-1567401893414-76b7b1e5a7a5")],
  },
  {
    slug: "kids-cotton-socks-pack-of-3",
    name: "Kids' Cotton Socks — Pack of 3",
    brand: "hackucha",
    category: "everyday-essentials",
    description:
      "Three pairs of cushioned cotton socks with a stretchy ribbed cuff. Reinforced heel and toe for the kids who never sit still.",
    price: 299, sale_price: 249, sku: "HK-KSC-14",
    sizes: ["2-3Y", "4-5Y", "6-7Y", "8-9Y"], colors: [C.white, C.navy, C.grey], fabric: "Cotton blend", care: "Machine wash warm",
    stock: 120, featured: false,
    images: [img("photo-1586350977771-b3b0abd50c82"), img("photo-1514090458221-65bb69cf63e6")],
  },
  {
    slug: "kids-cotton-pyjama-set",
    name: "Kids' Cotton Pyjama Set",
    brand: "comfort",
    category: "everyday-essentials",
    description:
      "A breathable cotton pyjama set with a drawstring waist. Soft enough for bedtime, tidy enough for a lazy Sunday morning.",
    price: 699, sale_price: 579, sku: "CF-KPJ-15",
    sizes: SIZES.kids, colors: [C.blue, C.pink, C.grey], fabric: "100% cotton", care: "Machine wash cold",
    stock: 52, featured: false,
    images: [img("photo-1543157145-f78c636d023d"), img("photo-1556905055-8f358a7a47b2")],
  },
  {
    slug: "boys-jogger-pants",
    name: "Boys' Jogger Pants",
    brand: "topas",
    category: "casual-wear",
    description:
      "Fleece-lined joggers with cuffed ankles and a soft drawstring waist. Warm without bulk, and roomy enough for playground sprints.",
    price: 799, sale_price: 649, sku: "TP-BJP-16",
    sizes: SIZES.kids, colors: [C.navy, C.grey, C.green], fabric: "Cotton fleece", care: "Machine wash cold",
    stock: 34, featured: false,
    images: [img("photo-1555009393-f20bdb245c4d"), img("photo-1476703993599-0035a21b17a9")],
  },
  {
    slug: "girls-denim-dungaree",
    name: "Girls' Denim Dungaree",
    brand: "james-harper",
    category: "casual-wear",
    description:
      "A classic dungaree in soft stretch denim with adjustable straps and a roomy front pocket. Layer it over a tee in every season.",
    price: 1099, sale_price: 899, sku: "JM-GDD-17",
    sizes: SIZES.kids, colors: [C.blue], fabric: "98% cotton, 2% elastane", care: "Machine wash cold, inside out",
    stock: 24, featured: true,
    images: [img("photo-1541099649105-f69ad21f3246"), img("photo-1519238263530-99bdd11df2ea")],
  },
  {
    slug: "kids-hooded-sweatshirt",
    name: "Kids' Hooded Sweatshirt",
    brand: "macho",
    category: "casual-wear",
    description:
      "A cosy brushed-back sweatshirt with a lined hood and kangaroo pocket. Warm on chilly mornings without feeling heavy.",
    price: 849, sale_price: null, sku: "MC-KHS-18",
    sizes: SIZES.kids, colors: [C.mustard, C.navy, C.sage], fabric: "Cotton-poly fleece", care: "Machine wash cold",
    stock: 38, featured: false,
    images: [img("photo-1515886657613-9f3515b0c78f"), img("photo-1483985988355-763728e1935b")],
  },
  {
    slug: "girls-silk-blend-lehenga-choli",
    name: "Girls' Silk Blend Lehenga Choli",
    brand: "shilpa",
    category: "occasion-wear",
    description:
      "A festive lehenga with a soft lining and a light dupatta. Traditional detailing, modern comfort — made for long celebrations.",
    price: 2799, sale_price: 2299, sku: "SH-GLC-19",
    sizes: SIZES.kids, colors: [C.maroon, C.mustard], fabric: "Silk blend", care: "Dry clean only",
    stock: 10, featured: true,
    images: [img("photo-1610030469983-98e550d6193c"), img("photo-1519689680058-324335c77eba")],
  },
  {
    slug: "boys-ethnic-kurta-pyjama",
    name: "Boys' Ethnic Kurta Pyjama",
    brand: "hi-rich",
    category: "occasion-wear",
    description:
      "A crisp kurta pyjama set in a breathable cotton blend. Clean lines and a comfortable fit for poojas, weddings and festivals.",
    price: 1399, sale_price: 1199, sku: "HR-BKP-20",
    sizes: SIZES.kids, colors: [C.cream, C.maroon, C.green], fabric: "Cotton blend", care: "Gentle machine wash",
    stock: 20, featured: false,
    images: [img("photo-1490427712608-588e68359dbd"), img("photo-1503454537195-1dcabb73ffb9")],
  },
  {
    slug: "girls-embroidered-anarkali-dress",
    name: "Girls' Embroidered Anarkali Dress",
    brand: "hamper",
    category: "occasion-wear",
    description:
      "A flared anarkali with delicate embroidery at the yoke and a soft cotton lining. Twirl-friendly and comfortable for hours of celebration.",
    price: 1999, sale_price: 1699, sku: "HP-GAD-21",
    sizes: SIZES.kids, colors: [C.peach, C.maroon], fabric: "Georgette with cotton lining", care: "Dry clean recommended",
    stock: 12, featured: true,
    images: [img("photo-1518831959646-742c3a14ebf7"), img("photo-1596870230751-ebdfce98ec42")],
  },
];

const brandBySlug = Object.fromEntries(
  BRANDS.map((brand, index) => [
    brand.slug,
    { ...brand, id: brand.slug, sort_order: index, status: "active", logo: null, created_at: now },
  ]),
);
const categoryBySlug = Object.fromEntries(
  CATEGORIES.map((category, index) => [
    category.slug,
    {
      ...category,
      id: category.slug,
      description: null,
      sort_order: index,
      status: "active",
      created_at: now,
    },
  ]),
);

const products = {};
PRODUCTS.forEach((product, index) => {
  const brand = brandBySlug[product.brand];
  const category = categoryBySlug[product.category];
  const id = `p_${product.slug}`;
  products[id] = {
    id,
    name: product.name,
    slug: product.slug,
    brand_id: brand.id,
    brand_name: brand.name,
    brand_slug: brand.slug,
    category_id: category.id,
    category_name: category.name,
    category_slug: category.slug,
    description: product.description,
    price: product.price,
    sale_price: product.sale_price,
    sku: product.sku,
    sizes: product.sizes,
    colors: product.colors,
    images: product.images,
    fabric: product.fabric,
    care: product.care,
    stock: product.stock,
    status: "active",
    is_featured: Boolean(product.featured),
    is_new: index < 8,
    rating: 4.5,
    tags: [category.name, brand.name],
    created_at: new Date(Date.now() - index * 86_400_000).toISOString(),
    updated_at: now,
  };
});

const settings = {
  storeName: "Rudraksh Collection",
  tagline: "Little Moments, Beautifully Dressed",
  address: "",
  phone: "",
  whatsapp: "",
  email: "hello@rudrakshcollection.in",
  openingHours: "",
  googleMapsUrl: "",
  instagram: "",
  announcement: "Free shipping on orders above ₹999",
  freeShippingThreshold: 999,
  shippingFee: 99,
  codAvailable: true,
  razorpayEnabled: false,
  updated_at: now,
};

async function put(path, value) {
  const url = `${databaseUrl.replace(/\/$/, "")}/${dbRoot}/${path}.json`;
  const response = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(value),
  });
  if (!response.ok) {
    throw new Error(`PUT /${dbRoot}/${path} failed: ${response.status} ${await response.text()}`);
  }
}

async function main() {
  console.log(`Seeding ${databaseUrl}/${dbRoot} …`);

  const existingSettings = await fetch(
    `${databaseUrl.replace(/\/$/, "")}/${dbRoot}/settings.json`,
  ).then((response) => (response.ok ? response.json() : null));

  await put("brands", brandBySlug);
  console.log(`  brands      ${Object.keys(brandBySlug).length}`);

  await put("categories", categoryBySlug);
  console.log(`  categories  ${Object.keys(categoryBySlug).length}`);

  await put("products", products);
  console.log(`  products    ${Object.keys(products).length}`);

  if (!existingSettings || force) {
    await put("settings", settings);
    console.log("  settings    written");
  } else {
    console.log("  settings    kept existing (use --force to overwrite)");
  }

  console.log("Done.");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
