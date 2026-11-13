"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Download } from "lucide-react";
import { toast } from "sonner";

/** The deploy this page was built from (set in next.config). */
const BUILD_VERSION = (process.env.APP_VERSION || "dev").slice(0, 12);
const CHECK_EVERY_MS = 10 * 60 * 1000;
/** Never interrupt someone paying or filling in details. */
const QUIET_PATHS = ["/checkout", "/admin/products/"];

/**
 * Keeps the installed app current.
 *
 * Registers the service worker, then — whenever the app comes back to the
 * foreground, and every few minutes while it is open — asks the server which
 * version is live. When a newer one is out it offers a one-tap refresh, so a
 * phone that keeps the app open for days still picks up new deploys.
 */
export function AppUpdates() {
  const pathname = usePathname();
  const pathRef = useRef(pathname);
  pathRef.current = pathname;
  const announced = useRef(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((error) => {
      console.warn("Service worker not registered:", error);
    });
  }, []);

  useEffect(() => {
    if (BUILD_VERSION === "dev") return;

    const check = async () => {
      if (announced.current || document.visibilityState !== "visible") return;
      if (QUIET_PATHS.some((path) => pathRef.current?.startsWith(path))) return;
      try {
        const response = await fetch("/api/version", { cache: "no-store" });
        const { version } = (await response.json()) as { version?: string };
        if (!version || version === "dev" || version === BUILD_VERSION) return;
        announced.current = true;
        toast("A new version of the shop is ready", {
          description: "Refresh to get the latest products and fixes.",
          duration: Infinity,
          action: { label: "Refresh", onClick: () => window.location.reload() },
        });
      } catch {
        /* offline: try again later */
      }
    };

    const timer = window.setInterval(check, CHECK_EVERY_MS);
    document.addEventListener("visibilitychange", check);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
    };
  }, []);

  return null;
}

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/**
 * "Install the app" — shown only where the browser can install it and it is
 * not installed already. On iPhone, which has no install prompt, it explains
 * Share → Add to Home Screen instead.
 */
export function InstallAppButton({ className = "" }: { className?: string }) {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [ios, setIos] = useState(false);
  const [installed, setInstalled] = useState(true);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setInstalled(standalone);
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent) && !standalone);

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPrompt);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed || (!prompt && !ios)) return null;

  const install = async () => {
    if (prompt) {
      await prompt.prompt();
      await prompt.userChoice.catch(() => null);
      setPrompt(null);
      return;
    }
    toast("Add to your Home Screen", {
      description: "Tap the Share button in Safari, then “Add to Home Screen”.",
      duration: 8000,
    });
  };

  return (
    <button
      type="button"
      onClick={install}
      className={`inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-muted ${className}`}
    >
      <Download className="h-4 w-4" /> Install the app
    </button>
  );
}
