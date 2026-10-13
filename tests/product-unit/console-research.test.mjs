import { test } from "node:test";
import assert from "node:assert/strict";
import { extractResearchPage } from "../../src/lib/console/extract-page.ts";
import {
  citedPassages,
  validateExtraction,
  citationUrl,
} from "../../src/lib/console/ai-evidence.ts";
import { scoreEvidence } from "../../src/lib/console/scoring-engine.ts";
const response = (text, annotations) => ({
  id: "response-fixture",
  status: "completed",
  output: [
    { type: "message", content: [{ type: "output_text", text, annotations }] },
  ],
});
const citation = (text, url) => ({
  type: "url_citation",
  url,
  title: "Source",
  start_index: text.indexOf("[1]"),
  end_index: text.indexOf("[1]") + 3,
});
test("cited evidence remains bound to its paragraph and provider annotation", () => {
  const a = "Jane Wilson FCA is the charity audit partner. [1]",
    b = "A different firm has 250 charity clients. No citation.";
  const p = citedPassages(
    response(a + "\n\n" + b, [
      citation(a, "https://practice.example/team/jane"),
    ]),
  );
  assert.equal(p.length, 1);
  assert.equal(p[0].summary, a);
  assert.ok(!p[0].summary.includes("250"));
  assert.deepEqual(citedPassages(response(a, [])), []);
});
test("unsafe citation links and invalid annotation offsets cannot become evidence", () => {
  for (const u of [
    "javascript:alert(1)",
    "https://localhost/x",
    "https://127.0.0.1/x",
    "https://user:password@website.example/",
  ])
    assert.throws(() => citationUrl(u));
  assert.deepEqual(
    citedPassages(
      response("A source passage with several words.", [
        {
          type: "url_citation",
          url: "https://site.example",
          start_index: 999,
          end_index: 1000,
        },
      ]),
    ),
    [],
  );
});
test("extraction rejects unsupported people, qualifications, identity and references", () => {
  const p = [
    {
      id: 0,
      url: "https://practice.example/team",
      title: "Team",
      summary: "Jane Wilson FCA is the charity audit partner.",
    },
  ];
  const data = {
    identity_matches: true,
    coverage: ["services", "people", "sorp", "clients", "recognition"].map(
      (category) => ({ category, checked: true, limitation: "" }),
    ),
    evidence: [{ passage_id: 0, category: "people" }],
    people: [
      {
        passage_id: 0,
        name: "Jane Wilson",
        role: "charity audit partner",
        qualifications: ["FCA"],
      },
    ],
  };
  assert.equal(validateExtraction(data, p), data);
  const withoutQualifications = { ...data, people: [{ ...data.people[0], qualifications: [] }] };
  assert.equal(validateExtraction(withoutQualifications, p), withoutQualifications);
  assert.throws(() =>
    validateExtraction({ ...data, identity_matches: false }, p),
  );
  assert.throws(() =>
    validateExtraction(
      { ...data, evidence: [{ passage_id: 12, category: "people" }] },
      p,
    ),
  );
  assert.throws(() =>
    validateExtraction(
      { ...data, people: [{ ...data.people[0], qualifications: ["DChA"] }] },
      p,
    ),
  );
  assert.throws(() =>
    validateExtraction({ ...data, coverage: data.coverage.slice(0, 4) }, p),
  );
});
test("crawler discovers relevant resources and staff links before removing navigation", () => {
  const page = extractResearchPage(
    '<nav><a href="/factsheets/specialist-areas">Factsheets</a><a href="/about/meet-the-team">Meet the team</a><a href="https://other.example/team">Other</a></nav><main><p>We provide accounting services to charities and other local organisations.</p></main>',
    "https://practice.example/",
  );
  assert.equal(page.links.length, 2);
  assert.ok(page.links.some((u) => u.includes("factsheets")));
  assert.ok(!page.text.includes("Factsheets"));
});
test("named staff and offices are extracted without inferring specialist qualifications", () => {
  const page = extractResearchPage(
    "<main><h2>Jane Wilson FCA – Director</h2><p>Jane leads our charity audit team and supports local trustees.</p></main><footer><address>15 Example Street, Bath BA1 1AA</address></footer>",
    "https://practice.example/team",
  );
  assert.equal(page.people[0].name, "Jane Wilson");
  assert.deepEqual(page.people[0].qualifications, ["FCA"]);
  assert.equal(page.offices[0].postcode, "BA1 1AA");
});
test("generic charity factsheets do not earn dedicated service-page points", () => {
  const e = {
    id: "e",
    state: "Current",
    source_type: "Firm website",
    url: "https://practice.example/factsheets/charity-trustees",
    summary:
      "A dedicated charity page explains audit accounts and charity reporting requirements.",
    provenance: { kind: "openai-search" },
  };
  const result = scoreEvidence([e], { sufficient: true });
  assert.ok(!result.awards.some((a) => a.criterion_id === "A1"));
});
test("AI paraphrases are honestly labelled in criterion awards", () => {
  const e = {
    id: "e",
    state: "Current",
    source_type: "Firm website",
    url: "https://practice.example/charities",
    summary: "Our dedicated charity team provides charity audit services.",
    provenance: { kind: "openai-search" },
  };
  const result = scoreEvidence([e], { sufficient: true });
  assert.ok(result.total > 0);
  assert.ok(result.awards.every((a) => a.justification.includes("paraphrase")));
});

test("mixed-source paragraphs cannot attribute every claim to either source", () => {
  const text =
    "One firm has charity services [1], another has specialist awards [2].";
  const annotations = [
    {
      type: "url_citation",
      url: "https://one.example/services",
      start_index: text.indexOf("[1]"),
      end_index: text.indexOf("[1]") + 3,
    },
    {
      type: "url_citation",
      url: "https://two.example/awards",
      start_index: text.indexOf("[2]"),
      end_index: text.indexOf("[2]") + 3,
    },
  ];
  assert.deepEqual(citedPassages(response(text, annotations)), []);
});

test("technical charity articles do not masquerade as dedicated service pages", () => {
  const e = {
    id: "article",
    state: "Current",
    source_type: "Firm website",
    url: "https://practice.example/lease-accounting-rules-charity/",
    summary:
      "If your organisation is an unincorporated charity and has income below £500,000, it is possible to avoid these lease changes by adopting receipts and payments accounts instead.",
  };
  assert.ok(
    !scoreEvidence([e], {
      sufficient: true,
      firmName: "Example Practice",
    }).awards.some((a) => a.criterion_id === "A1"),
  );
});
test("testimonials and firm names cannot masquerade as named charity specialists", () => {
  const e = {
    id: "review",
    state: "Current",
    source_type: "Firm website",
    url: "https://practice.example/charities/",
    summary:
      "As quality assurance partner in a previous role, I can highly recommend Example Practice. Their major strength is specialist accounting and legal expertise in their not-for-profit department.",
  };
  assert.equal(
    scoreEvidence([e], { sufficient: true, firmName: "Example Practice" })
      .scores.people,
    0,
  );
  const company = {
    ...e,
    summary:
      "Example Practice is a specialist charity audit partner responsible for charity accounting services.",
  };
  assert.equal(
    scoreEvidence([company], { sufficient: true, firmName: "Example Practice" })
      .scores.people,
    0,
  );
});
test("explicit charity financial-statement services earn supported service criteria", () => {
  const e = {
    id: "service",
    state: "Current",
    source_type: "Firm website",
    url: "https://practice.example/business-sectors/charities/",
    summary:
      "Publishing high quality annual financial statements is a cornerstone of excellence in charity accountability; we can assist you with this.",
  };
  const result = scoreEvidence([e], { sufficient: true });
  assert.ok(result.awards.some((a) => a.criterion_id === "A1"));
  assert.ok(result.awards.some((a) => a.criterion_id === "A2"));
});
