// Private ICE control link: token-checked writes plus admin create/revoke.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { checkIsAdmin } from "@/lib/is-admin";
import { ICE_EVENT_ID, sortKnockout, type KnockoutRider } from "@/lib/ice-knockout";
import { checkControlToken, hashToken, newToken, ICE_CONTROL_EXPIRES_AT } from "@/lib/ice-control.server";

const tokenSchema = z.string().max(100);
const COLS = "id, race_class, full_name, bib_number, sort_order, status, out_round, out_at";

export const iceControlLoad = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: tokenSchema }).parse(d))
  .handler(async ({ data }) => {
    if (!(await checkControlToken(data.token))) return { valid: false as const, riders: [] as KnockoutRider[] };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin.from("ice_knockout_riders").select(COLS).eq("event_id", ICE_EVENT_ID);
    if (error) throw new Error("Could not load riders.");
    return { valid: true as const, riders: sortKnockout((rows ?? []) as KnockoutRider[]) };
  });

export const iceControlSet = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      token: tokenSchema,
      id: z.string().uuid(),
      status: z.enum(["in", "out"]),
      out_round: z.string().max(60).nullable(),
      out_at: z.string().max(40).nullable(),
    }).parse(d))
  .handler(async ({ data }) => {
    if (!(await checkControlToken(data.token))) return { ok: false };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch = data.status === "in"
      ? { status: "in", out_round: null, out_at: null }
      : { status: "out", out_round: data.out_round, out_at: data.out_at ?? new Date().toISOString() };
    const { error } = await supabaseAdmin.from("ice_knockout_riders").update(patch).eq("id", data.id).eq("event_id", ICE_EVENT_ID);
    return { ok: !error };
  });

export const iceControlAdd = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      token: tokenSchema,
      race_class: z.enum(["pro", "support"]),
      full_name: z.string().trim().min(1).max(80),
      bib_number: z.string().trim().max(10).nullable(),
    }).parse(d))
  .handler(async ({ data }) => {
    if (!(await checkControlToken(data.token))) return { ok: false };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("ice_knockout_riders").insert({
      event_id: ICE_EVENT_ID, race_class: data.race_class, full_name: data.full_name, bib_number: data.bib_number || null, sort_order: 200,
    });
    return { ok: !error };
  });

async function requireAdmin(supabase: Parameters<typeof checkIsAdmin>[0]) {
  if (!(await checkIsAdmin(supabase))) throw new Error("Forbidden");
}

export const iceControlStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("ice_control_links").select("created_at, expires_at")
      .eq("event_id", ICE_EVENT_ID).is("revoked_at", null).gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    return { active: Boolean(data), createdAt: data?.created_at ?? null, expiresAt: data?.expires_at ?? null };
  });

async function revokeAll() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("ice_control_links").update({ revoked_at: new Date().toISOString() }).eq("event_id", ICE_EVENT_ID).is("revoked_at", null);
}

export const iceControlRevoke = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase);
    await revokeAll();
    return { ok: true };
  });

export const iceControlCreate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase);
    if (Date.now() >= Date.parse(ICE_CONTROL_EXPIRES_AT)) throw new Error("The event window has ended.");
    await revokeAll();
    const token = newToken();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("ice_control_links").insert({
      event_id: ICE_EVENT_ID, token_hash: await hashToken(token), expires_at: ICE_CONTROL_EXPIRES_AT, created_by: context.userId,
    });
    if (error) throw new Error("Could not create link.");
    return { path: `/ice-control/${token}`, expiresAt: ICE_CONTROL_EXPIRES_AT };
  });
