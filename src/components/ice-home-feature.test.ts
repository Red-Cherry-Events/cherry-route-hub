import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { iceHomeFeature } from "./ice-home-feature";
import type { Event } from "@/lib/mock-data";

// Real Inner City Enduro 2026 timing: Sat 28 Nov 05:00 UTC, two riding days.
const ICE_DATE = "2026-11-28T05:00:00.000Z";

function event(over: Partial<Event> = {}): Event {
  const base: Event = {
    id: "f046ce38-e687-4038-959d-271ba20825f0",
    externalId: null,
    name: "Inner City Enduro 2026",
    discipline: "Urban Adventures",
    date: ICE_DATE,
    location: "Baakens Valley, Lower Valley Road, Gqeberha",
    distanceKm: 0,
    status: "open",
    heroColor: "#c32236",
    description: "",
    schedule: [],
    mapQuery: "",
    entered: false,
    days: [
      { id: "d1", date: "2026-11-28", routes: [] },
      { id: "d2", date: "2026-11-29", routes: [] },
    ],
  };
  return Object.assign(base, over);
}

const at = (iso: string) => Date.parse(iso);

describe("ICE home feature", () => {
  it("shows during race week, seven days out through the last riding day", () => {
    const picked = iceHomeFeature([event()], at("2026-11-26T13:00:00Z"));
    assert.equal(picked?.name, "Inner City Enduro 2026");
  });

  it("shows on the day before the first riding day", () => {
    assert.ok(iceHomeFeature([event()], at("2026-11-27T20:00:00Z")));
  });

  it("stops showing once the last riding day has passed", () => {
    assert.equal(iceHomeFeature([event()], at("2026-12-01T08:00:00Z")), null);
  });

  it("stays hidden more than a week ahead", () => {
    assert.equal(iceHomeFeature([event()], at("2026-11-19T08:00:00Z")), null);
  });

  it("ignores archived and draft ICE events", () => {
    assert.equal(iceHomeFeature([event({ lifecycle: "archived" })], at("2026-11-26T13:00:00Z")), null);
    assert.equal(iceHomeFeature([event({ lifecycle: "draft" })], at("2026-11-26T13:00:00Z")), null);
  });

  it("ignores events that are not Inner City Enduro", () => {
    const other = event({ id: "other", name: "Otto1890 Weekend Warrior Grabouw 2027" });
    assert.equal(iceHomeFeature([other], at("2026-11-26T13:00:00Z")), null);
  });

  it("picks the nearest ICE event when more than one is in range", () => {
    const later = event({ id: "next-year", name: "Inner City Enduro 2027", date: "2027-11-27T05:00:00.000Z" });
    const picked = iceHomeFeature([later, event()], at("2026-11-26T13:00:00Z"));
    assert.equal(picked?.id, "f046ce38-e687-4038-959d-271ba20825f0");
  });
});
