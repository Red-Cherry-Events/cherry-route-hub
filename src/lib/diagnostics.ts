// Client helper: fire-and-forget diagnostic log. Never throws, never blocks.
export function errInfo(e: unknown): { message: string; stack: string | null } {
  if (e instanceof Error) return { message: e.message, stack: e.stack ? e.stack.slice(0, 500) : null };
  let message: string;
  try {
    message = typeof e === "string" ? e : JSON.stringify(e);
  } catch {
    message = String(e);
  }
  return { message: (message || "Unknown error").slice(0, 500), stack: null };
}

export function errText(e: unknown): string {
  return errInfo(e).message;
}

export async function logDiagnostic(event: string, detail: Record<string, unknown> = {}): Promise<void> {
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await supabase.auth.getSession();
    if (!data.session) return; // table only accepts signed-in rows
    const { logDiagnosticFn } = await import("./diagnostics.functions");
    await logDiagnosticFn({ data: { event, detail } });
  } catch (e) {
    try {
      console.warn("[diagnostics] log failed:", event, e);
    } catch {
      /* ignore */
    }
  }
}

/** Capacitor bridge facts, read defensively. */
export function capacitorFacts(): Record<string, unknown> {
  const w = typeof window !== "undefined" ? (window as any) : undefined;
  const cap = w?.Capacitor;
  const safe = (fn: () => unknown) => {
    try {
      return fn();
    } catch (e) {
      return `error: ${errText(e)}`;
    }
  };
  return {
    capacitorPresent: Boolean(cap),
    isNativePlatform: safe(() => cap?.isNativePlatform?.() ?? null),
    platform: safe(() => cap?.getPlatform?.() ?? null),
    firebaseMessagingAvailable: safe(() => cap?.isPluginAvailable?.("FirebaseMessaging") ?? null),
  };
}
