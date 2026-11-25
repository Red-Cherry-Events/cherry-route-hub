import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { finishPositions, type KnockoutRider } from "./ice-knockout";

const r = (id: string, status: "in" | "out", out_at: string | null = null): KnockoutRider =>
  ({ id, race_class: "pro", full_name: id, bib_number: null, sort_order: 1, status, out_round: null, out_at });

describe("finishPositions", () => {
  it("first rider out finishes last, last survivor wins", () => {
    const p = finishPositions([r("a", "out", "2026-11-29T10:00:00Z"), r("b", "out", "2026-11-29T10:05:00Z"), r("c", "in")]);
    assert.equal(p.get("a"), 3);
    assert.equal(p.get("b"), 2);
    assert.equal(p.get("c"), 1);
  });
  it("riders still racing have no place while more than one is in", () => {
    const p = finishPositions([r("a", "out", "2026-11-29T10:00:00Z"), r("b", "in"), r("c", "in")]);
    assert.equal(p.get("a"), 3);
    assert.equal(p.has("b"), false);
  });
});
