// Lets server routes keep work running after the response (Cloudflare ctx.waitUntil).
import { AsyncLocalStorage } from "node:async_hooks";

type Ctx = { waitUntil?: (p: Promise<unknown>) => void };
export const requestCtx = new AsyncLocalStorage<Ctx | undefined>();

/** Runs `task` in the background when the runtime allows it; otherwise awaits it inline. */
export async function runAfterResponse(task: () => Promise<unknown>): Promise<"background" | "inline"> {
  const ctx = requestCtx.getStore();
  const p = task().catch((e) => console.error("[background] task failed", e));
  if (ctx && typeof ctx.waitUntil === "function") {
    ctx.waitUntil(p);
    return "background";
  }
  await p;
  return "inline";
}
