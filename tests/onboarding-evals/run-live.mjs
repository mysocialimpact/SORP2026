import assert from "node:assert/strict";
import { writeFile, mkdir } from "node:fs/promises";
import { journeys } from "./journeys.mjs";
import {
  interpretWithModel,
  ONBOARDING_MODEL,
} from "../../src/lib/onboarding/model.ts";
import { processTurn } from "../../src/lib/onboarding/engine.ts";
import {
  initialConversation,
  applyFacts,
  confirmCharity,
  normaliseConversation,
  nextQuestion,
  nextObjective,
  missingRegistration,
} from "../../src/lib/onboarding/state.ts";
if (process.env.SORP_LIVE_EVAL !== "true")
  throw new Error(
    "Explicit SORP_LIVE_EVAL=true required. This runner makes billable real model calls.",
  );
if (!process.env.OPENAI_API_KEY && !process.env.OPEN_API_KEY)
  throw new Error("Existing model credential required; no simulated pass.");
const report = {
  model: ONBOARDING_MODEL,
  startedAt: new Date().toISOString(),
  calls: 0,
  inputTokens: 0,
  outputTokens: 0,
  estimatedUsd: 0,
  generatedQuestions: 0,
  passed: 0,
  failed: 0,
  journeys: [],
};
let reserved = 0,
  lastInterpretation;
const selected = process.env.SORP_EVAL_IDS
  ? journeys.filter((j) => process.env.SORP_EVAL_IDS.split(",").includes(j.id))
  : journeys;
async function bounded(text, state) {
  if (report.calls >= 60 || reserved + 0.02 > 1.2)
    throw new Error("Live evaluation budget exhausted");
  reserved += 0.02;
  report.calls++;
  const result = await interpretWithModel(text, state, (p) => {
    lastInterpretation = p;
  });
  report.inputTokens += result.usage.input;
  report.outputTokens += result.usage.output;
  report.estimatedUsd += result.usage.estimatedUsd;
  return result;
}
for (const journey of selected) {
  let state = initialConversation();
  const record = { id: journey.id, passed: true, turns: [] };
  try {
    for (const step of journey.steps) {
      if (step.text) {
        const result = await processTurn(state, step.text, bounded);
        state = result.state;
      }
      if (step.edit) state = applyFacts(state, step.edit, "form");
      if (step.resume)
        state = normaliseConversation(JSON.parse(JSON.stringify(state)));
      if (step.confirm)
        state = confirmCharity(state, {
          name: step.confirm,
          registrationNumber: "1234567",
          officialUrl:
            "https://register-of-charities.charitycommission.gov.uk/charity-search/-/charity-details/1234567",
        });
      if (step.text && state.response?.generated) report.generatedQuestions++;
      // Every journey evaluates synchronized state, progression, no premature confirmation and turn bounds.
      assert.ok(state.turns <= 10);
      assert.ok(
        state.facts.charities.every((v) => !/^I (already|used|work)/i.test(v)),
      );
      if (nextObjective(state) === "registration")
        assert.ok(missingRegistration(state).length > 0);
      if (state.response?.generated)
        assert.ok(
          state.response.fields.every(
            (f) =>
              !["name", "email", "role"].includes(f) ||
              missingRegistration(state).includes(f),
          ),
        );
      record.turns.push({
        question: nextQuestion(state),
        objective: nextObjective(state),
        generated: !!state.response?.generated,
        role: state.facts.role,
        organisation: state.facts.organisation,
        relationships: state.professional.map(
          ({ entity, period, relationship }) => ({
            entity,
            period,
            relationship,
          }),
        ),
      });
      step.check?.(state);
    }
    report.passed++;
  } catch (e) {
    record.passed = false;
    record.interpretation = lastInterpretation;
    record.error = String(e.message).replace(/[\w.+-]+@[\w.-]+/g, "[email]");
    report.failed++;
  }
  report.journeys.push(record);
  console.log("LIVE_EVAL", JSON.stringify(record));
}
report.completedAt = new Date().toISOString();
await mkdir("test-results", { recursive: true });
await writeFile(
  "test-results/onboarding-live-eval.json",
  JSON.stringify(report, null, 2),
);
console.log(
  "LIVE_EVAL_SUMMARY",
  JSON.stringify({ ...report, journeys: undefined }),
);
if (report.failed || report.generatedQuestions < Math.min(5, selected.length))
  process.exitCode = 1;
