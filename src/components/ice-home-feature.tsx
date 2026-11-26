// Home-screen feature for Inner City Enduro: the event happening this weekend,
// shown above a rider's own entered events so nobody misses race week.
import { Link } from "@tanstack/react-router";
import { CalendarDays, ChevronRight, MapPin, Radio } from "lucide-react";
import { isRaceWeek } from "@/components/race-week-banner";
import { isIceEvent } from "@/lib/event-sponsor-overrides";
import { brandHeader } from "@/lib/event-brand";
import { formatDate, type Event } from "@/lib/mock-data";

/**
 * The ICE event while it is inside its race week (seven days out through the
 * last riding day), or null outside that window. Archived and draft events are
 * never picked.
 */
export function iceHomeFeature(events: Event[], now: number = Date.now()): Event | null {
  return (
    events
      .filter((e) => (e.lifecycle ?? "published") === "published")
      .filter((e) => isIceEvent(e.name))
      .filter((e) => isRaceWeek(e.date, e.days, now))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0] ?? null
  );
}

/** "Sat 28 Nov to Sun 29 Nov" for a multi-day event, one date otherwise. */
function dayRange(event: Event): string {
  const count = Array.isArray(event.days) && event.days.length > 0 ? event.days.length : 1;
  if (count <= 1) return formatDate(event.date);
  const end = new Date(new Date(event.date).getTime() + (count - 1) * 86_400_000);
  return `${formatDate(event.date)} to ${formatDate(end.toISOString())}`;
}

export function IceHomeFeature({ event }: { event: Event }) {
  const brand = brandHeader(event.heroColor);
  return (
    <section data-section="ice_home_feature" className="px-5 pt-4">
      <Link
        to="/my-events/$eventId"
        params={{ eventId: event.id }}
        data-track-action="ice_home_feature"
        className="block overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-border transition active:scale-[0.99]"
      >
        <div className="relative">
          {event.coverUrl ? (
            <img
              src={event.coverUrl}
              alt={`${event.name} race weekend`}
              className="h-36 w-full object-cover sm:h-44"
            />
          ) : (
            <div
              className={`h-36 w-full sm:h-44 ${brand.className}`}
              style={brand.style}
              aria-hidden
            />
          )}
          <span className="absolute left-3 top-3 rounded-full bg-cherry px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-primary-foreground shadow">
            This weekend
          </span>
        </div>
        <div className="bg-ink px-4 py-3 text-primary-foreground">
          <p className="font-display text-base font-bold leading-tight">{event.name}</p>
          <p className="mt-1 flex min-w-0 items-center gap-1.5 text-[11px] opacity-85">
            <CalendarDays className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{dayRange(event)}</span>
          </p>
          <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px] opacity-85">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{event.location}</span>
          </p>
          <p className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-cherry">
            <Radio className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Live stream, results and village map</span>
            <ChevronRight className="ml-auto h-4 w-4 shrink-0 opacity-70" />
          </p>
        </div>
      </Link>
    </section>
  );
}
