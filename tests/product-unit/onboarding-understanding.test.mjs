import test from "node:test";
import assert from "node:assert/strict";
import {
  initialConversation,
  extractImmediate,
  advance,
  applyFacts,
  applyExtraction,
  normaliseConversation,
  nextQuestion,
  nextObjective,
  charityOptions,
  confirmCharity,
  cleanFacts,
  validEntity,
  proposeCharity,
} from "../../src/lib/onboarding/state.ts";
const answer = (s, t) => advance(s, extractImmediate(t, s));
const trustee = () =>
  answer(
    initialConversation(),
    "I’m Alex Jones, a trustee at Interim Spaces. My email is alex@example.com.",
  );
const confirmed = (s, name = "Interim Spaces") =>
  confirmCharity(s, {
    name,
    officialUrl: `https://register-of-charities.charitycommission.gov.uk/charity-search/-/charity-details/${name === "Interim Spaces" ? "1234569" : "1234568"}`,
  });
test("trustee relationship is inferred, suggested immediately and never silently confirmed", () => {
  const s = trustee();
  assert.equal(s.facts.organisation, "Interim Spaces");
  assert.equal(s.facts.role, "Trustee");
  assert.deepEqual(charityOptions(s), ["Interim Spaces"]);
  assert.equal(s.knowledge.organisationKind.status, "inferred");
  assert.match(nextQuestion(s), /You mentioned Interim Spaces.*Shall we/);
  assert.equal(s.charity.phase, "suggest");
  assert.equal(s.charity.confirmed, null);
});
test("exact reminder preserves the entity, acknowledges the correction and does not search", () => {
  for (const text of [
    "I already told you Interim Spaces.",
    "I already told you.",
    "As I said, Interim Spaces.",
  ]) {
    const s = answer(trustee(), text);
    assert.equal(s.lastIntent, "remind");
    assert.equal(s.charity.proposed, "Interim Spaces");
    assert.equal(s.charity.phase, "suggest");
    assert.equal(s.facts.organisation, "Interim Spaces");
    assert.deepEqual(s.facts.charities, []);
    assert.match(nextQuestion(s), /You’re right — Interim Spaces.*Shall we/);
    assert.equal(s.repairTurns, 1);
  }
});
test("incomplete registration remembers the charity while asking only for missing details", () => {
  const s = answer(initialConversation(), "I’m a trustee at Interim Spaces.");
  assert.equal(s.facts.name, "");
  assert.equal(s.facts.email, "");
  assert.match(nextQuestion(s), /noted Interim Spaces/);
  assert.match(nextQuestion(s), /your name and your email address/);
  assert.doesNotMatch(nextQuestion(s), /what you do|Which charity/);
});
test("firm and approximate portfolio do not become the charity", () => {
  const s = answer(
    initialConversation(),
    "I’m Sarah Jones, an accountant at Burton Sweet working with around 20 charities. My email is sarah@example.com.",
  );
  assert.equal(s.facts.organisation, "Burton Sweet");
  assert.equal(s.facts.portfolio, "around 20 charities");
  assert.equal(s.facts.organisationKind, "firm");
  assert.deepEqual(charityOptions(s), []);
  assert.match(nextQuestion(s), /Which charity/);
});
test("multiple mentions and ambiguous other require a choice", () => {
  const s = answer(
    trustee(),
    "I work with Interim Spaces, Brainstrust and another charity.",
  );
  assert.deepEqual(charityOptions(s), ["Interim Spaces", "Brainstrust"]);
  assert.match(nextQuestion(s), /Which one/);
  assert.equal(s.charity.proposed, "");
  const unclear = answer(s, "No, the other charity.");
  assert.equal(unclear.clarification, "charity");
  assert.equal(unclear.charity.phase, "suggest");
  assert.match(nextQuestion(unclear), /Interim Spaces, Brainstrust/);
  const chosen = answer(
    proposeCharity(s, "Interim Spaces"),
    "No, the other charity.",
  );
  assert.equal(chosen.charity.proposed, "Brainstrust");
  assert.equal(chosen.charity.phase, "lookup");
});
test("employer rejection retains the employer and removes the charity suggestion", () => {
  const s = answer(
    trustee(),
    "I work there, but that’s not the charity I want to review.",
  );
  assert.equal(s.facts.organisation, "Interim Spaces");
  assert.deepEqual(charityOptions(s), []);
  assert.equal(s.charity.confirmed, null);
  assert.match(nextQuestion(s), /Which charity/);
});
test("change of mind clears confirmed charity and stale matches at any objective", () => {
  const s = answer(
    confirmed(trustee()),
    "Actually, let’s use Brainstrust instead.",
  );
  assert.equal(s.charity.proposed, "Brainstrust");
  assert.equal(s.charity.confirmed, null);
  assert.deepEqual(s.charity.candidates, []);
  assert.equal(s.charity.phase, "lookup");
  assert.equal(nextObjective(s), "charity");
  assert.match(nextQuestion(s), /official record for Brainstrust/);
});
test("ambiguity, disagreement and questions never fill the currently requested field", () => {
  const s = confirmed(trustee());
  for (const text of [
    "That’s not what I meant.",
    "Actually, I meant…",
    "Why do you need that?",
    "I disagree.",
  ]) {
    const next = answer(s, text);
    assert.equal(next.facts.responsibilities, "");
    assert.equal(next.facts.organisation, "Interim Spaces");
    assert.equal(nextObjective(next), "clarification");
    assert.doesNotMatch(nextQuestion(next), /What keeps you/);
  }
});
test("early referral, interests, responsibilities and concern survive intervening corrections", () => {
  let s = answer(
    trustee(),
    "I found you through LinkedIn. I prepare accounts. I’m worried about getting our charity accounts ready for SORP 2026. I am interested in impact reporting.",
  );
  s = answer(s, "I already told you Interim Spaces.");
  s = confirmed(s);
  assert.equal(s.facts.discovery, "LinkedIn");
  assert.match(s.facts.concerns, /SORP 2026/);
  assert.equal(s.facts.interests, "impact reporting");
  assert.equal(nextObjective(s), "complete");
  assert.doesNotMatch(
    nextQuestion(s),
    /come across|up at night|prepare accounts/,
  );
});
test("direct edits and reload use the same relationship and question state", () => {
  let s = applyFacts(
    initialConversation(),
    {
      name: "Alex Jones",
      email: "alex@example.com",
      role: "Trustee",
      organisation: "Interim Spaces",
    },
    "form",
  );
  s = normaliseConversation(JSON.parse(JSON.stringify(s)));
  assert.match(nextQuestion(s), /Interim Spaces/);
  assert.equal(s.knowledge.role.status, "confirmed");
  s = applyFacts(s, { organisation: "Brainstrust" }, "form");
  assert.equal(s.charity.proposed, "Brainstrust");
  assert.doesNotMatch(nextQuestion(s), /Interim Spaces/);
});
test("legacy draft migrates without losing facts or registry confirmation", () => {
  const old = {
    facts: trustee().facts,
    turns: 2,
    asked: ["registration"],
    skipped: [],
  };
  const s = normaliseConversation(old, { name: "Interim Spaces" });
  assert.equal(s.version, 3);
  assert.equal(s.charity.confirmed.name, "Interim Spaces");
  assert.equal(nextObjective(s), "responsibilities");
});
test("entity boundary refuses corrections, questions and model-generated conversational wording", () => {
  for (const value of [
    "I already told you interim spaces",
    "That’s not what I meant",
    "You mentioned Interim Spaces. Shall we use that charity?",
    "No, the other charity",
    "I work there, but that’s not the charity I want to review",
    "Actually, I meant…",
  ]) {
    assert.equal(validEntity(value), false, value);
    assert.deepEqual(
      cleanFacts({
        name: value,
        role: value,
        organisation: value,
        charities: [value],
      }).charities,
      [],
    );
    const s = applyExtraction(trustee(), {
      intent: "remind",
      organisation: value,
      charities: [value],
      charityChoice: value,
    });
    assert.equal(s.facts.organisation, "Interim Spaces");
    assert.equal(s.charity.proposed, "Interim Spaces");
  }
});
test("semantic correction changes only grounded fields while retaining other objectives", () => {
  let s = trustee();
  s = applyExtraction(s, {
    intent: "correct",
    target: "name",
    name: "Alexandra Jones",
  });
  assert.equal(s.facts.name, "Alexandra Jones");
  assert.equal(s.facts.email, "alex@example.com");
  assert.equal(s.charity.proposed, "Interim Spaces");
});
test("repairs do not consume the optional information budget; total exchanges remain bounded", () => {
  const s = answer(
    { ...trustee(), turns: 5 },
    "I already told you Interim Spaces.",
  );
  assert.equal(nextObjective(s), "charity");
  assert.match(nextQuestion(s), /You’re right/);
  // The optional conversation cap cannot bypass mandatory charity confirmation.
  assert.equal(nextObjective({ ...s, turns: 10 }), "charity");
});
test("portfolio clause never masks later named clients in the same answer", () => {
  const s = answer(
    initialConversation(),
    "I’m Sarah Jones, an accountant at Burton Sweet working with around 20 charities. My email is sarah@example.com. I work with Interim Spaces, Brainstrust and another charity.",
  );
  assert.deepEqual(charityOptions(s), ["Interim Spaces", "Brainstrust"]);
  assert.match(nextQuestion(s), /Which one/);
});
test("unfinished form edits survive resume but never complete registration", () => {
  const s = normaliseConversation(
    applyFacts(trustee(), { email: "alex@" }, "form"),
  );
  assert.equal(s.facts.email, "alex@");
  assert.equal(nextObjective(s), "registration");
  assert.match(nextQuestion(s), /email address/);
});
test("other charity resolves the original query even when the official name differs", () => {
  let s = answer(trustee(), "I work with Interim Spaces and Brainstrust.");
  s = confirmed(proposeCharity(s, "Interim Spaces"), "Interim Spaces Limited");
  s = answer(s, "No, the other charity.");
  assert.equal(s.charity.proposed, "Brainstrust");
  assert.equal(s.charity.phase, "lookup");
});
test("semantic interpretation supersedes incidental lexical matches instead of retaining them", async () => {
  const { reconcileExtraction } =
    await import("../../src/lib/onboarding/state.ts");
  const s = initialConversation(),
    message = "I’m Alex Jones. My partner is a trustee at Interim Spaces.";
  const next = advance(
    s,
    reconcileExtraction(message, s, {
      intent: "inform",
      name: "Alex Jones",
      context: "My partner is a trustee at Interim Spaces.",
    }),
  );
  assert.equal(next.facts.name, "Alex Jones");
  assert.equal(next.facts.role, "");
  assert.equal(next.facts.organisation, "");
  assert.match(nextQuestion(next), /what you do/);
});
test("manual typing retains word separators while validation remains deterministic", () => {
  let s = applyFacts(initialConversation(), { name: "David " }, "form");
  assert.equal(s.facts.name, "David ");
  s = normaliseConversation(s);
  assert.equal(s.facts.name, "David ");
  s = applyFacts(s, { name: s.facts.name + "Smith" }, "form");
  assert.equal(s.facts.name, "David Smith");
});
