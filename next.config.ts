import type { NextConfig } from "next";
import path from "node:path";

import { imageHosts } from "./src/lib/image-hosts";

// Local `next dev` runs against the Wrangler emulated bindings when they are
// installed. Vercel builds and production builds skip this entirely: there is
// no Cloudflare account, no wrangler and no local bindings there.
const onVercel = process.env.VERCEL === "1";
const isDev = process.env.NODE_ENV !== "production";

if (isDev && !onVercel) {
  void import("@opennextjs/cloudflare")
    .then(({ initOpenNextCloudflareForDev }) =>
      initOpenNextCloudflareForDev({ configPath: "./freebuff.wrangler.jsonc" }),
    )
    .catch(() => {
      // wrangler is not installed here — plain Next.js dev server is fine.
    });
}


/**
 * The image optimizer only fetches from the hosts in `src/lib/image-hosts.ts`
 * (extend with the `IMAGE_HOSTS` env var). A pasted URL on any other https host
 * still displays — `StoreImage` serves it unoptimized — it just cannot use our
 * optimizer as a free proxy.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  // Next inlines its bootstrap scripts, so 'unsafe-inline' is required without a
  // nonce pipeline. Third-party origins stay enumerated.
  `script-src 'self' 'unsafe-inline'${
    isDev ? " 'unsafe-eval'" : ""
  } https://*.razorpay.com https://apis.google.com https://www.google.com https://www.gstatic.com https://accounts.google.com https://*.firebaseio.com https://*.firebasedatabase.app`,
  // ^ The database hosts are required in script-src: when a WebSocket cannot be
  // opened (office networks, some antivirus and browser extensions), the
  // Realtime Database falls back to long-polling, which loads its data through
  // <script> tags from the database host. Without them the catalogue never
  // arrives on those machines and every page sits on its loading skeleton.
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://fonts.gstatic.com",
  "connect-src 'self' https://*.firebaseio.com wss://*.firebaseio.com https://*.firebasedatabase.app wss://*.firebasedatabase.app https://*.googleapis.com https://*.firebaseapp.com https://*.razorpay.com",
  // The database hosts are here for the same long-polling fallback as above.
  "frame-src 'self' https://*.razorpay.com https://*.firebaseapp.com https://www.google.com https://recaptcha.google.com https://accounts.google.com https://*.firebaseio.com https://*.firebasedatabase.app",
  "media-src 'self' blob: https:",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  // The gateway posts the customer to their bank; allow only that exception.
  "form-action 'self' https://*.razorpay.com",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // The admin panel must never be framed — clickjacking an "approve refund"
  // button is the classic reason this header exists.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
  // `allow-popups` keeps the Google sign-in popup able to talk to the opener.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  ...(isDev
    ? []
    : [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]),
];

const nextConfig: NextConfig = {
  env: {
    FIREBASE_API_KEY: process.env.FIREBASE_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
    FIREBASE_AUTH_DOMAIN: process.env.FIREBASE_AUTH_DOMAIN || process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
    FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
    FIREBASE_MESSAGING_SENDER_ID: process.env.FIREBASE_MESSAGING_SENDER_ID || process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
    FIREBASE_APP_ID: process.env.FIREBASE_APP_ID || process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
    FIREBASE_DATABASE_URL: process.env.FIREBASE_DATABASE_URL || process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "",
    FIREBASE_DB_ROOT: process.env.FIREBASE_DB_ROOT || process.env.NEXT_PUBLIC_FIREBASE_DB_ROOT || "rudraksh",
    ADMIN_EMAIL: process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL || "",
    SITE_URL: process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "",
    IMAGE_HOSTS: process.env.IMAGE_HOSTS || "",
    // Lets an open app notice that a newer deploy is live (components/app-updates).
    APP_VERSION: (process.env.VERCEL_GIT_COMMIT_SHA || process.env.VERCEL_DEPLOYMENT_ID || "dev").slice(0, 12),
  },
  images: {
    remotePatterns: imageHosts.map((hostname) => ({ protocol: 'https' as const, hostname })),
  },
  async headers() {
    // Pages that belong to one customer or to the team: never in search results,
    // even if a link to them is posted somewhere public.
    const privatePages = ["/admin", "/admin/:path*", "/account", "/checkout", "/invoice", "/cart", "/wishlist", "/track-order"];
    return [
      { source: "/:path*", headers: securityHeaders },
      ...privatePages.map((source) => ({
        source,
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
      })),
    ];
  },
  async redirects() {
    return [
      { source: "/about", destination: "/story", permanent: true },
      { source: "/policy", destination: "/privacy", permanent: true },
      { source: "/refund", destination: "/returns", permanent: true },
    ];
  },
  outputFileTracingRoot: path.resolve(__dirname),
  // The visual-editor loader that used to be wired in here stamped every element
  // with its source file and line number (data-orchids-id="src\app\…:76:4"),
  // which shipped the project's file layout to every visitor and bloated each
  // page. It is a design-time tool and has no place in a production build.
};

export default nextConfig;
