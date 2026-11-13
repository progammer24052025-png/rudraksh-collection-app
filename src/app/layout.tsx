import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/auth-context";
import { CartProvider } from "@/lib/cart-context";
import { StoreSettingsProvider } from "@/lib/store-context";
import { storeConfig, siteUrl } from "@/lib/config";
import { getStoreSettings } from "@/lib/server/catalog";
import { AccountSync } from "@/components/account-sync";
import { FirstOrderOffer } from "@/components/first-order-offer";
import { SiteInsights } from "@/components/site-insights";
import { StoreAnalytics } from "@/components/store-analytics";

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

/** A value the store saved itself, and not the placeholder shipped in config. */
const own = (saved: string | undefined, placeholder: string) => {
  const value = (saved ?? "").trim();
  return value && value !== placeholder.trim() ? value : undefined;
};

/**
 * The shop as search engines see it. Contact details are published only once
 * they have been saved in Admin → Settings, so placeholder numbers never reach
 * Google's business listings.
 */
function storeJsonLd(settings: Awaited<ReturnType<typeof getStoreSettings>>) {
  const phone = own(settings?.phone, storeConfig.phone);
  const street = own(settings?.address, storeConfig.address);
  const instagram = settings?.instagram?.trim();
  return {
    "@context": "https://schema.org",
    "@type": "ClothingStore",
    name: storeConfig.name,
    description:
      "Children's clothing store offering boys', girls' and baby wear from trusted Indian brands.",
    url: siteUrl,
    logo: `${siteUrl}/icon.svg`,
    image: `${siteUrl}/opengraph-image`,
    ...(phone ? { telephone: phone } : {}),
    address: {
      "@type": "PostalAddress",
      ...(street ? { streetAddress: street.replace(/\s*\n\s*/g, ", ") } : {}),
      addressLocality: storeConfig.city,
      addressRegion: storeConfig.state,
      addressCountry: "IN",
    },
    ...(settings?.openingHours?.trim() ? { openingHours: settings.openingHours.trim() } : {}),
    ...(instagram && /^https:\/\/(www\.)?instagram\.com\//.test(instagram) ? { sameAs: [instagram] } : {}),
    currenciesAccepted: "INR",
    paymentAccepted: "Cash, UPI, Credit Card, Debit Card, Net Banking",
    areaServed: "India",
  };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const organisationJsonLd = storeJsonLd(await getStoreSettings().catch(() => null));
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
          // `<` is escaped so text saved in admin can never close the script tag.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organisationJsonLd).replace(/</g, "\\u003c") }}
        />
        <SiteInsights />
        <StoreAnalytics />
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
