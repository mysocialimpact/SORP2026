import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { verifiedTar } from "../../src/app/sorp-public-model.ts";

const complete = { lens: "tar", readable: true, score: 68, findings: Array.from({ length: 15 }, (_, fieldId) => ({ fieldId: fieldId + 1 })), diagnostics: {
  pageCount: 26, pagesProcessed: 26, textExtractionSuccess: true, extractedTextLength: 54000,
  allChunksIndexed: true, assessmentRetrievalSucceeded: true,
} };

test("TAR found but not fully read never completes homework or enables Quick Review", () => {
  assert.equal(verifiedTar(null), false);
  assert.equal(verifiedTar({ ...complete, readable: false, score: null }), false);
  assert.equal(verifiedTar({ ...complete, diagnostics: { ...complete.diagnostics, pagesProcessed: 25 } }), false);
  assert.equal(verifiedTar({ ...complete, diagnostics: { ...complete.diagnostics, textExtractionSuccess: false } }), false);
  assert.equal(verifiedTar({ ...complete, diagnostics: { ...complete.diagnostics, allChunksIndexed: false } }), false);
  assert.equal(verifiedTar({ ...complete, diagnostics: { ...complete.diagnostics, assessmentRetrievalSucceeded: false } }), false);
  assert.equal(verifiedTar({ ...complete, findings: complete.findings.slice(0, 14) }), false);
});

test("Retry refreshes a saved profile when the public-income tier is missing", async () => {
  const source = await readFile(new URL("../../src/app/sorp-candidate-review.tsx", import.meta.url), "utf8");
  assert.match(source, /saved\.candidate\?\.latestIncome !== null && existingSetup\?\.income/);
  assert.match(source, /const data = canReuseProfile \?/);
});

test("fully read, indexed and assessed TAR allows homework completion and Quick Review", () => {
  assert.equal(verifiedTar(complete), true);
});
