import { describe, expect, it } from "bun:test";
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
    expect(s.startIdx).toBe(2);
    expect(s.endIdx).toBe(8);
    expect(s.lengthKm).toBeCloseTo(0.667, 2);
    expect(s.climbM).toBe(60);
  });
  it("puts a later stage on the return pass, after the previous stage's end", () => {
    const [, s2] = locateStages(line, [st("s1", 1, 2, 15), st("s2", 2, 10, 4)]);
    expect(s2.startIdx).toBe(30); // index of point 10 on the way back
    expect(s2.endIdx).toBe(36);
    expect(s2.climbM).toBe(0);
  });
  it("returns nothing for routes without stages", () => {
    expect(locateStages(line, undefined)).toEqual([]);
  });
  it("labels km inside a stage", () => {
    const located = locateStages(line, [st("s1", 1, 2, 8)]);
    expect(stageAtKm(located, 0.5)?.stage.number).toBe(1);
    expect(stageAtKm(located, 1.5)).toBeNull();
  });
});
