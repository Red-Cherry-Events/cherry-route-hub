// Admin-only card: see, revoke or replace the private ICE trackside control link.
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { iceControlCreate, iceControlRevoke, iceControlStatus } from "@/lib/ice-control.functions";

const fmt = (iso: string) => new Date(iso).toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg", dateStyle: "medium", timeStyle: "short" });

export function IceControlLinkAdmin() {
  const qc = useQueryClient();
  const status = useServerFn(iceControlStatus);
  const create = useServerFn(iceControlCreate);
  const revoke = useServerFn(iceControlRevoke);
  const [fresh, setFresh] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const q = useQuery({ queryKey: ["ice-control-status"], queryFn: () => status() });

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    try { await fn(); } catch { toast.error("That did not work. Try again."); }
    setBusy(false);
    void qc.invalidateQueries({ queryKey: ["ice-control-status"] });
  }

  return (
    <section className="space-y-2 rounded-2xl bg-card p-4 ring-1 ring-border">
      <p className="text-[11px] font-bold uppercase tracking-widest text-ink-soft">Admin · Trackside control link</p>
      <p className="text-sm text-ink">
        {q.data?.active && q.data.expiresAt ? `Active. Works without sign-in until ${fmt(q.data.expiresAt)}.` : "No active link."}
      </p>
      {fresh ? (
        <div className="space-y-1 rounded-xl bg-secondary p-3">
          <p className="text-xs font-bold text-ink">Copy this now. It will not be shown again.</p>
          <p className="break-all text-xs text-ink">{fresh}</p>
          <button type="button" onClick={() => void navigator.clipboard.writeText(fresh).then(() => toast.success("Copied"))} className="rounded-full bg-cherry px-3 py-1.5 text-xs font-bold text-primary-foreground">Copy link</button>
        </div>
      ) : null}
      <div className="flex gap-2">
        <button type="button" disabled={busy} onClick={() => void run(async () => { const r = await create(); setFresh(`${window.location.origin}${r.path}`); })} className="flex-1 rounded-full bg-cherry py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60">Create new link</button>
        <button type="button" disabled={busy || !q.data?.active} onClick={() => void run(async () => { await revoke(); setFresh(null); })} className="flex-1 rounded-full bg-secondary py-2.5 text-sm font-bold text-ink disabled:opacity-60">Revoke link</button>
      </div>
      <p className="text-[11px] text-ink-soft">Creating a new link switches the old one off.</p>
    </section>
  );
}
