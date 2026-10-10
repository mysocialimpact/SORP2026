import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const review = readFileSync(new URL("../../src/app/sorp-candidate-review.tsx", import.meta.url), "utf8");
const model = readFileSync(new URL("../../src/app/sorp-public-model.ts", import.meta.url), "utf8");

test("Historical Snapshot exposes a compact 19-question assessment trail at the bottom", () => {
  assert.match(review, /HOW WAS THIS ASSESSED\?/);
  assert.match(review, /<SnapshotMethod[^>]+\/>\s*<SnapshotAssessmentRows lens=\{lens\}\/>/);
  assert.match(review, /source → evidence/);
  assert.match(review, /<AssessmentAudit finding=\{finding\} compact/);
});

test("full report records the complete deterministic chain and run versions", () => {
  for (const label of ["SOURCE:", "EVIDENCE:", "PROPOSITIONS:", "SORP TEST:", "LOGICAL TEST:", "CLASSIFICATION:", "WHY:", "WHY NOT HIGHER:"]) assert.match(review, new RegExp(label));
  assert.match(review, /source SHA-256/);
  assert.match(review, /engine \$\{value\.tar\.assessmentRun/);
  assert.match(model, /assessmentTrail\?: AssessmentTrail/);
});
