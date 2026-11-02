import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: {
    default: "Rudraksh Collection — Premium Children's Wear | Vadodara",
    template: "%s | Rudraksh Collection",
  },
  description:
    "Shop quality children's wear from trusted brands at Rudraksh Collection, Vadodara. Boys', girls', baby & toddler clothing. Free shipping on orders above ₹999.",
  keywords: [
    "children's wear", "kids clothing", "boys wear", "girls wear", "baby clothes",
    "Vadodara", "Rudraksh Collection", "kids fashion India",
  ],
  openGraph: {
    title: "Rudraksh Collection — Premium Children's Wear",
    description: "Quality children's wear from trusted brands. Shop now at Rudraksh Collection, Vadodara.",
    type: "website",
    locale: "en_IN",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
