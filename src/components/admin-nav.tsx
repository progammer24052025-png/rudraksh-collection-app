"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, LogOut, Menu, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { AdminSubtabs } from "@/components/admin-subtabs";
import { useAdmin } from "@/lib/admin-context";
import { ADMIN_GROUPS, groupForPath, isTabActive } from "@/lib/admin-nav";
import { cn } from "@/lib/utils";

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAdmin();
  const activeGroup = groupForPath(pathname);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-2 sm:gap-5">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Admin menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 overflow-y-auto p-0">
              <AdminDrawer pathname={pathname} />
            </SheetContent>
          </Sheet>

          <Link href="/admin/dashboard" className="flex items-center gap-2 font-serif text-lg font-medium">
            RC Admin
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {ADMIN_GROUPS.map((group) => {
              const active = activeGroup?.key === group.key;
              const triggerClass = cn(
                "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                active ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
              );

              // A group with one screen is a plain link; several screens get a menu.
              if (group.tabs.length === 1) {
                return (
                  <Link key={group.key} href={group.tabs[0].href} className={triggerClass}>
                    <group.icon className="h-4 w-4" />
                    {group.label}
                  </Link>
                );
              }

              return (
                <DropdownMenu key={group.key}>
                  <DropdownMenuTrigger asChild>
                    <button type="button" className={triggerClass}>
                      <group.icon className="h-4 w-4" />
                      {group.label}
                      <ChevronDown className="h-3.5 w-3.5 opacity-60" aria-hidden />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-52">
                    <DropdownMenuLabel className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                      {group.label}
                    </DropdownMenuLabel>
                    {group.tabs.map((tab) => (
                      <DropdownMenuItem key={tab.href} asChild>
                        <Link
                          href={tab.href}
                          className={cn(
                            "cursor-pointer",
                            isTabActive(pathname, tab.href) && "font-medium text-sage",
                          )}
                        >
                          {tab.label}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden max-w-40 truncate text-xs text-muted-foreground lg:inline">
            {user?.email}
          </span>
          <Button asChild variant="ghost" size="sm">
            <Link href="/">
              <Store className="h-4 w-4" />
              <span className="ml-1.5 hidden sm:inline">Store</span>
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              await logout();
              router.replace("/admin");
            }}
          >
            <LogOut className="h-4 w-4" />
            <span className="ml-1.5 hidden sm:inline">Logout</span>
          </Button>
        </div>
      </div>

      <AdminSubtabs />
    </header>
  );
}

/** Mobile: every group with its screens nested underneath, never a flat list. */
function AdminDrawer({ pathname }: { pathname: string }) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border p-4">
        <span className="font-serif text-lg font-semibold">RC Admin</span>
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto p-4">
        {ADMIN_GROUPS.map((group) => (
          <div key={group.key}>
            <p className="flex items-center gap-2 px-2 pb-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              <group.icon className="h-3.5 w-3.5" aria-hidden />
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.tabs.map((tab) => {
                const active = isTabActive(pathname, tab.href);
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={cn(
                      "block rounded-md px-3 py-2 text-sm transition-colors",
                      active
                        ? "bg-muted font-medium text-foreground"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                    )}
                  >
                    {tab.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t border-border p-4 text-xs text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          ← Back to the store
        </Link>
      </div>
    </div>
  );
}
