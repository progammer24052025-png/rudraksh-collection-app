// ─────────────────────────────────────────────────────────────
// Canonical data model — every record lives in Firebase Realtime
// Database under /{DB_ROOT}/...  There is no SQL database.
// ─────────────────────────────────────────────────────────────

export type ProductStatus = "active" | "draft" | "archived";
export type OrderStatus = "placed" | "confirmed" | "packed" | "shipped" | "delivered" | "cancelled";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";
export type PaymentMethod = "cod" | "razorpay";

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  description?: string | null;
  status: "active" | "hidden";
  sort_order?: number;
  /**
   * Categories this brand sells in. A brand may sit in several — detected from
   * the bio, then editable by hand in Admin → Catalog → Brands.
   */
  category_slugs?: string[];
  category_names?: string[];
  /** `auto` = filled by the classifier, `manual` = chosen by an admin. */
  category_source?: "auto" | "manual" | null;
  category_updated_at?: string;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  /**
   * Departments this category hangs under. Empty/undefined means top level.
   * "Everyday Essentials" can sit under Men, Women and Kids at once.
   */
  parent_slugs?: string[];
  /** Legacy single-parent value written by older records. */
  parent_slug?: string | null;
  image?: string | null;
  description?: string | null;
  status: "active" | "hidden";
  sort_order?: number;
  created_at: string;
  updated_at?: string;
}

export interface ProductColor {
  name: string;
  hex: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  brand_id: string | null;
  brand_name?: string;
  brand_slug?: string;
  category_id: string | null;
  category_name?: string;
  category_slug?: string;
  description: string;
  price: number;
  sale_price: number | null;
  sku: string | null;
  sizes: string[];
  colors: ProductColor[];
  images: string[];
  /**
   * Transparent cut-out of the piece, generated in the browser from the cover
   * photo. The rail hangs this instead of framing the photo.
   */
  image_cutout?: string | null;
  fabric: string | null;
  care: string | null;
  stock: number;
  status: ProductStatus;
  is_featured: boolean;
  is_new: boolean;
  /** Legacy flag kept for older records. */
  is_sample?: boolean;
  rating?: number;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  brand: string;
  size: string;
  color: string;
  quantity: number;
  price: number;
  image: string;
}

export interface OrderStatusEvent {
  status: OrderStatus;
  at: string;
  note?: string;
}

export interface Order {
  id: string;
  order_number: string;
  user_id: string | null;
  customer_name: string;
  phone: string;
  email: string | null;
  address: string;
  city: string;
  state: string;
  pincode: string;
  items: OrderItem[];
  subtotal: number;
  discount?: number;
  taxable_base?: number;
  tax?: number;
  tax_rate?: number;
  coupon_code?: string | null;
  shipping: number;
  total: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  /** Set only for verified online payments. */
  razorpay_order_id?: string | null;
  razorpay_payment_id?: string | null;
  order_status: OrderStatus;
  notes?: string | null;
  status_history: OrderStatusEvent[];
  created_at: string;
  updated_at: string;
}

/** Public, privacy-safe projection written next to every order. */
export interface OrderTracking {
  order_number: string;
  order_status: OrderStatus;
  payment_status: PaymentStatus;
  status_history: OrderStatusEvent[];
  phone_last4: string;
  total: number;
  created_at: string;
  updated_at: string;
}

export interface Address {
  id: string;
  fullName: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  phone: string | null;
  phoneVerified: boolean;
  addresses: Address[];
  createdAt: string;
  updatedAt: string;
}

export interface AdminRecord {
  uid: string;
  email: string;
  name?: string;
  role: "owner" | "manager";
  created_at: string;
}

export interface StoreSettings {
  storeName?: string;
  tagline?: string;
  legalEntity?: string;
  address?: string;
  cityStatePincode?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  website?: string;
  openingHours?: string;
  googleMapsUrl?: string;
  instagram?: string;
  freeShippingThreshold?: number;
  shippingFee?: number;
  codAvailable?: boolean;
  razorpayEnabled?: boolean;
  announcement?: string;
  gstin?: string;
  pan?: string;
  cin?: string;
  tax?: {
    enabled?: boolean;
    /** Fraction, e.g. 0.05 = 5%. */
    rate?: number;
    /** True when catalogue prices already include GST. */
    inclusive?: boolean;
    label?: string;
  };
  updated_at?: string;
}

export type CouponType = "percent" | "flat";

export interface Coupon {
  code: string;
  title: string;
  description?: string;
  type: CouponType;
  /** Percentage (0–100) for "percent", rupees for "flat". */
  value: number;
  min_order: number;
  /** 0 or undefined means unlimited. */
  max_uses?: number;
  used_count?: number;
  active: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type BannerPlacement = "home_offers" | "announcement" | "cart";

export interface Banner {
  id: string;
  title: string;
  subtitle?: string;
  code?: string;
  image?: string;
  link: string;
  placement: BannerPlacement;
  product_ids?: string[];
  active: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
  sort: number;
  created_at?: string;
  updated_at?: string;
}

export type ActivityType = "signin" | "order" | "wishlist" | "profile" | "coupon";

export interface ActivityEvent {
  id: string;
  type: ActivityType;
  label: string;
  meta?: string;
  href?: string;
  at: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  uid: string | null;
  status: "new" | "read" | "replied";
  created_at: string;
}

export interface CartItem {
  productId: string;
  quantity: number;
  size: string;
  color: string;
}
