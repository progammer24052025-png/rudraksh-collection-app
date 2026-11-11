import NextImage, { type ImageProps } from "next/image";

import { isOptimizableImage } from "@/lib/image-hosts";

/**
 * Drop-in replacement for `next/image`.
 *
 * Images on a host the optimizer is not allowed to fetch (see
 * `src/lib/image-hosts.ts`), and inline `data:` images, are rendered
 * unoptimized so they still display instead of failing with a 400.
 */
export default function StoreImage({ unoptimized, src, ...props }: ImageProps) {
  const direct = typeof src === "string" && !isOptimizableImage(src);
  // eslint-disable-next-line jsx-a11y/alt-text -- `alt` arrives through props
  return <NextImage src={src} unoptimized={unoptimized || direct} {...props} />;
}
