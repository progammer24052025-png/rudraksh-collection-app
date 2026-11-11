/**
 * Rudraksh Collection's document identity.
 *
 * The seal is a mala of rudraksha beads closing into a guru bead and tassel —
 * the store's name, drawn — around a serif "R" with a hanger hook rising out of
 * it for the clothing. It is plain SVG with fixed colours, so it prints the same
 * on every printer and in every saved PDF, light or dark mode.
 */

const ROSE = "#995C5C";
const SAGE = "#596650";
const INK = "#2D2A26";

/** The mala seal. `size` is the rendered width in px. */
export function BrandSeal({ size = 64, className = "", title }: { size?: number; className?: string; title?: string }) {
  const beads = 22;
  const ring = 27;
  const centre = 32;
  return (
    <svg
      width={size}
      height={size * (78 / 64)}
      viewBox="0 0 64 78"
      className={className}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {/* Beads, leaving a gap at the bottom where the mala closes. */}
      {Array.from({ length: beads }, (_, index) => {
        const angle = (Math.PI / 2) + ((index + 0.5) / beads) * (Math.PI * 2 * 0.9) + Math.PI * 0.1;
        const x = centre + ring * Math.cos(angle);
        const y = centre + ring * Math.sin(angle);
        return (
          <g key={index}>
            <circle cx={x} cy={y} r={2.5} fill={index % 2 ? ROSE : "#B07A7A"} />
            {/* The grooves that make it a rudraksha and not a pearl. */}
            <path d={`M${x - 1.2} ${y - 1.6} Q${x} ${y} ${x - 1.2} ${y + 1.6}`} stroke="#F5EFE6" strokeWidth={0.45} fill="none" opacity={0.7} />
          </g>
        );
      })}
      {/* Guru bead and tassel. */}
      <circle cx={centre} cy={centre + ring + 2} r={3.6} fill={SAGE} />
      <path d={`M${centre} ${centre + ring + 5.5} l-3 11 M${centre} ${centre + ring + 5.5} l0 12 M${centre} ${centre + ring + 5.5} l3 11`} stroke={SAGE} strokeWidth={1.1} strokeLinecap="round" />
      {/* Hanger hook rising from the monogram. */}
      <path d="M32 14.5 c0 -3 3.6 -3.4 3.6 -0.6 c0 1.7 -1.6 2.2 -3.6 4.1" stroke={INK} strokeWidth={1.3} fill="none" strokeLinecap="round" />
      <path d="M22 26 L32 18 L42 26" stroke={INK} strokeWidth={1.3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <text x={centre} y={43} textAnchor="middle" fontFamily="'Playfair Display', Georgia, serif" fontSize={17} fontWeight={600} fill={INK}>
        R
      </text>
    </svg>
  );
}

/** A tailor's running stitch, used as the section rule on documents. */
export function StitchRule({ className = "", colour = ROSE }: { className?: string; colour?: string }) {
  return (
    <div
      aria-hidden
      className={`h-px w-full ${className}`}
      style={{ backgroundImage: `linear-gradient(to right, ${colour} 55%, transparent 0)`, backgroundSize: "9px 1px", backgroundRepeat: "repeat-x" }}
    />
  );
}

/** The store's letterhead line: seal, name and tagline. */
export function BrandLockup({ name, tagline }: { name: string; tagline?: string }) {
  return (
    <div className="flex items-center gap-3">
      <BrandSeal size={46} />
      <div>
        <p className="font-serif text-2xl leading-none tracking-wide text-[#2D2A26]">{name}</p>
        {tagline ? (
          <p className="mt-1.5 text-[10px] font-medium uppercase tracking-[0.24em] text-[#995C5C]">{tagline}</p>
        ) : null}
      </div>
    </div>
  );
}

/** Faint seal behind the document body; prints as a watermark. */
export function SealWatermark() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
      <BrandSeal size={340} className="opacity-[0.045]" />
    </div>
  );
}
