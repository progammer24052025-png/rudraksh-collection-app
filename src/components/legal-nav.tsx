"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck, FileText, RotateCcw, Truck } from "lucide-react";

const LEGAL_TABS = [
  { label: "Privacy Policy", href: "/privacy", icon: ShieldCheck },
  { label: "Terms & Conditions", href: "/terms", icon: FileText },
  { label: "Returns & Refunds", href: "/returns", icon: RotateCcw },
  { label: "Shipping Policy", href: "/shipping", icon: Truck },
];

export function LegalNav() {
  const pathname = usePathname();

  return (
    <div className="border-b border-border/70 bg-card/60 backdrop-blur-md sticky top-16 z-40">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <nav className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto py-2.5 scrollbar-none" aria-label="Legal pages">
          {LEGAL_TABS.map((tab) => {
            const active = pathname === tab.href;
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className={`h-4 w-4 ${active ? "text-primary-foreground" : "text-muted-foreground"}`} />
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

