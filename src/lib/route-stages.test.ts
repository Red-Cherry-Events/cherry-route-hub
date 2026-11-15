import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { locateStages, stageAtKm } from "./route-stages";
import type { LatLngAlt } from "./geo";

// Out-and-back along a meridian: 0..20 then back 20..0 (~111 m per step).
const line: LatLngAlt[] = [];
for (let i = 0; i <= 20; i++) line.push([18, -34 + i * 0.001, 100 + i * 10]);
for (let i = 19; i >= 0; i--) line.push([18, -34 + i * 0.001, 100 + i * 10]);

const st = (id: string, number: number, a: number, b: number) => ({
  id, number, name: id, startLat: -34 + a * 0.001, startLng: 18, endLat: -34 + b * 0.001, endLng: 18,
});

describe("locateStages", () => {
  it("finds start before end and climbs on the way up", () => {
    const [s] = locateStages(line, [st("s1", 1, 2, 8)]);
    assert.equal(s.startIdx, 2);
    assert.equal(s.endIdx, 8);
    assert.ok(Math.abs(s.lengthKm - 0.667) < 0.005);
    assert.equal(s.climbM, 60);
  });
  it("puts a later stage on the return pass, after the previous stage's end", () => {
    const [, s2] = locateStages(line, [st("s1", 1, 2, 15), st("s2", 2, 10, 4)]);
    assert.equal(s2.startIdx, 30); // index of point 10 on the way back
    assert.equal(s2.endIdx, 36);
    assert.equal(s2.climbM, 0);
  });
  it("returns nothing for routes without stages", () => {
    assert.deepEqual(locateStages(line, undefined), []);
  });
  it("labels km inside a stage", () => {
    const located = locateStages(line, [st("s1", 1, 2, 8)]);
    assert.equal(stageAtKm(located, 0.5)?.stage.number, 1);
    assert.equal(stageAtKm(located, 1.5), null);
  });
});
