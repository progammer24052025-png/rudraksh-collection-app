"use client";

import { useCallback, useEffect, useState } from "react";

import { getFirebaseAuth, logActivity } from "@/lib/firebase";

const STORAGE_KEY = "rudraksh-wishlist";
const SYNC_EVENT = "rudraksh-wishlist-change";

function readWishlist(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

/** Wishlist lives in localStorage so guests can use it without an account. */
export function useWishlist() {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    setIds(readWishlist());

    const sync = () => setIds(readWishlist());
    window.addEventListener("storage", sync);
    window.addEventListener(SYNC_EVENT, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(SYNC_EVENT, sync);
    };
  }, []);

  const write = useCallback((next: string[]) => {
    setIds(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event(SYNC_EVENT));
    } catch {
      /* storage may be disabled */
    }
  }, []);

  const toggle = useCallback(
    (productId: string) => {
      // Read the stored list rather than using a state updater, so saving a piece
      // logs exactly once even under StrictMode's double render.
      const current = readWishlist();
      const adding = !current.includes(productId);
      write(adding ? [...current, productId] : current.filter((id) => id !== productId));

      if (!adding) return;
      try {
        const user = getFirebaseAuth().currentUser;
        if (user) {
          void logActivity(user.uid, {
            type: "wishlist",
            label: "Saved a piece to your wishlist",
            href: "/wishlist",
          });
        }
      } catch {
        /* auth not configured — nothing to log */
      }
    },
    [write],
  );

  const remove = useCallback(
    (productId: string) => {
      write(readWishlist().filter((id) => id !== productId));
    },
    [write],
  );

  return { ids, toggle, remove, has: (id: string) => ids.includes(id) };
}
