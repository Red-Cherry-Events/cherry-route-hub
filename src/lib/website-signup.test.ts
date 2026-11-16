import test from "node:test";
import assert from "node:assert/strict";
import { websiteHostForOrigin } from "./website-signup";
import { websiteHostOf } from "./event-interest-handler.server";

test("GravDuro origins map to gravduro.co.za", () => {
  for (const o of ["https://www.gravduro.co.za", "https://gravduro.co.za", "https://gravduro.vercel.app", "https://gravduro-git-main-rce.vercel.app"])
    assert.equal(websiteHostForOrigin(o), "gravduro.co.za");
});
test("other origins are rejected", () => {
  for (const o of [null, "https://evil.com", "https://notgravduro-x.vercel.app", "http://gravduro.co.za", "https://gravduro-x.evil.vercel.app.com", "https://www.seatosea.co.za"])
    assert.equal(websiteHostForOrigin(o), null);
});
test("event website host ignores www", () => {
  assert.equal(websiteHostOf("https://www.gravduro.co.za"), "gravduro.co.za");
  assert.equal(websiteHostOf(null), null);
});
