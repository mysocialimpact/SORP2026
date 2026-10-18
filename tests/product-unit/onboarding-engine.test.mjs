import test from "node:test";
import assert from "node:assert/strict";
import {
  initialConversation,
  applyFacts,
  advance,
  normaliseConversation,
  nextQuestion,
  nextObjective,
  charityOptions,
  confirmCharity,
  questionPlan,
  validEntity,
  extractImmediate,
} from "../../src/lib/onboarding/state.ts";
import {
  validateInterpretation,
  modelRequest,
  MAX_OUTPUT_TOKENS,
} from "../../src/lib/onboarding/model.ts";
import { processTurn, quickTurn, registrationExtraction } from "../../src/lib/onboarding/engine.ts";
const relationship = (entity, period = "past", relationship = "client") => ({
  entity,
  aliases: [],
  kind: "charity",
  relationship,
  period,
  confidence: "stated",
  role: "",
  evidence: `Worked with ${entity}`,
  turn: 1,
});
const ready = () =>
  applyFacts(
    initialConversation(),
    {
      name: "Alex Rowan",
      email: "alex@example.invalid",
      role: "Trustee",
      organisation: "Interim Spaces",
    },
    "form",
  );
test("standalone email and optional skip advance without waiting for AI", () => {
  const emailed = quickTurn(initialConversation(), "sarah@example.com");
  assert.equal(emailed.facts.email, "sarah@example.com");
  assert.equal(emailed.turns, 1);
  assert.equal(emailed.charity.confirmed, null);
  assert.equal(quickTurn(initialConversation(), "I’m Sarah at Burton Sweet"), null);
  assert.equal(quickTurn(emailed, "sarah@example.com"), null);
  assert.equal(quickTurn(initialConversation(), "Skip this for now", true), null);
  const optional = confirmCharity(ready(), { name: "Fixture charity" });
  const skipped = quickTurn(optional, "Skip this for now", true);
  assert.equal(nextObjective(skipped), "discovery");
});
test("only complete explicit first introductions can skip duplicate interpretation", () => {
  const text = "I’m Sarah Jones, an accountant at Burton Sweet. My email is sarah@example.com.";
  const facts = registrationExtraction(initialConversation(), text);
  assert.equal(facts.name, "Sarah Jones");
  assert.equal(facts.organisation, "Burton Sweet");
  const instant = quickTurn(initialConversation(), text);
  assert.equal(instant.facts.email, "sarah@example.com");
  assert.equal(instant.charity.confirmed, null);
  assert.equal(nextObjective(instant), "charity");
  assert.ok(!instant.response?.generated, "A local response must not be labelled AI-generated");
  for (const message of [text + " I used to work with Oxfam.", text + " I want to explore Interim Spaces.", "I’m Alex Jones, a trustee at Interim Spaces. My email is alex@example.com.", "I’m Sarah Jones, an accountant at Burton Sweet. My colleague’s email is sarah@example.com."]) assert.equal(registrationExtraction(initialConversation(), message), null);
  assert.equal(registrationExtraction(applyFacts(initialConversation(), { organisation: "My correction" }, "form"), text), null);
  assert.equal(registrationExtraction({ ...initialConversation(), turns: 1 }, text), null);
});
test("a simple yes chooses a suggested charity for lookup without confirming its record", () => {
  const state = advance(initialConversation(), { name: "Alex Jones", email: "alex@example.com", role: "Trustee", organisation: "Cedar Advisory", charities: ["Interim Spaces"] });
  const next = quickTurn(state, "Yes please");
  assert.equal(next.charity.proposed, "Interim Spaces");
  assert.equal(next.charity.phase, "lookup");
  assert.equal(next.charity.confirmed, null);
});
const output = (facts, extra = {}) => ({
  intent: "inform",
  target: "unknown",
  charityDecision: "none",
  finishRequested: false,
  facts,
  relationships: [],
  next: {
    objective: "registration",
    fields: ["role"],
    question: "What sort of work are you doing now?",
  },
  ...extra,
});
const fact = (
  field,
  value,
  quote = value,
  period = "current",
  correction = false,
) => ({ field, value, quote, period, correction });
test("history shapes the missing-role question without populating current employer", () => {
  const s = advance(initialConversation(), {
    name: "Marcus Worrey",
    email: "marcus@example.invalid",
    professional: [relationship("Blue Cross")],
    questionProposal: {
      objective: "registration",
      fields: ["role"],
      question: "What sort of work are you doing now?",
    },
  });
  assert.equal(s.facts.organisation, "");
  assert.equal(s.facts.role, "");
  assert.match(nextQuestion(s), /Blue Cross.*previously.*now/);
  assert.equal(s.response.generated, true);
  const corrected = applyFacts(s, { name: "Marcus Warry" }, "form");
  assert.equal(corrected.facts.name, "Marcus Warry");
  assert.match(nextQuestion(corrected), /Blue Cross/);
  assert.doesNotMatch(nextQuestion(corrected), /Worrey/);
});
test("past relationships cannot populate a current employer, even if a model incorrectly also proposes it", () => {
  const s = advance(initialConversation(), {
    organisation: "Blue Cross",
    professional: [relationship("Blue Cross")],
  });
  assert.equal(s.facts.organisation, "");
  assert.deepEqual(charityOptions(s), ["Blue Cross"]);
  assert.equal(s.charity.confirmed, null);
});
test("current and historical relationships coexist, with provenance and uncertainty", () => {
  const s = advance(initialConversation(), {
    organisation: "Cedar Advisory",
    professional: [
      relationship("Blue Cross"),
      {
        ...relationship("Cedar Advisory", "current", "employer"),
        kind: "firm",
        confidence: "uncertain",
      },
    ],
  });
  assert.equal(s.facts.organisation, "Cedar Advisory");
  assert.equal(s.professional.length, 2);
  assert.equal(s.professional[1].confidence, "uncertain");
});
test("grounding tolerates typographic punctuation and case without dropping supplied identity", () => {
  const p = validateInterpretation(
    output([
      fact("role", "Trustee", "I’m a trustee"),
      fact("name", "Alex Rowan"),
    ]),
    "I'm a trustee. My name is Alex Rowan.",
    initialConversation(),
  );
  assert.equal(p.role, "Trustee");
  assert.equal(p.name, "Alex Rowan");
});
test("literal identity remains grounded even when a supporting quote has harmless extra words", () => {
  const p = validateInterpretation(
    output([fact("role", "trustee", "I'm a trustee at Interim Spaces")]),
    "I'm Alex Rowan, a trustee at Interim Spaces.",
    initialConversation(),
  );
  assert.equal(p.role, "trustee");
});
test("professional summaries need evidence, but need not be verbatim substrings", () => {
  const p = validateInterpretation(
    output([
      fact(
        "discovery",
        "Referral from a colleague",
        "A colleague sent me your website.",
      ),
    ]),
    "A colleague sent me your website.",
    initialConversation(),
  );
  assert.equal(p.discovery, "Referral from a colleague");
});
test("fabricated identity and ungrounded professional summaries are rejected", () => {
  const p = validateInterpretation(
    output([
      fact("email", "invented@example.invalid"),
      fact("discovery", "LinkedIn", "LinkedIn"),
    ]),
    "Hello there",
    initialConversation(),
  );
  assert.equal(p.email, undefined);
  assert.equal(p.discovery, undefined);
});
test("historical roles and employers are not current registration facts", () => {
  const p = validateInterpretation(
    output([
      fact("role", "accountant", "accountant", "past"),
      fact("organisation", "KPMG", "KPMG", "past"),
    ]),
    "I was an accountant at KPMG.",
    initialConversation(),
  );
  assert.equal(p.role, undefined);
  assert.equal(p.organisation, undefined);
});
test("a flat list cannot enter a typed charity field", () => {
  const p = validateInterpretation(
    output([fact("charities", "Shelter, Mind and Brainstrust")]),
    "Shelter, Mind and Brainstrust",
    initialConversation(),
  );
  assert.equal(p.charities, undefined);
});
test("alternate names of one charity deduplicate while preserving historical relationship", () => {
  const s = advance(initialConversation(), {
    professional: [
      { ...relationship("Blue Cross"), aliases: ["The Blue Cross"] },
      relationship("The Blue Cross"),
    ],
  });
  assert.equal(s.professional.length, 1);
  assert.deepEqual(charityOptions(s), ["Blue Cross"]);
});
for (const key of ["name", "email", "role", "organisation"])
  test(`manual ${key} is authoritative across subsequent extraction and reload`, () => {
    const s = ready();
    const previous = s.facts[key];
    const altered = {
      name: "Alexandra Rowan",
      email: "alexandra@example.invalid",
      role: "Finance director",
      organisation: "Mind",
    }[key];
    const edited = applyFacts(s, { [key]: altered }, "form");
    const next = advance(edited, { [key]: previous, intent: "inform" });
    const resumed = normaliseConversation(JSON.parse(JSON.stringify(next)));
    assert.equal(resumed.facts[key], altered);
    assert.ok(resumed.corrections.some((c) => c.field === key));
  });
test("a manual correction stays authoritative even if extraction proposes another correction", () => {
  const s = advance(ready(), {
    intent: "correct",
    target: "name",
    name: "Alexandra Rowan",
    correctedFields: ["name"],
    email: "wrong@example.invalid",
  });
  assert.equal(s.facts.name, "Alex Rowan");
  assert.equal(s.facts.email, "alex@example.invalid");
  assert.equal(s.knowledge.name.status, "confirmed");
});
test("next-question validation uses the updated facts, rejecting stale requests for known details", () => {
  const s = advance(initialConversation(), {
    name: "Alex Rowan",
    email: "alex@example.invalid",
    role: "Trustee",
    organisation: "Independent",
    questionProposal: {
      objective: "registration",
      fields: ["role"],
      question: "What is your role?",
    },
  });
  assert.equal(nextObjective(s), "charity");
  assert.equal(s.response, null);
  assert.doesNotMatch(nextQuestion(s), /your role/);
});
test("question text cannot contradict its metadata and ask for known identity", () => {
  const s = advance(ready(), {
    questionProposal: {
      objective: "registration",
      fields: ["role"],
      question: "What is your email address?",
    },
  });
  assert.equal(s.response, null);
});
test("a post-confirmation proposal is used only when its objective remains missing", () => {
  let s = advance(ready(), {
    afterCharity: {
      objective: "responsibilities",
      fields: ["responsibilities"],
      question: "Which parts of the charity’s governance do you oversee?",
    },
  });
  s = confirmCharity(s, { name: "Interim Spaces" });
  assert.equal(s.response.generated, true);
  assert.match(nextQuestion(s), /governance/);
  let filled = advance(ready(), {
    responsibilities: "I oversee governance",
    discovery: "LinkedIn",
    concerns: "Funding",
    afterCharity: {
      objective: "responsibilities",
      fields: ["responsibilities"],
      question: "What do you oversee?",
    },
  });
  filled = confirmCharity(filled, { name: "Interim Spaces" });
  assert.equal(nextObjective(filled), "complete");
  assert.equal(filled.response, null);
});
test("additional professional context accumulates; explicit correction replaces it", () => {
  let s = advance(initialConversation(), { concerns: "Funding" });
  s = advance(s, { concerns: "Data quality" });
  assert.match(s.facts.concerns, /Funding.*Data quality/);
  s = advance(s, { intent: "correct", concerns: "Reporting deadlines" });
  assert.equal(s.facts.concerns, "Reporting deadlines");
});
test("early exit stops optional questions but cannot invent mandatory account details", () => {
  const complete = advance(ready(), { finishRequested: true });
  assert.equal(nextObjective(complete), "complete");
  const missing = advance(initialConversation(), { finishRequested: true });
  assert.equal(nextObjective(missing), "registration");
  assert.equal(questionPlan(missing).canContinue, false);
});
test("one model call handles a turn and its complete state transition", async () => {
  let calls = 0;
  const result = await processTurn(
    initialConversation(),
    "My name is Alex Rowan",
    async () => {
      calls++;
      return {
        name: "Alex Rowan",
        questionProposal: {
          objective: "registration",
          fields: ["email"],
          question: "What email address should we use?",
        },
      };
    },
  );
  assert.equal(calls, 1);
  assert.equal(result.state.facts.name, "Alex Rowan");
  assert.equal(result.state.turns, 1);
  assert.match(nextQuestion(result.state), /email/);
});
test("model input is bounded structured memory rather than increasing raw history", () => {
  const body = modelRequest("Hello", ready());
  assert.equal(body.max_output_tokens, MAX_OUTPUT_TOKENS);
  assert.equal(body.store, false);
  const input = JSON.parse(body.input[0].content);
  assert.equal(input.history, undefined);
  assert.ok(input.professional);
  assert.ok(input.knowledge);
  assert.ok(input.plan);
  assert.equal(body.tools, undefined);
});
test("raw historical/correction sentences fail entity validation", () => {
  for (const v of [
    "I used to work with Blue Cross",
    "I already told you Interim Spaces",
    "My charity is Blue Cross",
  ])
    assert.equal(validEntity(v), false);
});
test("unnamed categories and portfolio counts cannot become charity candidates", () => {
  for (const name of [
    "charities",
    "20 charities",
    "around 20 charities",
    "a charity",
    "another charity",
    "our clients",
    "companies",
  ])
    assert.equal(validEntity(name), false, name);
  assert.equal(validEntity("Trustee", "role"), true);
  assert.equal(validEntity("Charity employee", "role"), true);
});
test("historical work requires a present-focused role question, not merely a generic prompt", () => {
  const s = advance(initialConversation(), {
    name: "Marcus Warry",
    email: "marcus@example.invalid",
    organisation: "Independent",
    professional: [relationship("Blue Cross")],
    questionProposal: {
      objective: "registration",
      fields: ["role"],
      question: "What do you do?",
    },
  });
  assert.equal(s.response, null);
  assert.match(nextQuestion(s), /Blue Cross.*previously.*now/);
});
test("rejection without an active choice cannot imply an arbitrary charity selection", () => {
  const s = advance(ready(), {
    professional: [relationship("Mind"), relationship("Shelter")],
    intent: "disagree",
    target: "charities",
    charityDecision: "reject",
  });
  assert.equal(s.charity.confirmed, null);
  assert.equal(s.clarification, "charity");
  assert.match(nextQuestion(s), /Which did you mean/);
});
test("changing professional fields invalidates an earlier tailored question", () => {
  let s = advance(ready(), {
    afterCharity: {
      objective: "responsibilities",
      fields: ["responsibilities"],
      question: "Which trustee responsibilities do you have?",
    },
  });
  s = applyFacts(s, { role: "Accountant" }, "form");
  assert.equal(s.afterCharity, null);
});

test("explicit fact-map schema retains separate volunteered context and null unknowns", () => {
  const text =
    "I advise 20 charities. I am interested in impact reporting and worried about funding.";
  const result = validateInterpretation(
    output({
      name: null,
      portfolio: {
        value: "20",
        quote: "I advise 20 charities.",
        period: "current",
        correction: false,
      },
      interests: {
        value: "impact reporting",
        quote: text,
        period: "current",
        correction: false,
      },
      concerns: {
        value: "funding",
        quote: text,
        period: "current",
        correction: false,
      },
    }),
    text,
    initialConversation(),
  );
  assert.equal(result.name, undefined);
  assert.equal(result.portfolio, "20");
  assert.equal(result.interests, "impact reporting");
  assert.equal(result.concerns, "funding");
  const schema = modelRequest(text, initialConversation()).text.format.schema
    .properties.facts;
  assert.ok(schema.required.includes("interests"));
  assert.ok(schema.required.includes("portfolio"));
});

test("typed trusteeships cannot fill employment; only explicit current employment can", () => {
  const current = {
    ...relationship("Interim Spaces", "current", "trustee"),
    confidence: "stated",
  };
  const s = advance(initialConversation(), { professional: [current] });
  assert.equal(s.facts.organisation, "");
  assert.equal(advance(initialConversation(), { professional: [{ ...current, relationship: "employer" }] }).facts.organisation, "Interim Spaces");
  const past = advance(initialConversation(), {
    professional: [relationship("Blue Cross")],
  });
  assert.equal(past.facts.organisation, "");
  const multiple = advance(initialConversation(), {
    professional: [current, { ...current, entity: "Mind" }],
  });
  assert.equal(multiple.facts.organisation, "");
  const edited = applyFacts(
    initialConversation(),
    { organisation: "Chosen firm" },
    "form",
  );
  assert.equal(
    advance(edited, { professional: [current] }).facts.organisation,
    "Chosen firm",
  );
});

test("outage extraction does not turn historical or third-person work into current employment", () => {
  for (const text of [
    "My name is Nina Patel. I used to be a finance manager at Shelter.",
    "My name is Emma Lee. My partner is a trustee at Mind.",
  ]) {
    const p = extractImmediate(text, initialConversation());
    assert.ok(p.name);
    assert.equal(p.role, undefined);
    assert.equal(p.organisation, undefined);
  }
});
test("resumption preserves relationship recency rather than making every mention new", () => {
  let s = advance(initialConversation(), {
    professional: [relationship("Mind")],
  });
  s = advance(s, { professional: [relationship("Shelter")] });
  assert.deepEqual(
    normaliseConversation(JSON.parse(JSON.stringify(s))).professional.map(
      (r) => r.turn,
    ),
    [1, 2],
  );
});

test("generated wording cannot retain a manually corrected first name", () => {
  const s = advance(initialConversation(), {
    name: "Marcus Worrey",
    questionProposal: {
      objective: "registration",
      fields: ["email", "role"],
      question: "Marcus, what is your email address and role?",
    },
  });
  assert.equal(s.response, null);
  const edited = applyFacts(s, { name: "Emma Lee" }, "form");
  assert.doesNotMatch(nextQuestion(edited), /Marcus|Worrey/);
});
