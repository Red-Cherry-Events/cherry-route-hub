// ICE knockout board: shared rounds, data fetch and live subscription.
// Reads need a signed-in session (RLS); writes are crew/admin only.
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const ICE_EVENT_ID = "f046ce38-e687-4038-959d-271ba20825f0";
export type RaceClass = "pro" | "support";

export const ICE_ROUNDS: Record<RaceClass, string[]> = {
  support: ["Heat 1 · 11:00", "Heat 2 · 13:00", "Final · 15:00"],
  pro: ["Heat 1 · 12:00", "Heat 2 · 14:00", "Final · 15:30"],
};
export const ICE_ROUND_NOTE: Record<RaceClass, string> = {
  support: "Heat 1 cuts to the last 15, heat 2 to the last 3, then a Last Man Standing final.",
  pro: "Heat 1 cuts to the last 8, heat 2 to the last 3, then a Last Man Standing final.",
};

export type KnockoutRider = {
  id: string;
  race_class: RaceClass;
  full_name: string;
  bib_number: string | null;
  sort_order: number;
  status: "in" | "out";
  out_round: string | null;
  out_at: string | null;
};

export const knockoutKey = (eventId: string) => ["ice-knockout", eventId] as const;

export function sortKnockout(rows: KnockoutRider[]): KnockoutRider[] {
  return [...rows].sort((a, b) => a.sort_order - b.sort_order || a.full_name.localeCompare(b.full_name));
}

export function useKnockout(eventId: string, enabled: boolean) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: knockoutKey(eventId),
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ice_knockout_riders")
        .select("id, race_class, full_name, bib_number, sort_order, status, out_round, out_at")
        .eq("event_id", eventId);
      if (error) throw error;
      return sortKnockout((data ?? []) as KnockoutRider[]);
    },
  });
  useEffect(() => {
    if (!enabled) return;
    let t: ReturnType<typeof setTimeout> | null = null;
    const channel = supabase
      .channel(`ice-knockout-${eventId}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "ice_knockout_riders", filter: `event_id=eq.${eventId}` }, () => {
        if (t) clearTimeout(t);
        t = setTimeout(() => void qc.invalidateQueries({ queryKey: knockoutKey(eventId) }), 300);
      })
      .subscribe();
    return () => {
      if (t) clearTimeout(t);
      void supabase.removeChannel(channel);
    };
  }, [enabled, eventId, qc]);
  return q;
}

/** Pull the video id out of any common YouTube link shape. */
export function youtubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.trim().match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|live\/|embed\/|shorts\/))([A-Za-z0-9_-]{11})/);
  return m?.[1] ?? null;
}

/** Finishing places from knockout order: first rider out finishes last. Riders still in have no place yet, except a sole survivor who wins. */
export function finishPositions(riders: KnockoutRider[]): Map<string, number> {
  const out = riders.filter((r) => r.status === "out").sort((a, b) => (a.out_at ?? "").localeCompare(b.out_at ?? ""));
  const pos = new Map<string, number>();
  out.forEach((r, i) => pos.set(r.id, riders.length - i));
  const still = riders.filter((r) => r.status === "in");
  if (still.length === 1 && riders.length > 1) pos.set(still[0]!.id, 1);
  return pos;
}

export function ordinal(n: number): string {
  const s = n % 100 >= 11 && n % 100 <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th";
  return `${n}${s}`;
}
