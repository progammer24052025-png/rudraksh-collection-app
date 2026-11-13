import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Directions to the Store",
  description: "Directions to Rudraksh Collection, family clothing store in Vadodara, Gujarat.",
  alternates: { canonical: "/directions" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
