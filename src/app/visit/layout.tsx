import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Visit Our Store in Vadodara",
  description: "Find Rudraksh Collection in Vadodara: address, opening hours and directions. Come in to try sizes before you buy.",
  alternates: { canonical: "/visit" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
