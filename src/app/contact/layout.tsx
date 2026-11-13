import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Questions about sizes, orders or delivery? Call, WhatsApp or email Rudraksh Collection in Vadodara — we reply quickly.",
  alternates: { canonical: "/contact" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
