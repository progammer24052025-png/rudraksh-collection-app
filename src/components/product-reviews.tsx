"use client";

import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { StarInput, StarRating } from "@/components/star-rating";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth-context";
import { readValue, subscribeUserOrders } from "@/lib/firebase";
import type { Order, Review } from "@/lib/types";

const formatDate = (iso: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

/**
 * Reviews for one product. Only customers whose order of this product was
 * delivered can write one — the server enforces that — so every review shown
 * carries a "Verified buyer" mark that is actually true.
 */
export function ProductReviews({ productId }: { productId: string }) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setReviews(null);
    readValue<Record<string, Review>>(["reviews", productId]).then((value) => {
      if (cancelled) return;
      setReviews(
        Object.values(value ?? {})
          .filter((review) => review && review.rating >= 1)
          .sort((a, b) => (b.created_at || "").localeCompare(a.created_at || "")),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [productId]);

  const uid = user?.uid ?? null;
  useEffect(() => {
    if (!uid) {
      setOrders([]);
      return;
    }
    return subscribeUserOrders(uid, setOrders);
  }, [uid]);

  const eligible = useMemo(
    () =>
      orders.some(
        (order) =>
          order.order_status === "delivered" &&
          Array.isArray(order.items) &&
          order.items.some((item) => item.productId === productId && !item.cancelled),
      ),
    [orders, productId],
  );

  const mine = useMemo(() => reviews?.find((review) => review.uid === uid) ?? null, [reviews, uid]);

  useEffect(() => {
    if (mine) {
      setRating(mine.rating);
      setText(mine.text || "");
    }
  }, [mine]);

  const summary = useMemo(() => {
    const list = reviews ?? [];
    const counts = [5, 4, 3, 2, 1].map((star) => ({
      star,
      count: list.filter((review) => Math.round(review.rating) === star).length,
    }));
    const average = list.length
      ? list.reduce((sum, review) => sum + review.rating, 0) / list.length
      : 0;
    return { counts, average, total: list.length };
  }, [reviews]);

  const submit = async () => {
    if (!user) return;
    if (rating < 1) {
      toast.error("Tap a star to rate this item");
      return;
    }
    setSaving(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ productId, rating, text }),
      });
      const data = (await response.json()) as { ok: boolean; error?: string; review?: Review };
      if (!data.ok || !data.review) {
        toast.error(data.error || "Could not save your review");
        return;
      }
      const saved = data.review;
      setReviews((current) => [saved, ...(current ?? []).filter((review) => review.uid !== saved.uid)]);
      setFormOpen(false);
      toast.success("Thank you — your review is live");
    } catch {
      toast.error("Could not save your review. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mt-16" aria-labelledby="reviews-heading">
      <h2 id="reviews-heading" className="font-serif text-2xl font-medium">
        Customer reviews
      </h2>

      <div className="mt-6 grid gap-8 lg:grid-cols-[280px_1fr]">
        <div>
          {summary.total > 0 ? (
            <>
              <div className="flex items-end gap-3">
                <span className="text-4xl font-semibold">{summary.average.toFixed(1)}</span>
                <div className="pb-1">
                  <StarRating value={summary.average} size={18} />
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {summary.total} verified review{summary.total === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
              <ul className="mt-4 space-y-1.5">
                {summary.counts.map(({ star, count }) => (
                  <li key={star} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="w-8">{star} star</span>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <span
                        className="block h-full rounded-full bg-amber-400"
                        style={{ width: `${summary.total ? (count / summary.total) * 100 : 0}%` }}
                      />
                    </span>
                    <span className="w-5 text-right">{count}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              {reviews === null ? "Loading reviews…" : "No reviews yet for this item."}
            </p>
          )}

          <div className="mt-5 rounded-lg border border-border bg-card p-4">
            <p className="flex items-center gap-1.5 text-sm font-medium">
              <BadgeCheck className="h-4 w-4 text-sage" /> Verified buyers only
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Only customers who received this item can review it, so what you read here comes from
              real purchases.
            </p>
            {eligible && !formOpen && (
              <Button className="mt-3 w-full" variant="outline" onClick={() => setFormOpen(true)}>
                {mine ? "Edit your review" : "Write a review"}
              </Button>
            )}
          </div>
        </div>

        <div>
          {eligible && formOpen && (
            <div className="mb-6 rounded-lg border border-border bg-card p-4">
              <p className="text-sm font-medium">How was it?</p>
              <div className="mt-2">
                <StarInput value={rating} onChange={setRating} />
              </div>
              <Textarea
                className="mt-3"
                rows={4}
                maxLength={1000}
                placeholder="Fit, fabric, how it held up after a wash — whatever would help another parent."
                value={text}
                onChange={(event) => setText(event.target.value)}
              />
              <div className="mt-3 flex gap-2">
                <Button onClick={submit} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Post review"}
                </Button>
                <Button variant="ghost" onClick={() => setFormOpen(false)} disabled={saving}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          <ul className="space-y-5">
            {(reviews ?? []).map((review) => (
              <li key={review.uid} className="border-b border-border pb-5 last:border-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <StarRating value={review.rating} />
                  <span className="text-sm font-medium">{review.name}</span>
                  <span className="inline-flex items-center gap-1 text-xs text-sage">
                    <BadgeCheck className="h-3.5 w-3.5" /> Verified buyer
                  </span>
                </div>
                {review.text && (
                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">{review.text}</p>
                )}
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {[review.size ? `Size bought: ${review.size}` : null, formatDate(review.created_at)]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
