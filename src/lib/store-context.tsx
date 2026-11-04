"use client";

// Live store settings from Realtime Database (/{DB_ROOT}/settings),
// with the static config as a fallback so the UI never renders blank.

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { storeConfig } from "./config";
import { isFirebaseConfigured, subscribeSettings } from "./firebase";
import type { StoreSettings } from "./types";

export type ResolvedStore = typeof storeConfig & {
  announcement: string;
  isLive: boolean;
  supportEmail: string;
  whatsappLink: string | null;
  mapsLink: string | null;
  instagramLink: string | null;
  hasContact: boolean;
};

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
    whatsappLink: whatsappDigits ? `https://wa.me/${whatsappDigits}` : null,
    mapsLink: merged.googleMapsUrl || null,
    instagramLink: merged.instagram || null,
    hasContact: Boolean(merged.address || merged.phone || merged.whatsapp || merged.email),
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
