import assert from "node:assert/strict";
import test from "node:test";
import { PILLARS, QUESTIONS } from "../../src/features/excellence/questions.ts";
import { scoreAssessment } from "../../src/features/excellence/scoring.ts";
import { SNAPSHOT_MATURITY } from "../../src/features/excellence/snapshot-maturity.ts";

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
