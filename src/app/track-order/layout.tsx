import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Track Your Order",
  description: "Check the status of your Rudraksh Collection order with your order number.",
  // A form, not content: keep it out of search results.
  robots: { index: false, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
