import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Collections — Boys, Girls & Baby Wear",
  description:
    "Browse boys', girls' and baby & toddler clothing by collection: everyday essentials, casual wear and occasion wear. Cash on delivery available.",
  alternates: { canonical: "/collections" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
