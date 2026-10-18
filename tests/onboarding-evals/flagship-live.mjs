// Explicit opt-in, preview build only. Calls the existing REAL two-stage AI.
// Synthetic identities and an explicit fixture charity; no account/registry/DB writes.
import assert from "node:assert/strict";
import { interpretWithModel, MODEL_RESERVATION_USD } from "../../src/lib/onboarding/model.ts";
import { processTurn, registrationExtraction } from "../../src/lib/onboarding/engine.ts";
import { initialConversation, applyFacts, confirmCharity, nextQuestion, challengeQuestion } from "../../src/lib/onboarding/state.ts";
if (process.env.VERCEL_ENV !== "preview" || process.env.SORP_LIVE_EVAL !== "true") throw Error("Preview opt-in required");
if (!process.env.OPENAI_API_KEY && !process.env.OPEN_API_KEY) throw Error("Existing AI connection unavailable");
let calls = 0, cost = 0;
const results = [];
async function turn(state, text) {
  if (++calls > 5 || cost + MODEL_RESERVATION_USD > 1) throw Error("Evaluation budget reached");
  const start = Date.now();
  const result = await processTurn(state, text, async (message, current) => {
    const output = await interpretWithModel(message, current, undefined, false, registrationExtraction(current, message) || undefined);
    cost += output.usage.estimatedUsd;
    assert.equal(output.notice || "", "", "A fallback is not a live AI pass");
    return output;
  });
  assert.equal(result.state.response?.generated, true);
  results.push({ durationMs: Date.now() - start, objective: result.state.response.objective, generated: true });
  return result.state;
}
try {
  const sarah = await turn(initialConversation(), "I’m Sarah Jones, an accountant at Burton Sweet. My email is sarah@example.com.");
  assert.equal(sarah.facts.name, "Sarah Jones");
  assert.equal(sarah.facts.email, "sarah@example.com");
  assert.equal(sarah.facts.organisation, "Burton Sweet");
  assert.equal(sarah.charity.confirmed, null);
  const trustee = await turn(initialConversation(), "I’m Alex Jones. I am a trustee at Interim Spaces, but I work professionally as a finance manager for Cedar Advisory. My email is alex@example.com. I want to explore Oxfam.");
  assert.equal(trustee.facts.organisation, "Cedar Advisory");
  assert.equal(trustee.charity.confirmed, null);
  assert.equal(trustee.charity.proposed, "Oxfam", JSON.stringify({ proposed: trustee.charity.proposed, charities: trustee.facts.charities, professional: trustee.professional.map(({ entity, relationship }) => ({ entity, relationship })) }));
  const ready = confirmCharity(sarah, { name: "Evaluation-only charity", registrationNumber: "FIXTURE", officialUrl: "https://example.invalid/fixture" });
  const complete = await turn(ready, "I prepare charity accounts and advise trustees. I heard about you through a colleague. My biggest challenge is gathering evidence before reporting deadlines.");
  for (const key of ["responsibilities", "discovery", "concerns"]) assert.ok(complete.facts[key], key);
  const finalPrompt = await turn(applyFacts(ready, { responsibilities: "I prepare charity accounts", discovery: "A colleague" }, "form"), "A colleague shared your website with me.");
  assert.ok(nextQuestion(finalPrompt).includes(challengeQuestion));
  const response = await turn(finalPrompt, "I’m worried about missing reporting deadlines while supporting our clients properly.");
  assert.ok(response.facts.concerns);
  assert.doesNotMatch(nextQuestion(response), /What’s your main challenge/);
  console.log("FLAGSHIP_LIVE_AI " + JSON.stringify({ passed: true, calls, estimatedUsd: cost, results, limitations: "Model integration only; registry, account creation, email and runtime preview storage are not verified by this check." }));
} catch (error) {
  console.log("FLAGSHIP_LIVE_AI " + JSON.stringify({ passed: false, calls, estimatedUsd: cost, results, error: error.message }));
  process.exitCode = 1;
}
