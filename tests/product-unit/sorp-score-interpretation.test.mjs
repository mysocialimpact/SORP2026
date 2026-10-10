import assert from "node:assert/strict";
import test from "node:test";
import { historicalSnapshotInterpretation, mandatoryDistribution, mandatoryInterpretation, mandatoryPriorityAction } from "../../src/app/sorp-score-interpretation.ts";
import { weights } from "../../src/app/sorp-public-model.ts";
import { actionHierarchy, readinessKnowledgeStatus } from "../../src/app/sorp-readiness-presentation.ts";

const finding = (classification, answer) => ({ classification, answer });

test("mandatory distribution uses applicable MUST findings only and excludes genuine N/A", () => {
  const findings = [
    ...Array.from({ length: 9 }, () => finding("MUST", "mostly")),
    ...Array.from({ length: 3 }, () => finding("MUST", "partly")),
    finding("MUST", "limited"),
    finding("MUST", "not_applicable"),
    finding("SHOULD", "yes"),
  ];
  assert.deepEqual(mandatoryDistribution(findings), { yes: 0, mostly: 9, partly: 3, limited: 1, not_yet: 0, not_sure: 0 });
  const snapshot = historicalSnapshotInterpretation({ findings });
  assert.equal(snapshot.applicable, 13);
  assert.equal(snapshot.clearlyDemonstrated, 0);
  assert.equal(snapshot.reportingStrengthExplanation, "Reporting Strength measures how much strong reporting is present across the full framework. Mandatory status asks whether each required area is evidenced clearly enough to be treated as clearly demonstrated.");
  assert.match(snapshot.distinction, /does not override unmet mandatory requirements/i);

  assert.equal(weights.not_sure, 0);
  const someUnknown = readinessKnowledgeStatus(["yes", "mostly", "not_sure"]);
  assert.deepEqual({ answered: someUnknown.answered, notSure: someUnknown.notSure, total: someUnknown.total }, { answered: 2, notSure: 1, total: 3 });
  assert.match(someUnknown.message, /may understate actual readiness/i);
  const mostlyUnknown = readinessKnowledgeStatus([...Array(10).fill("not_sure"), ...Array(9).fill("yes")]);
  assert.equal(mostlyUnknown.label, "NOT YET KNOWN");
  assert.match(mostlyUnknown.message, /insufficient confirmed information/i);
  assert.match(mostlyUnknown.message, /9 of 19 questions were answered and 10 were marked Not sure/i);

  const groups = actionHierarchy([
    { fieldId: 1, answer: "not_yet" }, { fieldId: 2, answer: "not_sure" },
    { fieldId: 3, answer: "partly" }, { fieldId: 4, answer: "mostly" },
    { fieldId: 5, answer: "yes" }, { fieldId: 6, answer: "not_applicable" },
  ]);
  assert.deepEqual(groups.doNow.map(item => item.fieldId), [1, 2]);
  assert.deepEqual(groups.improve.map(item => item.fieldId), [3, 4]);
  assert.deepEqual(groups.noAction.map(item => item.fieldId), [5, 6]);
});

test("the five required synthetic distributions receive deterministic, proportionate interpretations", () => {
  const cases = [
    [{ yes: 0, mostly: 13, partly: 0, limited: 0, not_yet: 0, not_sure: 0 }, /substance is largely there/i],
    [{ yes: 10, mostly: 3, partly: 0, limited: 0, not_yet: 0, not_sure: 0 }, /most of your mandatory requirements are already clearly demonstrated/i],
    [{ yes: 3, mostly: 6, partly: 4, limited: 0, not_yet: 0, not_sure: 0 }, /much of the substance is already there/i],
    [{ yes: 1, mostly: 2, partly: 5, limited: 3, not_yet: 2, not_sure: 0 }, /significant mandatory reporting gaps remain/i],
    [{ yes: 5, mostly: 3, partly: 0, limited: 0, not_yet: 0, not_sure: 2 }, /evidence or human confirmation/i],
  ];
  for (const [distribution, expected] of cases) assert.match(mandatoryInterpretation(distribution), expected);
  for (const [distribution] of cases) assert.equal(mandatoryInterpretation(distribution), mandatoryInterpretation(distribution));
});

test("presentation guard replaces contradictory no-action copy only for non-clear mandatory findings", () => {
  assert.equal(mandatoryPriorityAction({ classification: "MUST", answer: "mostly", action: "No action needed; already strong enough." }, "Outcomes reporting"), "Strengthen the presentation so outcomes reporting is clearly demonstrated.");
  assert.equal(mandatoryPriorityAction({ classification: "MUST", answer: "partly", action: "Nothing else is needed." }, "Learning"), "Strengthen the reporting for learning.");
  assert.equal(mandatoryPriorityAction({ classification: "MUST", answer: "yes", action: "No action needed; already strong enough." }, "Outcomes reporting"), "No action needed; already strong enough.");
  assert.equal(mandatoryPriorityAction({ classification: "SHOULD", answer: "mostly", action: "No action needed; already strong enough." }, "Outcomes reporting"), "No action needed; already strong enough.");
});
