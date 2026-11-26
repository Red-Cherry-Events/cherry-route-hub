// Johann's stream switch: same private token as the OBS overlay, lets him pick Pro or Support.
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { iceStreamPushOverlay } from "@/lib/ice-stream.functions";
import { IceStreamPush } from "@/components/ice-stream-push";

export const Route = createFileRoute("/ice-overlay-switch/$token")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "ICE stream switch · Red Cherry Events" },
      { name: "description", content: "Private stream controls for Inner City Enduro." },
      { property: "og:title", content: "ICE stream switch" },
      { property: "og:description", content: "Private stream controls for Inner City Enduro." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,nofollow,noarchive" },
      { name: "referrer", content: "no-referrer" },
    ],
  }),
  component: Switch,
});

function Switch() {
  const { token } = Route.useParams();
  const push = useServerFn(iceStreamPushOverlay);
  return (
    <main className="mx-auto max-w-md space-y-3 p-4">
      <h1 className="font-display text-2xl font-bold text-ink">ICE stream switch</h1>
      <p className="text-sm text-ink-soft">Pick what shows on the stream. The card updates in OBS within about 2 seconds.</p>
      <IceStreamPush push={(i) => push({ data: { ...i, token } })} />
    </main>
  );
}
