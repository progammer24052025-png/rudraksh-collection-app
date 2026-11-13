import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Our Story",
  description: "How Rudraksh Collection, a family clothing shop in Vadodara, chooses comfortable, good-quality clothes for men, women and kids.",
  alternates: { canonical: "/story" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
