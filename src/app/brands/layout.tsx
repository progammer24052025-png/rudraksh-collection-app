import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kids' Clothing Brands",
  description:
    "Shop children's wear from trusted Indian brands — Macho, James & Harper, Bodycare, Comfort and more — at Rudraksh Collection, Vadodara.",
  alternates: { canonical: "/brands" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
