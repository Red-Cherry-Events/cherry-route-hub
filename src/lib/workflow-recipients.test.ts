import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { workflowPartnerInput, workflowTestInput } from "./workflow-recipients";
import { allowedTestRecipient } from "./test-recipient.server";

describe("workflow recipient boundaries", () => {
  it("permits explicit external crew and partner recipients for recorded sends", () => {
    assert.deepEqual(workflowPartnerInput({ stepId: "step", to: [" Crew@example.org ", "partner@example.com", "crew@example.org"] }), {
      stepId: "step", to: ["crew@example.org", "partner@example.com"],
    });
  });
  it("does not allow extra recipient fields into the caller-only test action", () => {
    const input = { stepId: "step", to: ["partner@example.org"] };
    assert.deepEqual(workflowTestInput(input), { stepId: "step" });
  });
  it("preserves restrictions on other admin test tools", () => {
    assert.throws(() => allowedTestRecipient("partner@example.org", "admin@redcherryevents.co.za"));
    assert.equal(allowedTestRecipient("admin@redcherryevents.co.za", "admin@redcherryevents.co.za"), "admin@redcherryevents.co.za");
  });
  it("rejects an empty or invalid external-recipient list", () => {
    assert.throws(() => workflowPartnerInput({ stepId: "step", to: [] }));
    assert.throws(() => workflowPartnerInput({ stepId: "step", to: ["invalid"] }));
  });
  it("limits explicit sends to 20 recipients", () => {
    const to = Array.from({ length: 20 }, (_, i) => `crew${i}@example.org`);
    assert.equal(workflowPartnerInput({ stepId: "step", to }).to.length, 20);
    assert.throws(() => workflowPartnerInput({ stepId: "step", to: [...to, "extra@example.org"] }));
  });
});