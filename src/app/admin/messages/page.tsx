"use client";

import { useEffect, useState } from "react";
import { Loader2, Mail, Phone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AdminNav } from "@/components/admin-nav";
import { subscribeMessages, updateValue } from "@/lib/firebase";
import type { ContactMessage } from "@/lib/types";

export default function AdminMessagesPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeMessages((list) => {
      setMessages(list);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="min-h-screen">
      <AdminNav />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <h1 className="font-serif text-2xl font-medium">Messages</h1>
          <p className="text-sm text-muted-foreground">
            {loading ? "Connecting…" : `${messages.length} message${messages.length === 1 ? "" : "s"} from the contact form`}
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-10 text-center text-muted-foreground">
            <Mail className="mx-auto h-10 w-10" />
            <p className="mt-3 text-sm">No messages yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div key={message.id} className="rounded-lg border border-border bg-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{message.subject || "General enquiry"}</p>
                    <p className="text-sm text-muted-foreground">
                      {message.name} · {message.email}
                      {message.phone ? ` · ${message.phone}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(message.created_at).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      message.status === "new"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {message.status}
                  </span>
                </div>

                <p className="mt-3 whitespace-pre-line text-sm">{message.message}</p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="outline">
                    <a href={`mailto:${message.email}?subject=Re: ${encodeURIComponent(message.subject || "Your enquiry")}`}>
                      <Mail className="mr-1.5 h-3.5 w-3.5" /> Reply
                    </a>
                  </Button>
                  {message.phone && (
                    <Button asChild size="sm" variant="outline">
                      <a href={`tel:${message.phone}`}>
                        <Phone className="mr-1.5 h-3.5 w-3.5" /> Call
                      </a>
                    </Button>
                  )}
                  {message.status === "new" && (
                    <Button
                      size="sm"
                      onClick={async () => {
                        try {
                          await updateValue(["messages", message.id], { status: "read" });
                          toast.success("Marked as read");
                        } catch {
                          toast.error("Could not update the message");
                        }
                      }}
                    >
                      Mark as read
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
