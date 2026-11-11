"use client";

// Live store settings from Realtime Database (/{DB_ROOT}/settings),
// with the static config as a fallback so the UI never renders blank.

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { storeConfig } from "./config";
import { isFirebaseConfigured, subscribeSettings } from "./firebase";
import type { StoreSettings } from "./types";

export type ResolvedStore = typeof storeConfig & {
  /** Distance-based delivery rules, when the store has saved any. */
  shipping?: StoreSettings["shipping"];
  announcement: string;
  isLive: boolean;
  supportEmail: string;
  supportPhone: string;
  whatsappLink: string | null;
  mapsLink: string | null;
  instagramLink: string | null;
  hasContact: boolean;
  /**
   * The static config ships with placeholder contact and tax details. These are
   * true only when the store has saved its own value in Admin → Settings, so a
   * placeholder GSTIN or phone number is never presented to shoppers as real.
   */
  confirmed: { gstin: boolean; whatsapp: boolean; phone: boolean; address: boolean };
};

/** Saved by the store itself, and not just the shipped placeholder. */
const isOwnValue = (saved: string | undefined, placeholder: string) =>
  Boolean(saved && saved.trim() && saved.trim() !== placeholder.trim());

const buildResolved = (settings: StoreSettings | null): ResolvedStore => {
  const merged = {
    ...storeConfig,
    ...Object.fromEntries(
      Object.entries(settings ?? {}).filter(([, value]) => value !== undefined && value !== null && value !== ""),
    ),
  } as typeof storeConfig;

  const whatsappDigits = (merged.whatsapp || "").replace(/\D/g, "");

  return {
    ...merged,
    announcement: settings?.announcement ?? "",
    isLive: Boolean(settings),
    supportEmail: merged.email || storeConfig.email,
    supportPhone: merged.phone || storeConfig.phone,
    whatsappLink: whatsappDigits ? `https://wa.me/${whatsappDigits}` : null,
    mapsLink: merged.googleMapsUrl || null,
    instagramLink: merged.instagram || null,
    hasContact: Boolean(merged.address || merged.phone || merged.whatsapp || merged.email),
    confirmed: {
      gstin: isOwnValue(settings?.gstin, storeConfig.gstin),
      whatsapp: isOwnValue(settings?.whatsapp, storeConfig.whatsapp),
      phone: isOwnValue(settings?.phone, storeConfig.phone),
      address: isOwnValue(settings?.address, storeConfig.address),
    },
  };
};

const StoreContext = createContext<ResolvedStore>(buildResolved(null));

export function StoreSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<StoreSettings | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured()) return;
    let unsubscribe: () => void = () => {};
    try {
      unsubscribe = subscribeSettings(setSettings);
    } catch (error) {
      console.warn("Store settings are unavailable:", error);
    }
    return () => unsubscribe();
  }, []);

  return <StoreContext.Provider value={buildResolved(settings)}>{children}</StoreContext.Provider>;
}

export function useStore(): ResolvedStore {
  return useContext(StoreContext);
}
