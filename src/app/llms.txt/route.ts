import { brands, collections, departments, siteUrl, storeConfig } from "@/lib/config";

/**
 * /llms.txt — a plain-language summary of the store for AI assistants and other readers
 * (https://llmstxt.org). It only restates facts already published on the site's own pages.
 * Contact details are left out on purpose: the defaults in config are placeholders until the
 * owner saves real ones in Admin → Settings, and a wrong phone number quoted by an assistant
 * is worse than none. Point readers at /contact instead.
 */
export const revalidate = 86400;

export function GET() {
  const url = (path: string) => `${siteUrl}${path}`;
  const body = `# ${storeConfig.name}

> ${storeConfig.name} is a clothing store in ${storeConfig.city}, ${storeConfig.state}, India, best known for children's wear, with an online shop that delivers across India.

## What the store sells
- Departments: ${departments.map((d) => d.name).join(", ")}
- Collections: ${collections.map((c) => c.name).join(", ")}
- Brands stocked: ${brands.map((b) => b.name).join(", ")}

## Ordering, delivery and returns
- Free delivery on orders of ₹${storeConfig.freeShippingThreshold} and above, anywhere in India.
- Orders are dispatched in ${storeConfig.dispatchDays} and usually arrive in ${storeConfig.deliveryDays}.
- Payment: online (UPI, cards, netbanking via Razorpay)${storeConfig.codAvailable ? " or cash on delivery" : ""}.
- Returns within ${storeConfig.returnWindowDays} days of delivery for unused items with tags; size exchanges are free. Innerwear and opened socks cannot be returned.

## Key pages
- [Shop all products](${url("/products")})
- [Collections](${url("/collections")})
- [Brands](${url("/brands")})
- [Shipping & delivery policy](${url("/shipping")})
- [Returns & refunds](${url("/returns")})
- [FAQ](${url("/faq")})
- [Visit the store in ${storeConfig.city}](${url("/visit")})
- [Contact](${url("/contact")})
- [Track an order](${url("/track-order")})
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
