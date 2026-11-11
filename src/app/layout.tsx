import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/auth-context";
import { CartProvider } from "@/lib/cart-context";
import { StoreSettingsProvider } from "@/lib/store-context";
import { storeConfig, siteUrl } from "@/lib/config";
import { AccountSync } from "@/components/account-sync";
import { FirstOrderOffer } from "@/components/first-order-offer";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Rudraksh Collection — Premium Children's Wear | Vadodara",
    template: "%s | Rudraksh Collection",
  },
  description:
    "Shop quality children's wear from trusted brands at Rudraksh Collection, Vadodara. Boys', girls', baby & toddler clothing. Free shipping on orders above ₹999.",
  keywords: [
    "children's wear",
    "kids clothing",
    "boys wear",
    "girls wear",
    "baby clothes",
    "Vadodara",
    "Rudraksh Collection",
    "kids fashion India",
  ],
  applicationName: storeConfig.name,
  authors: [{ name: storeConfig.name }],
  openGraph: {
    title: "Rudraksh Collection — Premium Children's Wear",
    description:
      "Quality children's wear from trusted brands. Shop now at Rudraksh Collection, Vadodara.",
    type: "website",
    locale: "en_IN",
    siteName: storeConfig.name,
    url: siteUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: "Rudraksh Collection — Premium Children's Wear",
    description: "Quality children's wear from trusted brands, delivered across India.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#faf7f2",
};

const organisationJsonLd = {
  "@context": "https://schema.org",
  "@type": "ClothingStore",
  name: storeConfig.name,
  description:
    "Children's clothing store offering boys', girls' and baby wear from trusted Indian brands.",
  url: siteUrl,
  address: {
    "@type": "PostalAddress",
    addressLocality: storeConfig.city,
    addressRegion: storeConfig.state,
    addressCountry: "IN",
  },
  areaServed: "India",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-3 focus:text-sm focus:font-medium focus:text-primary-foreground"
        >
          Skip to content
        </a>
        <StoreSettingsProvider>
          <AuthProvider>
            <CartProvider>
              <AccountSync />
              {children}
              <FirstOrderOffer />
            </CartProvider>
          </AuthProvider>
        </StoreSettingsProvider>
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organisationJsonLd) }}
        />
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
