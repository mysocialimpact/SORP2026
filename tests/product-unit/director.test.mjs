import test from "node:test";
import assert from "node:assert/strict";
import {
  emptyDraft,
  validDraft,
  buildReport,
  QUESTIONS,
  AREAS,
  reportText,
} from "../../src/features/director/model.ts";
test("21 concrete ratings across five areas; incomplete reports refused", () => {
  assert.equal(QUESTIONS.length, 21);
  assert.equal(AREAS.length, 5);
  assert.ok(validDraft(emptyDraft()));
  assert.throws(() => buildReport(emptyDraft()));
});
test("scores use equal pillar weighting and bounded meaningful anchors", () => {
  for (const rating of [1, 3, 5]) {
    const d = {
      ...emptyDraft(),
      ratings: Array(21).fill(rating),
      completed: true,
      step: 25,
    };
    const r = buildReport(d);
    assert.equal(r.overall, rating);
    assert.equal(r.priorities.length, 3);
    assert.equal(r.areas.length, 5);
  }
  const d = {
    ...emptyDraft(),
    ratings: QUESTIONS.map((q) => (q[0] === 1 ? 5 : 1)),
    completed: true,
    step: 25,
  };
  assert.equal(buildReport(d).overall, 1.8);
});
test("validation rejects invalid, incomplete and oversized payloads", () => {
  assert.equal(validDraft({ ...emptyDraft(), ratings: [6] }), false);
  assert.equal(validDraft({ ...emptyDraft(), completed: true }), false);
  assert.equal(validDraft({ ...emptyDraft(), step: 25 }), false);
  assert.equal(
    validDraft({
      ...emptyDraft(),
      reflections: ["x".repeat(10001), "", "", ""],
    }),
    false,
  );
});
test("agenda preserves actual context and never invents systems", () => {
  const d = {
    ...emptyDraft(),
    ratings: Array(21).fill(2),
    completed: true,
    step: 25,
    reflections: [
      "Excel and a shared drive",
      "Repeated copying",
      "More time with beneficiaries",
      "A small volunteer team",
    ],
  };
  const r = buildReport(d);
  assert.ok(r.agenda.join(" ").includes(d.reflections[0]));
  assert.ok(r.agenda.join(" ").includes(d.reflections[1]));
  assert.ok(reportText(d).includes("not independently verified"));
  assert.ok(reportText(d).includes(QUESTIONS[20][1]));
  d.reflections = ["", "", "", ""];
  assert.match(buildReport(d).agenda[1], /none were specified/);
});
