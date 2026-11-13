import { StarRating } from "@/components/star-rating";
import type { GoogleRating } from "@/lib/server/google-rating";
import { cn } from "@/lib/utils";

/**
 * The shop's live Google rating, attributed to Google Maps as its terms ask:
 * set apart with its own border, labelled with the source, and linking to the
 * reviews themselves so a shopper can check them.
 */
export function GoogleRatingBadge({ data, className }: { data: GoogleRating; className?: string }) {
  const count = data.count.toLocaleString("en-IN");
  const content = (
    <>
      <span className="text-2xl font-semibold leading-none">{data.rating.toFixed(1)}</span>
      <span className="flex flex-col gap-1">
        <StarRating value={data.rating} size={14} />
        <span className="text-xs text-muted-foreground">
          {count} review{data.count === 1 ? "" : "s"} on <span className="font-medium text-foreground">Google Maps</span>
        </span>
      </span>
    </>
  );

  const classes = cn(
    "inline-flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 shadow-sm",
    className,
  );

  return data.mapsUrl ? (
    <a
      href={data.mapsUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(classes, "transition-colors hover:border-foreground/30")}
      aria-label={`Rated ${data.rating.toFixed(1)} out of 5 from ${count} Google reviews. Read them on Google Maps.`}
    >
      {content}
    </a>
  ) : (
    <div className={classes}>{content}</div>
  );
}
