import type { Metadata } from "next";

import { brands } from "@/lib/config";

type Props = { params: Promise<{ slug: string }>; children: React.ReactNode };

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const clean = /^[a-z0-9-]{1,60}$/.test(slug) ? slug : "";
  const known = brands.find((brand) => brand.slug === clean);
  const name = known?.name ?? clean.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  if (!name) return { title: "Brand", robots: { index: false, follow: true } };
  return {
    title: `${name} Kids' Clothing`,
    description: `Shop ${name} children's wear at Rudraksh Collection, Vadodara — boys', girls' and baby clothing with cash on delivery and easy returns.`,
    alternates: { canonical: `/brands/${clean}` },
  };
}

export default function Layout({ children }: Props) {
  return children;
}
