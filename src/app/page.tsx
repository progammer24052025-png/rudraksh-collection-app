import type { Metadata } from "next";

import { getGoogleRating } from "@/lib/server/google-rating";

import { HomeView } from "./home-view";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  // Live from Google Places; null (no rating shown) when not configured.
  const googleRating = await getGoogleRating();
  return <HomeView googleRating={googleRating} />;
}
