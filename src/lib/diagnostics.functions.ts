// App diagnostics (store app debugging). Rows are written as the signed-in
// user through RLS; only admins can read them. Never throws.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const logDiagnosticFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ event: z.string().min(1).max(120), detail: z.record(z.string(), z.unknown()).optional() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    try {
      let detail = data.detail ?? {};
      if (JSON.stringify(detail).length > 8000) detail = { truncated: true };
      const { error } = await (context.supabase as any)
        .from("app_diagnostics")
        .insert({ user_id: context.userId, event: data.event, detail });
      if (error) console.error("[diagnostics] insert failed:", error.message);
      return { ok: !error };
    } catch (e) {
      console.error("[diagnostics] failed:", e instanceof Error ? e.message : e);
      return { ok: false };
    }
  });
