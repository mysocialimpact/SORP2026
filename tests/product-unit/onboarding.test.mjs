import test from "node:test";
import assert from "node:assert/strict";
import {
  initialConversation,
  confirmCharity,
  extractImmediate,
  advance,
  nextQuestion,
  nextObjective,
  registrationReady,
  safeDestination,
  charityQueryFromAnswer,
  TOTAL_TURN_CAP,
} from "../../src/lib/onboarding/state.ts";
const introduction =
  "I’m Sarah Jones, a chartered accountant at Burton Sweet. My email is sarah@example.com. I work with about 20 charities, including Brainstrust. I found you on LinkedIn.";
const answer = (s, t) => advance(s, extractImmediate(t, s));
test("A: all early facts populate together and charity/discovery are remembered", () => {
  const s = answer(initialConversation(), introduction);
  assert.equal(s.facts.name, "Sarah Jones");
  assert.equal(s.facts.email, "sarah@example.com");
  assert.equal(s.facts.role, "Chartered accountant");
  assert.equal(s.facts.organisation, "Burton Sweet");
  assert.equal(s.facts.portfolio, "about 20 charities");
  assert.equal(s.facts.discovery, "LinkedIn");
  assert.deepEqual(s.facts.charities, ["Brainstrust"]);
  assert.match(nextQuestion(s), /You mentioned Brainstrust/);
  assert.equal(registrationReady(s.facts), true);
  const confirmed = confirmCharity(s, { name: "Brainstrust" });
  assert.equal(nextObjective(confirmed), "responsibilities");
  const detail = answer(confirmed, "I prepare accounts and advise trustees");
  assert.equal(nextObjective(detail), "concerns");
  assert.equal(nextQuestion(detail), "What keeps you up at night?");
});
test("B: partial first answer delivers a name without invented registration details", () => {
  const s = answer(
    initialConversation(),
    "Hello, I’m David. I work for a small charity.",
  );
  assert.equal(s.facts.name, "David");
  assert.equal(s.facts.email, "");
  assert.equal(s.facts.role, "");
  assert.match(nextQuestion(s), /email address and what you do/);
});
test("one bare name is enough for the first reward", () => {
  assert.equal(answer(initialConversation(), "Sarah").facts.name, "Sarah");
});
test("greetings, general sentences and professional titles are not invented names", () => {
  for (const message of [
    "Hello",
    "Hi there",
    "Good Morning",
    "I work for a small charity",
    "I am Finance Director",
    "I’m Chief Executive",
  ])
    assert.equal(
      answer(initialConversation(), message).facts.name,
      "",
      message,
    );
});
test("C: three charities require a choice, not an automatic first selection", () => {
  const s = answer(
    initialConversation(),
    introduction.replace("Brainstrust", "Brainstrust, Shelter and Mind"),
  );
  assert.deepEqual(s.facts.charities, ["Brainstrust", "Shelter", "Mind"]);
  assert.equal(s.charity.confirmed, null);
  assert.match(nextQuestion(s), /Which one/);
});
test("D: early professional concerns are not asked again", () => {
  let s = answer(
    initialConversation(),
    introduction +
      " My biggest challenge is keeping client data consistent across reporting systems.",
  );
  s = confirmCharity(s, { name: "Brainstrust" });
  s = answer(s, "I prepare accounts and advise trustees");
  assert.match(s.facts.concerns, /client data/);
  assert.equal(nextObjective(s), "complete");
  assert.doesNotMatch(nextQuestion(s), /up at night/);
});
test("short completed conversations stop and optional questions can be skipped", () => {
  let s = answer(
    initialConversation(),
    introduction + " I prepare accounts. My concern is governance.",
  );
  s = confirmCharity(s, { name: "Brainstrust" });
  assert.equal(nextObjective(s), "complete");
  assert.equal(s.turns, 1);
  s = advance(initialConversation(), {}, true);
  assert.deepEqual(s.skipped, []);
});
test("optional exchanges end at six; essential corrections end at ten", () => {
  const ready = answer(initialConversation(), introduction);
  assert.equal(nextObjective({ ...ready, turns: 6 }), "complete");
  assert.equal(
    nextObjective({ ...initialConversation(), turns: 9 }),
    "registration",
  );
  assert.equal(
    nextObjective({ ...initialConversation(), turns: TOTAL_TURN_CAP }),
    "complete",
  );
});
test("return destinations preserve product queries/hashes and reject redirect injection", () => {
  assert.equal(
    safeDestination("/ask-sorp/workspace/?question=hello#answer"),
    "/ask-sorp/workspace/?question=hello#answer",
  );
  for (const v of [
    "//evil.test",
    "/\\evil.test",
    "https://evil.test",
    "/api/logout",
    "/login/",
    "/get-started/",
    "/\nevil.test",
  ])
    assert.equal(safeDestination(v), "/dashboard/");
});
test("email validation never manufactures an address", () => {
  const s = answer(initialConversation(), "I’m David and my email is david@");
  assert.equal(s.facts.email, "");
  assert.equal(registrationReady(s.facts), false);
});

test("natural charity confirmation and selection resolve a lookup without assuming a first client", () => {
  const s = answer(initialConversation(), introduction);
  assert.equal(charityQueryFromAnswer("Yes please", s), "Brainstrust");
  assert.equal(
    charityQueryFromAnswer("Yes please", {
      ...s,
      facts: { ...s.facts, charities: ["Brainstrust", "Shelter"] },
    }),
    "",
  );
  assert.equal(
    charityQueryFromAnswer("Let’s start with Shelter", {
      ...s,
      facts: { ...s.facts, charities: ["Brainstrust", "Shelter"] },
    }),
    "Shelter",
  );
});
