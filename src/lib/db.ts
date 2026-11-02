import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { Product, Brand, Category, Order, OrderItem } from "./types";

type Env = { DB: D1Database };

function getDb(): D1Database {
  const { env } = getCloudflareContext<Env>();
  return env.DB;
}

// ── Schema ──────────────────────────────────────────────
const SCHEMA = `
CREATE TABLE IF NOT EXISTS brands (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  image TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  brand_id TEXT REFERENCES brands(id),
  category_id TEXT REFERENCES categories(id),
  description TEXT NOT NULL DEFAULT '',
  price INTEGER NOT NULL,
  sale_price INTEGER,
  sku TEXT,
  sizes TEXT NOT NULL DEFAULT '[]',
  colors TEXT NOT NULL DEFAULT '[]',
  images TEXT NOT NULL DEFAULT '[]',
  fabric TEXT,
  care TEXT,
  stock INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  is_sample INTEGER NOT NULL DEFAULT 0,
  is_featured INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  pincode TEXT NOT NULL,
  items TEXT NOT NULL,
  subtotal INTEGER NOT NULL,
  shipping INTEGER NOT NULL,
  total INTEGER NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'cod',
  payment_status TEXT NOT NULL DEFAULT 'pending',
  order_status TEXT NOT NULL DEFAULT 'placed',
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS admin_users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS store_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL REFERENCES admin_users(id),
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

let schemaReady = false;
const STATEMENTS = SCHEMA.split(";").map(s => s.trim()).filter(Boolean);
export async function ensureSchema(): Promise<void> {
  if (schemaReady) return;
  const db = getDb();
  for (const stmt of STATEMENTS) {
    await db.prepare(stmt).run();
  }
  schemaReady = true;
}

// ── Brands ──────────────────────────────────────────────
export async function getBrands(): Promise<Brand[]> {
  await ensureSchema();
  const db = getDb();
  const res = await db.prepare("SELECT * FROM brands WHERE status='active' ORDER BY name").all();
  return res.results as Brand[];
}

export async function getBrandBySlug(slug: string): Promise<Brand | null> {
  await ensureSchema();
  const db = getDb();
  return (await db.prepare("SELECT * FROM brands WHERE slug=?").bind(slug).first()) as Brand | null;
}

export async function upsertBrand(b: Partial<Brand> & { name: string; slug: string }): Promise<void> {
  await ensureSchema();
  const db = getDb();
  await db.prepare(`INSERT INTO brands (id,name,slug,logo,description,status) VALUES (?,?,?,?,?,?)
    ON CONFLICT(slug) DO UPDATE SET name=excluded.name, logo=excluded.logo, description=excluded.description, status=excluded.status`)
    .bind(b.id ?? crypto.randomUUID(), b.name, b.slug, b.logo ?? null, b.description ?? null, b.status ?? 'active').run();
}

// ── Categories ──────────────────────────────────────────
export async function getCategories(): Promise<Category[]> {
  await ensureSchema();
  const db = getDb();
  const res = await db.prepare("SELECT * FROM categories WHERE status='active' ORDER BY name").all();
  return res.results as Category[];
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  await ensureSchema();
  const db = getDb();
  return (await db.prepare("SELECT * FROM categories WHERE slug=?").bind(slug).first()) as Category | null;
}

export async function upsertCategory(c: Partial<Category> & { name: string; slug: string }): Promise<void> {
  await ensureSchema();
  const db = getDb();
  await db.prepare(`INSERT INTO categories (id,name,slug,image,status) VALUES (?,?,?,?,?)
    ON CONFLICT(slug) DO UPDATE SET name=excluded.name, image=excluded.image, status=excluded.status`)
    .bind(c.id ?? crypto.randomUUID(), c.name, c.slug, c.image ?? null, c.status ?? 'active').run();
}

// ── Products ────────────────────────────────────────────
interface ProductRow {
  id: string; name: string; slug: string; brand_id: string | null; category_id: string | null;
  description: string; price: number; sale_price: number | null; sku: string | null;
  sizes: string; colors: string; images: string; fabric: string | null; care: string | null;
  stock: number; status: string; is_sample: number; is_featured: number;
  created_at: string; updated_at: string;
  brand_name?: string; brand_slug?: string; category_name?: string; category_slug?: string;
}

function mapProduct(row: ProductRow): Product {
  return {
    ...row,
    sizes: JSON.parse(row.sizes || "[]"),
    colors: JSON.parse(row.colors || "[]"),
    images: JSON.parse(row.images || "[]"),
    is_sample: !!row.is_sample,
    is_featured: !!row.is_featured,
  };
}

export interface ProductFilters {
  brand?: string;
  category?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  sizes?: string[];
  featured?: boolean;
  sample?: boolean;
  limit?: number;
  offset?: number;
}

export async function getProducts(filters: ProductFilters = {}): Promise<{ products: Product[]; total: number }> {
  await ensureSchema();
  const db = getDb();
  let where = "WHERE p.status='active'";
  const params: unknown[] = [];

  if (filters.brand) { where += " AND b.slug=?"; params.push(filters.brand); }
  if (filters.category) { where += " AND c.slug=?"; params.push(filters.category); }
  if (filters.search) { where += " AND (p.name LIKE ? OR p.description LIKE ? OR b.name LIKE ?)"; const s = `%${filters.search}%`; params.push(s, s, s); }
  if (filters.minPrice != null) { where += " AND p.price>=?"; params.push(filters.minPrice); }
  if (filters.maxPrice != null) { where += " AND p.price<=?"; params.push(filters.maxPrice); }
  if (filters.featured) where += " AND p.is_featured=1";
  if (filters.sample != null) { where += " AND p.is_sample=?"; params.push(filters.sample ? 1 : 0); }

  const countSql = `SELECT COUNT(*) as cnt FROM products p LEFT JOIN brands b ON p.brand_id=b.id LEFT JOIN categories c ON p.category_id=c.id ${where}`;
  const countRes = await db.prepare(countSql).bind(...params).first<{ cnt: number }>();
  const total = countRes?.cnt ?? 0;

  let sql = `SELECT p.*, b.name as brand_name, b.slug as brand_slug, c.name as category_name, c.slug as category_slug
    FROM products p LEFT JOIN brands b ON p.brand_id=b.id LEFT JOIN categories c ON p.category_id=c.id ${where}
    ORDER BY p.created_at DESC`;
  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;
  sql += " LIMIT ? OFFSET ?";
  params.push(limit, offset);

  const res = await db.prepare(sql).bind(...params).all();
  return { products: (res.results as ProductRow[]).map(mapProduct), total };
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  await ensureSchema();
  const db = getDb();
  const row = await db.prepare(`SELECT p.*, b.name as brand_name, b.slug as brand_slug, c.name as category_name, c.slug as category_slug
    FROM products p LEFT JOIN brands b ON p.brand_id=b.id LEFT JOIN categories c ON p.category_id=c.id WHERE p.slug=?`).bind(slug).first() as ProductRow | null;
  return row ? mapProduct(row) : null;
}

export async function getProductById(id: string): Promise<Product | null> {
  await ensureSchema();
  const db = getDb();
  const row = await db.prepare(`SELECT p.*, b.name as brand_name, b.slug as brand_slug, c.name as category_name, c.slug as category_slug
    FROM products p LEFT JOIN brands b ON p.brand_id=b.id LEFT JOIN categories c ON p.category_id=c.id WHERE p.id=?`).bind(id).first() as ProductRow | null;
  return row ? mapProduct(row) : null;
}

export async function upsertProduct(p: Partial<Product> & { name: string; slug: string; price: number }): Promise<void> {
  await ensureSchema();
  const db = getDb();
  const id = p.id ?? crypto.randomUUID();
  await db.prepare(`INSERT INTO products (id,name,slug,brand_id,category_id,description,price,sale_price,sku,sizes,colors,images,fabric,care,stock,status,is_sample,is_featured,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'))
    ON CONFLICT(slug) DO UPDATE SET name=excluded.name, brand_id=excluded.brand_id, category_id=excluded.category_id,
      description=excluded.description, price=excluded.price, sale_price=excluded.sale_price, sku=excluded.sku,
      sizes=excluded.sizes, colors=excluded.colors, images=excluded.images, fabric=excluded.fabric, care=excluded.care,
      stock=excluded.stock, status=excluded.status, is_sample=excluded.is_sample, is_featured=excluded.is_featured, updated_at=datetime('now')`)
    .bind(id, p.name, p.slug, p.brand_id ?? null, p.category_id ?? null, p.description ?? "",
      p.price, p.sale_price ?? null, p.sku ?? null,
      JSON.stringify(p.sizes ?? []), JSON.stringify(p.colors ?? []), JSON.stringify(p.images ?? []),
      p.fabric ?? null, p.care ?? null, p.stock ?? 0, p.status ?? "active",
      p.is_sample ? 1 : 0, p.is_featured ? 1 : 0).run();
}

export async function deleteProduct(id: string): Promise<void> {
  await ensureSchema();
  const db = getDb();
  await db.prepare("DELETE FROM products WHERE id=?").bind(id).run();
}

// ── Orders ──────────────────────────────────────────────
export async function createOrder(o: {
  customer_name: string; phone: string; email?: string;
  address: string; city: string; state: string; pincode: string;
  items: OrderItem[]; subtotal: number; shipping: number; total: number;
  payment_method: "cod" | "razorpay"; notes?: string;
}): Promise<Order> {
  await ensureSchema();
  const db = getDb();
  const id = crypto.randomUUID();
  const orderNumber = `RC-${Date.now().toString(36).toUpperCase()}-${id.slice(0, 4).toUpperCase()}`;
  await db.prepare(`INSERT INTO orders (id,order_number,customer_name,phone,email,address,city,state,pincode,items,subtotal,shipping,total,payment_method,notes)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .bind(id, orderNumber, o.customer_name, o.phone, o.email ?? null, o.address, o.city, o.state, o.pincode,
      JSON.stringify(o.items), o.subtotal, o.shipping, o.total, o.payment_method, o.notes ?? null).run();
  return (await db.prepare("SELECT * FROM orders WHERE id=?").bind(id).first()) as Order;
}

export async function getOrder(id: string): Promise<Order | null> {
  await ensureSchema();
  const db = getDb();
  const row = await db.prepare("SELECT * FROM orders WHERE id=? OR order_number=?").bind(id, id).first() as Record<string, unknown> | null;
  if (!row) return null;
  return { ...row, items: JSON.parse(row.items as string) } as Order;
}

export async function getOrders(status?: string): Promise<Order[]> {
  await ensureSchema();
  const db = getDb();
  let sql = "SELECT * FROM orders";
  const params: unknown[] = [];
  if (status) { sql += " WHERE order_status=?"; params.push(status); }
  sql += " ORDER BY created_at DESC LIMIT 200";
  const res = await db.prepare(sql).bind(...params).all();
  return (res.results as Record<string, unknown>[]).map(r => ({ ...r, items: JSON.parse(r.items as string) }) as Order);
}

export async function updateOrderStatus(id: string, status: string, paymentStatus?: string): Promise<void> {
  await ensureSchema();
  const db = getDb();
  if (paymentStatus) {
    await db.prepare("UPDATE orders SET order_status=?, payment_status=?, updated_at=datetime('now') WHERE id=?").bind(status, paymentStatus, id).run();
  } else {
    await db.prepare("UPDATE orders SET order_status=?, updated_at=datetime('now') WHERE id=?").bind(status, id).run();
  }
}

// ── Admin ───────────────────────────────────────────────
export async function getAdminByEmail(email: string): Promise<{ id: string; email: string; password_hash: string; name: string | null } | null> {
  await ensureSchema();
  const db = getDb();
  return await db.prepare("SELECT id,email,password_hash,name FROM admin_users WHERE email=?").bind(email).first() as never;
}

export async function createAdmin(email: string, passwordHash: string, name?: string): Promise<void> {
  await ensureSchema();
  const db = getDb();
  await db.prepare("INSERT OR IGNORE INTO admin_users (id,email,password_hash,name) VALUES (?,?,?,?)")
    .bind(crypto.randomUUID(), email, passwordHash, name ?? null).run();
}

export async function createSession(token: string, adminId: string, expiresAt: Date): Promise<void> {
  await ensureSchema();
  const db = getDb();
  await db.prepare("INSERT INTO sessions (token,admin_id,expires_at) VALUES (?,?,?)")
    .bind(token, adminId, expiresAt.toISOString()).run();
}

export async function getSession(token: string): Promise<{ admin_id: string; email: string; name: string | null } | null> {
  await ensureSchema();
  const db = getDb();
  const row = await db.prepare(`SELECT s.admin_id, s.expires_at, a.email, a.name FROM sessions s JOIN admin_users a ON s.admin_id=a.id WHERE s.token=?`).bind(token).first() as
    { admin_id: string; expires_at: string; email: string; name: string | null } | null;
  if (!row) return null;
  if (new Date(row.expires_at) < new Date()) return null;
  return { admin_id: row.admin_id, email: row.email, name: row.name };
}

export async function deleteSession(token: string): Promise<void> {
  await ensureSchema();
  const db = getDb();
  await db.prepare("DELETE FROM sessions WHERE token=?").bind(token).run();
}

// ── Settings ────────────────────────────────────────────
export async function getSetting(key: string): Promise<string | null> {
  await ensureSchema();
  const db = getDb();
  const row = await db.prepare("SELECT value FROM store_settings WHERE key=?").bind(key).first<{ value: string }>();
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await ensureSchema();
  const db = getDb();
  await db.prepare("INSERT INTO store_settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(key, value).run();
}

export async function getAllSettings(): Promise<Record<string, string>> {
  await ensureSchema();
  const db = getDb();
  const res = await db.prepare("SELECT key,value FROM store_settings").all();
  const out: Record<string, string> = {};
  for (const r of res.results as { key: string; value: string }[]) out[r.key] = r.value;
  return out;
}
