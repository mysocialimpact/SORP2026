import { test } from "node:test";
import assert from "node:assert/strict";
import { criteria } from "../src/lib/impact-review/mid/rubric";
import {
  validateClaims,
  validateFindings,
  scoreFramework,
  type Criterion,
  type Page,
} from "../src/lib/impact-review/mid/assessment";
const pages: Page[] = [
  {
    page: 1,
    text: "We trained 2,000 people. We have not yet measured changes in household income. The board reviewed these results and commissioned follow-up interviews.",
    readable: true,
    extraction: "text",
  },
];
function findings(): Criterion[] {
  return criteria("claims").map((c) => ({
    id: c.id,
    status: "assessed",
    score: 3,
    explanation: "The report supports this judgement.",
    evidence: [{ page: 1, quote: "We trained 2,000 people." }],
    limitations: [],
    improvement: "State how follow-up income data will be collected.",
    confidence: "medium",
    claimIds: [],
  }));
}
test("both rubrics have exactly five principles and twenty unique tests", () => {
  for (const f of ["claims", "excellence"] as const) {
    assert.equal(criteria(f).length, 20);
    assert.equal(new Set(criteria(f).map((c) => c.id)).size, 20);
    assert.equal(new Set(criteria(f).map((c) => c.principle)).size, 5);
  }
});
test("four scores of 3 produce 15/20 per principle and 75/100", () => {
  const s = scoreFramework(findings(), "claims");
  assert.equal(s.overall, 75);
  assert.equal(s.coverage, 20);
  assert.equal(s.provisional, false);
  assert.deepEqual(
    s.principles.map((p) => p.score),
    [15, 15, 15, 15, 15],
  );
});
test("genuine inapplicability changes denominator while preserving coverage", () => {
  const f = findings();
  f[0] = {
    ...f[0],
    status: "not_applicable",
    score: null,
    limitations: [
      "A first report cannot follow up a previous reporting cycle.",
    ],
  };
  const s = scoreFramework(f, "claims");
  assert.equal(s.overall, 75);
  assert.equal(s.coverage, 19);
  assert.equal(s.principles[0].score, 15);
});
test("two excluded tests in a single principle suppress the overall score", () => {
  const f = findings();
  for (const i of [0, 1])
    f[i] = {
      ...f[i],
      status: "unassessable",
      score: null,
      limitations: ["Unreadable material."],
    };
  const s = scoreFramework(f, "claims");
  assert.equal(s.overall, null);
  assert.equal(s.coverage, 18);
  assert.equal(s.provisional, true);
});
test("15 assessable tests suppress the overall even with three per principle", () => {
  const f = findings();
  for (const i of [0, 4, 8, 12, 16])
    f[i] = { ...f[i], status: "unassessable", score: null };
  assert.equal(scoreFramework(f, "claims").overall, null);
});
test("16 assessable tests meet minimum if every principle has three", () => {
  const f = findings();
  for (const i of [0, 4, 8, 12])
    f[i] = { ...f[i], status: "unassessable", score: null };
  assert.equal(scoreFramework(f, "claims").overall, 75);
});
test("zero is assessable missing disclosure, not an excluded test", () => {
  const f = findings().map((f) => ({
    ...f,
    status: "not_demonstrated" as const,
    score: 0,
    evidence: [],
  }));
  const validated = validateFindings(f, "claims", pages, []);
  assert.equal(scoreFramework(validated, "claims").overall, 0);
  assert.equal(scoreFramework(validated, "claims").coverage, 20);
});
test("fabricated quotation is rejected even if its page exists", () => {
  const f = findings();
  f[0].evidence = [
    { page: 1, quote: "Our programme lifted 2,000 people out of poverty." },
  ];
  assert.throws(() => validateFindings(f, "claims", pages, []), /Unverified/);
});
test("invented page reference is rejected", () => {
  const f = findings();
  f[0].evidence[0].page = 9;
  assert.throws(() => validateFindings(f, "claims", pages, []), /Unverified/);
});
test("positive scores without evidence cannot be published", () => {
  const f = findings();
  f[1].evidence = [];
  assert.throws(() => validateFindings(f, "claims", pages, []), /evidence/);
});
test("not applicable must be null and explained", () => {
  const f = findings();
  f[0].status = "not_applicable";
  assert.throws(() => validateFindings(f, "claims", pages, []), /scores/);
  f[0].score = null;
  assert.throws(() => validateFindings(f, "claims", pages, []), /limitation/);
});
test("missing pages prevent zero scores based on absence", () => {
  const f = findings();
  f[0] = { ...f[0], status: "not_demonstrated", score: 0, evidence: [] };
  assert.throws(
    () =>
      validateFindings(
        f,
        "claims",
        [...pages, { page: 2, text: "", readable: false, extraction: "ocr" }],
        [],
      ),
    /absence/,
  );
});
test("duplicate, missing and out-of-framework criterion IDs are rejected", () => {
  const f = findings();
  f[0].id = f[1].id;
  assert.throws(() => scoreFramework(f, "claims"));
  assert.throws(() => validateFindings(f, "claims", pages, []));
  assert.throws(() => scoreFramework(findings().slice(0, 19), "claims"));
});
test("claim register preserves exact claim and verified evidence, rejecting fictional claims", () => {
  const claim = {
    id: "C1",
    text: "We trained 2,000 people.",
    page: 1,
    classification: "output",
    outcome: "Training participation.",
    materiality: "high",
    evidence: [{ page: 1, quote: "We trained 2,000 people." }],
    adequacy: "partial",
    causal: false,
    assumptions: ["Participation does not prove increased income."],
    exaggerationRisk: "low",
    defensibleWording: "",
  };
  assert.equal(validateClaims({ claims: [claim] }, pages).length, 1);
  assert.throws(
    () =>
      validateClaims(
        {
          claims: [
            { ...claim, text: "We lifted 2,000 people out of poverty." },
          ],
        },
        pages,
      ),
    /Unverified/,
  );
  assert.throws(
    () => validateClaims({ claims: [claim, claim] }, pages),
    /Duplicate/,
  );
});
test("unknown claim references and untrusted score additions are rejected", () => {
  const f = findings();
  f[0].claimIds = ["invented"];
  assert.throws(() => validateFindings(f, "claims", pages, []), /Unknown/);
  assert.throws(() =>
    validateFindings(
      findings().map((f) => ({ ...f, overall: 100 })),
      "claims",
      pages,
      [],
    ),
  );
});
test("scores reject fractions, out of bounds, NaN and missing numeric values", () => {
  for (const invalid of [-1, 5, 1.5, NaN, null]) {
    const f = findings();
    f[0].score = invalid;
    assert.throws(() => scoreFramework(f, "claims"));
  }
});

