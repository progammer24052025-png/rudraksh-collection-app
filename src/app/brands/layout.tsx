import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Clothing Brands We Stock",
  description:
    "Shop men's, women's and kids' wear from trusted Indian brands — Macho, James & Harper, Bodycare, Comfort and more — at Rudraksh Collection, Vadodara.",
  alternates: { canonical: "/brands" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
