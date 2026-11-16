import { createFileRoute } from "@tanstack/react-router";

// Newsletter sign-ups posted from the browser on allow-listed event websites (GravDuro).
export const Route = createFileRoute("/api/public/website-signup")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => {
        const { websiteSignupCorsHeaders } = await import("@/lib/website-signup");
        return new Response(null, { status: 204, headers: websiteSignupCorsHeaders(request.headers.get("origin")) });
      },
      POST: async ({ request }) => {
        const { websiteHostForOrigin, websiteSignupCorsHeaders } = await import("@/lib/website-signup");
        const origin = request.headers.get("origin");
        const headers = websiteSignupCorsHeaders(origin);
        const host = websiteHostForOrigin(origin);
        if (!host) return Response.json({ ok: false, error: "This website is not allowed to send sign-ups." }, { status: 403, headers });
        try {
          const { processEventInterest } = await import("@/lib/event-interest-handler.server");
          const { status, body } = await processEventInterest(request, { websiteHost: host });
          return Response.json(body.ok ? { ok: true } : body, { status, headers });
        } catch (e) {
          console.error("[website-signup] failed", (e as Error).message);
          return Response.json({ ok: false, error: "Something went wrong, please try again." }, { status: 500, headers });
        }
      },
    },
  },
});
