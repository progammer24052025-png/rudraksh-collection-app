"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { AdminProvider, useAdmin } from "@/lib/admin-context";

import { SealLoader } from "@/components/kit/brand-mark";
function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAdmin, loading } = useAdmin();
  const isLoginPage = pathname === "/admin";

  // Access follows the admin record alone. An owner address on its own proves
  // nothing until it is verified and the record has been written.
  const hasAccess = isAdmin;

  useEffect(() => {
    if (!loading && !hasAccess && !isLoginPage) router.replace("/admin");
  }, [hasAccess, isLoginPage, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <SealLoader size={56} showLabel={false} />
      </div>
    );
  }

  if (!hasAccess && !isLoginPage) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <SealLoader size={56} showLabel={false} />
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
