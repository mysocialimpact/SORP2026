import test from "node:test";
import assert from "node:assert/strict";
import { completedEvent, assessmentExample, validPreparedDocument } from "../../src/app/sorp-journey-progress.ts";

test("a reassuring sentence cannot fabricate completion", () => {
  assert.equal(completedEvent({ phase: "started", message: "We have not yet completed the report" }), false);
  assert.equal(completedEvent({ phase: "retry", message: "No report located" }), false);
  assert.equal(completedEvent({ phase: "completed", message: "All pages read" }), true);
});

test("a stale or incomplete document cannot advance to assessment", () => {
  const document = { id: "saved", expiresAt: new Date(Date.now() + 60000).toISOString(), validation: "passed", pageCount: 26, pagesProcessed: 26 };
  assert.equal(validPreparedDocument(document), true);
  assert.equal(validPreparedDocument({ ...document, pagesProcessed: 25 }), false);
  assert.equal(validPreparedDocument({ ...document, expiresAt: "2000-01-01" }), false);
});

test("the example preserves the authoritative result and rejects conflicts, missing references and invalid evidence", () => {
  const quote = "The charity provides affordable workspace and support to creative organisations.";
  const finding = { fieldId: 1, answer: "partly", assessmentTrail: { classification: "partly", source: { digest: "same-report" }, evidence: [{ id: "E1", page: 2, excerpt: quote }], propositions: [{ id: "Q1.1" }], validation: [{ propositionId: "Q1.1", valid: true }] } };
  const lens = { publicationStatus: "PUBLISHABLE", assessmentRun: { sourceDigest: "same-report" }, diagnostics: { pageCount: 8 }, findings: [finding] };
  assert.equal(assessmentExample(lens), finding);
  assert.equal(assessmentExample(lens).assessmentTrail.evidence[0].excerpt, quote);
  for (const change of [{ contradictions: "Conflicting evidence" }, { answer: "yes" }, { assessmentTrail: { ...finding.assessmentTrail, validation: [] } }, { assessmentTrail: { ...finding.assessmentTrail, evidence: [{ id: "E1", page: 9, excerpt: quote }] } }]) {
    assert.equal(assessmentExample({ ...lens, findings: [{ ...finding, ...change }] }), null);
  }
  assert.equal(assessmentExample({ ...lens, publicationStatus: "REVIEW_REQUIRED" }), null);
});
