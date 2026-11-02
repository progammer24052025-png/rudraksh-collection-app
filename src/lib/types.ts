export interface Brand {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  description: string | null;
  status: "active" | "hidden";
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  status: "active" | "hidden";
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  brand_id: string | null;
  category_id: string | null;
  description: string;
  price: number;
  sale_price: number | null;
  sku: string | null;
  sizes: string[];
  colors: { name: string; hex: string }[];
  images: string[];
  fabric: string | null;
  care: string | null;
  stock: number;
  status: "active" | "draft" | "archived";
  is_sample: boolean;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
  // joined
  brand_name?: string;
  brand_slug?: string;
  category_name?: string;
  category_slug?: string;
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

export interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  phone: string;
  email: string | null;
  address: string;
  city: string;
  state: string;
  pincode: string;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  total: number;
  payment_method: "cod" | "razorpay";
  payment_status: "pending" | "paid" | "failed";
  order_status: "placed" | "confirmed" | "shipped" | "delivered" | "cancelled";
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  created_at: string;
}

export interface StoreSetting {
  key: string;
  value: string;
}
