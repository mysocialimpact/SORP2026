import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  coreQuestions,
  eligibilityFor,
  readinessAreas,
  readinessStages,
  relevantAdditionalChecks,
  scoreForAnswer,
  scoreReadinessAreas,
  stageForQuestion,
  tierFromSetup,
  tierLabel,
} from "../../src/app/sorp-questionnaire.ts";

const dataPath = new URL("../../src/app/sorp-questionnaire.ts", import.meta.url);
const experiencePath = new URL("../../src/app/sorp-assessment.tsx", import.meta.url);

test("SORP snapshot keeps one stable 15-question scoring method", async () => {
  const source = await readFile(dataPath, "utf8");
  const coreBlock = source.slice(source.indexOf("export const coreQuestions"), source.indexOf("export const additionalChecks"));
  const questionIds = [...coreBlock.matchAll(/^\s+id: (\d+),$/gm)].map((match) => Number(match[1]));

  assert.deepEqual(questionIds, Array.from({ length: 15 }, (_, index) => index + 1));
  assert.equal((coreBlock.match(/affectsScore: true/g) ?? []).length, 15);
  assert.match(source, /15 questions × maximum 4 points|scoreForAnswer/);
  assert.match(source, /"MUST" \| "SHOULD" \| "MAY" \| "JUDGEMENT" \| "MSI_READINESS"/);
});

const baseSetup = {
  role: "staff",
  jurisdiction: "ew",
  startDate: "2026-01-01",
  endDate: "2026-12-31",
  accounts: "accruals",
  income: "tier2",
  nearBoundary: false,
  activities: ["none"],
};

test("eligibility stays helpful for non-standard and uncertain routes", () => {
  assert.match(eligibilityFor({ ...baseSetup, accounts: "receipts" }).status, /MAY NOT APPLY/);
  assert.match(eligibilityFor({ ...baseSetup, startDate: "2025-12-31" }).status, /MAY NOT APPLY/);
  assert.match(eligibilityFor({ ...baseSetup, accounts: "not_sure" }).status, /PROVISIONAL/);
  assert.match(eligibilityFor({ ...baseSetup, jurisdiction: "roi" }).status, /PROVISIONAL/);
});

test("tier logic keeps uncertainty and the Tier 1 / Tier 2 boundary visible", () => {
  assert.equal(tierFromSetup({ ...baseSetup, income: "unsure" }), null);
  assert.equal(tierLabel({ ...baseSetup, income: "unsure" }), "Not yet confirmed");
  assert.equal(tierFromSetup({ ...baseSetup, income: "tier1_high", nearBoundary: true }), null);
  assert.equal(tierLabel({ ...baseSetup, income: "tier1_high", nearBoundary: true }), "Tier 1 / Tier 2 borderline");
  assert.equal(tierFromSetup({ ...baseSetup, income: "tier3" }), "tier3");
});

test("additional checks respond transparently to activities and tier", () => {
  assert.deepEqual(relevantAdditionalChecks(baseSetup).map((check) => check.id), []);
  assert.deepEqual(relevantAdditionalChecks({ ...baseSetup, activities: ["not_sure"] }).map((check) => check.id), ["volunteers", "grant_making", "social_investment"]);
  assert.deepEqual(relevantAdditionalChecks({ ...baseSetup, activities: ["volunteers", "grant_making", "group"] }).map((check) => check.id), ["volunteers", "grant_making", "group"]);
  assert.deepEqual(relevantAdditionalChecks({ ...baseSetup, income: "tier3", activities: ["fundraising", "investments"] }).map((check) => check.id), ["fundraising", "investments", "sustainability"]);
});

test("the main score always uses the same 15 core answers", () => {
  const allNotSure = Object.fromEntries(coreQuestions.map((question) => [question.id, "not_sure"]));
  const allClear = Object.fromEntries(coreQuestions.map((question) => [question.id, "yes"]));
  const calculate = (answers) => Math.round(coreQuestions.reduce((total, question) => total + scoreForAnswer(answers[question.id]), 0) / 60 * 100);

  assert.equal(calculate(allNotSure), 0);
  assert.equal(calculate(allClear), 100);
  assert.equal(coreQuestions.length, 15);
});

test("four deterministic area scores use the existing 15 answers without changing the overall score", () => {
  assert.deepEqual(readinessAreas.map(({ title, label, first, last }) => [title, label, first, last]), [
    ["PURPOSE", "Objectives & activities", 1, 4],
    ["PERFORMANCE", "Achievements & performance", 5, 10],
    ["LEARNING", "Plans for future periods", 11, 13],
    ["REPORTING", "Trustees’ Annual Report readiness", 14, 15],
  ]);
  const answerBySection = { objectives: "yes", achievements: "mostly", learning: "partly", reporting: "not_yet" };
  const answers = Object.fromEntries(coreQuestions.map(question => [question.id, answerBySection[question.section]]));
  assert.deepEqual(scoreReadinessAreas(answers).map(area => area.score), [100, 75, 50, 25]);
  assert.equal(Math.round(coreQuestions.reduce((total, question) => total + scoreForAnswer(answers[question.id]), 0) / 60 * 100), 70);
  assert.equal(relevantAdditionalChecks(baseSetup).length, 0);
});

test("the Snapshot and conversation share the eight visible readiness stages", () => {
  assert.deepEqual([...readinessStages], [
    "Your charity & SORP context",
    "Quick Readiness Review",
    "Objectives & activities",
    "Achievements & performance",
    "Plans for future periods",
    "Trustees’ Annual Report readiness",
    "Additional SORP checks",
    "Your Full Readiness Review",
  ]);
  assert.deepEqual(coreQuestions.map(stageForQuestion), [3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 6, 6]);
});

test("SORP snapshot reuses canonical conversational setup and transparent conditional checks", async () => {
  const source = await readFile(experiencePath, "utf8");

  assert.match(source, /SorpReadinessConversation setupOnly/);
  assert.match(source, /setSetupWorkflow\(nextWorkflow\)/);
  assert.match(source, /These checks create separate SORP flags\. They do not change the main 0–100 score/);
  assert.match(source, /Why am I seeing this\?/);
  assert.match(source, /Save &amp; exit/);
  assert.match(source, /\/are-you-sorp-ready\/results/);
  assert.match(source, /window\.localStorage\.setItem\(RESULT_KEY/);
  assert.match(source, /Snapshot will be carried into the conversation/);
  assert.match(source, /\/are-you-sorp-ready\/conversation\?from=snapshot/);
  assert.doesNotMatch(source, /email.*required|required.*email/i);
});

test("every snapshot question must be answered before continuing", async () => {
  const source = await readFile(experiencePath, "utf8");

  assert.doesNotMatch(source, /nextLabel=\{setup\.role \? "Continue" : "Skip"\}/);
  assert.match(source, /onSetupComplete/);
  assert.match(source, /if \(!currentQuestion \|\| !coreAnswers\[currentQuestion\.id\]\) return;/);
  assert.match(source, /if \(!currentExtra \|\| !extraAnswers\[currentExtra\.id\]\) return;/);
  assert.match(source, /nextDisabled=\{!coreAnswers\[currentQuestion\.id\]\}/);
  assert.match(source, /nextDisabled=\{!extraAnswers\[currentExtra\.id\]\}/);
});
