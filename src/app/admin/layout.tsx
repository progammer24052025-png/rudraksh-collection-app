"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { AdminProvider, useAdmin } from "@/lib/admin-context";
import { isAllowedAdminEmail } from "@/lib/firebase";

function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAdmin, loading } = useAdmin();
  const isLoginPage = pathname === "/admin";

  const isOwner = Boolean(user?.email && isAllowedAdminEmail(user.email));
  const hasAccess = isAdmin || isOwner;

  useEffect(() => {
    if (!loading && !hasAccess && !isLoginPage) router.replace("/admin");
  }, [hasAccess, isLoginPage, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!hasAccess && !isLoginPage) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <>{children}</>;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminProvider>
      <AdminShell>{children}</AdminShell>
    </AdminProvider>
  );
}
