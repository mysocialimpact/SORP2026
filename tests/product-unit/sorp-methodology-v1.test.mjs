import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { answerScores, methodologyV1, requirementFor, scoreCanonical, tests } from "../../src/app/sorp-methodology-v1.ts";
import { APPROVED_COW_METHODOLOGY_HASH } from "../../src/app/sorp-public-model.ts";

const answers = (answer) => Object.fromEntries(tests.map(item => [item.id, answer]));

test("canonical V1.0 is exactly the approved 19-question structure", () => {
  assert.equal(APPROVED_COW_METHODOLOGY_HASH, "dda7df64fa051e4448e438f8bd0c91982f9d0ebe4b4794f588fb2f5c2199ac1e");
  assert.equal(methodologyV1.methodologyVersion, "1.0");
  assert.equal(methodologyV1.methodologyId, "ARE_YOU_SORP_READY");
  assert.equal(tests.length, 19);
  assert.equal(new Set(tests.map(item => item.id)).size, 19);
  assert.deepEqual(["OA", "AP", "LF", "S"].map(prefix => tests.filter(item => item.id.startsWith(prefix)).length), [7, 7, 3, 2]);
  assert.deepEqual(tests.map(item => item.id), ["OA1", "OA2", "OA3", "OA4", "OA5", "OA6", "OA7", "AP1", "AP2", "AP3", "AP4", "AP5", "AP6", "AP7", "LF1", "LF2", "LF3", "S1", "S2"]);
  for (const item of tests) {
    assert.equal(item.rubric.length, 5);
    assert.equal(item.tiers.length, 3);
    for (const tier of item.tiers) assert.equal(tier.weight, tier.status.startsWith("MUST") ? 4 : tier.status === "SHOULD" ? 2 : 1);
  }
});

test("NOT SURE earns zero while retaining the denominator; S2 N/A alone is excluded", () => {
  assert.equal(answerScores.not_sure, 0);
  const full = scoreCanonical(answers("yes"), "tier2", "ew");
  const unknown = scoreCanonical({ ...answers("yes"), OA1: "not_sure" }, "tier2", "ew");
  assert.equal(full.score, 100);
  assert.equal(unknown.maximum, full.maximum);
  assert.equal(unknown.points, full.points - 16);
  assert.equal(unknown.mandatory.unconfirmed, 1);
  assert.equal(scoreCanonical({ ...answers("yes"), S2: "not_applicable" }, "tier2", "ew"), null);
  const notApplicable = scoreCanonical({ ...answers("yes"), S2: "not_applicable" }, "tier2", "ew", { s2SeparateSustainabilityReporting: false });
  assert.equal(notApplicable.maximum, full.maximum - 4);
  assert.equal(scoreCanonical({ ...answers("yes"), OA1: "not_applicable" }, "tier2", "ew"), null);
  assert.equal(scoreCanonical(answers("yes"), "tier2", "not_sure"), null);
});

test("mandatory status is separate from Reporting Strength and tier/jurisdiction rules", () => {
  const result = scoreCanonical({ ...answers("yes"), OA1: "mostly" }, "tier3", "ew");
  assert.ok(result.score > 90);
  assert.equal(result.mandatory.attention, 1);
  assert.equal(result.mandatory.demonstrated, result.mandatory.applicable - 1);
  assert.equal(requirementFor(tests[1], "tier2", "scotland").weight, 1);
  assert.equal(requirementFor(tests[1], "tier2", "england").weight, 4);
  assert.equal(methodologyV1.reportingStrengthBands[0].label, "VERY LIMITED");
  assert.equal(methodologyV1.reportingStrengthBands.at(-1).label, "LEADING PRACTICE");
});

test("Cow Console's approved record generates the public methodology and assessment-service copies", async () => {
  const [page, review, backend, cow, protocol, site, backendModule] = await Promise.all([
    readFile(new URL("../../src/app/sorp-public-methodology.tsx", import.meta.url), "utf8"),
    readFile(new URL("../../src/app/sorp-candidate-review.tsx", import.meta.url), "utf8"),
    readFile(new URL("../../src/app/sorp-methodology-v1.generated.json", import.meta.url), "utf8").catch(() => null),
    readFile(new URL("../../../g-p-6a7b081ad5688191af04c9280e01bea2/cow-console/app/intelligence/methodologies/are-you-sorp-ready/1.0.approved.json", import.meta.url), "utf8").catch(() => null),
    readFile(new URL("../../../g-p-6a7b081ad5688191af04c9280e01bea2/cow-console/app/intelligence/methodologies/are-you-sorp-ready/1.0.protocol.approved.json", import.meta.url), "utf8").catch(() => null),
    readFile(new URL("../../src/app/sorp-methodology-v1.generated.json", import.meta.url), "utf8"),
    readFile(new URL("../../src/app/sorp-methodology-v1.generated.mjs", import.meta.url), "utf8").catch(() => null),
  ]);
  assert.match(page, /from "\.\/sorp-methodology-v1"/);
  assert.match(review, /from "\.\/sorp-methodology-v1"/);
  assert.match(review, /verifiedCanonicalTar/);
  assert.deepEqual(JSON.parse(site), methodologyV1);
  if (cow && protocol) assert.deepEqual(JSON.parse(site), { ...JSON.parse(cow), protocol: JSON.parse(protocol), generatedFrom: "GENERATED FROM COW CONSOLE CANONICAL METHODOLOGY V1.0 — DO NOT EDIT DIRECTLY" });
  if (backend) assert.deepEqual(JSON.parse(backend), methodologyV1);
  if (backendModule) assert.match(backendModule, /GENERATED FROM COW CONSOLE CANONICAL METHODOLOGY/);
  assert.match(page, /assessmentProtocol\.historicalAssessment\.steps/);
});
