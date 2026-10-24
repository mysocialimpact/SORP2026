import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  containsIsolatedCustomerReference,
  excludeIsolatedCustomerRows,
  isIsolatedCustomerEmail,
  isIsolatedCustomerIdentity,
  isIsolatedCustomerOrganisation,
} from "../../src/lib/customer-isolation.ts";

const accountRoute = await readFile(new URL("../../src/app/api/readiness-account/route.ts", import.meta.url), "utf8");
const reportRoute = await readFile(new URL("../../src/app/api/readiness/report-email/route.ts", import.meta.url), "utf8");
const founderRoute = await readFile(new URL("../../src/app/api/founder/[...path]/route.ts", import.meta.url), "utf8");

test("the legacy customer is identified by exact account, organisation and domain boundaries", () => {
  assert.equal(isIsolatedCustomerEmail("will@brainstrust.org.uk"), true);
  assert.equal(isIsolatedCustomerEmail("person@team.brainstrust.org.uk"), true);
  assert.equal(isIsolatedCustomerEmail("person@brainstrust.org.uk.example.org"), false);
  assert.equal(isIsolatedCustomerOrganisation("brainstrust"), true);
  assert.equal(isIsolatedCustomerOrganisation("Brainstrust"), true);
  assert.equal(isIsolatedCustomerOrganisation("brainstrust-demo"), false);
  assert.equal(isIsolatedCustomerIdentity({ account: { id: "cff1f534-05f0-4c23-bb0c-729150c52429" } }), true);
  assert.equal(isIsolatedCustomerIdentity({ account: { email: "demo@example.invalid" } }), false);
});

test("collection filtering removes only isolated legacy-customer rows", () => {
  const payload = {
    users: [
      { id: "demo", email: "demo@example.invalid" },
      { id: "cff1f534-05f0-4c23-bb0c-729150c52429", email: "will@brainstrust.org.uk" },
    ],
    organisations: [
      { id: "demo-charity", name: "Demo Charity" },
      { id: "brainstrust", name: "Brainstrust" },
    ],
  };
  assert.equal(containsIsolatedCustomerReference(payload), true);
  assert.deepEqual(excludeIsolatedCustomerRows(payload), {
    users: [{ id: "demo", email: "demo@example.invalid" }],
    organisations: [{ id: "demo-charity", name: "Demo Charity" }],
  });
});

test("SORP entry points block legacy customer access and outbound report email", () => {
  assert.match(accountRoute, /containsIsolatedCustomerReference\(payload\)/);
  assert.match(accountRoute, /isIsolatedCustomerIdentity\(result\)/);
  assert.match(reportRoute, /containsIsolatedCustomerReference\(body\)/);
  assert.match(founderRoute, /isIsolatedCustomerEmail\(email\)/);
  assert.match(founderRoute, /coalesce\(platform_organisation_id,''\) <> 'brainstrust'/);
});
