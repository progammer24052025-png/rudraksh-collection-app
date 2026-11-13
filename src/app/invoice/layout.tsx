import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Invoice",
  // Invoices hold a customer's name and address: never index or follow.
  robots: { index: false, follow: false, nocache: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
