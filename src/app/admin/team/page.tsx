"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ShieldCheck, Trash2, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AdminNav } from "@/components/admin-nav";
import { useAdmin } from "@/lib/admin-context";
import {
  denyAdminRequest,
  grantAdmin,
  revokeAdmin,
  subscribeAdminRequests,
  subscribeAdmins,
  type AdminRequest,
} from "@/lib/firebase";
import type { AdminRecord } from "@/lib/types";

import { Spinner } from "@/components/ui/spinner";
import { SealLoader } from "@/components/kit/brand-mark";
export default function AdminTeamPage() {
  const { user } = useAdmin();
  const [admins, setAdmins] = useState<AdminRecord[]>([]);
  const [requests, setRequests] = useState<AdminRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    const offAdmins = subscribeAdmins((list) => {
      setAdmins(list);
      setLoading(false);
    });
    const offRequests = subscribeAdminRequests(setRequests);
    return () => {
      offAdmins();
      offRequests();
    };
  }, []);

  const pending = useMemo(
    () => requests.filter((request) => !admins.some((admin) => admin.uid === request.uid)),
    [requests, admins],
  );

  const approve = async (request: AdminRequest) => {
    if (!request.email) {
      toast.error("That request has no email address attached");
      return;
    }
    setBusy(request.uid);
    try {
      await grantAdmin(request.uid, request.email, "manager");
      toast.success(`${request.email} can now sign in to the admin`);
    } catch (error) {
      console.error(error);
      toast.error("Could not approve that request");
    } finally {
      setBusy(null);
    }
  };

  const deny = async (request: AdminRequest) => {
    setBusy(request.uid);
    try {
      await denyAdminRequest(request.uid);
      toast.success("Request dismissed");
    } catch (error) {
      console.error(error);
      toast.error("Could not dismiss that request");
    } finally {
      setBusy(null);
    }
  };

  const remove = async (admin: AdminRecord) => {
    if (admin.uid === user?.uid) {
      toast.error("You cannot remove your own admin access");
      return;
    }
    if (!confirm(`Remove admin access for ${admin.email}?`)) return;
    setBusy(admin.uid);
    try {
      await revokeAdmin(admin.uid);
      toast.success("Access removed");
    } catch (error) {
      console.error(error);
      toast.error("Could not remove that admin");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="min-h-screen">
      <AdminNav />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="mb-8">
          <h1 className="font-serif text-2xl font-medium">Team</h1>
          <p className="text-sm text-muted-foreground">
            Who can open this dashboard. Approvals and removals take effect immediately.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16 text-muted-foreground">
            <SealLoader size={40} showLabel={false} />
          </div>
        ) : (
          <div className="space-y-8">
            <section>
              <h2 className="flex items-center gap-2 font-serif text-lg font-medium">
                <UserPlus className="h-4 w-4 text-primary" /> Access requests
                {pending.length > 0 && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                    {pending.length}
                  </span>
                )}
              </h2>

              {pending.length === 0 ? (
                <p className="mt-3 rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
                  No pending requests. Someone who signs in at <code>/admin</code> without access will
                  appear here.
                </p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {pending.map((request) => (
                    <li
                      key={request.uid}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4"
                    >
                      <div>
                        <p className="text-sm font-medium">{request.email ?? "Unknown email"}</p>
                        <p className="text-xs text-muted-foreground">
                          {request.name ? `${request.name} · ` : ""}
                          requested {new Date(request.requested_at).toLocaleString("en-IN")}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => approve(request)} disabled={busy === request.uid}>
                          {busy === request.uid ? (
                            <Spinner className="h-3.5 w-3.5" />
                          ) : (
                            <><Check className="mr-1.5 h-3.5 w-3.5" /> Approve</>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deny(request)}
                          disabled={busy === request.uid}
                        >
                          <X className="mr-1.5 h-3.5 w-3.5" /> Dismiss
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h2 className="flex items-center gap-2 font-serif text-lg font-medium">
                <ShieldCheck className="h-4 w-4 text-primary" /> Admins
              </h2>
              <ul className="mt-3 space-y-3">
                {admins.map((admin) => (
                  <li
                    key={admin.uid}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {admin.email}
                        {admin.uid === user?.uid && (
                          <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                            You
                          </span>
                        )}
                      </p>
                      <p className="text-xs capitalize text-muted-foreground">
                        {admin.role} · added {new Date(admin.created_at).toLocaleDateString("en-IN")}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => remove(admin)}
                      disabled={busy === admin.uid || admin.uid === user?.uid}
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Remove
                    </Button>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-lg border border-border bg-muted/40 p-5 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">How to add a team member</p>
              <ol className="mt-2 list-decimal space-y-1 pl-5">
                <li>They open <code>/admin</code> and sign in with Google or an email account.</li>
                <li>Their request appears above — approve it here.</li>
                <li>Their dashboard unlocks instantly, without signing in again.</li>
              </ol>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
