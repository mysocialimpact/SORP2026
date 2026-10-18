// Real, bounded model comparison in a preview build. No accounts or database writes.
import assert from "node:assert/strict";
import { interpretWithModel } from "../../src/lib/onboarding/model.ts";
import { processTurn, registrationExtraction } from "../../src/lib/onboarding/engine.ts";
import { initialConversation, applyFacts, confirmCharity, nextQuestion } from "../../src/lib/onboarding/state.ts";

if (process.env.VERCEL_ENV !== "preview" || process.env.SORP_LIVE_EVAL !== "true") throw Error("Preview live-evaluation opt-in required");
if (!process.env.OPENAI_API_KEY && !process.env.OPEN_API_KEY) throw Error("Existing AI connection unavailable");

const originalFetch = globalThis.fetch;
let profile = "baseline", calls = [], totalCalls = 0, totalCost = 0;
globalThis.fetch = async (url, options) => {
  if (String(url) !== "https://api.openai.com/v1/responses") return originalFetch(url, options);
  assert.ok(++totalCalls <= 24, "Live comparison request limit reached");
  const body = JSON.parse(options.body);
  const stage = body.text.format.name === "onboarding_interpretation" ? "interpretation" : "dialogue";
  if (profile === "baseline") {
    body.reasoning = { effort: stage === "interpretation" ? "low" : "medium" };
    body.max_output_tokens = stage === "interpretation" ? 4000 : 3000;
  }
  const started = performance.now();
  const response = await originalFetch(url, { ...options, body: JSON.stringify(body) });
  const data = await response.clone().json();
  calls.push({ stage, model: body.model, ms: Math.round(performance.now() - started), status: response.status, error: data.error?.message, outputTokens: data.usage?.output_tokens, reasoningTokens: data.usage?.output_tokens_details?.reasoning_tokens });
  return response;
};

const initial = initialConversation();
const ready = confirmCharity(applyFacts(initialConversation(), { name: "Sarah Jones", email: "sarah@example.com", role: "Accountant", organisation: "Burton Sweet", responsibilities: "I prepare charity accounts", discovery: "A colleague" }, "form"), { name: "Evaluation-only charity", registrationNumber: "FIXTURE", officialUrl: "https://example.invalid/fixture" });
const cases = [
  { id: "introduction", state: initial, message: "I’m Sarah Jones, an accountant at Burton Sweet. My email is sarah@example.com.", check(state) { assert.equal(state.facts.name, "Sarah Jones"); assert.equal(state.facts.email, "sarah@example.com"); assert.equal(state.facts.organisation, "Burton Sweet"); assert.equal(state.charity.confirmed, null); } },
  { id: "separate-employer-and-charity", state: initial, message: "I’m Alex Jones. I am a trustee at Interim Spaces, but I work professionally as a finance manager for Cedar Advisory. My email is alex@example.com. I want to explore Oxfam.", check(state) { assert.equal(state.facts.organisation, "Cedar Advisory"); assert.equal(state.charity.proposed, "Oxfam"); assert.equal(state.charity.confirmed, null); } },
  { id: "thoughtful-final-answer", state: ready, message: "I’m worried about missing reporting deadlines while supporting our clients properly.", check(state) { assert.ok(state.facts.concerns); assert.doesNotMatch(nextQuestion(state), /What’s your main challenge/); } },
];
const results = [];
for (const scenario of cases) {
  for (const candidate of ["baseline", "fast"]) {
    profile = candidate; calls = [];
    const started = performance.now();
    const record = { id: scenario.id, profile };
    try {
      const result = await processTurn(scenario.state, scenario.message, (message, state) => interpretWithModel(message, state, undefined, false, profile === "fast" ? registrationExtraction(state, message) || undefined : undefined));
      totalCost += result.extraction.usage?.estimatedUsd || 0;
      assert.ok(totalCost < 2, "Live comparison cost limit reached");
      assert.equal(result.extraction.notice || "", "", "Fallback is not a model pass");
      assert.equal(result.state.response?.generated, true);
      scenario.check(result.state);
      Object.assign(record, { passed: true, ms: Math.round(performance.now() - started), calls, reply: nextQuestion(result.state) });
    } catch (error) { Object.assign(record, { passed: false, ms: Math.round(performance.now() - started), calls, error: error.message }); }
    results.push(record);
    console.log("ONBOARDING_LATENCY " + JSON.stringify(record));
  }
}
console.log("ONBOARDING_LATENCY_SUMMARY " + JSON.stringify({ profiles: ["baseline", "fast"].map(profile => {
  const group = results.filter(result => result.profile === profile);
  return { profile, passed: group.every(result => result.passed), averageMs: Math.round(group.reduce((sum, result) => sum + result.ms, 0) / group.length) };
}), totalCalls, estimatedUsd: totalCost }));
if (results.some(result => !result.passed)) process.exitCode = 1;
