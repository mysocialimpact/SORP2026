import assert from "node:assert/strict";
import test from "node:test";
import { PILLARS, QUESTIONS } from "../../src/features/excellence/questions.ts";
import { scoreAssessment } from "../../src/features/excellence/scoring.ts";
import { SNAPSHOT_MATURITY } from "../../src/features/excellence/snapshot-maturity.ts";
import { PURPOSE_OPEN_QUESTIONS, PURPOSE_SCALE, PURPOSE_SECTIONS, purposeMaturity, scorePurpose, newPurposeWorkspace, normalisePurposeWorkspace } from "../../src/features/excellence/purpose.ts";
import { PURPOSE_QUESTION_GUIDANCE } from "../../src/features/excellence/purpose-guidance.ts";
import { LEADERSHIP_OPEN_QUESTIONS, LEADERSHIP_SCALE, LEADERSHIP_SECTIONS, leadershipMaturity, newLeadershipWorkspace, normaliseLeadershipWorkspace, scoreLeadership } from "../../src/features/excellence/leadership.ts";
import { LEADERSHIP_QUESTION_GUIDANCE } from "../../src/features/excellence/leadership-guidance.ts";

test("native charity assessment preserves the established five-pillar, 25-question methodology", () => {
  assert.deepEqual(PILLARS.map(pillar => pillar.key), ["purpose", "leadership", "data", "delivery", "communication"]);
  assert.equal(QUESTIONS.length, 25);
  assert.equal(new Set(QUESTIONS.map(question => question.id)).size, 25);
  assert.equal(Object.keys(SNAPSHOT_MATURITY).length, 25);
  for (const question of QUESTIONS) assert.equal(SNAPSHOT_MATURITY[question.id].length, 5);
});

test("native Social Impact Excellence scoring remains deterministic", () => {
  const result = scoreAssessment([1,2,3,4,5, 2,2,2,2,2, 3,3,3,3,3, 4,4,4,4,4, 5,5,5,5,5]);
  assert.equal(result.overall, 3.4);
  assert.deepEqual(result.pillarScores.map(item => item.score), [3,2,3,4,5]);
  assert.equal(result.maturity, "Partly established");
  assert.equal(result.strengths.length, 3);
  assert.equal(result.opportunities.length, 3);
});

test("native Purpose pathway preserves the released assessment and guidance", () => {
  assert.equal(PURPOSE_SECTIONS.length, 4);
  assert.equal(PURPOSE_SECTIONS.flatMap(section => section.questions).length, 20);
  assert.equal(PURPOSE_OPEN_QUESTIONS.length, 5);
  assert.equal(PURPOSE_QUESTION_GUIDANCE.length, 20);
  assert.equal(new Set(PURPOSE_QUESTION_GUIDANCE.map(guidance => guidance.why)).size, 20);
  const starDescriptions = PURPOSE_QUESTION_GUIDANCE.flatMap(guidance => guidance.stars);
  assert.equal(starDescriptions.length, 100);
  assert.equal(new Set(starDescriptions).size, 100);
  for (const guidance of PURPOSE_QUESTION_GUIDANCE) {
    assert.equal(guidance.stars.length, 5);
    assert.ok(guidance.why.length >= 120);
    for (const description of guidance.stars) assert.ok(description.length >= 25);
  }
  const workspace = newPurposeWorkspace({ name: "QA", email: "qa@example.invalid", organisation: "QA Charity" });
  workspace.answers.slice(0, 20).forEach(answer => { answer.score = 4; });
  assert.deepEqual(scorePurpose(workspace.answers), { score: 4, maturity: "Established" });
  workspace.answers[0].comment = "Existing context remains attached to the scored question.";
  workspace.answers[20].answer = "Existing open reflection remains attached to question 21.";
  const restored = normalisePurposeWorkspace(workspace);
  assert.equal(restored.answers.length, 25);
  assert.equal(restored.answers[0].comment, workspace.answers[0].comment);
  assert.equal(restored.answers[20].answer, workspace.answers[20].answer);
});

test("Leadership pathway provides exactly five scored sections, 20 ratings and five qualitative questions", () => {
  assert.equal(LEADERSHIP_SECTIONS.length, 5);
  assert.deepEqual(LEADERSHIP_SECTIONS.map(section => section.questions.length), [4, 4, 4, 4, 4]);
  assert.equal(LEADERSHIP_SECTIONS.flatMap(section => section.questions).length, 20);
  assert.equal(LEADERSHIP_OPEN_QUESTIONS.length, 5);
  const workspace = newLeadershipWorkspace({ name: "QA", email: "qa@example.invalid", organisation: "QA Charity" });
  assert.equal(workspace.answers.length, 25);
  assert.equal(new Set(workspace.answers.map(answer => answer.questionId)).size, 25);
  assert.deepEqual(workspace.answers.map(answer => answer.questionId), Array.from({ length: 25 }, (_, index) => `leadership-${String(index + 1).padStart(2, "0")}`));
});

test("Leadership guidance is fully authored and question-specific", () => {
  assert.equal(LEADERSHIP_QUESTION_GUIDANCE.length, 20);
  assert.equal(new Set(LEADERSHIP_QUESTION_GUIDANCE.map(item => item.why)).size, 20);
  const stars = LEADERSHIP_QUESTION_GUIDANCE.flatMap(item => item.stars);
  assert.equal(stars.length, 100);
  assert.equal(new Set(stars).size, 100);
  for (const item of LEADERSHIP_QUESTION_GUIDANCE) {
    assert.equal(item.stars.length, 5);
    assert.match(item.why, /[.!?].+[.!?]$/);
    for (const description of item.stars) assert.ok(description.length >= 35);
  }
});

test("Leadership scoring reuses Purpose bands, excludes qualitative answers and rejects missing or invalid ratings", () => {
  assert.deepEqual(LEADERSHIP_SCALE, PURPOSE_SCALE);
  const workspace = newLeadershipWorkspace();
  assert.equal(scoreLeadership(workspace.answers), null);
  workspace.answers.slice(0, 20).forEach(answer => { answer.score = 4; });
  workspace.answers.slice(20).forEach(answer => { answer.answer = "Qualitative context that is deliberately unscored."; answer.score = 1; });
  assert.deepEqual(scoreLeadership(workspace.answers), { score: 4, maturity: "Established" });
  workspace.answers[0].score = 6;
  assert.equal(scoreLeadership(workspace.answers), null);
  workspace.answers[0].score = 2;
  assert.deepEqual(scoreLeadership(workspace.answers), { score: 3.9, maturity: "Established" });
  for (const score of [1, 1.79, 1.8, 2.59, 2.6, 3.39, 3.4, 4.19, 4.2, 5]) {
    assert.equal(leadershipMaturity(score), purposeMaturity(score));
  }
});

test("Leadership draft restoration sanitises invalid data without touching other product namespaces", () => {
  const purpose = { preserved: true };
  const snapshot = { answers: [1, 2, 3] };
  const workspace = newLeadershipWorkspace({ organisation: "QA Charity" });
  workspace.status = "draft";
  workspace.answers[0].score = 5;
  workspace.answers[0].comment = "Board challenge is recorded proportionately.";
  workspace.answers[20].answer = "Our leadership is committed but needs clearer shared accountability.";
  const product = { purpose, snapshot, leadership: workspace };
  const restored = normaliseLeadershipWorkspace(product.leadership);
  assert.equal(restored.answers[0].score, 5);
  assert.equal(restored.answers[0].comment, workspace.answers[0].comment);
  assert.equal(restored.answers[20].answer, workspace.answers[20].answer);
  assert.strictEqual(product.purpose, purpose);
  assert.strictEqual(product.snapshot, snapshot);
  const invalid = structuredClone(workspace);
  invalid.answers[1].score = 0;
  invalid.answers[2].questionId = "purpose-03";
  invalid.reviewStatus = "reviewed";
  const sanitised = normaliseLeadershipWorkspace(invalid);
  assert.equal(sanitised.answers[1].score, null);
  assert.equal(sanitised.answers[2].questionId, "leadership-03");
  assert.equal(sanitised.reviewStatus, "not_submitted");
});
