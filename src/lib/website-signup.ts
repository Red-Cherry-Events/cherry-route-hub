// Browser-called newsletter sign-ups from partner event websites. Each allowed
// origin maps to the website host its events must be linked to.
const SITES: { host: string; origins: string[]; previewPrefix?: string }[] = [
  {
    host: "gravduro.co.za",
    origins: ["https://www.gravduro.co.za", "https://gravduro.co.za", "https://gravduro.vercel.app"],
    previewPrefix: "gravduro-",
  },
];

/** Website host an origin signs people up for, or null when not allowed. */
export function websiteHostForOrigin(origin: string | null): string | null {
  if (!origin) return null;
  for (const site of SITES) if (site.origins.includes(origin)) return site.host;
  let url: URL;
  try { url = new URL(origin); } catch { return null; }
  if (url.protocol !== "https:" || url.port || url.origin !== origin) return null;
  const h = url.hostname.toLowerCase();
  for (const site of SITES) {
    if (site.previewPrefix && h.endsWith(".vercel.app") && h.startsWith(site.previewPrefix) && h.split(".").length === 3) return site.host;
  }
  return null;
}

export function websiteSignupCorsHeaders(origin: string | null): Record<string, string> {
  return {
    ...(websiteHostForOrigin(origin) ? { "Access-Control-Allow-Origin": origin! } : {}),
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}
