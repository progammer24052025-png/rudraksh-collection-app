"use client";

import * as React from "react";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Reference: peel-to-reveal coupon button.
 * Re-skinned from the reference's blue to the store's sage / ivory palette so it
 * sits inside the Rudraksh theme instead of next to it.
 */
interface CouponRevealButtonProps extends React.ComponentPropsWithoutRef<"button"> {
  frontText?: string;
  backText?: string;
  couponCode?: string;
  onReveal?: () => void;
}

const CouponRevealButton = React.forwardRef<HTMLButtonElement, CouponRevealButtonProps>(
  (
    {
      frontText = "Reveal Coupon Code",
      backText = "Here's your coupon code!",
      couponCode = "SHADSPACE20",
      onReveal,
      className,
      onClick,
      ...props
    },
    ref,
  ) => {
    const containerRef = React.useRef<HTMLButtonElement>(null);
    React.useImperativeHandle(ref, () => containerRef.current!);

    const [width, setWidth] = React.useState(240);
    const [isHovered, setIsHovered] = React.useState(false);
    const [isPeeled, setIsPeeled] = React.useState(false);
    const [copied, setCopied] = React.useState(false);

    // Track width changes for precise pixel-based clip path matching
    React.useEffect(() => {
      if (!containerRef.current) return;
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) setWidth(entry.contentRect.width);
      });
      resizeObserver.observe(containerRef.current);
      return () => resizeObserver.disconnect();
    }, []);

    // peelX is the top-right corner of the unpeeled sticker cover
    const peelX = isPeeled ? -48 : isHovered ? width - 48 : width - 24;

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!isPeeled) {
        setIsPeeled(true);
        if (onReveal) onReveal();
      } else {
        navigator.clipboard?.writeText(couponCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
      if (onClick) onClick(e);
    };

    return (
      <button
        ref={containerRef}
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          "group relative h-12 w-full max-w-70 overflow-visible rounded-lg text-sm font-medium select-none outline-none",
          "transition-all duration-200 active:scale-[0.98]",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          className,
        )}
        {...props}
      >
        {/* Underneath layer: revealed code */}
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center rounded-lg border-2 border-dashed transition-colors duration-300",
            copied
              ? "border-sage bg-sage/10 text-sage"
              : "border-primary bg-primary/5 text-foreground",
            "shadow-[inset_0_2px_4px_rgba(0,0,0,0.04)]",
          )}
        >
          <div className="relative flex w-full items-center justify-center px-3 text-center font-semibold">
            <div
              className={cn(
                "absolute inset-0 flex items-center justify-center gap-1.5 transition-all duration-200",
                isPeeled || isHovered ? "opacity-100" : "opacity-0",
              )}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 stroke-[2.5]" />
                  <span>Copied to clipboard</span>
                </>
              ) : (
                <>
                  <span
                    className={cn(
                      "rounded px-2 py-0.5 font-mono text-xs tracking-wider",
                      copied ? "bg-sage/10" : "bg-primary/10",
                    )}
                  >
                    {couponCode}
                  </span>
                  <Copy className="h-3.5 w-3.5 opacity-70 animate-pulse motion-reduce:animate-none" />
                </>
              )}
            </div>
            <span
              className={cn(
                "absolute inset-0 flex items-center justify-center transition-opacity duration-200",
                isPeeled || isHovered ? "opacity-0" : "opacity-100",
              )}
            >
              {backText}
            </span>
          </div>
        </div>

        {/* Sticker cover */}
        <div
          aria-hidden="true"
          style={{
            clipPath: `polygon(0px 0px, ${peelX}px 0px, ${peelX - 24}px 100%, 0px 100%)`,
            transition: "clip-path 400ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
          className={cn(
            "pointer-events-none absolute inset-0 flex items-center justify-center rounded-lg bg-primary font-semibold text-primary-foreground shadow-md",
            "motion-reduce:transition-none",
          )}
        >
          <span className="truncate px-6 text-center">{frontText}</span>
        </div>

        {/* Turning corner flap */}
        <div
          aria-hidden="true"
          className={cn("pointer-events-none absolute -top-1 origin-bottom-left", "motion-reduce:transition-none")}
          style={{
            height: 56,
            width: 48,
            left: isPeeled ? -36 : peelX - 36,
            opacity: isPeeled ? 0 : 1,
            transform: `scale(${isPeeled ? 0.8 : isHovered ? 1.05 : 1})`,
            transition:
              "left 400ms cubic-bezier(0.22, 1, 0.36, 1), transform 400ms cubic-bezier(0.22, 1, 0.36, 1), opacity 250ms ease-out",
          }}
        >
          <svg
            width="48"
            height="56"
            viewBox="0 0 48 56"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="drop-shadow-[-3px_4px_5px_rgba(0,0,0,0.18)]"
          >
            <path d="M 36 4 L 12 52 L 28 56 Z" fill="url(#peelGradient-26)" />
            <defs>
              <linearGradient id="peelGradient-26" x1="36" y1="4" x2="18" y2="54" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="currentColor" stopOpacity="0.4" />
                <stop offset="25%" stopColor="currentColor" stopOpacity="0.7" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="1" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </button>
    );
  },
);

CouponRevealButton.displayName = "CouponRevealButton";

export { CouponRevealButton, type CouponRevealButtonProps };
export default CouponRevealButton;
