// ICE race-day surfaces for signed-in users: live stream, knockout board and map jump.
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Map as MapIcon, Radio, Trophy } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/lib/auth";
import { ICE_ROUND_NOTE, useKnockout, youtubeId, type RaceClass } from "@/lib/ice-knockout";
import { scrollAppTo } from "@/lib/app-scroll";

function useLiveStream(eventId: string) {
  return useQuery({
    queryKey: ["event-live-stream", eventId],
    queryFn: async () => {
      const { data } = await supabase.from("event_live_streams").select("youtube_url").eq("event_id", eventId).maybeSingle();
      return data?.youtube_url ?? null;
    },
    refetchInterval: 60_000,
  });
}

export function IceRaceDayLive({ eventId, onOpenMap }: { eventId: string; onOpenMap: () => void }) {
  const stream = useLiveStream(eventId);
  const { isAdmin } = useIsAdmin();
  const id = youtubeId(stream.data);
  return (
    <section data-section="race_day_live" className="space-y-3">
      <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
        <Radio className="h-4 w-4 text-cherry" /> Race day live
      </h2>
      {id ? (
        <div className="aspect-video w-full overflow-hidden rounded-2xl bg-ink ring-1 ring-border">
          <iframe
            src={`https://www.youtube.com/embed/${id}?autoplay=0&rel=0`}
            title="Inner City Enduro live stream"
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : (
        <div className="rounded-2xl bg-ink p-4 text-primary-foreground ring-1 ring-border">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cherry">Live stream</p>
          <p className="mt-1 font-display text-lg font-bold">Live stream starts Sunday 29 Nov, first heat 11:00</p>
          <p className="mt-1 text-sm opacity-80">Come back here on race day. The player shows up on this page.</p>
        </div>
      )}
      {isAdmin ? <AdminStreamField eventId={eventId} current={stream.data ?? ""} /> : null}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => document.getElementById("ice-knockout")?.scrollIntoView({ behavior: "smooth", block: "start" })} className="flex items-center justify-center gap-2 rounded-2xl bg-card px-3 py-3 text-sm font-bold text-ink ring-1 ring-border">
          <Trophy className="h-4 w-4 text-cherry" /> Who's in, who's out
        </button>
        <button type="button" onClick={() => { onOpenMap(); scrollAppTo(0); }} className="flex items-center justify-center gap-2 rounded-2xl bg-card px-3 py-3 text-sm font-bold text-ink ring-1 ring-border">
          <MapIcon className="h-4 w-4 text-cherry" /> Rider map
        </button>
      </div>
    </section>
  );
}

function AdminStreamField({ eventId, current }: { eventId: string; current: string }) {
  const qc = useQueryClient();
  const [value, setValue] = useState(current);
  const [busy, setBusy] = useState(false);
  async function save() {
    const v = value.trim();
    if (v && !youtubeId(v)) return void toast.error("That doesn't look like a YouTube link.");
    setBusy(true);
    const { error } = await supabase.from("event_live_streams").upsert({ event_id: eventId, youtube_url: v || null, updated_at: new Date().toISOString() });
    setBusy(false);
    if (error) return void toast.error("Could not save the link.");
    toast.success(v ? "Live stream link saved" : "Live stream link cleared");
    void qc.invalidateQueries({ queryKey: ["event-live-stream", eventId] });
  }
  return (
    <div className="rounded-2xl border border-dashed border-border p-3">
      <p className="text-[11px] font-bold uppercase tracking-widest text-ink-soft">Admin · YouTube live link</p>
      <div className="mt-2 flex gap-2">
        <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="https://www.youtube.com/live/…" className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm" />
        <button type="button" disabled={busy} onClick={save} className="rounded-full bg-cherry px-4 text-xs font-bold text-primary-foreground disabled:opacity-60">Save</button>
      </div>
    </div>
  );
}

export function IceKnockoutBoard({ eventId }: { eventId: string }) {
  const q = useKnockout(eventId, true);
  const [cls, setCls] = useState<RaceClass>("pro");
  const riders = (q.data ?? []).filter((r) => r.race_class === cls);
  const still = riders.filter((r) => r.status === "in");
  const out = riders.filter((r) => r.status === "out").sort((a, b) => (b.out_at ?? "").localeCompare(a.out_at ?? ""));
  return (
    <section id="ice-knockout" data-section="ice_knockout" className="scroll-mt-16 space-y-3">
      <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
        <Trophy className="h-4 w-4 text-cherry" /> Live results: who's in, who's out
      </h2>
      <div className="grid grid-cols-2 gap-1 rounded-full bg-secondary p-1">
        {(["pro", "support"] as const).map((c) => (
          <button key={c} type="button" onClick={() => setCls(c)} className={`rounded-full py-2 text-xs font-bold ${cls === c ? "bg-cherry text-primary-foreground" : "text-ink-soft"}`}>
            {c === "pro" ? "Pro" : "Support"}
          </button>
        ))}
      </div>
      <p className="text-sm font-bold text-ink">{still.length} still in · {out.length} knocked out</p>
      <p className="-mt-2 text-[11px] text-ink-soft">{ICE_ROUND_NOTE[cls]}</p>
      {q.isLoading ? <p className="text-sm text-ink-soft">Loading…</p> : null}
      <ul className="grid gap-1.5 sm:grid-cols-2">
        {still.map((r) => (
          <li key={r.id} className="flex items-center justify-between rounded-xl bg-card px-3 py-2.5 ring-1 ring-border">
            <span className="text-sm font-bold text-ink">{r.bib_number ? `#${r.bib_number} ` : ""}{r.full_name}</span>
            <span className="rounded-full bg-success px-2 py-0.5 text-[10px] font-black text-primary-foreground">IN</span>
          </li>
        ))}
      </ul>
      {out.length ? (
        <>
          <p className="pt-1 text-[11px] font-bold uppercase tracking-widest text-ink-soft">Knocked out</p>
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {out.map((r) => (
              <li key={r.id} className="flex items-center justify-between rounded-xl bg-secondary/50 px-3 py-2 opacity-60">
                <span className="text-sm text-ink line-through decoration-ink-soft/50">{r.full_name}</span>
                <span className="text-[11px] text-ink-soft">{r.out_round ?? "Out"}</span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}
