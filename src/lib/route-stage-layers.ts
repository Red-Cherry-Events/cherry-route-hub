// Draws timed stages on a Leaflet map: thick outlined stretch, numbered start
// badge and chequered finish flag, each with a popup. Browser-only.
import L from "leaflet";
import type { LatLngAlt } from "@/lib/geo";
import type { RouteStage } from "@/lib/mock-data";
import { locateStages, stageSummary, type LocatedStage } from "@/lib/route-stages";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export function stageBadgeHtml(n: number, color: string, size = 26) {
  return `<div style="width:${size}px;height:${size}px;border-radius:9999px;background:${color};color:#111;border:2px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.55),0 2px 4px rgba(0,0,0,.35);display:grid;place-items:center;font:800 ${Math.round(size * 0.5)}px/1 system-ui,sans-serif;">${n}</div>`;
}

const FINISH_HTML = `<div style="width:18px;height:18px;border:2px solid #fff;border-radius:4px;box-shadow:0 0 0 1px rgba(0,0,0,.6),0 1px 3px rgba(0,0,0,.4);background-color:#fff;background-image:linear-gradient(45deg,#111 25%,transparent 25%,transparent 75%,#111 75%),linear-gradient(45deg,#111 25%,transparent 25%,transparent 75%,#111 75%);background-size:8px 8px;background-position:0 0,4px 4px;"></div>`;

export function addStageLayers(
  map: L.Map,
  lines: LatLngAlt[][],
  stages: RouteStage[] | undefined,
  routeColor: string,
  weight = 5,
): { remove: () => void; located: LocatedStage[] } {
  if (!stages?.length) return { remove: () => {}, located: [] };
  const located = locateStages(lines.flat(), stages);
  const layers: L.Layer[] = [];
  for (const s of located) {
    const color = s.stage.color || routeColor;
    const ll = s.coords.map(([lng, lat]) => [lat, lng] as [number, number]);
    layers.push(L.polyline(ll, { color: "#111", weight: weight * 2 + 3, opacity: 0.85, interactive: false }));
    layers.push(L.polyline(ll, { color, weight: weight * 2, opacity: 1, interactive: false }));
    const title = `Stage ${s.stage.number}`;
    const sub = `${esc(stageSummary(s))}`;
    const name = esc(s.stage.name) + (s.stage.sponsor ? ` · powered by ${esc(s.stage.sponsor)}` : "");
    const start = ll[0];
    const end = ll[ll.length - 1];
    layers.push(
      L.marker(start, {
        zIndexOffset: 600,
        icon: L.divIcon({ className: "rce-stage-start", html: stageBadgeHtml(s.stage.number, color), iconSize: [26, 26], iconAnchor: [13, 13], popupAnchor: [0, -13] }),
      }).bindPopup(`<p style="font-weight:700;margin:0">${title} start · ${name}</p><p style="margin:2px 0 0;font-size:12px">${sub}</p>`),
    );
    layers.push(
      L.marker(end, {
        zIndexOffset: 590,
        icon: L.divIcon({ className: "rce-stage-end", html: FINISH_HTML, iconSize: [18, 18], iconAnchor: [9, 9], popupAnchor: [0, -9] }),
      }).bindPopup(`<p style="font-weight:700;margin:0">${title} finish</p><p style="margin:2px 0 0;font-size:12px">${sub}</p>`),
    );
  }
  layers.forEach((l) => l.addTo(map));
  return { remove: () => layers.forEach((l) => l.remove()), located };
}
