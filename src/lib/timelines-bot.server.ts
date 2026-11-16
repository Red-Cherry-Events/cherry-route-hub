// TimelinesAI WhatsApp auto-reply. The webhook body is only a lookup hint:
// every fact is re-fetched from the TimelinesAI API before anything is sent.
import { CONFIDENTIALITY_RULES } from "@/lib/knowledge-redact";
import {
  ALERT_GAP_MS, DEBOUNCE_MS, ERROR_ALERT_GAP_MS, HUMAN_QUIET_MS, RCE_WA_ACCOUNT,
  canAlert, cleanReply, firstName, holdingMessage, humanHasChat, isBlockedSender, isMediaOnly,
  normaliseSettings, pendingIncoming, shaunAlert, trimTo, type AutoReplySettings, type TlMessage,
} from "@/lib/timelines-bot";

const API = "https://app.timelines.ai/integrations/api";
const ERROR_ROW = 0; // whatsapp_bot_chats row used for the hourly error-alert limit

async function tl(path: string, init: { method?: string; body?: unknown } = {}) {
  const token = process.env["TIMELINES_API_TOKEN"];
  if (!token) throw new Error("TIMELINES_API_TOKEN is not set");
  const res = await fetch(`${API}${path}`, {
    method: init.method ?? "GET",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json", ...(init.body ? { "Content-Type": "application/json" } : {}) },
    body: init.body ? JSON.stringify(init.body) : undefined,
    signal: AbortSignal.timeout(20_000),
  });
  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch { /* not json */ }
  if (!res.ok || json?.status === "error") {
    throw Object.assign(new Error(`TimelinesAI ${init.method ?? "GET"} ${path.split("?")[0]} failed (${res.status}): ${String(json?.message ?? text).slice(0, 200)}`), { status: res.status });
  }
  return json?.data ?? json;
}

async function loadSettings(admin: any): Promise<AutoReplySettings> {
  const { data } = await admin.from("site_settings").select("value").eq("key", "whatsapp_autoreply").maybeSingle();
  return normaliseSettings(data?.value);
}

/** Webhook entry: verify, record, then wait and answer. Never throws. */
export async function handleTimelinesMessage(messageUid: string) {
  const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
  const settings = await loadSettings(admin);
  if (!settings.enabled) return;

  let msg: TlMessage, chat: any;
  try {
    msg = await tl(`/messages/${encodeURIComponent(messageUid)}`);
    if (!msg?.uid || msg.uid !== messageUid || msg.from_me !== false) return;
    chat = await tl(`/chats/${encodeURIComponent(String(msg.chat_id))}`);
  } catch (e) {
    const status = (e as { status?: number }).status;
    if (status === 404 || status === 400) return; // fake or unknown uid: ignore quietly
    await alertError(admin, settings, e);
    return;
  }
  if (chat?.whatsapp_account_id !== RCE_WA_ACCOUNT || chat?.is_group) return;
  if (isBlockedSender(msg.sender_phone, settings.escalation)) return;

  const chatId = Number(msg.chat_id);
  const { error: dupe } = await admin.from("whatsapp_bot_messages").insert({ uid: msg.uid, chat_id: chatId, direction: "in" });
  if (dupe) return; // already processed (TimelinesAI retry)
  await admin.from("whatsapp_bot_chats").upsert({ chat_id: chatId, latest_in_uid: msg.uid, updated_at: new Date().toISOString() });

  await new Promise((r) => setTimeout(r, DEBOUNCE_MS));

  // Only the latest message in a burst answers, and only once.
  const { data: claimed } = await admin
    .from("whatsapp_bot_chats")
    .update({ answered_uid: msg.uid, updated_at: new Date().toISOString() })
    .eq("chat_id", chatId)
    .eq("latest_in_uid", msg.uid)
    .or(`answered_uid.is.null,answered_uid.neq.${msg.uid}`)
    .select("handoff_until, last_alert_at")
    .maybeSingle();
  if (!claimed) return;

  try {
    await answerChat(admin, settings, chat, chatId, msg, claimed);
  } catch (e) {
    console.error("[timelines-bot] answer failed", (e as Error).message);
    await alertError(admin, settings, e);
  }
}

async function answerChat(admin: any, settings: AutoReplySettings, chat: any, chatId: number, latest: TlMessage, state: { handoff_until: string | null; last_alert_at: string | null }) {
  const page = await tl(`/chats/${chatId}/messages?sorting_order=desc`);
  const history: TlMessage[] = (page?.messages ?? []).slice(0, 15);
  if (!history.some((m) => m.uid === latest.uid)) history.unshift(latest);

  const { data: botRows } = await admin.from("whatsapp_bot_messages").select("uid").eq("chat_id", chatId).eq("direction", "bot");
  const botUids = new Set<string>((botRows ?? []).map((r: any) => r.uid));
  const now = Date.now();
  const pending = pendingIncoming(history);
  if (!pending.length) return;

  const name = String(chat?.name || latest.sender_name || "").trim();
  const phone = String(chat?.phone || latest.sender_phone || "");
  const question = pending.map((m) => (m.text ?? "").trim() || `[${m.message_type || "attachment"}]`).join("\n");

  if (humanHasChat(history, botUids, now, state.handoff_until)) {
    await logExchange(admin, phone, name, question, null, null);
    return;
  }

  let decision: { reply: string; confident: boolean; needs_human_reason: string | null };
  let eventId: string | null = null;
  if (isMediaOnly(pending)) {
    decision = { reply: "", confident: false, needs_human_reason: "voice note / media" };
  } else {
    const r = await askModel(admin, question, history, name);
    decision = r.decision;
    eventId = r.eventId;
  }

  if (decision.confident && decision.reply) {
    const text = cleanReply(decision.reply);
    await sendToChat(admin, chatId, text);
    await logExchange(admin, phone, name, question, text, eventId);
    return;
  }

  // Hand to a human.
  const holding = holdingMessage(name);
  await sendToChat(admin, chatId, holding);
  await tl(`/chats/${chatId}/labels`, { method: "PUT", body: { labels: ["Needs human"] } }).catch((e) => console.error("[timelines-bot] label failed", (e as Error).message));
  const alertOk = canAlert(state.last_alert_at, now, ALERT_GAP_MS);
  await admin.from("whatsapp_bot_chats").update({
    handoff_until: new Date(now + HUMAN_QUIET_MS).toISOString(),
    ...(alertOk ? { last_alert_at: new Date(now).toISOString() } : {}),
  }).eq("chat_id", chatId);
  if (alertOk) {
    await tl(`/messages`, { method: "POST", body: { phone: settings.escalation, text: shaunAlert({ name, phone, question, reason: decision.needs_human_reason || "not sure of the answer", draft: trimTo(decision.reply, 400) }) } })
      .catch((e) => console.error("[timelines-bot] escalation failed", (e as Error).message));
  }
  await logExchange(admin, phone, name, question, `${holding}\n\n(Handed to the team: ${decision.needs_human_reason || "not sure"}. Draft: ${decision.reply || "none"})`, eventId);
}

async function sendToChat(admin: any, chatId: number, text: string) {
  const data = await tl(`/chats/${chatId}/messages`, { method: "POST", body: { text } });
  const uid = data?.message_uid;
  if (uid) await admin.from("whatsapp_bot_messages").upsert({ uid, chat_id: chatId, direction: "bot" });
}

async function askModel(admin: any, question: string, history: TlMessage[], name: string) {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("LOVABLE_API_KEY is not set");
  const { buildGlobalBotContext } = await import("@/lib/app-bot.server");
  const ctx = await buildGlobalBotContext(admin, { question, userId: null, isAdmin: false, isStaff: false });
  const first = firstName(name);

  const system = `You are the Red Cherry Events assistant answering the Red Cherry Events WhatsApp number. You help riders and spectators with questions about any Red Cherry event.

WhatsApp rules:
- Plain text only. No markdown, no asterisks, no headings, no bullet symbols other than simple dashes. Links as plain full URLs.
- Short and friendly, like a person on the team. Maximum about 600 characters.
- ${first ? `Greet them by first name (${first}) at the start of a new conversation.` : "Their name is unknown; don't guess one."}
- Never use long dashes. South African English. No emojis unless they used one.
- Only use facts from the CONTEXT. If an APPROVED ANSWER matches, use it. Never invent prices, dates, times, codes, links or policies.
- Discount and promo codes that appear in the approved answers or business knowledge may and should be shared when someone asks for them, with their expiry if stated.
- The person is not signed in, so you can't see their own entry, tent, race number or balance.

Set confident=false (and still write your best draft in reply) when:
- the answer isn't clearly in the CONTEXT;
- refunds, cancellations or entry transfers that need a decision; payment problems; questions about their own entry details;
- complaints or anyone upset; sponsorship, business or supplier deals; medical or emergency issues; press or media; anyone asking to speak to a person;
- the message is only a voice note, image, file or sticker.
needs_human_reason: a short phrase saying why (null when confident).

${CONFIDENTIALITY_RULES}`;

  const convo = [...history]
    .reverse()
    .map((m) => `${m.from_me ? "Red Cherry" : "Rider"}: ${(m.text ?? "").trim() || `[${m.message_type || "attachment"}]`}`)
    .join("\n");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(45_000),
    body: JSON.stringify({
      model: "google/gemini-3.6-flash",
      messages: [
        { role: "system", content: system },
        { role: "system", content: `CONTEXT:\n${ctx.text}` },
        { role: "user", content: `Recent WhatsApp conversation (oldest first):\n${convo}\n\nAnswer the rider's latest message(s):\n${question}` },
      ],
      tools: [{
        type: "function",
        function: {
          name: "whatsapp_reply",
          description: "The WhatsApp reply decision",
          parameters: {
            type: "object",
            properties: {
              reply: { type: "string" },
              confident: { type: "boolean" },
              needs_human_reason: { type: ["string", "null"] },
            },
            required: ["reply", "confident", "needs_human_reason"],
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "whatsapp_reply" } },
    }),
  });
  if (!res.ok) throw new Error(`AI gateway error ${res.status}`);
  const j: any = await res.json();
  const args = j?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  const parsed = typeof args === "string" ? JSON.parse(args) : args;
  if (!parsed || typeof parsed.reply !== "string" || typeof parsed.confident !== "boolean") throw new Error("AI returned no usable answer");
  return {
    decision: { reply: parsed.reply, confident: parsed.confident, needs_human_reason: parsed.needs_human_reason ?? null },
    eventId: ctx.focusEventIds[0] ?? null,
  };
}

async function logExchange(admin: any, phone: string, name: string, question: string, answer: string | null, eventId: string | null) {
  try {
    const wa = phone.replace(/\D/g, "");
    const { data: existing } = await admin.from("admin_qa_threads").select("id").eq("channel", "whatsapp").eq("wa_phone", wa)
      .order("last_message_at", { ascending: false, nullsFirst: false }).limit(1).maybeSingle();
    let threadId = existing?.id as string | undefined;
    if (!threadId) {
      const { data: profile } = await admin.from("profiles").select("id").ilike("phone", `%${wa.slice(-9)}`).limit(1).maybeSingle();
      const { data: created } = await admin.from("admin_qa_threads")
        .insert({ event_id: eventId, rider_user_id: profile?.id ?? null, channel: "whatsapp", wa_phone: wa, wa_name: name || null, last_message_at: new Date().toISOString() })
        .select("id").single();
      threadId = created?.id;
    }
    if (!threadId) return;
    const rows: any[] = [{ thread_id: threadId, author_id: null, body: question, is_admin_msg: false, is_bot: false }];
    if (answer) rows.push({ thread_id: threadId, author_id: null, body: answer, is_admin_msg: false, is_bot: true });
    await admin.from("admin_qa_messages").insert(rows);
    await admin.from("admin_qa_threads").update({ last_message_at: new Date().toISOString(), ...(name ? { wa_name: name } : {}) }).eq("id", threadId);
  } catch (e) {
    console.error("[timelines-bot] logging failed", (e as Error).message);
  }
}

async function alertError(admin: any, settings: AutoReplySettings, err: unknown) {
  try {
    const now = Date.now();
    const { data } = await admin.from("whatsapp_bot_chats").select("last_alert_at").eq("chat_id", ERROR_ROW).maybeSingle();
    if (!canAlert(data?.last_alert_at, now, ERROR_ALERT_GAP_MS)) return;
    await admin.from("whatsapp_bot_chats").upsert({ chat_id: ERROR_ROW, last_alert_at: new Date(now).toISOString(), updated_at: new Date(now).toISOString() });
    await tl(`/messages`, { method: "POST", body: { phone: settings.escalation, text: `Rider Hub WhatsApp bot hit an error and didn't reply to a rider: ${trimTo((err as Error)?.message ?? String(err), 300)}` } });
  } catch (e) {
    console.error("[timelines-bot] error alert failed", (e as Error).message);
  }
}
