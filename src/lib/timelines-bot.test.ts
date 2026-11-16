import test from "node:test";
import assert from "node:assert/strict";
import * as b from "./timelines-bot";

const msg = (uid: string, t: string, from_me: boolean, text: string | null = "hi") => ({ uid, chat_id: 1, timestamp: t, from_me, text });
const now = Date.parse("2026-11-16T12:00:00+02:00");

test("RCE and Shaun's numbers never get replies", () => {
  assert.equal(b.isBlockedSender("+27 81 818 0179", b.DEFAULT_ESCALATION), true);
  assert.equal(b.isBlockedSender("+27826913515", b.DEFAULT_ESCALATION), true);
  assert.equal(b.isBlockedSender("+27821112222", b.DEFAULT_ESCALATION), false);
});
test("team message in last 12 hours silences the bot, bot's own do not", () => {
  const h = [msg("a", "2026-11-16 08:00:00 +0200", true)];
  assert.equal(b.humanHasChat(h, new Set(), now), true);
  assert.equal(b.humanHasChat(h, new Set(["a"]), now), false);
  assert.equal(b.humanHasChat([msg("a", "2026-11-15 23:00:00 +0200", true)], new Set(), now), false);
});
test("handover keeps the bot silent for its window", () => {
  assert.equal(b.humanHasChat([], new Set(), now, new Date(now + 1000).toISOString()), true);
  assert.equal(b.humanHasChat([], new Set(), now, new Date(now - 1000).toISOString()), false);
});
test("consecutive messages after the last outgoing one are answered together", () => {
  const p = b.pendingIncoming([msg("3", "2026-11-16 11:02:00 +0200", false), msg("1", "2026-11-16 10:00:00 +0200", false), msg("2", "2026-11-16 11:00:00 +0200", true), msg("4", "2026-11-16 11:03:00 +0200", false)]);
  assert.deepEqual(p.map((m) => m.uid), ["3", "4"]);
});
test("media-only messages go to a human", () => {
  assert.equal(b.isMediaOnly([msg("1", "2026-11-16 11:00:00 +0200", false, null)]), true);
  assert.equal(b.isMediaOnly([msg("1", "2026-11-16 11:00:00 +0200", false, "hello")]), false);
});
test("alerts limited to once per 2 hours per chat", () => {
  assert.equal(b.canAlert(new Date(now - 3600_000).toISOString(), now, b.ALERT_GAP_MS), false);
  assert.equal(b.canAlert(new Date(now - 7300_000).toISOString(), now, b.ALERT_GAP_MS), true);
});
test("holding message and alert wording", () => {
  assert.equal(b.holdingMessage("Sarah Smith"), "Thanks Sarah! I've passed this on to the team and someone will get back to you shortly.");
  assert.match(b.shaunAlert({ name: "Sarah", phone: "+27821112222", question: "x".repeat(400), reason: "refund", draft: "d" }), /^Rider Hub bot needs a hand 🙋 Sarah \(\+27821112222\) asked: "x{299}…"\. Why: refund\. Bot's best guess: d\.$/);
});
test("settings default to on with Shaun as escalation", () => {
  assert.deepEqual(b.normaliseSettings(null), { enabled: true, escalation: "+27826913515" });
  assert.equal(b.normaliseSettings({ enabled: false }).enabled, false);
});
test("markdown is flattened to plain WhatsApp text", () => {
  assert.equal(b.cleanReply("**Hi** see [entries](https://x.co)"), "Hi see entries: https://x.co");
});
