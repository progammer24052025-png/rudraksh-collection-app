import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Collections — Men, Women & Kids",
  description:
    "Browse clothing for men, women and kids by collection: everyday essentials, casual wear and occasion wear. Cash on delivery available.",
  alternates: { canonical: "/collections" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
