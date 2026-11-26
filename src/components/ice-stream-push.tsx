// Push the current Pro or Support order to the OBS stream overlay, or hide it.
import { useState } from "react";
import { toast } from "sonner";
import { MonitorUp } from "lucide-react";

type Push = (input: { race_class: "pro" | "support" | null; visible: boolean }) => Promise<{ ok: boolean }>;

export function IceStreamPush({ push }: { push: Push }) {
  const [busy, setBusy] = useState(false);
  async function run(race_class: "pro" | "support" | null, label: string) {
    setBusy(true);
    try {
      const r = await push({ race_class, visible: race_class !== null });
      if (!r.ok) throw new Error();
      toast.success(label);
    } catch { toast.error("Could not reach the stream. Try again."); }
    setBusy(false);
  }
  return (
    <section className="space-y-2 rounded-2xl bg-card p-4 ring-1 ring-border">
      <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-ink-soft"><MonitorUp className="h-3.5 w-3.5" /> Live stream</p>
      <p className="text-xs text-ink-soft">When the race is done and the order is right, push it to the stream graphics.</p>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" disabled={busy} onClick={() => void run("pro", "Pro results sent to the stream")} className="rounded-full bg-cherry py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60">Push Pro</button>
        <button type="button" disabled={busy} onClick={() => void run("support", "Support results sent to the stream")} className="rounded-full bg-cherry py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60">Push Support</button>
      </div>
      <button type="button" disabled={busy} onClick={() => void run(null, "Results hidden from the stream")} className="w-full rounded-full bg-secondary py-2 text-sm font-bold text-ink disabled:opacity-60">Hide from stream</button>
    </section>
  );
}
