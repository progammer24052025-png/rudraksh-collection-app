// Official styling & logotypes for each curated brand
const BRAND_METAS: Record<
  string,
  {
    tagline: string;
    accent: string;
    bg: string;
  }
> = {
  macho: {
    tagline: "Sport & Innerwear",
    accent: "#DC2626", // bold red
    bg: "#FEF2F2",
  },
  "james-harper": {
    tagline: "Classic Kids",
    accent: "#1E3A8A", // deep navy
    bg: "#EFF6FF",
  },
  "James & Harper": {
    tagline: "Classic Kids",
    accent: "#1E3A8A",
    bg: "#EFF6FF",
  },
  hamper: {
    tagline: "Playful Essentials",
    accent: "#D97706", // amber
    bg: "#FFFBEB",
  },
  essa: {
    tagline: "Modern Comfort",
    accent: "#059669", // emerald
    bg: "#ECFDF5",
  },
  bodycare: {
    tagline: "Soft Baby Wear",
    accent: "#DB2777", // rose pink
    bg: "#FDF2F8",
  },
  "lux-lyra": {
    tagline: "Premium Stretch",
    accent: "#7C3AED", // royal purple
    bg: "#F5F3FF",
  },
  comfort: {
    tagline: "Daily Loungewear",
    accent: "#0284C7", // sky blue
    bg: "#F0F9FF",
  },
  shilpa: {
    tagline: "Heritage & Casual",
    accent: "#B45309", // warm rust
    bg: "#FFFBEB",
  },
  "hi-rich": {
    tagline: "Quality Basics",
    accent: "#15803D", // forest green
    bg: "#F0FDF4",
  },
  hackucha: {
    tagline: "Fun Fashion",
    accent: "#EA580C", // vibrant orange
    bg: "#FFF7ED",
  },
  topas: {
    tagline: "Active Junior",
    accent: "#4338CA", // indigo
    bg: "#EEF2FF",
  },
  "top-gear": {
    tagline: "Sportswear",
    accent: "#E11D48", // crimson
    bg: "#FFF1F2",
  },
};

export function BrandLogoBadge({ slug, name }: { slug: string; name: string }) {
  const meta = BRAND_METAS[slug] || BRAND_METAS[name] || {
    tagline: "Kidswear",
    accent: "#4B5563",
    bg: "#F3F4F6",
  };

  // Get 1-2 character monogram for crisp circular emblem
  const words = name.split(/\s+/).filter(Boolean);
  const monogram = words.length > 1 ? `${words[0][0]}${words[1][0]}` : name.slice(0, 2).toUpperCase();

  return (
    <div
      className="relative flex h-full w-full flex-col items-center justify-center rounded-full p-2 text-center transition-all duration-300"
      style={{ backgroundColor: meta.bg }}
    >
      {/* Decorative inner ring */}
      <div
        className="absolute inset-1.5 rounded-full border border-dashed opacity-40 transition-opacity group-hover:opacity-80"
        style={{ borderColor: meta.accent }}
      />

      {/* Styled Brand Monogram / Logotype */}
      <span
        className="font-serif text-lg sm:text-xl font-bold tracking-wider"
        style={{ color: meta.accent }}
      >
        {monogram}
      </span>
      <span
        className="mt-0.5 text-[9px] sm:text-[10px] font-semibold tracking-wider uppercase opacity-80"
        style={{ color: meta.accent }}
      >
        {name.length > 9 ? name.slice(0, 8) + "…" : name}
      </span>
    </div>
  );
}

