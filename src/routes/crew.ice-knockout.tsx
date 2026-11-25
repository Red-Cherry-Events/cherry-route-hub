// Trackside ICE knockout controller: crew and admin mark riders in or out per round.
import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { IceKnockoutController } from "@/components/ice-knockout-controller";
import { IceControlLinkAdmin } from "@/components/ice-control-link-admin";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin, useIsCrew } from "@/lib/auth";
import { ICE_EVENT_ID, knockoutKey, useKnockout, type KnockoutRider, type RaceClass } from "@/lib/ice-knockout";

export const Route = createFileRoute("/crew/ice-knockout")({
  head: () => ({
    meta: [
      { title: "ICE knockout tracker · Crew · Red Cherry Events" },
      { name: "description", content: "Mark Inner City Enduro riders in or out after each heat." },
      { property: "og:title", content: "ICE knockout tracker · Crew" },
      { property: "og:description", content: "Mark Inner City Enduro riders in or out after each heat." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: CrewIceKnockout,
});

function CrewIceKnockout() {
  const { isCrew, loading, user } = useIsCrew();
  const qc = useQueryClient();
  const { isAdmin } = useIsAdmin();
  const q = useKnockout(ICE_EVENT_ID, isCrew);

  if (loading) return <p className="p-4 text-sm text-ink-soft">Loading…</p>;
  if (!user) return <Navigate to="/crew/login" />;
  if (!isCrew) return <p className="p-4 text-sm text-ink-soft">This area is for Red Cherry crew. Ask an admin to add you to the crew team.</p>;

  async function save(r: KnockoutRider, patch: Pick<KnockoutRider, "status" | "out_round" | "out_at">) {
    qc.setQueryData<KnockoutRider[]>(knockoutKey(ICE_EVENT_ID), (old) => old?.map((x) => (x.id === r.id ? { ...x, ...patch } : x)));
    const { error } = await supabase.from("ice_knockout_riders").update(patch).eq("id", r.id);
    if (error) {
      toast.error("Could not save. Check signal and try again.");
      void qc.invalidateQueries({ queryKey: knockoutKey(ICE_EVENT_ID) });
      return false;
    }
    return true;
  }

  async function onAdd(input: { race_class: RaceClass; full_name: string; bib_number: string | null }) {
    const { error } = await supabase.from("ice_knockout_riders").insert({ event_id: ICE_EVENT_ID, ...input, sort_order: 200 });
    if (error) { toast.error("Could not add rider."); return false; }
    void qc.invalidateQueries({ queryKey: knockoutKey(ICE_EVENT_ID) });
    return true;
  }

  return (
    <div className="mx-auto w-full max-w-xl space-y-4 px-4 pb-10 pt-4">
      <Link to="/crew" className="inline-flex items-center gap-1 text-xs font-semibold text-ink-soft"><ArrowLeft className="h-3.5 w-3.5" /> Crew centre</Link>
      <header>
        <h1 className="font-display text-2xl font-bold text-ink">ICE knockout tracker</h1>
        <p className="text-sm text-ink-soft">Tap a rider to mark them out. Changes show on the event page straight away.</p>
      </header>

      {isAdmin ? <IceControlLinkAdmin /> : null}
      <IceKnockoutController riders={q.data ?? []} loading={q.isLoading} onSave={save} onAdd={onAdd} />
    </div>
  );
}
