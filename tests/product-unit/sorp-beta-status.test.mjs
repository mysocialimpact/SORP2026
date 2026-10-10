import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("the review keeps beta visible and explains it only where relevant", async () => {
  const [review, introduction, homework, publishedReview] = await Promise.all([
    readFile(new URL("../../src/app/sorp-candidate-review.tsx", import.meta.url), "utf8"),
    readFile(new URL("../../src/app/sorp-introduction.tsx", import.meta.url), "utf8"),
    readFile(new URL("../../src/app/sorp-homework-experience.tsx", import.meta.url), "utf8"),
    readFile(new URL("../../src/app/api/published-review/route.ts", import.meta.url), "utf8"),
  ]);

  assert.match(review, /Are You SORP Ready\? <small className="scr-beta-badge">BETA<\/small>/);
  assert.doesNotMatch(introduction, /\bbeta\b/i);
  assert.match(review, /HELP THE NEXT CHARITY/);
  assert.match(review, /One quick piece of feedback helps us improve the tool/);
  assert.match(review, /SKIP FOR NOW/);
  assert.match(review, /Thank you\. This genuinely helps us improve the beta\./);
  assert.match(homework, /This tool is still in beta\. Unusual delays like this help us identify where the experience needs to improve\./);
  assert.match(review, /Thanks for helping us improve Are You SORP Ready\? while it’s in beta\./);
  assert.match(review, /productStatus: "BETA"/);
  const snapshot = review.slice(review.indexOf("function QuickReviewResult"), review.indexOf("function ReportHighlights"));
  assert.match(snapshot, /REPORTING STRENGTH/);
  assert.match(review, /MANDATORY SORP REQUIREMENTS/);
  assert.match(snapshot, /MandatoryStatus/);
  assert.match(snapshot, /MUST \/ SHOULD \/ MAY/);
  assert.match(snapshot, /WHAT THIS TELLS US/);
  assert.match(snapshot, /Your full report comes later/);
  assert.doesNotMatch(snapshot, /WHAT LOOKS STRONG|IMPORTANT GAPS|TOP PRIORITIES|EVIDENCE FOUND/);
  assert.ok(snapshot.lastIndexOf("<SnapshotMethod") > snapshot.lastIndexOf("hs-full-report-message"));
  assert.match(review, /DO NOW/);
  assert.match(review, /IMPROVE WHEN PRACTICAL/);
  assert.match(review, /ALREADY STRONG \/ NO ACTION/);
  assert.match(review, /Practical SORP-readiness and Social Impact Excellence support starts from £250/);
  assert.match(review, /human review is where MSI agrees what work, if any/);
  assert.match(publishedReview, /Do not prescribe, recommend or sell specific My Social Impact services/);
});
