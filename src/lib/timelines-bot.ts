// Pure rules for the TimelinesAI WhatsApp auto-reply (tested in timelines-bot.test.ts).
export const RCE_WA_ACCOUNT = "27818180179@s.whatsapp.net";
export const DEFAULT_ESCALATION = "+27826913515";
export const HUMAN_QUIET_MS = 12 * 3600_000;
export const ALERT_GAP_MS = 2 * 3600_000;
export const ERROR_ALERT_GAP_MS = 3600_000;
export const DEBOUNCE_MS = 20_000;
export const MAX_REPLY = 600;

export type TlMessage = {
  uid: string;
  chat_id: number | string;
  timestamp: string;
  sender_phone?: string | null;
  sender_name?: string | null;
  from_me: boolean;
  text?: string | null;
  has_attachment?: boolean;
  message_type?: string | null;
};

export type AutoReplySettings = { enabled: boolean; escalation: string };
export function normaliseSettings(v: unknown): AutoReplySettings {
  const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  const esc = typeof o.escalation === "string" && digits(o.escalation).length >= 9 ? o.escalation.trim() : DEFAULT_ESCALATION;
  return { enabled: o.enabled !== false, escalation: esc };
}

export const digits = (s: unknown) => String(s ?? "").replace(/\D/g, "");

export function isBlockedSender(phone: unknown, escalation: string) {
  const d = digits(phone);
  return !d || ["27818180179", "27826913515", digits(escalation)].includes(d);
}

/** "2023-06-18 15:19:23 +0300" → epoch ms. */
export function parseTlTime(s: string | null | undefined): number {
  if (!s) return NaN;
  const m = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})\s*([+-]\d{2}):?(\d{2})?$/.exec(s.trim());
  if (m) return Date.parse(`${m[1]}T${m[2]}${m[3]}:${m[4] ?? "00"}`);
  return Date.parse(s);
}

const hasText = (m: TlMessage) => !!(m.text ?? "").trim();

/** Incoming messages after the last outgoing one, oldest first. */
export function pendingIncoming(history: TlMessage[]): TlMessage[] {
  const sorted = [...history].sort((a, b) => parseTlTime(a.timestamp) - parseTlTime(b.timestamp));
  const out: TlMessage[] = [];
  for (const m of sorted) {
    if (m.from_me) out.length = 0;
    else out.push(m);
  }
  return out;
}

/** True when a team member (an outgoing message the bot did not send) wrote within 12 hours, or a handover is active. */
export function humanHasChat(history: TlMessage[], botUids: Set<string>, now: number, handoffUntil?: string | null) {
  if (handoffUntil && Date.parse(handoffUntil) > now) return true;
  return history.some((m) => m.from_me && !botUids.has(m.uid) && now - parseTlTime(m.timestamp) < HUMAN_QUIET_MS);
}

export function isMediaOnly(pending: TlMessage[]) {
  return pending.length > 0 && !pending.some(hasText);
}

export const firstName = (name: string | null | undefined) => {
  const f = String(name ?? "").trim().split(/\s+/)[0] ?? "";
  return /^[\p{L}'-]{2,}$/u.test(f) ? f : "";
};

export function holdingMessage(name: string | null | undefined) {
  const f = firstName(name);
  return `Thanks${f ? ` ${f}` : ""}! I've passed this on to the team and someone will get back to you shortly.`;
}

export function trimTo(s: string, max: number) {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length <= max ? t : `${t.slice(0, max - 1).trimEnd()}…`;
}

/** Plain WhatsApp text: strip markdown, cap length. */
export function cleanReply(s: string) {
  let t = s
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, "$1: $2")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/—/g, ", ")
    .trim();
  if (t.length > MAX_REPLY + 100) t = `${t.slice(0, MAX_REPLY).replace(/\s+\S*$/, "")}…`;
  return t;
}

export function shaunAlert(o: { name: string; phone: string; question: string; reason: string; draft: string }) {
  return `Rider Hub bot needs a hand 🙋 ${o.name || "Unknown"} (${o.phone}) asked: "${trimTo(o.question, 300)}". Why: ${o.reason}. Bot's best guess: ${o.draft || "none"}.`;
}

export function canAlert(lastAlertAt: string | null | undefined, now: number, gap: number) {
  return !lastAlertAt || now - Date.parse(lastAlertAt) >= gap;
}

/** Pull the message uid out of an untrusted webhook body (only used as a lookup key). */
export function payloadMessageUid(p: any): string | null {
  const c = [p?.message?.message_uid, p?.message?.uid, p?.message_uid, p?.data?.message?.uid, p?.data?.message_uid, p?.data?.uid];
  const v = c.find((x) => typeof x === "string" && /^[\w-]{8,80}$/.test(x));
  return v ?? null;
}
