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
