// Store app only: once the rider is signed in, re-save their push token on
// every launch (tokens rotate) and ask once whether they want race alerts.
// Renders nothing on the website.
import { useEffect, useState } from "react";
import { useSession } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const ASKED_KEY = "rce-native-push-asked";

export function NativePushPrompt() {
  const { user } = useSession();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [detail, setDetail] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    if (!(window as any).Capacitor?.isNativePlatform?.()) return;
    let cancelled = false;
    void (async () => {
      const native = await import("@/lib/native");
      const state = await native.nativePushState().catch((e) => {
        void import("@/lib/diagnostics").then((d) => d.logDiagnostic("native_push.prompt_state_failed", d.errInfo(e)));
        return "default" as const;
      });
      if (cancelled) return;
      if (state === "granted") {
        await native.resyncNativePushToken().catch((e) => console.error("[native-push] launch resync failed:", e));
        return;
      }
      if (state === "denied") return;
      let asked = false;
      try {
        asked = localStorage.getItem(ASKED_KEY) === "1";
      } catch {
        /* ignore */
      }
      if (!asked) setOpen(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  function markAsked() {
    try {
      localStorage.setItem(ASKED_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  async function yes() {
    setBusy(true);
    markAsked();
    setDetail(null);
    let res: { ok: boolean; reason?: string; error?: string };
    try {
      const { enableNativePush } = await import("@/lib/native");
      res = await enableNativePush("native-push-prompt");
    } catch (e) {
      const { errInfo, logDiagnostic } = await import("@/lib/diagnostics");
      const info = errInfo(e);
      void logDiagnostic("native_push.prompt_failed", info);
      res = { ok: false, reason: "Couldn't turn on alerts. You can try again from your profile.", error: info.message };
    }
    setBusy(false);
    if (res.ok) setOpen(false);
    else {
      setNote(res.reason ?? "Couldn't turn on alerts.");
      setDetail(res.error ?? null);
    }
  }

  function later() {
    markAsked();
    setOpen(false);
  }

  if (!open) return null;
  return (
    <Dialog open={open} onOpenChange={(o) => (o ? null : later())}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Get start times and race alerts?</DialogTitle>
          <DialogDescription>
            We'll let you know about your start batch, route changes and anything urgent on race day. No spam.
          </DialogDescription>
        </DialogHeader>
        {note ? <p className="text-sm text-ink-soft">{note}</p> : null}
        {detail ? <p className="break-words text-[11px] leading-snug text-muted-foreground">{detail}</p> : null}
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={later} disabled={busy}>Not now</Button>
          <Button onClick={() => void yes()} disabled={busy}>Yes, send alerts</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
