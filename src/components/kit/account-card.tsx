"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

export type AccountTab = { id: string; label: string; icon?: LucideIcon };

/**
 * Reference #6 — Account settings card, re-skinned.
 * `#121212` → cream card, selected pill → ink, muted copy → warm grey.
 */
export function AccountCard({
  tabs,
  active,
  onSelect,
  title = "Account settings",
  description = "Manage your profile, orders and saved pieces.",
  children,
  className,
}: {
  tabs: AccountTab[];
  active: string;
  onSelect: (id: string) => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl border border-border bg-card", className)}>
      <div className="border-b border-border px-5 py-5 sm:px-6">
        <h2 className="font-serif text-xl text-foreground">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="grid gap-0 md:grid-cols-[200px_minmax(0,1fr)]">
        <nav
          aria-label="Account sections"
          className="flex gap-1.5 overflow-x-auto border-b border-border p-3 md:flex-col md:border-b-0 md:border-r"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const selected = tab.id === active;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelect(tab.id)}
                aria-current={selected ? "page" : undefined}
                className={cn(
                  "flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-3.5 py-2 text-sm transition-colors",
                  selected
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                {Icon ? <Icon className="h-4 w-4" aria-hidden /> : null}
                {tab.label}
              </button>
            );
          })}
        </nav>

        <div className="p-5 sm:p-6">{children}</div>
      </div>
    </div>
  );
}

export function AccountSection({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-medium text-foreground">{title}</h3>
          {description ? (
            <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

export function ActivityRow({
  icon: Icon,
  title,
  meta,
  href,
}: {
  icon: LucideIcon;
  title: string;
  meta: string;
  href?: string;
}) {
  const inner = (
    <>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cream text-muted-foreground">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm text-foreground">{title}</span>
        <span className="block truncate text-xs text-muted-foreground">{meta}</span>
      </span>
      {href ? <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden /> : null}
    </>
  );

  const className =
    "flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors" + (href ? " hover:bg-secondary" : "");

  return href ? (
    <Link href={href} className={className}>
      {inner}
    </Link>
  ) : (
    <div className={className}>{inner}</div>
  );
}
