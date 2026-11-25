import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

/** Profile card listing riders I've blocked in event chats, with unblock. */
export function BlockedRidersCard({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["user-blocks-list", userId],
    queryFn: async () => {
      const { data } = await supabase.from("user_blocks").select("blocked_id, created_at").order("created_at", { ascending: false });
      const ids = (data ?? []).map((b) => b.blocked_id);
      const names = new Map<string, string>();
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", ids);
        for (const p of profs ?? []) if (p.full_name) names.set(p.id, p.full_name);
      }
      return ids.map((id) => ({ id, name: names.get(id) ?? "Rider" }));
    },
  });

  async function unblock(id: string) {
    const { error } = await supabase.from("user_blocks").delete().eq("blocker_id", userId).eq("blocked_id", id);
    toast[error ? "error" : "success"](error ? "Couldn't unblock" : "Rider unblocked");
    qc.invalidateQueries({ queryKey: ["user-blocks-list", userId] });
    qc.invalidateQueries({ queryKey: ["user-blocks", userId] });
  }

  const rows = q.data ?? [];
  if (!rows.length) return null;
  return (
    <section data-section="blocked_riders" className="mx-5 mt-4 rounded-2xl bg-card p-4 ring-1 ring-border">
      <div className="flex items-center gap-2">
        <Ban className="h-4 w-4 text-cherry" />
        <h2 className="font-display text-sm font-bold">Blocked riders</h2>
      </div>
      <p className="mt-1 text-xs text-ink-soft">You don't see these riders' event chat messages.</p>
      <ul className="mt-3 space-y-1.5">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center justify-between rounded-xl bg-secondary/50 px-3 py-2 text-sm ring-1 ring-border">
            <span className="truncate text-ink">{r.name}</span>
            <button onClick={() => void unblock(r.id)} className="text-xs font-semibold text-cherry underline">
              Unblock
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
