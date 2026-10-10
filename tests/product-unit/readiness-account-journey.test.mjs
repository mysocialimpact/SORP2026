import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const review = readFileSync(new URL("../../src/app/sorp-candidate-review.tsx", import.meta.url), "utf8");
const google = readFileSync(new URL("../../src/app/booking-google.ts", import.meta.url), "utf8");
const googleCallback = readFileSync(new URL("../../src/app/api/booking/google/callback/route.ts", import.meta.url), "utf8");
const reviewStyles = readFileSync(new URL("../../src/app/sorp-candidate-review.css", import.meta.url), "utf8");

test("the saved account gate sits before public report retrieval and captures the required profile", () => {
  assert.match(review, /\["find", "confirmation", "account"\]/);
  assert.match(review, /go\("account"\); event\("account_step_viewed"\)/);
  assert.match(review, /SIGN IN WITH GOOGLE/);
  assert.match(review, /ALREADY HAVE AN ACCOUNT\?/);
  assert.match(review, /ALREADY HAVE AN ACCOUNT\?[\s\S]*SIGN IN →[\s\S]*scr-google-signin/);
  assert.match(review, /function GoogleMark/);
  assert.match(review, /aria-busy=\{googleSignInStarting\}/);
  assert.match(review, /Confirm email address/);
  assert.match(review, /Confirm password/);
  assert.match(review, /Your role/);
  assert.match(review, /action: "save", progress: saved/);
  assert.match(review, /await startHomework\(\)/);
});

test("account access remains clearly visible in the sticky top-right header", () => {
  assert.match(review, /className="scr-header-actions"/);
  assert.match(review, /className="scr-header-login"/);
  assert.match(review, /LOG IN <b>WITH GOOGLE<\/b>/);
  assert.match(review, /<b>SIGNED IN<\/b>/);
  assert.match(review, /action: "logout"/);
  assert.match(review, /BUILD 120 · 10 OCTOBER 2026 · 13:38 BST/);
  assert.match(review, /className="scr-inline-build"/);
  assert.match(reviewStyles, /\.scr-header-actions\{display:flex/);
  assert.match(reviewStyles, /\.scr-account-switch\{display:flex;width:100%;min-height:76px/);
  assert.match(reviewStyles, /\.scr-inline-build\{[^}]*color:#6a6864/);
  assert.match(reviewStyles, /@media\(max-width:900px\)[\s\S]*grid-template-columns:minmax\(0,1fr\) auto/);
});

test("Google account sign-in retries temporary failures and recovers an interrupted first callback", () => {
  assert.match(googleCallback, /attempt <= 3/);
  assert.match(googleCallback, /response\.status === 429 \|\| response\.status >= 500/);
  assert.match(googleCallback, /account\.response\?\.status === 401/);
  assert.match(googleCallback, /account\.response\?\.status === 409/);
  assert.match(googleCallback, /action: "login"/);
  assert.match(googleCallback, /action: "signup"/);
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
