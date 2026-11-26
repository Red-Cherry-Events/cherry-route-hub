// ICE stream overlay: crew push a results card, the OBS overlay link reads the last push.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ICE_EVENT_ID, finishPositions, sortKnockout, type KnockoutRider } from "@/lib/ice-knockout";
import { checkControlToken } from "@/lib/ice-control.server";

export type StreamRow = { place: number | null; name: string; bib: string | null; status: "in" | "out" };
export type StreamState = { race_class: "pro" | "support" | null; rows: StreamRow[]; visible: boolean; pushed_at: string };

const pushSchema = z.object({ race_class: z.enum(["pro", "support"]).nullable(), visible: z.boolean() });

async function doPush(input: z.infer<typeof pushSchema>) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  let rows: StreamRow[] = [];
  if (input.race_class) {
    const { data, error } = await supabaseAdmin.from("ice_knockout_riders")
      .select("id, race_class, full_name, bib_number, sort_order, status, out_round, out_at")
      .eq("event_id", ICE_EVENT_ID).eq("race_class", input.race_class);
    if (error) return { ok: false };
    const riders = sortKnockout((data ?? []) as KnockoutRider[]);
    const pos = finishPositions(riders);
    rows = riders.map((r) => ({ place: pos.get(r.id) ?? null, name: r.full_name, bib: r.bib_number, status: r.status }))
      .sort((a, b) => (a.status === b.status ? (a.place ?? 0) - (b.place ?? 0) : a.status === "in" ? -1 : 1));
  }
  const now = new Date().toISOString();
  const { error } = input.race_class
    ? await supabaseAdmin.from("ice_stream_push").upsert({ event_id: ICE_EVENT_ID, race_class: input.race_class, rows: rows as never, visible: input.visible, pushed_at: now }, { onConflict: "event_id" })
    : await supabaseAdmin.from("ice_stream_push").upsert({ event_id: ICE_EVENT_ID, visible: false, pushed_at: now }, { onConflict: "event_id" });
  return { ok: !error };
}

/** Trackside link push. */
export const iceStreamPushToken = createServerFn({ method: "POST" })
  .inputValidator((d) => pushSchema.extend({ token: z.string().max(100) }).parse(d))
  .handler(async ({ data }) => {
    if (!(await checkControlToken(data.token))) return { ok: false };
    return doPush(data);
  });

/** Signed-in crew/admin push. */
export const iceStreamPushStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => pushSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: roles } = await context.supabase.from("user_roles").select("role").in("role", ["admin", "crew"]).limit(1);
    if (!roles?.length) throw new Error("Forbidden");
    return doPush(data);
  });

/** OBS overlay read, token checked every call. */
export const iceOverlayLoad = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string().max(100) }).parse(d))
  .handler(async ({ data }) => {
    if (!(await checkControlToken(data.token, "overlay"))) return { valid: false as const, state: null };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin.from("ice_stream_push").select("race_class, rows, visible, pushed_at").eq("event_id", ICE_EVENT_ID).maybeSingle();
    return { valid: true as const, state: (row ?? null) as StreamState | null };
  });
