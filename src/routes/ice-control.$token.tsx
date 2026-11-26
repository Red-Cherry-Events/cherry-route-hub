// Private trackside ICE controller: no sign-in, every load and write is token-checked on the server.
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { IceKnockoutController, type KnockoutPatch } from "@/components/ice-knockout-controller";
import { IceStreamPush } from "@/components/ice-stream-push";
import { iceStreamPushToken } from "@/lib/ice-stream.functions";
import { iceControlAdd, iceControlLoad, iceControlSet } from "@/lib/ice-control.functions";
import type { KnockoutRider, RaceClass } from "@/lib/ice-knockout";

export const Route = createFileRoute("/ice-control/$token")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "ICE trackside controller · Red Cherry Events" },
      { name: "description", content: "Private trackside controller for Inner City Enduro." },
      { property: "og:title", content: "ICE trackside controller" },
      { property: "og:description", content: "Private trackside controller for Inner City Enduro." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,nofollow,noarchive" },
      { name: "referrer", content: "no-referrer" },
    ],
  }),
  component: IceControl,
});

function IceControl() {
  const { token } = Route.useParams();
  const qc = useQueryClient();
  const load = useServerFn(iceControlLoad);
  const set = useServerFn(iceControlSet);
  const add = useServerFn(iceControlAdd);
  const pushStream = useServerFn(iceStreamPushToken);
  const key = ["ice-control", "riders"];
  const q = useQuery({
    queryKey: key,
    queryFn: () => load({ data: { token } }),
    refetchInterval: (query) => (query.state.data?.valid ? 5000 : false),
    retry: false,
  });

  if (q.isLoading) return <Frame><p className="text-sm text-ink-soft">Loading…</p></Frame>;
  if (q.isError || !q.data?.valid) {
    return <Frame><h1 className="font-display text-xl font-bold text-ink">This link is not valid</h1></Frame>;
  }

  async function onSave(r: KnockoutRider, patch: KnockoutPatch) {
    qc.setQueryData<{ valid: true; riders: KnockoutRider[] }>(key, (old) => old && { ...old, riders: old.riders.map((x) => (x.id === r.id ? { ...x, ...patch } : x)) });
    try {
      const res = await set({ data: { token, id: r.id, ...patch } });
      if (!res.ok) throw new Error();
      return true;
    } catch {
      toast.error("Could not save. Check signal and try again.");
      void qc.invalidateQueries({ queryKey: key });
      return false;
    }
  }

  async function onAdd(input: { race_class: RaceClass; full_name: string; bib_number: string | null }) {
    try {
      const res = await add({ data: { token, ...input } });
      if (!res.ok) throw new Error();
      void qc.invalidateQueries({ queryKey: key });
      return true;
    } catch {
      toast.error("Could not add rider.");
      return false;
    }
  }

  return (
    <Frame>
      <header>
        <h1 className="font-display text-2xl font-bold text-ink">ICE knockout tracker</h1>
        <p className="text-sm text-ink-soft">Inner City Enduro 2026. Tap a rider to mark them out. Changes show on the event page straight away.</p>
      </header>
      <IceStreamPush push={(d) => pushStream({ data: { token, ...d } })} />
      <IceKnockoutController riders={q.data.riders} loading={false} onSave={onSave} onAdd={onAdd} />
    </Frame>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-dvh overflow-y-auto bg-background">
      <div className="mx-auto w-full max-w-xl space-y-4 px-4 pb-10 pt-6">{children}</div>
    </div>
  );
}
