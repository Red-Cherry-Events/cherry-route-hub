import { createFileRoute } from "@tanstack/react-router";

// TimelinesAI "message:received:new" webhook. No shared secret exists, so the
// body is only used to find the message uid; everything is re-fetched from the
// TimelinesAI API before the bot acts. Replies within 5 seconds, works after.
export const Route = createFileRoute("/api/public/hooks/timelines-whatsapp")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let payload: unknown = null;
        try { payload = await request.json(); } catch { return Response.json({ ok: true }); }
        const { payloadMessageUid } = await import("@/lib/timelines-bot");
        const uid = payloadMessageUid(payload);
        if (!uid) return Response.json({ ok: true });
        const { runAfterResponse } = await import("@/lib/wait-until.server");
        const { handleTimelinesMessage } = await import("@/lib/timelines-bot.server");
        await runAfterResponse(() => handleTimelinesMessage(uid));
        return Response.json({ ok: true });
      },
    },
  },
});
