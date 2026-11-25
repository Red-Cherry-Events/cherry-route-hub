import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ICE_ROUNDS, youtubeId } from "./ice-knockout";

describe("ice knockout", () => {
  it("uses the race-day round times", () => {
    assert.deepEqual(ICE_ROUNDS.support, ["Heat 1 · 11:00", "Heat 2 · 13:00", "Final · 15:00"]);
    assert.deepEqual(ICE_ROUNDS.pro, ["Heat 1 · 12:00", "Heat 2 · 14:00", "Final · 15:30"]);
  });
  it("reads YouTube live and watch links", () => {
    assert.equal(youtubeId("https://www.youtube.com/live/abcdefghijk?si=x"), "abcdefghijk");
    assert.equal(youtubeId("https://www.youtube.com/watch?v=abcdefghijk"), "abcdefghijk");
    assert.equal(youtubeId("https://youtu.be/abcdefghijk"), "abcdefghijk");
    assert.equal(youtubeId("https://example.com"), null);
  });
});
