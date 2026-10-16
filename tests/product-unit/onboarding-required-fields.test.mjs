import test from "node:test";
import assert from "node:assert/strict";
import {
  initialConversation,
  applyFacts,
  advance,
  extractImmediate,
  registrationReady,
  accountReady,
  nextObjective,
  missingRegistration,
  questionPlan,
  cleanFacts,
  confirmCharity,
  TOTAL_TURN_CAP,
} from "../../src/lib/onboarding/state.ts";

const personal = () => applyFacts(initialConversation(), {
  name: "Bill Jones",
  email: "bill@example.org",
  role: "Accountant",
}, "form");

const charity = {
  name: "Interim Spaces",
  registrationNumber: "1165694",
  officialUrl: "https://register-of-charities.charitycommission.gov.uk/",
};

test("having a name, valid email and role is NOT enough to create an account", () => {
  const s = personal();
  assert.equal(registrationReady(s.facts), false);
  assert.equal(accountReady(s), false);
  assert.equal(nextObjective(s), "registration");
  assert.ok(missingRegistration(s).includes("organisation"));
  assert.ok(questionPlan(s).fields.includes("organisation"));
});

test("named firm completes work context, but a confirmed charity is still required", () => {
  const s = applyFacts(personal(), { organisation: "Burton Sweet" }, "form");
  assert.equal(registrationReady(s.facts), true);
  assert.equal(accountReady(s), false);
  assert.equal(nextObjective(s), "charity");
  assert.equal(accountReady(confirmCharity(s, charity)), true);
});

test("work context can truthfully be independent without inventing an employer", () => {
  const s = applyFacts(personal(), { organisationKind: "independent" }, "form");
  assert.equal(s.facts.organisation, "");
  assert.equal(s.facts.organisationKind, "independent");
  assert.equal(registrationReady(s.facts), true);
  assert.equal(missingRegistration(s).includes("organisation"), false);
  assert.equal(accountReady(s), false);
  assert.equal(nextObjective(s), "charity");
  assert.equal(accountReady(confirmCharity(s, charity)), true);
  assert.equal(cleanFacts({ organisationKind: "independent" }).organisationKind, "independent");
});

test("first-person declaration of independent work is extracted without an employer", () => {
  const before = personal();
  const after = advance(before, extractImmediate("I am self-employed.", before));
  assert.equal(after.facts.organisationKind, "independent");
  assert.equal(after.facts.organisation, "");
  assert.equal(registrationReady(after.facts), true);
});

test("describing someone else as independent does not fill your own work context", () => {
  const before = personal();
  const after = advance(before, extractImmediate("My colleague is self-employed.", before));
  assert.equal(after.facts.organisationKind === "independent", false);
  assert.equal(registrationReady(after.facts), false);
});

test("optional skips, finish requests and conversation caps cannot bypass a charity", () => {
  const s = applyFacts(personal(), { organisation: "Burton Sweet" }, "form");
  const skipped = advance(s, { utterance: "Skip" }, true);
  assert.equal(accountReady(skipped), false);
  assert.equal(nextObjective(skipped), "charity");
  assert.equal(nextObjective({ ...skipped, finishRequested: true }), "charity");
  assert.equal(nextObjective({ ...skipped, turns: TOTAL_TURN_CAP }), "charity");
});

test("conversation cap never declares an incomplete mandatory profile finished", () => {
  const s = { ...personal(), turns: TOTAL_TURN_CAP };
  assert.equal(nextObjective(s), "registration");
  assert.equal(accountReady(s), false);
});

test("successful completion of all mandatory checks still permits optional dialogue", () => {
  const s = confirmCharity(
    applyFacts(personal(), { organisation: "Burton Sweet" }, "form"),
    charity,
  );
  assert.equal(accountReady(s), true);
  assert.ok(["responsibilities", "discovery", "concerns", "complete"].includes(nextObjective(s)));
});
