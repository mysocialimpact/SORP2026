import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const review = readFileSync(new URL("../../src/app/sorp-candidate-review.tsx", import.meta.url), "utf8");
const google = readFileSync(new URL("../../src/app/booking-google.ts", import.meta.url), "utf8");
const googleCallback = readFileSync(new URL("../../src/app/api/booking/google/callback/route.ts", import.meta.url), "utf8");
const backendProxy = readFileSync(new URL("../../src/app/backend-proxy.ts", import.meta.url), "utf8");
const reviewStyles = readFileSync(new URL("../../src/app/sorp-candidate-review.css", import.meta.url), "utf8");
const assessmentModeStyles = readFileSync(new URL("../../src/app/assessment-mode.css", import.meta.url), "utf8");

test("the saved account gate sits before public report retrieval and captures the required profile", () => {
  assert.match(review, /\["find", "confirmation", "account"\]/);
  assert.match(review, /go\("account"\); event\("account_step_viewed"\)/);
  assert.match(review, /ALREADY HAVE AN ACCOUNT\?/);
  assert.match(review, /ALREADY HAVE AN ACCOUNT\?[\s\S]*SIGN IN →[\s\S]*Email address/);
  assert.match(review, /Confirm email address/);
  assert.match(review, /Confirm password/);
  assert.match(review, /Your role/);
  assert.match(review, /action: "save", progress: saved/);
  assert.match(review, /await startHomework\(\)/);
});

test("email account access remains available inside the dedicated assessment shell", () => {
  assert.match(review, /const GOOGLE_ACCOUNT_SIGN_IN_ENABLED = false/);
  assert.match(review, /!account && GOOGLE_ACCOUNT_SIGN_IN_ENABLED && <>/);
  assert.match(review, /CREATE MY FREE ACCOUNT →/);
  assert.match(review, /SIGN IN AND CONTINUE →/);
  assert.match(review, /function AssessmentHeader/);
  assert.match(review, /href="\/are-you-sorp-ready\/"/);
  assert.match(review, /function AssessmentProgress/);
  assert.doesNotMatch(review, /BUILD 120|scr-inline-build|scr-beta-badge/);
  assert.match(reviewStyles, /\.scr-account-switch\{display:flex;width:100%;min-height:76px/);
  assert.match(assessmentModeStyles, /--assessment-header-height: 56px/);
  assert.match(assessmentModeStyles, /grid-template-columns: repeat\(8/);
});

test("Google account callback stays on the destination while the existing backend handles the account", () => {
  assert.match(googleCallback, /proxyExistingSorpBackend\(request, "\/api\/booking\/google\/callback"\)/);
  assert.match(backendProxy, /redirect: "manual"/);
  assert.match(backendProxy, /"location"/);
  assert.match(backendProxy, /getSetCookie/);
});

test("Google account sign-in requests identity only and uses a short-lived signed state", () => {
  const accountFlow = google.slice(google.indexOf("export function readinessAccountOauthUrl"), google.indexOf("export function validOauthState"));
  assert.match(accountFlow, /scope: "openid email profile"/);
  assert.doesNotMatch(accountFlow, /calendar\.events/);
  assert.match(accountFlow, /createHmac\("sha256", clientSecret\)/);
  assert.match(accountFlow, /age < 0 \|\| age > 900/);
  assert.match(accountFlow, /timingSafeEqual/);
  assert.match(accountFlow, /profile\.email_verified/);
  assert.match(accountFlow, /msi-readiness-account:\$\{subject\}/);
});

test("the completed report leads into one consistent beyond-compliance journey", () => {
  assert.match(review, /YOUR REPORT IS COMPLETE ✓/);
  assert.match(review, /Your personalised report is already yours\. Nothing that follows changes that\./);
  assert.match(review, /Purpose · Leadership · Data · Delivery · Communication/);
  assert.match(review, /START THE SOCIAL IMPACT MATURITY ASSESSMENT/);
  assert.match(review, /ASK US TO REVIEW YOUR SOCIAL IMPACT REPORT/);
  assert.match(review, /Social Impact Excellence support starts from £250/);
  assert.match(review, /IMPACT DIRECTOR SUPPORT/);
  assert.doesNotMatch(review, /score >= 70|score < 70/);
});
