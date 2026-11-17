import { ogImageMeta, eventOgImageUrl, OG_SITE } from "@/lib/og";
import { BackLink } from "@/components/back-link";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { RouteMap } from "@/components/route-map";
import { VillageMapView } from "@/components/village-map-view";

// Some events (Inner City Enduro) have no GPX routes — their course is drawn
// on the race village map. The route map page falls back to that map so links
// to /events/:id/map never land on a blank "no routes" state.
function eventHasRoutes(days: unknown): boolean {
  if (!Array.isArray(days)) return false;
  for (const day of days) {
    for (const r of (day as any)?.routes ?? []) {
      if ((r?.kmlUrls ?? []).length > 0) return true;
      if ((r?.customMarkers ?? []).some((m: any) => m?.icon !== "warning" && m?.icon !== "aid")) return true;
    }
  }
  return false;
}

export const Route = createFileRoute("/events/$eventId/map")({
  loader: async ({ params }) => {
    const { data, error } = await supabase
      .from("events")
      .select("id, name, days")
      .eq("id", params.eventId)
      .maybeSingle();
    if (error || !data) throw notFound();
    let hasVillageMap = false;
    if (!eventHasRoutes(data.days)) {
      const { count } = await supabase
        .from("event_village_maps")
        .select("id", { count: "exact", head: true })
        .eq("event_id", params.eventId);
      hasVillageMap = (count ?? 0) > 0;
    }
    return { event: data, hasVillageMap };
  },
  head: ({ params }) => ({ meta: [
      ...ogImageMeta(eventOgImageUrl(params.eventId, "Route map"), "Event route map"),
    { title: 'Event route map · Red Cherry Rider Hub' },
    { name: 'description', content: 'Explore event routes, waterpoints and fullscreen GPS route navigation.' },
    { property: 'og:title', content: 'Event route map · Red Cherry Rider Hub' },
    { property: 'og:description', content: 'Explore event routes, waterpoints and fullscreen GPS route navigation.' },
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: `${OG_SITE}/events/${params.eventId}/map` },
  ],
  links: [{ rel: "canonical", href: `${OG_SITE}/events/${params.eventId}/map` }] }),
  component: FullscreenMap,
  notFoundComponent: () => (
    <div className="p-8 text-center text-sm text-ink-soft">
      Event not found.{" "}
      <Link to="/events" className="font-semibold text-cherry">
        Back
      </Link>
    </div>
  ),
});

function FullscreenMap() {
  const { event, hasVillageMap } = Route.useLoaderData();
  const villageFallback = !eventHasRoutes(event.days) && hasVillageMap;
  return (
    <div className="flex h-[100dvh] flex-col bg-background">
      <header className="flex items-center gap-3 border-b border-border bg-card px-4 py-3">
        <BackLink
          to="/events/$eventId"
          params={{ eventId: event.id }}
          className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-ink"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </BackLink>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-ink-soft">
            {villageFallback ? "Route & village map" : "Route map"}
          </p>
          <h1 className="truncate font-display text-base font-bold text-ink">{event.name}</h1>
        </div>
      </header>
      <div className="relative flex-1 overflow-hidden">
        {villageFallback ? (
          <VillageMapView eventId={event.id} riderOnly startFullscreen />
        ) : (
          <RouteMap event={event as never} height="100%" />
        )}
      </div>
    </div>
  );
}
