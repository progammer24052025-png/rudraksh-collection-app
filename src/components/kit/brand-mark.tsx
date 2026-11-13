/**
 * Rudraksh Collection's identity: the mala seal.
 *
 * A mala of rudraksha beads closing into a guru bead and tassel — the store's
 * name, drawn — around a serif "R" with a hanger hook rising out of it for the
 * clothing. The same mark is the logo, the favicon, the stamp on bills and the
 * loading animation: while something loads, a glow travels bead by bead round
 * the mala, the way beads pass through the fingers during japa.
 *
 * Colours are fixed hex values so the seal prints identically on every printer
 * and in every saved PDF, in light or dark mode.
 */
import { cn } from "@/lib/utils";

const ROSE = "#995C5C";
const ROSE_LIGHT = "#B07A7A";
const SAGE = "#596650";
const INK = "#2D2A26";
const CREAM = "#F5EFE6";

const BEADS = 22;
const RING = 27;
const CENTRE = 32;
/** One full lap of the travelling glow, in seconds. */
const LAP = 1.6;

/** Where bead `index` sits, leaving a gap at the bottom where the mala closes. */
function beadPosition(index: number, count: number, ring: number, centre: number) {
  const angle = Math.PI / 2 + ((index + 0.5) / count) * (Math.PI * 2 * 0.9) + Math.PI * 0.1;
  return { x: centre + ring * Math.cos(angle), y: centre + ring * Math.sin(angle) };
}

/**
 * The mala seal. `size` is the rendered width in px.
 * `loading` sets the beads travelling; give it a `title` (e.g. "Loading") when
 * it is the only thing telling the user something is happening.
 */
export function BrandSeal({
  size = 64,
  className = "",
  title,
  loading = false,
}: {
  size?: number;
  className?: string;
  title?: string;
  loading?: boolean;
}) {
  return (
    <svg
      width={size}
      height={size * (78 / 64)}
      viewBox="0 0 64 78"
      className={cn(loading && "seal-loading", className)}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {Array.from({ length: BEADS }, (_, index) => {
        const { x, y } = beadPosition(index, BEADS, RING, CENTRE);
        return (
          <g
            key={index}
            className={loading ? "seal-bead" : undefined}
            style={
              loading
                ? ({
                    // Delays run in the beads' own order, so the glow walks round the mala.
                    animationDelay: `${((index / BEADS) * LAP - LAP).toFixed(3)}s`,
                    animationDuration: `${LAP}s`,
                    transformOrigin: `${x.toFixed(2)}px ${y.toFixed(2)}px`,
                  } as React.CSSProperties)
                : undefined
            }
          >
            <circle cx={x} cy={y} r={2.5} fill={index % 2 ? ROSE : ROSE_LIGHT} />
            {/* The grooves that make it a rudraksha and not a pearl. */}
            <path
              d={`M${x - 1.2} ${y - 1.6} Q${x} ${y} ${x - 1.2} ${y + 1.6}`}
              stroke={CREAM}
              strokeWidth={0.45}
              fill="none"
              opacity={0.7}
            />
          </g>
        );
      })}
      {/* Guru bead and tassel. */}
      <circle cx={CENTRE} cy={CENTRE + RING + 2} r={3.6} fill={SAGE} />
      <path
        d={`M${CENTRE} ${CENTRE + RING + 5.5} l-3 11 M${CENTRE} ${CENTRE + RING + 5.5} l0 12 M${CENTRE} ${CENTRE + RING + 5.5} l3 11`}
        stroke={SAGE}
        strokeWidth={1.1}
        strokeLinecap="round"
      />
      {/* Hanger hook rising from the monogram. */}
      <path
        d="M32 14.5 c0 -3 3.6 -3.4 3.6 -0.6 c0 1.7 -1.6 2.2 -3.6 4.1"
        stroke={INK}
        strokeWidth={1.3}
        fill="none"
        strokeLinecap="round"
      />
      <path d="M22 26 L32 18 L42 26" stroke={INK} strokeWidth={1.3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <text
        x={CENTRE}
        y={43}
        textAnchor="middle"
        fontFamily="'Playfair Display', Georgia, serif"
        fontSize={17}
        fontWeight={600}
        fill={INK}
      >
        R
      </text>
    </svg>
  );
}

const MINI_BEADS = 10;

/**
 * The mala alone — the seal's outer beads — for spaces too small for the full
 * mark: buttons, table rows, inline "Saving…" labels. Drawn in `currentColor`
 * so it matches whatever text or button it sits in.
 */
export function MalaSpinner({ className, label = "Loading" }: { className?: string; label?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      role="status"
      aria-label={label}
      className={cn("seal-loading inline-block size-4 shrink-0", className)}
    >
      {Array.from({ length: MINI_BEADS }, (_, index) => {
        const angle = -Math.PI / 2 + (index / MINI_BEADS) * Math.PI * 2;
        const x = 12 + 9 * Math.cos(angle);
        const y = 12 + 9 * Math.sin(angle);
        return (
          <circle
            key={index}
            cx={x}
            cy={y}
            r={2.1}
            fill="currentColor"
            className="seal-bead-mini"
            style={{
              animationDelay: `${((index / MINI_BEADS) * LAP * 0.7 - LAP * 0.7).toFixed(3)}s`,
              animationDuration: `${LAP * 0.7}s`,
            }}
          />
        );
      })}
    </svg>
  );
}

/**
 * The full-size loading state: the seal with its beads travelling, and an
 * optional caption. Use for pages and panels; use `MalaSpinner` in buttons.
 */
export function SealLoader({
  label = "Loading",
  size = 56,
  showLabel = true,
  className,
}: {
  label?: string;
  size?: number;
  showLabel?: boolean;
  className?: string;
}) {
  return (
    <div role="status" aria-live="polite" className={cn("flex flex-col items-center justify-center gap-3", className)}>
      <BrandSeal size={size} loading />
      {showLabel ? (
        <p className="text-sm text-muted-foreground">{label}…</p>
      ) : (
        <span className="sr-only">{label}</span>
      )}
    </div>
  );
}

/** A tailor's running stitch, used as the section rule on documents. */
export function StitchRule({ className = "", colour = ROSE }: { className?: string; colour?: string }) {
  return (
    <div
      aria-hidden
      className={`h-px w-full ${className}`}
      style={{
        backgroundImage: `linear-gradient(to right, ${colour} 55%, transparent 0)`,
        backgroundSize: "9px 1px",
        backgroundRepeat: "repeat-x",
      }}
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
