import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const centre = await readFile(new URL("../../src/components/founder/founder-control-centre.tsx", import.meta.url), "utf8");
const products = await readFile(new URL("../../src/components/founder/product-dashboard.tsx", import.meta.url), "utf8");
const route = await readFile(new URL("../../src/app/api/founder/[...path]/route.ts", import.meta.url), "utf8");
const auth = await readFile(new URL("../../src/lib/founder/auth.ts", import.meta.url), "utf8");

test("founder home uses the requested operational identity and six product tabs", () => {
  assert.match(centre, /Founder Control Centre/);
  assert.match(centre, /Your SORP 2026 platform at a glance/);
  for (const label of ["Home", "Are You SORP Ready?", "Ask SORP", "Charity Impact Reports", "Social Impact Excellence", "My Impact Director"]) assert.match(centre, new RegExp(label.replace(/[?]/g, "\\?")));
  assert.match(centre, /Search organisations or users/);
  assert.doesNotMatch(centre, /Continue your assessment|Where you are|Recommended next step/);
});

test("product dashboards use recorded rows and state truthful empty analytics", () => {
  assert.match(products, /data\.products\.readiness/);
  assert.match(products, /data\.products\.askSorp/);
  assert.match(products, /data\.products\.impactReports/);
  assert.match(products, /data\.products\.excellence/);
  assert.match(products, /data\.products\.impactDirector/);
  assert.match(products, /Topic analytics are not currently collected/);
  assert.match(products, /Conversation content is not shown/);
  assert.match(products, /Search organisation, user or status/);
  assert.match(products, /founder-sort/);
  assert.match(centre, /aria-sort/);
});

test("founder organisation and user data remain server-authorised", () => {
  assert.match(route, /protectFounderRequest\(request\)/);
  assert.match(route, /action:"founder-account-detail"/);
  assert.match(route, /action: "founder-overview"/);
  assert.match(auth, /platformAccess\?\.founder !== true/);
  assert.doesNotMatch(auth, /FOUNDER_EMAIL/);
});
