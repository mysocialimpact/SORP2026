import test from "node:test";
import assert from "node:assert/strict";
import { baselineOnlyAccess, legacyAccess, maturityProgress, normaliseAccess,
  pillarAvailable, pillarProgress } from "../../src/lib/excellence/access-policy.ts";

test("new managed organisations start with only the Maturity Assessment", () => {
  assert.equal(baselineOnlyAccess.stages.maturity, true);
  for (const key of ["diagnostic", "blueprint", "roadmap", "excellence"]) assert.equal(baselineOnlyAccess.stages[key], false);
  for (const key of ["purpose", "leadership", "data", "delivery", "communications"]) assert.equal(baselineOnlyAccess.pillars[key], false);
  assert.equal(normaliseAccess(baselineOnlyAccess)?.pillars.purpose, false);
  assert.equal(normaliseAccess({ stages: {}, pillars: {} }), null);
});

test("completed baseline never automatically unlocks a deep dive", () => {
  const answers = Array(25).fill(3);
  const maturity = maturityProgress({ answers, result: { overall: 3 } });
  assert.deepEqual(maturity, { status: "completed", percentage: 100, score: 3, completed: true });
  assert.equal(pillarAvailable(baselineOnlyAccess, maturity.completed, "purpose"), false);
  assert.equal(pillarAvailable({ ...baselineOnlyAccess, pillars: { ...baselineOnlyAccess.pillars, purpose: true } }, false, "purpose"), false);
  assert.equal(pillarAvailable({ ...baselineOnlyAccess, pillars: { ...baselineOnlyAccess.pillars, purpose: true } }, true, "purpose"), true);
  assert.equal(pillarAvailable(baselineOnlyAccess, true, "leadership"), false);
  assert.equal(legacyAccess.pillars.communications, true);
  assert.equal(maturityProgress({ migration: { source: "legacy-social-impact-excellence" }, result: { overall: 3.5 } }).completed, true);
});

test("access status does not overwrite stored pillar progress", () => {
  const data = { purpose: { status: "draft", progress: 45, score: 2.8 } };
  const before = pillarProgress(data, "purpose");
  assert.deepEqual(before, { status: "in_progress", percentage: 45, score: 2.8 });
  assert.equal(pillarAvailable(baselineOnlyAccess, true, "purpose"), false);
  assert.deepEqual(pillarProgress(data, "purpose"), before);
});
