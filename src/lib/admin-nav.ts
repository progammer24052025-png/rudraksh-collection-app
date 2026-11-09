// ─────────────────────────────────────────────────────────────
// Admin navigation model.
//
// The console is grouped rather than flat: five screens under Catalog
// would be an unusable row of links. A group with a single screen renders
// as a plain link; anything with more renders as a menu plus the sub-tab
// bar in `components/admin-subtabs`.
// ─────────────────────────────────────────────────────────────

import {
  LayoutDashboard,
  Mail,
  Package,
  Settings,
  ShoppingBag,
  Users,
  type LucideIcon,
} from "lucide-react";

export type AdminTab = {
  label: string;
  href: string;
};

export type AdminGroup = {
  key: string;
  label: string;
  description: string;
  icon: LucideIcon;
  tabs: AdminTab[];
};

export const ADMIN_GROUPS: AdminGroup[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    description: "Orders, revenue and stock at a glance",
    icon: LayoutDashboard,
    tabs: [{ label: "Overview", href: "/admin/dashboard" }],
  },
  {
    key: "catalog",
    label: "Catalog",
    description: "Products, collections and brands",
    icon: Package,
    tabs: [
      { label: "Products", href: "/admin/products" },
      { label: "Collections", href: "/admin/collections" },
      { label: "Brands", href: "/admin/brands" },
    ],
  },
  {
    key: "sales",
    label: "Sales",
    description: "Orders, coupons and storefront banners",
    icon: ShoppingBag,
    tabs: [
      { label: "Orders", href: "/admin/orders" },
      { label: "Coupons", href: "/admin/coupons" },
      { label: "Banners", href: "/admin/banners" },
    ],
  },
  {
    key: "content",
    label: "Content",
    description: "Customer messages from the contact form",
    icon: Mail,
    tabs: [{ label: "Messages", href: "/admin/messages" }],
  },
  {
    key: "people",
    label: "People",
    description: "Store team and access requests",
    icon: Users,
    tabs: [{ label: "Team", href: "/admin/team" }],
  },
  {
    key: "settings",
    label: "Settings",
    description: "Contact details, shipping and hours",
    icon: Settings,
    tabs: [{ label: "Store settings", href: "/admin/settings" }],
  },
];

/**
 * True when `href` is the current screen. A tab stays active on its own
 * detail routes: `/admin/products/abc` keeps the Products tab lit.
 */
export function isTabActive(pathname: string | null | undefined, href: string): boolean {
  const path = (pathname ?? "").replace(/\/+$/, "") || "/";
  const target = (href ?? "").replace(/\/+$/, "");
  if (!target) return false;
  return path === target || path.startsWith(`${target}/`);
}

/** The group that owns the current path, longest matching tab wins. */
export function groupForPath(pathname: string | null | undefined): AdminGroup | null {
  let best: { group: AdminGroup; length: number } | null = null;

  for (const group of ADMIN_GROUPS) {
    for (const tab of group.tabs) {
      if (!isTabActive(pathname, tab.href)) continue;
      if (!best || tab.href.length > best.length) {
        best = { group, length: tab.href.length };
      }
    }
  }

  return best?.group ?? null;
}
