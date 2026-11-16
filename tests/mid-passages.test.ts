import { test } from "node:test";
import assert from "node:assert/strict";
import { sourcePassages, resolveFindings } from "../src/lib/impact-review/mid/passages";
import { validateCitation } from "../src/lib/impact-review/mid/assessment";
import { retryAfter } from "../src/lib/impact-review/mid/ai";
test("source references resolve only to contiguous text on the verified physical page", () => {
  const pages = [
    {
      page: 3,
      text: "This is original source evidence, with unusual punctuation – and numbers 25%.\n".repeat(
        40,
      ),
      extraction: "text" as const,
      readable: true,
    },
    {
      page: 4,
      text: "An unreadable OCR fragment.",
      extraction: "ocr" as const,
      readable: false,
    },
  ];
  const passages = sourcePassages(pages);
  assert.ok(passages.length > 2);
  for (const p of passages) {
    assert.equal(p.page, 3);
    assert.ok(p.quote.length <= 700);
    validateCitation(p, pages);
  }
  const finding = {
    id: "claims.1.1",
    status: "assessed" as const,
    score: 2,
    explanation: "Fixture",
    limitations: [],
    improvement: "Fixture",
    confidence: "low" as const,
    claimIds: [],
    evidenceIds: [passages[0].id],
  };
  const [resolved] = resolveFindings({ findings: [finding] }, passages);
  assert.equal(resolved.evidence[0].quote, passages[0].quote);
  assert.throws(
    () =>
      resolveFindings(
        { findings: [{ ...finding, evidenceIds: ["P4.1"] }] },
        passages,
      ),
    /Unverified quotation/,
  );
});
test("provider backoff honours bounded Retry-After values", () => {
  assert.equal(retryAfter("120"), 120);
  assert.equal(retryAfter(null), 60);
  assert.equal(retryAfter("invalid"), 60);
  assert.equal(retryAfter("9000"), 3600);
  assert.equal(retryAfter("0"), 30);
});

