export async function readEnquiryFields(request: Request): Promise<Record<string, unknown>> {
  if ((request.headers.get("content-type") ?? "").includes("application/json")) {
    const body = await request.json().catch(() => ({}));
    return body && typeof body === "object" ? body as Record<string, unknown> : {};
  }
  const out: Record<string, unknown> = {};
  (await request.formData()).forEach((value, key) => { if (typeof value === "string") out[key] = value; });
  return out;
}

export const ENQUIRY_QUOTAS = { overall: { limit: 20, seconds: 60 }, email: { limit: 5, seconds: 3600 } };

export async function consumeEnquiryQuota(admin: any, scope: string, actor: string, limit: number, seconds: number) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(actor));
  const hash = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
  const { data, error } = await admin.rpc("consume_request_quota", { _scope: scope, _actor_hash: hash, _limit: limit, _window_seconds: seconds });
  return !error && data === true;
}