import { ImageResponse } from "next/og";

import { AppIcon } from "@/lib/app-icon";

/**
 * PNG app icons for the install manifest.
 *   /app-icon/192   /app-icon/512          regular
 *   /app-icon/maskable-512                 with Android's safe-zone padding
 */
export const dynamic = "force-static";

const VARIANTS: Record<string, { size: number; padding: number }> = {
  "192": { size: 192, padding: 0.08 },
  "512": { size: 512, padding: 0.08 },
  "maskable-512": { size: 512, padding: 0.2 },
};

export function generateStaticParams() {
  return Object.keys(VARIANTS).map((variant) => ({ variant }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ variant: string }> }) {
  const { variant } = await params;
  const spec = VARIANTS[variant];
  if (!spec) return new Response("Not found", { status: 404 });
  return new ImageResponse(<AppIcon size={spec.size} padding={spec.padding} />, {
    width: spec.size,
    height: spec.size,
    headers: { "cache-control": "public, max-age=86400, immutable" },
  });
}
