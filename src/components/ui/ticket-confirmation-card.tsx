"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// --- Icons ---

const CheckCircleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

// --- Helpers ---

const DashedLine = () => <div className="w-full border-t border-dashed border-border" aria-hidden="true" />;

const Barcode = ({ value }: { value: string }) => {
  const hashCode = (s: string) =>
    s.split("").reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0);
      return a & a;
    }, 0);
  const seed = hashCode(value);
  const random = (s: number) => {
    const x = Math.sin(s) * 10000;
    return x - Math.floor(x);
  };

  const bars = Array.from({ length: 60 }).map((_, index) => ({
    width: random(seed + index) > 0.7 ? 2.5 : 1.5,
  }));

  const spacing = 1.5;
  const totalWidth = bars.reduce((acc, bar) => acc + bar.width + spacing, 0) - spacing;
  const svgWidth = 250;
  const svgHeight = 70;
  let currentX = (svgWidth - totalWidth) / 2;

  return (
    <div className="flex flex-col items-center py-2">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={svgWidth}
        height={svgHeight}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        aria-label={`Barcode for ${value}`}
        className="fill-current text-foreground"
      >
        {bars.map((bar, index) => {
          const x = currentX;
          currentX += bar.width + spacing;
          return <rect key={index} x={x} y="10" width={bar.width} height="50" />;
        })}
      </svg>
      <p className="mt-2 font-mono text-sm tracking-[0.3em] text-muted-foreground">{value}</p>
    </div>
  );
};

type Confetto = { left: number; top: number; rotate: number; duration: number; delay: number; color: string };

/** Warm paper confetti — sage, saffron and clay instead of party primaries. */
const ConfettiExplosion = () => {
  const [pieces, setPieces] = React.useState<Confetto[]>([]);

  React.useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const colors = ["#7C8B5C", "#D99A3B", "#B4553F", "#2F3B2A", "#C9B79A"];
    setPieces(
      Array.from({ length: 60 }).map((_, i) => ({
        left: Math.random() * 100,
        top: -20 + Math.random() * 10,
        rotate: Math.random() * 360,
        duration: 2.5 + Math.random() * 2.5,
        delay: Math.random() * 2,
        color: colors[i % colors.length],
      })),
    );
  }, []);

  if (pieces.length === 0) return null;

  return (
    <>
      <style>
        {`
          @keyframes rudraksh-fall {
            0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
            100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
          }
        `}
      </style>
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true">
        {pieces.map((piece, i) => (
          <div
            key={i}
            className="absolute h-4 w-2"
            style={{
              left: `${piece.left}%`,
              top: `${piece.top}%`,
              backgroundColor: piece.color,
              transform: `rotate(${piece.rotate}deg)`,
              animation: `rudraksh-fall ${piece.duration}s ${piece.delay}s linear forwards`,
            }}
          />
        ))}
      </div>
    </>
  );
};

// --- Main ticket ---

export interface TicketLine {
  label: string;
  value: string;
  muted?: boolean;
}

export interface TicketProps extends React.HTMLAttributes<HTMLDivElement> {
  ticketId: string;
  amount: number;
  date: Date;
  cardHolder: string;
  last4Digits?: string;
  barcodeValue: string;
  icon?: React.ReactNode;
  /** e.g. "Cash on delivery" — replaces the card-network badge of the reference. */
  paymentLabel?: string;
  /** Itemised bill rows (subtotal, discount, GST…). */
  lines?: TicketLine[];
  /** Small print under the barcode. */
  note?: string;
  /** Warm paper confetti on mount. */
  celebrate?: boolean;
}

const AnimatedTicket = React.forwardRef<HTMLDivElement, TicketProps>(
  (
    {
      className,
      ticketId,
      amount,
      date,
      cardHolder,
      last4Digits,
      barcodeValue,
      icon,
      paymentLabel = "Cash on delivery",
      lines,
      note,
      celebrate = true,
      ...props
    },
    ref,
  ) => {
    const [showConfetti, setShowConfetti] = React.useState(false);

    React.useEffect(() => {
      if (!celebrate) return;
      const mountTimer = setTimeout(() => setShowConfetti(true), 100);
      const unmountTimer = setTimeout(() => setShowConfetti(false), 6000);
      return () => {
        clearTimeout(mountTimer);
        clearTimeout(unmountTimer);
      };
    }, [celebrate]);

    const formattedAmount = new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);

    const formattedDate = new Intl.DateTimeFormat("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
      .format(date)
      .replace(",", " •");

    return (
      <>
        {showConfetti && <ConfettiExplosion />}
        <div
          ref={ref}
          className={cn(
            "relative z-10 w-full max-w-sm rounded-2xl border border-border bg-card text-card-foreground shadow-lg",
            "animate-in fade-in-0 zoom-in-95 duration-500",
            className,
          )}
          {...props}
        >
          {/* Ticket cut-outs */}
          <div className="absolute -left-4 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full bg-background" aria-hidden="true" />
          <div className="absolute -right-4 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full bg-background" aria-hidden="true" />

          <div className="flex flex-col items-center p-8 text-center">
            <div className="animate-in zoom-in-50 rounded-full bg-sage/10 p-3 duration-500 delay-300">
              {icon ?? <CheckCircleIcon className="h-10 w-10 animate-in zoom-in-75 text-sage duration-500 delay-500" />}
            </div>
            <h1 className="mt-4 font-serif text-2xl font-semibold">Thank you!</h1>
            <p className="mt-1 text-muted-foreground">Your order has been received</p>
          </div>

          <div className="space-y-6 px-8 pb-8">
            <DashedLine />

            <div className="grid grid-cols-2 gap-4 text-left">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Order</p>
                <p className="font-mono font-medium">{ticketId}</p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Amount paid</p>
                <p className="text-lg font-semibold">{formattedAmount}</p>
              </div>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Date</p>
              <p className="font-medium">{formattedDate}</p>
            </div>

            {lines && lines.length > 0 && (
              <div className="space-y-1.5 rounded-lg bg-muted/50 p-4 text-sm">
                {lines.map((line) => (
                  <div key={line.label} className="flex items-baseline justify-between gap-3">
                    <span className={line.muted ? "text-muted-foreground" : ""}>{line.label}</span>
                    <span className={cn("font-medium tabular-nums", line.muted && "text-muted-foreground")}>
                      {line.value}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-4">
              <div className="flex h-9 w-12 items-center justify-center rounded bg-background text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {last4Digits ? `••${last4Digits}` : "COD"}
              </div>
              <div className="text-left">
                <p className="font-semibold">{cardHolder}</p>
                <p className="text-sm text-muted-foreground">{paymentLabel}</p>
              </div>
            </div>

            <DashedLine />

            <Barcode value={barcodeValue} />

            {note && <p className="text-center text-xs leading-relaxed text-muted-foreground">{note}</p>}
          </div>
        </div>
      </>
    );
  },
);

AnimatedTicket.displayName = "AnimatedTicket";

export { AnimatedTicket };
export default AnimatedTicket;
