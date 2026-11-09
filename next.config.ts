import type { NextConfig } from "next";
import path from "node:path";

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

const LOADER = path.resolve(__dirname, 'src/visual-edits/component-tagger-loader.js');

/**
 * Images uploaded from the admin panel are compressed in the browser and stored
 * as files under `public/`, so they are served from our own origin and are not
 * affected by `remotePatterns` at all. Only pasted external URLs are — and those
 * must be https. Dropping `http` closes the plaintext-and-internal-address half
 * of the open image proxy without touching a single working image.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  // Next inlines its bootstrap scripts, so 'unsafe-inline' is required without a
  // nonce pipeline. Third-party origins stay enumerated.
  `script-src 'self' 'unsafe-inline'${
    isDev ? " 'unsafe-eval'" : ""
  } https://*.razorpay.com https://apis.google.com https://www.google.com https://www.gstatic.com https://accounts.google.com`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://fonts.gstatic.com",
  "connect-src 'self' https://*.firebaseio.com wss://*.firebaseio.com https://*.firebasedatabase.app wss://*.firebasedatabase.app https://*.googleapis.com https://*.firebaseapp.com https://*.razorpay.com",
  "frame-src 'self' https://*.razorpay.com https://*.firebaseapp.com https://www.google.com https://recaptcha.google.com https://accounts.google.com",
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
  },
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async redirects() {
    return [
      { source: "/about", destination: "/story", permanent: true },
      { source: "/policy", destination: "/privacy", permanent: true },
      { source: "/refund", destination: "/returns", permanent: true },
    ];
  },
  outputFileTracingRoot: path.resolve(__dirname),
  typescript: { ignoreBuildErrors: true },
  turbopack: {
    rules: {
      "*.{jsx,tsx}": { loaders: [LOADER] },
    },
  },
};

export default nextConfig;
