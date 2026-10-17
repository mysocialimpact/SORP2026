import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const review = readFileSync(new URL("../../src/app/sorp-candidate-review.tsx", import.meta.url), "utf8");
const google = readFileSync(new URL("../../src/app/booking-google.ts", import.meta.url), "utf8");
const googleCallback = readFileSync(new URL("../../src/app/api/booking/google/callback/route.ts", import.meta.url), "utf8");
const backendProxy = readFileSync(new URL("../../src/app/backend-proxy.ts", import.meta.url), "utf8");

// Registration-before-review and legacy checkpoint recovery are exercised in
// one-login.spec.ts through the running application.

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
