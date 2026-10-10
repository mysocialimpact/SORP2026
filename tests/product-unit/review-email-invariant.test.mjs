import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { GET as trackedReviewClick } from "../../src/app/api/growth-click/route.ts";
import { POST as publishedReview } from "../../src/app/api/published-review/route.ts";
import { POST as reviewReportEmail } from "../../src/app/api/readiness/review-report-email/route.ts";

const source = readFileSync(new URL("../../src/app/sorp-candidate-review.tsx", import.meta.url), "utf8");

test("review feedback cannot send the published-review notification", async () => {
  const saveFeedback = source.slice(source.indexOf("async function saveFeedback("), source.indexOf("function go(step:", source.indexOf("async function saveFeedback(")));
  assert.doesNotMatch(saveFeedback, /post\(|fetch\(|report-email|operation:\s*["']feedback/);

  const originalFetch = globalThis.fetch;
  let sends = 0;
  globalThis.fetch = async () => { sends++; throw new Error("Review feedback reached an email endpoint"); };
  try {
    const request = new Request("https://mysocialimpact.org/api/published-review", {
      method: "POST",
      headers: { "content-type": "application/json", referer: "https://mysocialimpact.org/are-you-sorp-ready/review" },
      body: JSON.stringify({ operation: "feedback", sessionId: "review-session-123", rating: 5, phase: "quick" }),
    });
    const response = await publishedReview(request);
    assert.equal(response.status, 409);
    assert.equal(sends, 0);
  } finally { globalThis.fetch = originalFetch; }
});

test("report email waits for the completed report, then sends once before optional closing screens", async () => {
  const preFinal = source.slice(source.indexOf("async function review("), source.indexOf("async function sendFinalReport("));
  assert.doesNotMatch(preFinal, /\/api\/readiness\/(?:review-)?report-email|api\.resend\.com\/emails/);
  const finalEffect = source.slice(source.indexOf("const reportComplete"), source.indexOf("function event(type:", source.indexOf("const reportComplete")));
  assert.match(finalEffect, /"final-feedback"/);
  assert.match(finalEffect, /"done"/);
  assert.match(finalEffect, /if \(!reportComplete\)/);
  assert.match(finalEffect, /saved\.emailSent/);
  assert.match(finalEffect, /emailAttempt\.current === receiptKey/);
  const finalSend = source.slice(source.indexOf("async function sendFinalReport("), source.indexOf("async function contribute("));
  assert.match(finalSend, /"final-feedback"/);
  assert.match(finalSend, /"done"/);
  assert.match(finalSend, /deliveryStage: "report-complete"/);
  assert.equal((finalSend.match(/post\("\/api\/readiness\/review-report-email"/g) || []).length, 1);
  assert.match(finalSend, /localStorage\.getItem\(receiptKey\) === "sent"/);
  assert.match(finalSend, /navigator\.locks\.request\(receiptKey, send\)/);

  const originalFetch = globalThis.fetch;
  const originalUrl = process.env.COW_GROWTH_EVENT_URL;
  const originalKey = process.env.COW_GROWTH_EVENT_KEY;
  let forwarded;
  const tracked = [];
  globalThis.fetch = async (input, init) => {
    if (String(input).includes("events.example.test")) {
      tracked.push(JSON.parse(init.body));
      return Response.json({ ok: true });
    }
    forwarded = JSON.parse(init.body);
    return Response.json({ ok: true, attachment: "test-only.pdf" });
  };
  try {
    const response = await reviewReportEmail(new Request("https://example.test/api/readiness/review-report-email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ deliveryStage: "report-complete", sessionId: "review-session-123", email: "nobody@example.test", result: { score: 50 } }),
    }));
    assert.equal(response.status, 200);
    assert.equal(forwarded.commercialJourney.reviews[0].label, "30-minute SORP Review — £50");
    assert.equal(forwarded.commercialJourney.reviews[0].cta, "BOOK 30 MINUTES");
    assert.equal(forwarded.commercialJourney.reviews[1].label, "60-minute SORP Review — £100");
    assert.equal(forwarded.commercialJourney.reviews[1].cta, "BOOK 60 MINUTES");
    assert.match(forwarded.commercialJourney.implementationSupport, /starts from £250/);
    assert.match(forwarded.commercialJourney.implementationSupport, /year-round approach/);
    assert.match(forwarded.commercialJourney.serviceBoundary, /human review/i);
    assert.match(forwarded.commercialJourney.reviews[0].url, /\/api\/growth-click\?review=30&sessionId=review-session-123$/);
    assert.deepEqual(forwarded.result.commercialJourney, forwarded.commercialJourney);

    process.env.COW_GROWTH_EVENT_URL = "https://events.example.test/collect";
    process.env.COW_GROWTH_EVENT_KEY = "test-key";
    const thirty = await trackedReviewClick(new Request("https://example.test/api/growth-click?review=30&sessionId=review-session-123"));
    const sixty = await trackedReviewClick(new Request("https://example.test/api/growth-click?review=60&sessionId=review-session-123"));
    assert.equal(thirty.headers.get("location"), "https://example.test/are-you-sorp-ready/review/booking?session=readiness&source=report-email");
    assert.equal(sixty.headers.get("location"), "https://example.test/are-you-sorp-ready/review/booking?session=wider&source=report-email");
    assert.deepEqual(tracked.map(event => [event.eventType, event.amountMinor]), [["email_review_30_clicked", 5000], ["email_review_60_clicked", 10000]]);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalUrl === undefined) delete process.env.COW_GROWTH_EVENT_URL; else process.env.COW_GROWTH_EVENT_URL = originalUrl;
    if (originalKey === undefined) delete process.env.COW_GROWTH_EVENT_KEY; else process.env.COW_GROWTH_EVENT_KEY = originalKey;
  }
});
