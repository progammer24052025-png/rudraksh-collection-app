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
    default: "Rudraksh Collection — Clothing Store for Men, Women & Kids in Vadodara",
    template: "%s | Rudraksh Collection",
  },
  description:
    "Rudraksh Collection is a family clothing shop in Khodiyar Nagar, New VIP Road, Vadodara: everyday and ethnic wear for men, women and kids. Shop online with cash on delivery, or visit the store.",
  keywords: [
    "clothing store Vadodara",
    "men's wear",
    "women's wear",
    "ethnic wear",
    "children's wear",
    "kids clothing",
    "boys wear",
    "girls wear",
    "baby clothes",
    "Vadodara",
    "Rudraksh Collection",
    "family clothing store",
  ],
  applicationName: storeConfig.name,
  // Google Search Console's HTML-tag check. A *.vercel.app address cannot use
  // the DNS method, so the code Search Console gives you goes in this variable.
  ...(process.env.GOOGLE_SITE_VERIFICATION
    ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION.trim() } }
    : {}),
  authors: [{ name: storeConfig.name }],
  openGraph: {
    title: "Rudraksh Collection — Clothing for Men, Women & Kids",
    description:
      "Everyday and ethnic wear for the whole family from trusted brands. Shop online or visit us in Vadodara.",
    type: "website",
    locale: "en_IN",
    siteName: storeConfig.name,
    url: siteUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: "Rudraksh Collection — Clothing for Men, Women & Kids",
    description: "Everyday and ethnic wear for the whole family, delivered across India.",
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
  // A Google Maps *listing* link (not the embed URL used for the map widget).
  const listing = (settings?.googleBusinessUrl ?? "").trim();
  const mapsListing = /^https:\/\/(maps\.app\.goo\.gl|g\.page|(www\.)?google\.[a-z.]+\/maps)\//.test(listing) ? listing : undefined;
  const profiles = [
    ...(instagram && /^https:\/\/(www\.)?instagram\.com\//.test(instagram) ? [instagram] : []),
    ...(mapsListing ? [mapsListing] : []),
  ];
  return {
    "@context": "https://schema.org",
    "@type": "ClothingStore",
    name: storeConfig.name,
    alternateName: ["Rudraksh Collection (Children Wear)", "Rudraksha Collection", "રુદ્રાક્ષ કલેક્શન"],
    description:
      "Family clothing store in Vadodara offering everyday and ethnic wear for men, women and children from trusted Indian brands.",
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
    ...(profiles.length ? { sameAs: profiles } : {}),
    ...(mapsListing ? { hasMap: mapsListing } : {}),
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
