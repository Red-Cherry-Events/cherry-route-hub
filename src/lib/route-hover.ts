// Tiny cross-component store so the elevation profile can tell the route map
// which point on the route the rider is currently hovering.
import { useSyncExternalStore } from "react";

export type RouteHover = { routeId: string; lat: number; lng: number; km: number; bearing?: number } | null;

let current: RouteHover = null;
const listeners = new Set<() => void>();

export function setRouteHover(next: RouteHover) {
  current = next;
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useRouteHover(): RouteHover {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => null,
  );
}

/** Which timed stage the rider picked from the stage list (map zooms to it). */
export type StageFocus = { routeId: string; stageId: string; n: number } | null;
let focus: StageFocus = null;
const focusListeners = new Set<() => void>();
export function setStageFocus(next: StageFocus) {
  focus = next;
  focusListeners.forEach((l) => l());
}
export function useStageFocus(): StageFocus {
  return useSyncExternalStore(
    (l) => { focusListeners.add(l); return () => focusListeners.delete(l); },
    () => focus,
    () => null,
  );
}
