// ─────────────────────────────────────────────────────────────
// Admin information architecture, in one place.
//
// Six top-level groups, each holding its own sub-tabs. Adding a screen means
// adding one line here — the header, the mobile drawer and the sub-tab bar all
// read from this file, so they can never drift apart.
// ─────────────────────────────────────────────────────────────

import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Megaphone,
  Package,
  Settings,
  ShoppingBag,
  Users,
} from "lucide-react";

export type AdminTab = {
  label: string;
  href: string;
};

export type AdminGroup = {
  key: string;
  label: string;
  icon: LucideIcon;
  /** Short line used on the dashboard launcher. */
  description: string;
  tabs: AdminTab[];
};

export const ADMIN_GROUPS: AdminGroup[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    description: "Today at a glance",
    tabs: [{ label: "Overview", href: "/admin/dashboard" }],
  },
  {
    key: "catalog",
    label: "Catalog",
    icon: Package,
    description: "Products, collections and brands",
    tabs: [
      { label: "Products", href: "/admin/products" },
      { label: "Collections", href: "/admin/collections" },
      { label: "Brands", href: "/admin/brands" },
    ],
  },
  {
    key: "sales",
    label: "Sales",
    icon: ShoppingBag,
    description: "Orders and discount codes",
    tabs: [
      { label: "Orders", href: "/admin/orders" },
      { label: "Coupons", href: "/admin/coupons" },
    ],
  },
  {
    key: "content",
    label: "Content",
    icon: Megaphone,
    description: "Banners and customer messages",
    tabs: [
      { label: "Banners", href: "/admin/banners" },
      { label: "Messages", href: "/admin/messages" },
    ],
  },
  {
    key: "people",
    label: "People",
    icon: Users,
    description: "Who can run the store",
    tabs: [{ label: "Team", href: "/admin/team" }],
  },
  {
    key: "settings",
    label: "Settings",
    icon: Settings,
    description: "Store details and email",
    tabs: [{ label: "Store", href: "/admin/settings" }],
  },
];

/** `/admin/products` and `/admin/products/p_123` both belong to the same tab. */
export function isTabActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function tabForPath(group: AdminGroup, pathname: string): AdminTab | undefined {
  // Longest href wins, so a nested screen never resolves to its parent tab.
  return [...group.tabs]
    .sort((a, b) => b.href.length - a.href.length)
    .find((tab) => isTabActive(pathname, tab.href));
}

export function groupForPath(pathname: string): AdminGroup | undefined {
  return ADMIN_GROUPS.find((group) => Boolean(tabForPath(group, pathname)));
}

/** Groups with more than one screen get a sub-tab bar; single screens do not. */
export function tabsForPath(pathname: string): { group: AdminGroup; tabs: AdminTab[] } | null {
  const group = groupForPath(pathname);
  if (!group || group.tabs.length < 2) return null;
  return { group, tabs: group.tabs };
}
