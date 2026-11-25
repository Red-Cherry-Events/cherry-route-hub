// Server-only helpers for the private ICE trackside control link.
import { enforceRequestQuota } from "@/lib/request-quota.server";
import { ICE_EVENT_ID } from "@/lib/ice-knockout";

/** End of Monday 30 November 2026, South African time. */
export const ICE_CONTROL_EXPIRES_AT = "2026-11-30T22:00:00.000Z";
const TOKEN_RE = /^[A-Za-z0-9_-]{43,64}$/;

export async function hashToken(token: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(d), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function newToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** True when the token matches an active, unexpired link for ICE. Bad attempts are rate limited. */
export async function checkControlToken(token: unknown): Promise<boolean> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  let ok = false;
  if (typeof token === "string" && TOKEN_RE.test(token)) {
    const { data } = await supabaseAdmin
      .from("ice_control_links")
      .select("id")
      .eq("token_hash", await hashToken(token))
      .eq("event_id", ICE_EVENT_ID)
      .is("revoked_at", null)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    ok = Boolean(data);
  }
  if (!ok) {
    try { await enforceRequestQuota("ice-control-bad-token", 20); } catch { throw new Error("Too many attempts. Try again later."); }
  }
  return ok;
}
