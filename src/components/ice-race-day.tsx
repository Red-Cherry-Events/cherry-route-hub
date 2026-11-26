// ICE race-day surfaces for signed-in users: live stream, knockout board and map jump.
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { Map as MapIcon, Maximize2, Minimize2, Radio, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ICE_ROUND_NOTE, finishPositions, ordinal, useKnockout, youtubeId, type RaceClass } from "@/lib/ice-knockout";
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
  const id = youtubeId(stream.data);
  return (
    <section data-section="race_day_live" className="space-y-3">
      <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
        <Radio className="h-4 w-4 text-cherry" /> Race day live
      </h2>
      {id ? (
        <StreamPlayer id={id} />
      ) : (
        <div className="rounded-2xl bg-ink p-4 text-primary-foreground ring-1 ring-border">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cherry">Live stream</p>
          <p className="mt-1 font-display text-lg font-bold">Live stream starts Sunday 29 Nov at 10:00</p>
          <p className="mt-1 text-sm opacity-80">Come back here on race day. The player shows up on this page.</p>
        </div>
      )}
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

// Sunday 29 Nov 2026, 10:00 SAST.
const STREAM_START = Date.parse("2026-11-29T08:00:00Z");

function StreamPlayer({ id }: { id: string }) {
  const [now, setNow] = useState<number | null>(null);
  const [play, setPlay] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [nativeFullscreen, setNativeFullscreen] = useState(false);
  const playerRef = useRef<HTMLDivElement>(null);
  const expandButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const sync = () => setNativeFullscreen(document.fullscreenElement === playerRef.current);
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);
  useEffect(() => {
    if (!expanded) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(false);
      if (event.key === "Tab") {
        event.preventDefault();
        closeButtonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
      expandButtonRef.current?.focus();
    };
  }, [expanded]);
  async function toggleFullscreen() {
    if (expanded) { setExpanded(false); return; }
    if (document.fullscreenElement === playerRef.current && document.fullscreenElement) {
      await document.exitFullscreen().catch(() => {});
      return;
    }
    if (playerRef.current?.requestFullscreen) {
      try { await playerRef.current.requestFullscreen(); return; } catch { /* iOS and embedded browsers use the full-window player. */ }
    }
    setExpanded(true);
  }
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const left = now === null ? null : STREAM_START - now;
  if (play || (left !== null && left <= 0)) {
    const player = (
      <div ref={playerRef} role={expanded ? "dialog" : undefined} aria-modal={expanded ? true : undefined} aria-label={expanded ? "Inner City Enduro live stream" : undefined} className={expanded ? "fixed inset-0 z-[10000] flex flex-col bg-ink text-primary-foreground" : "flex w-full flex-col overflow-hidden rounded-2xl bg-ink text-primary-foreground ring-1 ring-border"}>
        <div className="flex justify-end p-2">
          <Button ref={expanded ? closeButtonRef : expandButtonRef} type="button" variant="secondary" size="sm" onClick={() => void toggleFullscreen()} aria-label={expanded || nativeFullscreen ? "Exit video fullscreen" : "Make video fullscreen"} title={expanded || nativeFullscreen ? "Exit fullscreen" : "Fullscreen"}>
            {expanded || nativeFullscreen ? <Minimize2 /> : <Maximize2 />}
            {expanded || nativeFullscreen ? "Close fullscreen" : "Fullscreen"}
          </Button>
        </div>
        <div className={expanded || nativeFullscreen ? "min-h-0 flex-1" : "aspect-video w-full"}>
        <iframe
          src={`https://www.youtube.com/embed/${id}?autoplay=${play ? 1 : 0}&rel=0&fs=1&playsinline=1`}
          title="Inner City Enduro live stream"
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
        />
        </div>
      </div>
    );
    return expanded ? createPortal(player, document.body) : player;
  }
  const s = Math.max(0, Math.floor((left ?? 0) / 1000));
  const parts = [
    { v: Math.floor(s / 86400), l: "Days" },
    { v: Math.floor((s % 86400) / 3600), l: "Hours" },
    { v: Math.floor((s % 3600) / 60), l: "Mins" },
    { v: s % 60, l: "Secs" },
  ];
  return (
    <button type="button" onClick={() => setPlay(true)} className="relative block aspect-video w-full overflow-hidden rounded-2xl bg-ink text-left ring-1 ring-border" aria-label="Open the Inner City Enduro live stream">
      <img src={`https://img.youtube.com/vi/${id}/maxresdefault.jpg`} alt="Inner City Enduro live stream" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-ink/60 p-3 text-primary-foreground">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cherry sm:text-xs">Live stream starts in</p>
        <div className="flex gap-2 sm:gap-3">
          {parts.map((p) => (
            <div key={p.l} className="min-w-12 rounded-xl bg-ink/80 px-2 py-1.5 text-center ring-1 ring-primary-foreground/20 sm:min-w-16">
              <p className="font-display text-2xl font-black tabular-nums sm:text-4xl">{left === null ? "--" : String(p.v).padStart(2, "0")}</p>
              <p className="text-[9px] font-bold uppercase tracking-widest opacity-80">{p.l}</p>
            </div>
          ))}
        </div>
        <p className="text-xs font-bold opacity-90">Sunday 29 Nov · 10:00</p>
      </div>
    </button>
  );
}

export function IceKnockoutBoard({ eventId }: { eventId: string }) {
  const q = useKnockout(eventId, true);
  const [cls, setCls] = useState<RaceClass>("pro");
  const riders = (q.data ?? []).filter((r) => r.race_class === cls);
  const still = riders.filter((r) => r.status === "in");
  const out = riders.filter((r) => r.status === "out").sort((a, b) => (b.out_at ?? "").localeCompare(a.out_at ?? ""));
  const places = finishPositions(riders);
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
            <span className="rounded-full bg-success px-2 py-0.5 text-[10px] font-black text-primary-foreground">{places.get(r.id) === 1 ? "WINNER" : "IN"}</span>
          </li>
        ))}
      </ul>
      {out.length ? (
        <>
          <p className="pt-1 text-[11px] font-bold uppercase tracking-widest text-ink-soft">Finishing order</p>
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {out.map((r) => (
              <li key={r.id} className="flex items-center justify-between rounded-xl bg-secondary/50 px-3 py-2 opacity-60">
                <span className="text-sm text-ink line-through decoration-ink-soft/50">{r.full_name}</span>
                <span className="text-[11px] font-bold text-ink-soft">{places.has(r.id) ? ordinal(places.get(r.id)!) : "Out"}</span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}
