import type { Metadata } from "next";

import { KitShowcase } from "@/components/kit/showcase";
import { ReferenceAdditions } from "@/components/kit/reference-additions";

export const metadata: Metadata = {
  title: "Conversion kit",
  description: "Internal preview of the Rudraksh Collection UI primitives.",
  robots: { index: false, follow: false },
};

export default function StyleGuidePage() {
  return (
    <>
      <KitShowcase />
      <ReferenceAdditions />
    </>
  );
}
