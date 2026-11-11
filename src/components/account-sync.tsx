"use client";

import { useEffect, useRef } from "react";

import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { readValue, writeValue } from "@/lib/firebase";
import type { CartItem } from "@/lib/types";
import { WISHLIST_STORAGE_KEY, WISHLIST_SYNC_EVENT } from "@/lib/use-wishlist";

type SavedState = { cart?: CartItem[]; wishlist?: string[] };

const lineKey = (item: CartItem) => `${item.productId}|${item.size}|${item.color}`;

const cleanCart = (value: unknown): CartItem[] =>
  (Array.isArray(value) ? value : [])
    .filter(
      (item): item is CartItem =>
        Boolean(item) && typeof item.productId === "string" && Number(item.quantity) > 0,
    )
    .map((item) => ({
      productId: item.productId,
      size: String(item.size ?? ""),
      color: String(item.color ?? ""),
      quantity: Math.min(20, Math.max(1, Math.floor(Number(item.quantity)))),
    }));

/** Same line on both sides keeps the larger quantity rather than adding them up. */
function mergeCarts(local: CartItem[], remote: CartItem[]): CartItem[] {
  const merged = new Map<string, CartItem>();
  for (const item of [...remote, ...local]) {
    const existing = merged.get(lineKey(item));
    merged.set(
      lineKey(item),
      existing ? { ...item, quantity: Math.max(existing.quantity, item.quantity) } : item,
    );
  }
  return Array.from(merged.values());
}

function readLocalWishlist(): string[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(WISHLIST_STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function writeLocalWishlist(ids: string[]) {
  try {
    window.localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(ids));
    window.dispatchEvent(new Event(WISHLIST_SYNC_EVENT));
  } catch {
    /* storage may be disabled */
  }
}

/**
 * Keeps the bag and wishlist with the account, not the device.
 *
 * On sign-in the device's bag and wishlist are merged with what the account
 * already had, so nothing is lost either way; after that every change is saved
 * to the account. On sign-out the device copy is cleared, so the next person
 * using a shared phone does not inherit someone else's bag.
 *
 * Renders nothing. Guests are untouched — their bag stays in the browser.
 */
export function AccountSync() {
  const { user, loading } = useAuth();
  const { items, replaceItems, isHydrated } = useCart();
  const uid = user?.uid ?? null;

  const readyFor = useRef<string | null>(null); // uid whose first merge is done
  const previousUid = useRef<string | null>(null);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  // Sign-in merge and sign-out clean-up.
  useEffect(() => {
    if (loading || !isHydrated) return;

    if (!uid) {
      if (previousUid.current) {
        replaceItems([]);
        writeLocalWishlist([]);
      }
      previousUid.current = null;
      readyFor.current = null;
      return;
    }

    previousUid.current = uid;
    if (readyFor.current === uid) return;

    let cancelled = false;
    (async () => {
      const saved = (await readValue<SavedState>(["userState", uid])) ?? {};
      if (cancelled) return;

      const cart = mergeCarts(cleanCart(itemsRef.current), cleanCart(saved.cart));
      const wishlist = Array.from(
        new Set([...(Array.isArray(saved.wishlist) ? saved.wishlist : []), ...readLocalWishlist()]),
      ).filter((id): id is string => typeof id === "string");

      replaceItems(cart);
      writeLocalWishlist(wishlist);
      readyFor.current = uid;

      try {
        await writeValue(["userState", uid], { cart, wishlist, updated_at: new Date().toISOString() });
      } catch (error) {
        console.warn("Could not save the bag to the account:", error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [uid, loading, isHydrated, replaceItems]);

  // Save bag changes, slightly delayed so quick taps make one write.
  useEffect(() => {
    if (!uid || readyFor.current !== uid) return;
    const timer = window.setTimeout(() => {
      writeValue(["userState", uid, "cart"], cleanCart(items)).catch(() => {});
    }, 800);
    return () => window.clearTimeout(timer);
  }, [items, uid]);

  // Save wishlist changes.
  useEffect(() => {
    if (!uid) return;
    const save = () => {
      if (readyFor.current !== uid) return;
      writeValue(["userState", uid, "wishlist"], readLocalWishlist()).catch(() => {});
    };
    window.addEventListener(WISHLIST_SYNC_EVENT, save);
    return () => window.removeEventListener(WISHLIST_SYNC_EVENT, save);
  }, [uid]);

  return null;
}
