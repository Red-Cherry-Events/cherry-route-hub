// OBS browser-source overlay for ICE: transparent page showing the last results the crew pushed.
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { iceOverlayLoad } from "@/lib/ice-stream.functions";
import { ordinal } from "@/lib/ice-knockout";

export const Route = createFileRoute("/ice-overlay/$token")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "ICE stream overlay · Red Cherry Events" },
      { name: "description", content: "Private stream graphics for Inner City Enduro." },
      { property: "og:title", content: "ICE stream overlay" },
      { property: "og:description", content: "Private stream graphics for Inner City Enduro." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,nofollow,noarchive" },
      { name: "referrer", content: "no-referrer" },
    ],
  }),
  component: Overlay,
});

function Overlay() {
  const { token } = Route.useParams();
  const load = useServerFn(iceOverlayLoad);
  const q = useQuery({
    queryKey: ["ice-overlay"],
    queryFn: () => load({ data: { token } }),
    refetchInterval: (query) => (query.state.data?.valid === false ? false : 2000),
    retry: false,
  });
  useEffect(() => {
    // OBS needs a see-through page.
    const els = [document.documentElement, document.body];
    els.forEach((e) => e.style.setProperty("background", "transparent", "important"));
    return () => els.forEach((e) => e.style.removeProperty("background"));
  }, []);

  if (q.data?.valid === false) return <p className="m-8 inline-block rounded bg-card p-3 text-ink">This overlay link is not valid.</p>;
  const s = q.data?.state;
  if (!s?.visible || !s.race_class) return null;
  const rows = s.rows.slice(0, 14);
  const title = s.race_class === "pro" ? "Pro" : "Support";

  return (
    <div className="fixed inset-0 flex items-center justify-end p-12">
      <div key={s.pushed_at} className="w-[520px] overflow-hidden rounded-2xl bg-card shadow-2xl ring-1 ring-border animate-in fade-in slide-in-from-right-8 duration-500">
        <div className="bg-cherry px-6 py-4 text-primary-foreground">
          <p className="text-sm font-bold uppercase tracking-[0.2em] opacity-90">Inner City Enduro 2026</p>
          <p className="font-display text-3xl font-bold">{title} results</p>
        </div>
        <ol className="divide-y divide-border">
          {rows.map((r, i) => (
            <li key={i} className={`flex items-center gap-4 px-6 py-2.5 text-xl ${r.status === "out" ? "text-ink-soft" : "text-ink"}`}>
              <span className="w-14 font-display font-bold">{r.place ? ordinal(r.place) : "IN"}</span>
              <span className="flex-1 truncate font-semibold">{r.name}</span>
              {r.bib ? <span className="text-base text-ink-soft">#{r.bib}</span> : null}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
