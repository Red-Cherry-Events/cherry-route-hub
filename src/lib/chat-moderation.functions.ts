import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const reportSchema = z.object({
  messageId: z.string().uuid(),
  reason: z.string().trim().max(500).optional(),
});

/** Saves a chat report as the signed-in rider (RLS applies), then alerts admins and crew. */
export const reportChatMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => reportSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: msg, error: msgErr } = await supabase
      .from("event_chat_messages")
      .select("id, event_id, author_id")
      .eq("id", data.messageId)
      .maybeSingle();
    if (msgErr || !msg) throw new Error("Message not found");
    if (msg.author_id === userId) throw new Error("You can't report your own message");

    const { error } = await supabase.from("chat_reports").insert({
      message_id: msg.id,
      event_id: msg.event_id,
      reporter_id: userId,
      reason: data.reason || null,
    });
    if (error && error.code !== "23505") {
      console.error("[chat-report] insert failed", error.message);
      throw new Error("Could not save the report");
    }
    if (error?.code === "23505") return { ok: true, duplicate: true };

    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: staff } = await supabaseAdmin.from("user_roles").select("user_id").in("role", ["admin", "crew"]);
      const ids = Array.from(new Set((staff ?? []).map((r) => r.user_id)));
      if (ids.length) {
        const { dispatchNotification } = await import("@/lib/notifications.server");
        await dispatchNotification({
          title: "Chat message reported",
          body: data.reason ? `Reason: ${data.reason.slice(0, 120)}` : "A rider reported a chat message. Please review it.",
          url: "/admin/chat-reports",
          audience: "all",
          kind: "general",
          onlyUserIds: ids,
          source: "chat-report",
          dedupeKey: `chat-report:${msg.id}:${userId}`,
        });
      }
    } catch (e) {
      console.error("[chat-report] notify failed", e instanceof Error ? e.message : e);
    }
    return { ok: true, duplicate: false };
  });
