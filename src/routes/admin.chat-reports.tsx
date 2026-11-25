import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";

export const Route = createFileRoute("/admin/chat-reports")({
  head: () => ({
    meta: [
      { title: "Chat reports · Red Cherry Events Admin" },
      { name: "description", content: "Review reported event chat messages, hide them and resolve reports." },
      { property: "og:title", content: "Chat reports · Red Cherry Events Admin" },
      { property: "og:description", content: "Review reported event chat messages." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ChatReports,
});

function ChatReports() {
  const qc = useQueryClient();
  const { user } = useSession();
  const [showResolved, setShowResolved] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const q = useQuery({
    queryKey: ["chat-reports", showResolved],
    queryFn: async () => {
      let query = supabase
        .from("chat_reports")
        .select(
          "id, reason, status, created_at, message_id, event:events(name), message:event_chat_messages(body, hidden, author_id, created_at, profiles:profiles(full_name))",
        )
        .order("created_at", { ascending: false })
        .limit(200);
      if (!showResolved) query = query.eq("status", "open");
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  async function setHidden(r: any, hidden: boolean) {
    setBusy(r.id);
    const { error } = await supabase
      .from("event_chat_messages")
      .update({ hidden, hidden_at: hidden ? new Date().toISOString() : null, hidden_by: hidden ? user?.id ?? null : null })
      .eq("id", r.message_id);
    toast[error ? "error" : "success"](error ? "Couldn't update the message" : hidden ? "Message hidden" : "Message visible again");
    setBusy(null);
    qc.invalidateQueries({ queryKey: ["chat-reports"] });
  }

  async function resolve(r: any) {
    setBusy(r.id);
    const { error } = await supabase
      .from("chat_reports")
      .update({ status: "resolved", resolved_at: new Date().toISOString(), resolved_by: user?.id ?? null })
      .eq("id", r.id);
    toast[error ? "error" : "success"](error ? "Couldn't resolve" : "Report resolved");
    setBusy(null);
    qc.invalidateQueries({ queryKey: ["chat-reports"] });
  }

  const rows = q.data ?? [];
  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="font-display text-xl font-bold text-ink">Chat reports</h1>
          <p className="text-xs text-ink-soft">Messages riders reported in event chats. Hide anything abusive, then resolve the report.</p>
        </div>
        <label className="flex items-center gap-1 text-xs text-ink">
          <input type="checkbox" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} /> Show resolved
        </label>
      </div>
      {q.isLoading ? (
        <p className="text-sm text-ink-soft">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="rounded-2xl bg-card p-4 text-sm text-ink-soft ring-1 ring-border">No open reports.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id} className="space-y-2 rounded-2xl bg-card p-4 ring-1 ring-border">
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-ink-soft">
                <span className="font-bold uppercase tracking-wide text-ink">{r.event?.name ?? "Event"}</span>
                <span>· reported {new Date(r.created_at).toLocaleString("en-ZA")}</span>
                <span className={`rounded-full px-2 py-0.5 font-semibold ${r.status === "open" ? "bg-accent text-cherry-deep" : "bg-secondary text-ink"}`}>
                  {r.status}
                </span>
                {r.message?.hidden && <span className="rounded-full bg-secondary px-2 py-0.5 font-semibold text-ink">hidden</span>}
              </div>
              <div className="rounded-xl bg-secondary px-3 py-2 text-sm text-ink">
                <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">{r.message?.profiles?.full_name ?? "Rider"}</p>
                <p className="whitespace-pre-line">{r.message?.body ?? "(message deleted)"}</p>
              </div>
              <p className="text-xs text-ink">
                <b>Reason:</b> {r.reason || "No reason given"}
              </p>
              <div className="flex flex-wrap gap-2">
                {r.message && (
                  <button
                    disabled={busy === r.id}
                    onClick={() => void setHidden(r, !r.message.hidden)}
                    className="rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-ink ring-1 ring-border disabled:opacity-60"
                  >
                    {r.message.hidden ? "Unhide message" : "Hide message"}
                  </button>
                )}
                {r.status === "open" && (
                  <button
                    disabled={busy === r.id}
                    onClick={() => void resolve(r)}
                    className="rounded-full cherry-gradient px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                  >
                    Mark resolved
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
