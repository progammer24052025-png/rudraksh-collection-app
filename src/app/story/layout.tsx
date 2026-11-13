import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Our Story",
  description: "How Rudraksh Collection, a children's wear shop in Vadodara, chooses comfortable, good-quality clothes for little ones.",
  alternates: { canonical: "/story" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
