// Timed stages on a route: locates each stage's start/end on the track in
// riding order (loops pass some points twice) and measures length and climb.
import { gainFromSeries, haversineMeters, smoothElevations, type LatLngAlt } from "@/lib/geo";
import type { RouteStage } from "@/lib/mock-data";

export type LocatedStage = {
  stage: RouteStage;
  startIdx: number;
  endIdx: number;
  startKm: number;
  endKm: number;
  lengthKm: number;
  climbM: number | null;
  coords: LatLngAlt[];
};

/** Distances within this of the best match count as "the same spot", so the
 *  earliest pass wins over a later, marginally closer one. */
const SAME_SPOT_M = 40;

function nearestAfter(coords: LatLngAlt[], from: number, lat: number, lng: number): number {
  const target: LatLngAlt = [lng, lat];
  const d: number[] = new Array(coords.length);
  let best = Infinity;
  for (let i = from; i < coords.length; i++) {
    d[i] = haversineMeters(coords[i], target);
    if (d[i] < best) best = d[i];
  }
  if (!Number.isFinite(best)) return coords.length - 1;
  let i = from;
  while (i < coords.length && d[i] > best + SAME_SPOT_M) i++;
  // Settle on the local minimum of that first close pass.
  while (i + 1 < coords.length && d[i + 1] <= d[i]) i++;
  return i;
}

export function cumulativeKmOf(coords: LatLngAlt[]): number[] {
  const out = [0];
  for (let i = 1; i < coords.length; i++) out.push(out[i - 1] + haversineMeters(coords[i - 1], coords[i]) / 1000);
  return out;
}

export function climbOf(eles: number[], kms: number[]): number | null {
  if (eles.length < 2) return null;
  return gainFromSeries(smoothElevations(eles, kms.map((k) => k * 1000)));
}

const cache = new WeakMap<LatLngAlt[], Map<string, LocatedStage[]>>();

/** Locate stages along a full-resolution track. Memoised per track + stages. */
export function locateStages(coords: LatLngAlt[], stages: RouteStage[] | undefined): LocatedStage[] {
  if (!stages?.length || coords.length < 2) return [];
  const key = JSON.stringify(stages);
  const hit = cache.get(coords)?.get(key);
  if (hit) return hit;
  const km = cumulativeKmOf(coords);
  const hasAlt = coords.some((c) => typeof c[2] === "number" && Number.isFinite(c[2]) && c[2] !== 0);
  const out: LocatedStage[] = [];
  let cursor = 0;
  for (const stage of [...stages].sort((a, b) => a.number - b.number)) {
    const startIdx = nearestAfter(coords, cursor, stage.startLat, stage.startLng);
    const endIdx = Math.max(startIdx + 1, nearestAfter(coords, startIdx + 1, stage.endLat, stage.endLng));
    const end = Math.min(endIdx, coords.length - 1);
    const slice = coords.slice(startIdx, end + 1);
    out.push({
      stage,
      startIdx,
      endIdx: end,
      startKm: km[startIdx],
      endKm: km[end],
      lengthKm: km[end] - km[startIdx],
      climbM: hasAlt ? climbOf(slice.map((c) => c[2] ?? 0), km.slice(startIdx, end + 1)) : null,
      coords: slice,
    });
    cursor = end;
  }
  let m = cache.get(coords);
  if (!m) cache.set(coords, (m = new Map()));
  m.set(key, out);
  return out;
}

export function stageAtKm<T extends { startKm: number; endKm: number }>(located: T[], km: number): T | null {
  return located.find((s) => km >= s.startKm && km <= s.endKm) ?? null;
}

export function stageSummary(s: { startKm: number; endKm: number; lengthKm: number; climbM: number | null }): string {
  const base = `km ${s.startKm.toFixed(1)} → ${s.endKm.toFixed(1)} · ${s.lengthKm.toFixed(1)} km`;
  return s.climbM === null ? base : `${base} · ${s.climbM} m climbing`;
}
