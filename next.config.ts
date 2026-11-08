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
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
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
