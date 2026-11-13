import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Offers & Coupon Codes",
  description: "Current discounts and coupon codes on children's clothing at Rudraksh Collection. Free delivery on larger orders.",
  alternates: { canonical: "/offers" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
