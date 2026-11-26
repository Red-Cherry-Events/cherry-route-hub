// OBS browser-source overlay for ICE: transparent page showing the last results the crew pushed.
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { iceOverlayLoad } from "@/lib/ice-stream.functions";
import { ordinal } from "@/lib/ice-knockout";
import { iceSponsorsFor } from "@/lib/event-sponsor-overrides";

const SPONSORS = iceSponsorsFor("Inner City Enduro 2026") ?? [];
const ICE_LOGO = "https://d1zwi51l39apzt.cloudfront.net/uploads/events/78730/nm0nYKwVOBHQVn4bzOwuaaB8DVMRpiiBwXjKNnQZ.png";

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
  const rows = s.rows.slice(0, 24);
  const title = s.race_class === "pro" ? "Pro" : "Support";
  const half = Math.ceil(rows.length / 2);
  const cols = rows.length > 8 ? [rows.slice(0, half), rows.slice(half)] : [rows];

  return (
    <div className="ice-overlay fixed inset-0 flex items-center justify-center px-16">
      <div key={s.pushed_at} className="ice-ov-card w-full overflow-hidden animate-in fade-in zoom-in-95 duration-500">
        <div className="ice-ov-head flex items-end justify-between gap-6 px-10 pb-5 pt-6">
          <div>
            <p className="ice-ov-kicker">Inner City Enduro 2026</p>
            <h1 className="ice-ov-title">{title} results</h1>
          </div>
          {ICE_LOGO ? <img src={ICE_LOGO} alt="Inner City Enduro" className="h-20 w-auto" /> : null}
        </div>
        <div className={`grid gap-x-10 px-10 py-5 ${cols.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
          {cols.map((col, c) => (
            <ol key={c}>
              {col.map((r, i) => (
                <li key={i} className={`ice-ov-row flex items-center gap-5 py-2 text-2xl ${r.status === "out" ? "is-out" : ""}`}>
                  <span className="ice-ov-place w-20">{r.place ? ordinal(r.place) : "IN"}</span>
                  <span className="flex-1 truncate font-semibold uppercase">{r.name}</span>
                  {r.bib ? <span className="ice-ov-bib text-lg">#{r.bib}</span> : null}
                </li>
              ))}
            </ol>
          ))}
        </div>
        <div className="ice-ov-sponsors flex flex-wrap items-center justify-center gap-x-8 gap-y-3 px-8 py-4">
          {SPONSORS.map((sp) => <img key={sp.name} src={sp.logoUrl} alt={sp.name} className="h-10 w-auto max-w-[140px] object-contain" />)}
        </div>
      </div>
    </div>
  );
}
