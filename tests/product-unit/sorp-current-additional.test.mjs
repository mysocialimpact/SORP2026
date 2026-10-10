import assert from "node:assert/strict";
import test from "node:test";
import { additionalStatus, availableAdditionalChecks, currentAdditionalChecks, relevantCurrentChecks } from "../../src/app/sorp-current-additional.ts";

test("the 15 existing core questions and four scored areas are untouched by additional checks", async () => {
  const { coreQuestions, readinessAreas } = await import("../../src/app/sorp-questionnaire.ts");
  assert.equal(coreQuestions.length, 15);
  assert.deepEqual(readinessAreas.map(area => area.title), ["PURPOSE", "PERFORMANCE", "LEARNING", "REPORTING"]);
  assert.equal(currentAdditionalChecks.some(check => "affectsScore" in check), false);
});

test("tier 1 screens volunteer and circumstance checks but excludes higher-tier disclosures", () => {
  const checks = availableAdditionalChecks("tier1");
  assert.ok(checks.some(check => check.id === "volunteers"));
  assert.ok(checks.some(check => check.id === "going_concern"));
  assert.ok(!checks.some(check => check.id === "investments"));
  assert.ok(!checks.some(check => check.id === "sustainability"));
  assert.ok(!checks.some(check => check.id === "fundraising"));
  assert.deepEqual(relevantCurrentChecks("tier1", { volunteers: "yes", going_concern: "no" }).map(check => check.id), ["volunteers"]);
});

test("tier 2 investment disclosure appears only when material investments are confirmed", () => {
  const selected = relevantCurrentChecks("tier2", { investments: "yes" });
  const investment = selected.find(check => check.id === "investments");
  assert.ok(investment);
  assert.deepEqual(investment.sources.map(source => source.reference), ["1.29", "1.44"]);
  assert.ok(selected.some(check => check.id === "principal_risks"));
  assert.ok(selected.some(check => check.id === "governance"));
  assert.ok(!selected.some(check => check.id === "sustainability"));
  assert.ok(!selected.some(check => check.id === "fundraising"));
});

test("tier 3 includes its automatic MUST checks without forcing screened-out activities", () => {
  const selected = relevantCurrentChecks("tier3", { volunteers: "no", fundraising: "no" });
  assert.ok(selected.some(check => check.id === "sustainability" && check.classification === "MUST"));
  assert.ok(selected.some(check => check.id === "future_finance" && check.classification === "MUST"));
  assert.ok(!selected.some(check => check.id === "volunteers"));
  assert.ok(!selected.some(check => check.id === "fundraising"));
});

test("audited fundraising disclosure is screened only in England and Wales", () => {
  assert.ok(availableAdditionalChecks("tier1", "ew").some(check => check.id === "audited_fundraising"));
  assert.ok(!availableAdditionalChecks("tier1", "scotland").some(check => check.id === "audited_fundraising"));
  assert.ok(!relevantCurrentChecks("tier1", { audited_fundraising: "no" }, "ew").some(check => check.id === "audited_fundraising"));
});

test("unknown applicability and not-applicable answers do not become scored failures", () => {
  assert.equal(additionalStatus(undefined, "not_sure"), "Applicability to confirm");
  assert.equal(additionalStatus(undefined, "no"), "Not applicable");
  assert.equal(additionalStatus("not_applicable", "yes"), "Not applicable");
  assert.equal(additionalStatus("not_yet", "yes"), "Action needed · self-reported");
  assert.equal(additionalStatus("yes", "yes"), "Covered · self-reported");
  assert.ok(!availableAdditionalChecks(null).some(check => check.id === "sustainability"));
});

test("every additional question has a SORP basis and applicability explanation", () => {
  for (const check of currentAdditionalChecks) {
    assert.ok(check.why && check.when && check.expects && check.sources.length, check.id);
    assert.ok(check.sources.every(source => /^1\.\d+$/.test(source.reference) && source.page > 0), check.id);
  }
});
