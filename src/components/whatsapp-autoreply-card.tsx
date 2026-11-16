import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { normaliseSettings, type AutoReplySettings } from "@/lib/timelines-bot";

const KEY = "whatsapp_autoreply";

/** Admin switch + escalation number for the TimelinesAI WhatsApp auto-reply. */
export function WhatsappAutoReplyCard() {
  const [value, setValue] = useState<AutoReplySettings>(normaliseSettings(null));
  const [initial, setInitial] = useState<AutoReplySettings>(normaliseSettings(null));
  const [status, setStatus] = useState<"" | "saving" | "saved" | "error">("");

  useEffect(() => {
    supabase.from("site_settings").select("value").eq("key", KEY).maybeSingle().then(({ data }) => {
      const s = normaliseSettings(data?.value);
      setValue(s);
      setInitial(s);
    });
  }, []);

  const dirty = JSON.stringify(value) !== JSON.stringify(initial);
  const valid = value.escalation.replace(/\D/g, "").length >= 9;

  const save = async () => {
    setStatus("saving");
    const { error } = await supabase.from("site_settings").upsert({ key: KEY, value: value as never });
    if (error) return setStatus("error");
    setInitial(value);
    setStatus("saved");
    setTimeout(() => setStatus(""), 1600);
  };

  return (
    <section className="rounded-2xl bg-card p-5 ring-1 ring-border">
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-cherry/10 text-cherry">
          <MessageCircle className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display font-bold text-ink">WhatsApp auto-reply (TimelinesAI)</h2>
          <p className="text-xs text-ink-soft">The assistant answers the Red Cherry WhatsApp number and hands tricky chats to the team.</p>
        </div>
        <label className="inline-flex shrink-0 cursor-pointer items-center gap-2 text-xs font-bold text-ink">
          <input
            type="checkbox"
            className="h-5 w-5 accent-[var(--color-cherry)]"
            checked={value.enabled}
            onChange={(e) => setValue({ ...value, enabled: e.target.checked })}
            aria-label="WhatsApp auto-reply on"
          />
          {value.enabled ? "On" : "Off"}
        </label>
      </div>
      <label className="mt-4 block">
        <span className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-ink-soft">Escalation number</span>
        <input
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-ink focus:border-cherry focus:outline-none focus:ring-2 focus:ring-cherry/20"
          value={value.escalation}
          inputMode="tel"
          onChange={(e) => setValue({ ...value, escalation: e.target.value })}
        />
      </label>
      <p className="mt-2 text-xs leading-relaxed text-ink-soft">
        Gets a WhatsApp when the bot isn't sure, a rider sends a voice note or photo, or something goes wrong. When off, the bot stays silent.
      </p>
      {status === "error" ? <p role="alert" className="mt-2 text-xs font-semibold text-cherry">Could not save. Please try again.</p> : null}
      <div className="mt-3 flex justify-end">
        <button
          onClick={save}
          disabled={!dirty || !valid || status === "saving"}
          className="rounded-lg bg-ink px-4 py-2 text-xs font-bold text-background disabled:opacity-40"
        >
          {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : "Save"}
        </button>
      </div>
    </section>
  );
}
