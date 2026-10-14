import assert from "node:assert/strict";
import test from "node:test";
import { dashboardRecommendation } from "../../src/lib/dashboard-recommendation.ts";

const base = {
  readinessStarted: false,
  readinessComplete: false,
  readinessIssues: 0,
  reportFeedbackReady: false,
  excellenceAnswered: 0,
  excellenceComplete: false,
};

test("a new organisation starts with Are You SORP Ready", () => {
  const result = dashboardRecommendation(base);
  assert.equal(result.href, "/are-you-sorp-ready/review/?entry=intro");
  assert.match(result.title, /SORP ready/);
});

test("saved readiness work is continued rather than restarted", () => {
  const result = dashboardRecommendation({ ...base, readinessStarted: true });
  assert.equal(result.href, "/are-you-sorp-ready/review/");
  assert.match(result.title, /partway/);
});

test("real readiness issues take priority after completion", () => {
  const result = dashboardRecommendation({ ...base, readinessStarted: true, readinessComplete: true, readinessIssues: 3, reportFeedbackReady: true });
  assert.match(result.title, /areas that need attention/);
  assert.match(result.reason, /3 areas/);
});

test("completed impact work links to its saved recommendations", () => {
  const result = dashboardRecommendation({ ...base, readinessStarted: true, readinessComplete: true, excellenceAnswered: 25, excellenceComplete: true });
  assert.equal(result.href, "/social-impact-excellence/results/");
  assert.match(result.title, /social impact recommendations/);
});
