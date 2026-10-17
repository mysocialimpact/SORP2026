import test from "node:test";
import assert from "node:assert/strict";
import { initialConversation, extractImmediate, reconcileExtraction, advance, applyFacts, confirmCharity, accountReady, optionalKeys, normaliseConversation, nextObjective, nextQuestion, challengeQuestion } from "../../src/lib/onboarding/state.ts";
const intro = "I’m Sarah Jones, an accountant at Burton Sweet. My email is sarah@example.com.";
const answer = (s, text) => advance(s, extractImmediate(text, s));
test("four immediate facts do not imply five completed essentials", () => {
  const s = answer(initialConversation(), intro);
  assert.deepEqual([s.facts.name, s.facts.email, s.facts.role, s.facts.organisation], ["Sarah Jones", "sarah@example.com", "Accountant", "Burton Sweet"]);
  assert.equal(accountReady(s), false);
  assert.equal(accountReady(confirmCharity(s, { name: "Fixture charity" })), true);
});
test("all seven editable text fields preserve edits and intentional clearing through extraction and resume", () => {
  let s = answer(initialConversation(), intro);
  for (const key of optionalKeys) {
    s = applyFacts(s, { [key]: "My exact edited answer" }, "form");
    s = advance(s, { [key]: "AI interpretation must not overwrite this", intent: "correct" });
    assert.equal(s.facts[key], "My exact edited answer");
    s = applyFacts(s, { [key]: "" }, "form");
    s = normaliseConversation(advance(s, { [key]: "Do not resurrect a deleted answer" }));
    assert.equal(s.facts[key], "");
  }
});
test("trusteeship alone is not employment and a named employer is not selected as charity", () => {
  const s = answer(initialConversation(), "I’m Alex Jones, a trustee at Interim Spaces. My email is alex@example.com.");
  assert.equal(s.facts.organisation, "");
  assert.deepEqual(s.facts.charities, ["Interim Spaces"]);
  const employed = answer(s, "I work for Cedar Advisory.");
  assert.equal(employed.facts.organisation, "Cedar Advisory");
  assert.equal(employed.charity.confirmed, null);
});
test("three optional questions stay separate and the last has the exact agreed wording", () => {
  let s = confirmCharity(answer(initialConversation(), intro), { name: "Fixture charity" });
  assert.equal(nextObjective(s), "responsibilities");
  s = answer(s, "I prepare charity accounts.");
  assert.equal(nextObjective(s), "discovery");
  s = answer(s, "I found you on LinkedIn.");
  assert.equal(nextQuestion(s), challengeQuestion);
  s = answer(s, "My biggest challenge is time.");
  assert.equal(nextObjective(s), "complete");
});
test("explicit starting-charity request survives an omitted model field without becoming confirmation", () => {
  const text = "I’m Alex Jones, a trustee at Interim Spaces. I work for Cedar Advisory. I want to explore Oxfam.";
  const initial = initialConversation();
  const local = answer(initial, text);
  assert.equal(local.charity.proposed, "Oxfam");
  assert.equal(local.facts.organisation, "Cedar Advisory");
  const server = advance(initial, reconcileExtraction(text, initial, { intent: "inform", organisation: "Cedar Advisory" }));
  assert.equal(server.charity.proposed, "Oxfam");
  assert.equal(server.charity.confirmed, null);
});
