import assert from "node:assert/strict";
import test from "node:test";
import { guidedPrompts } from "../../src/app/sorp-public-model.ts";

test("guided review asks only the three most material unanswered published findings", () => {
  const finding = (fieldId, answer, confidence = "MEDIUM", classification = "SHOULD") => ({ fieldId, answer, confidence, classification, finding: `Finding ${fieldId}` });
  const tar = { score: 58, findings: [finding(1, "yes", "HIGH"), finding(2, "mostly", "HIGH"), finding(3, "partly"), finding(4, "not_sure", "LOW", "MUST"), finding(5, "not_yet", "HIGH", "MUST"), finding(6, "partly"), finding(7, "partly")] };
  const wider = { score: 80, findings: [finding(3, "yes", "HIGH"), finding(4, "mostly", "HIGH")] };
  const report = { tar, wider };
  const prompts = guidedPrompts(report);
  assert.equal(prompts.length, 3);
  assert.equal(prompts[0].fieldId, 4);
  assert(prompts.every(item => item.answer !== "yes" && item.fieldId !== 2));
  assert.equal(tar.score, 58);
  assert.equal(wider.score, 80);
  assert(!guidedPrompts({ tar: { ...tar, findings: [finding(8, "mostly", "high")] }, wider }).length);
});
