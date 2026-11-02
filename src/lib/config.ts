export const storeConfig = {
  name: "Rudraksh Collection",
  tagline: "Little Moments, Beautifully Dressed",
  category: "Children's Wear",
  location: "Vadodara, Gujarat, India",
  googleRating: 4.84,
  googleReviewCount: null as number | null,

  address: "", // TODO: owner to supply
  phone: "", // TODO: owner to supply
  whatsapp: "", // TODO: owner to supply
  email: "hello@rudrakshcollection.in", // placeholder
  openingHours: "", // TODO: owner to supply
  googleMapsUrl: "", // TODO: owner to supply
  instagram: "", // TODO: owner to supply

  freeShippingThreshold: 999,
  shippingFee: 99,
  codAvailable: true,
  razorpayEnabled: false, // set true when keys are configured
};

export const brands = [
  { slug: "macho", name: "Macho" },
  { slug: "james", name: "James" },
  { slug: "hamper", name: "Hamper" },
  { slug: "essa", name: "Essa" },
  { slug: "bodycare", name: "Bodycare" },
  { slug: "lux-lyra", name: "Lux Lyra" },
  { slug: "comfort", name: "Comfort" },
  { slug: "shilpa", name: "Shilpa" },
  { slug: "hi-rich", name: "Hi-Rich" },
  { slug: "hackucha", name: "Hackucha" },
  { slug: "topas", name: "Topas" },
  { slug: "top-gear", name: "Top-Gear" },
] as const;

export const collections = [
  { slug: "boys-wear", name: "Boys' Wear" },
  { slug: "girls-wear", name: "Girls' Wear" },
  { slug: "baby-toddler", name: "Baby & Toddler" },
  { slug: "everyday-essentials", name: "Everyday Essentials" },
  { slug: "casual-wear", name: "Casual Wear" },
  { slug: "occasion-wear", name: "Occasion Wear" },
] as const;

export type CollectionSlug = (typeof collections)[number]["slug"];
export type BrandSlug = (typeof brands)[number]["slug"];
