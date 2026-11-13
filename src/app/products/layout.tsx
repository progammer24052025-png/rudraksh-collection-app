import type { Metadata } from "next";

export const metadata: Metadata = {
  // The root template already suffixes the default; restating the template keeps it for
  // product pages below this layout.
  title: {
    default: "Shop Clothing for Men, Women & Kids",
    template: "%s | Rudraksh Collection",
  },
  description:
    "Browse men's, women's and kids' clothing — everyday and ethnic wear — from trusted brands at Rudraksh Collection, Vadodara. Filter by size, brand and price. Cash on delivery available.",
  alternates: { canonical: "/products" },
};

export default function ProductsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
