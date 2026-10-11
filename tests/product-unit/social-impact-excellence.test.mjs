import assert from "node:assert/strict";
import test from "node:test";
import { PILLARS, QUESTIONS } from "../../src/features/excellence/questions.ts";
import { scoreAssessment } from "../../src/features/excellence/scoring.ts";
import { SNAPSHOT_MATURITY } from "../../src/features/excellence/snapshot-maturity.ts";
import { PURPOSE_OPEN_QUESTIONS, PURPOSE_SECTIONS, scorePurpose, newPurposeWorkspace } from "../../src/features/excellence/purpose.ts";
import { PURPOSE_QUESTION_GUIDANCE } from "../../src/features/excellence/purpose-guidance.ts";

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
  for (const guidance of PURPOSE_QUESTION_GUIDANCE) assert.equal(guidance.stars.length, 5);
  const workspace = newPurposeWorkspace({ name: "QA", email: "qa@example.invalid", organisation: "QA Charity" });
  workspace.answers.slice(0, 20).forEach(answer => { answer.score = 4; });
  assert.deepEqual(scorePurpose(workspace.answers), { score: 4, maturity: "Established" });
});
