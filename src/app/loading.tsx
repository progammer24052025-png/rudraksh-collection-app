import { SealLoader } from "@/components/kit/brand-mark";

/** Shown while any page's code or data is loading during navigation. */
export default function Loading() {
  return <SealLoader label="Loading" size={72} className="min-h-[60vh]" />;
}
