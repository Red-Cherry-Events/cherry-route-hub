// Phone-friendly ICE knockout controller shared by the crew page and the private trackside link.
import { useState } from "react";
import { Plus, Undo2 } from "lucide-react";
import { ICE_ROUNDS, ICE_ROUND_NOTE, type KnockoutRider, type RaceClass } from "@/lib/ice-knockout";

export type KnockoutPatch = Pick<KnockoutRider, "status" | "out_round" | "out_at">;

export function IceKnockoutController({
  riders: all, loading, onSave, onAdd,
}: {
  riders: KnockoutRider[];
  loading: boolean;
  onSave: (r: KnockoutRider, patch: KnockoutPatch) => Promise<boolean>;
  onAdd: (input: { race_class: RaceClass; full_name: string; bib_number: string | null }) => Promise<boolean>;
}) {
  const [cls, setCls] = useState<RaceClass>("support");
  const [round, setRound] = useState<Record<RaceClass, string>>({ support: ICE_ROUNDS.support[0]!, pro: ICE_ROUNDS.pro[0]! });
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [bib, setBib] = useState("");
  const [last, setLast] = useState<{ id: string; prev: KnockoutPatch; label: string } | null>(null);

  const riders = all.filter((r) => r.race_class === cls);
  const inCount = riders.filter((r) => r.status === "in").length;

  async function toggle(r: KnockoutRider) {
    const prev = { status: r.status, out_round: r.out_round, out_at: r.out_at };
    const next: KnockoutPatch = r.status === "in"
      ? { status: "out", out_round: round[cls] ?? null, out_at: new Date().toISOString() }
      : { status: "in", out_round: null, out_at: null };
    if (await onSave(r, next)) setLast({ id: r.id, prev, label: `${r.full_name} marked ${next.status.toUpperCase()}` });
  }

  async function undo() {
    if (!last) return;
    const r = all.find((x) => x.id === last.id);
    if (r && (await onSave(r, last.prev))) setLast(null);
  }

  async function addRider(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    if (await onAdd({ race_class: cls, full_name: name.trim(), bib_number: bib.trim() || null })) {
      setName(""); setBib(""); setAdding(false);
    }
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-1 rounded-full bg-secondary p-1">
        {(["support", "pro"] as const).map((c) => (
          <button key={c} type="button" onClick={() => setCls(c)} className={`rounded-full py-2.5 text-sm font-bold ${cls === c ? "bg-cherry text-primary-foreground" : "text-ink-soft"}`}>
            {c === "pro" ? "Pro class" : "Support class"}
          </button>
        ))}
      </div>

      <label className="block">
        <span className="text-[11px] font-bold uppercase tracking-widest text-ink-soft">Round riders go out in</span>
        <select value={round[cls]} onChange={(e) => setRound((r) => ({ ...r, [cls]: e.target.value }))} className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-3 text-base font-semibold text-ink">
          {ICE_ROUNDS[cls].map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <span className="mt-1 block text-[11px] text-ink-soft">{ICE_ROUND_NOTE[cls]}</span>
      </label>

      <div className="flex items-center justify-between rounded-2xl bg-card px-4 py-3 ring-1 ring-border">
        <p className="text-sm font-bold text-ink">{inCount} still in · {riders.length - inCount} out</p>
        {last ? (
          <button type="button" onClick={undo} className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-xs font-bold text-ink">
            <Undo2 className="h-3.5 w-3.5" /> Undo
          </button>
        ) : null}
      </div>
      {last ? <p className="-mt-2 text-[11px] text-ink-soft">{last.label}</p> : null}

      {loading ? <p className="text-sm text-ink-soft">Loading riders…</p> : null}
      <ul className="space-y-2">
        {riders.map((r) => (
          <li key={r.id}>
            <button type="button" onClick={() => void toggle(r)} className={`flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-4 text-left ring-1 ring-border ${r.status === "in" ? "bg-card" : "bg-secondary/60 opacity-70"}`}>
              <span>
                <span className="block text-base font-bold text-ink">{r.bib_number ? `#${r.bib_number} ` : ""}{r.full_name}</span>
                {r.status === "out" && r.out_round ? <span className="text-xs text-ink-soft">Out in {r.out_round}</span> : null}
              </span>
              <span className={`shrink-0 rounded-full px-4 py-2 text-sm font-black ${r.status === "in" ? "bg-success text-primary-foreground" : "bg-destructive text-destructive-foreground"}`}>
                {r.status === "in" ? "IN" : "OUT"}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {adding ? (
        <form onSubmit={addRider} className="space-y-2 rounded-2xl bg-card p-4 ring-1 ring-border">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Rider name" className="w-full rounded-xl border border-border bg-background px-3 py-3 text-base" autoFocus />
          <input value={bib} onChange={(e) => setBib(e.target.value)} placeholder="Bib number (optional)" inputMode="numeric" className="w-full rounded-xl border border-border bg-background px-3 py-3 text-base" />
          <div className="flex gap-2">
            <button type="submit" className="flex-1 rounded-full bg-cherry py-3 text-sm font-bold text-primary-foreground">Add to {cls === "pro" ? "Pro" : "Support"}</button>
            <button type="button" onClick={() => setAdding(false)} className="rounded-full bg-secondary px-4 text-sm font-bold text-ink">Cancel</button>
          </div>
        </form>
      ) : (
        <button type="button" onClick={() => setAdding(true)} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-4 text-sm font-bold text-ink">
          <Plus className="h-4 w-4" /> Add rider
        </button>
      )}
    </>
  );
}
