import type { Metadata } from "next";

export const metadata: Metadata = {
  // The root template already suffixes the default; restating the template keeps it for
  // product pages below this layout.
  title: {
    default: "Shop Kids' Clothing — Boys, Girls & Baby Wear",
    template: "%s | Rudraksh Collection",
  },
  description:
    "Browse boys', girls', baby and toddler clothing from trusted brands at Rudraksh Collection, Vadodara. Filter by size, brand and price. Cash on delivery available.",
  alternates: { canonical: "/products" },
};

export default function ProductsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
