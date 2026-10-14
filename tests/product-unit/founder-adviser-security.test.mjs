import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const founderAuth = await readFile(new URL("../../src/lib/founder/auth.ts", import.meta.url), "utf8");
const adviser = await readFile(new URL("../../src/components/adviser/adviser-workspace.tsx", import.meta.url), "utf8");
const invitation = await readFile(new URL("../../src/components/platform/invitation-acceptance.tsx", import.meta.url), "utf8");
const dashboardAccess = await readFile(new URL("../../src/components/console/founder-link.tsx", import.meta.url), "utf8");
const platformAuth = await readFile(new URL("../../src/lib/platform/auth.ts", import.meta.url), "utf8");
const accountPortal = await readFile(new URL("../../src/components/account-portal.tsx", import.meta.url), "utf8");
const founderRoute = await readFile(new URL("../../src/app/api/founder/[...path]/route.ts", import.meta.url), "utf8");
const consoleAuth = await readFile(new URL("../../src/lib/console/auth.ts", import.meta.url), "utf8");
const directoryControls = await readFile(new URL("../../src/lib/console/directory-controls.ts", import.meta.url), "utf8");
const directoryData = await readFile(new URL("../../src/lib/directory-data.ts", import.meta.url), "utf8");

test("the founder page requires the server-issued platform founder role", () => {
  assert.match(founderAuth, /data\.platformAccess\?\.founder !== true/);
  assert.doesNotMatch(founderAuth, /account\.email.*FOUNDER_EMAIL/);
});

test("the research console uses the same server-issued founder role", () => {
  assert.match(consoleAuth, /data\.platformAccess\?\.founder !== true/);
  assert.doesNotMatch(consoleAuth, /ADMIN_EMAIL/);
});

test("the adviser UI uses the permission-enforcing account actions", () => {
  assert.match(adviser, /action:"adviser-workspace"/);
  assert.match(adviser, /action:"adviser-client"/);
  assert.match(adviser, /status!=="active"/);
  assert.match(adviser, /No assessment data is visible yet/);
});

test("expired or revoked adviser entitlements do not expose the adviser workspace", () => {
  assert.match(platformAuth, /\["Adviser", "Enterprise"\]\.includes\(membership\.entitlement\?\.plan/);
  assert.match(dashboardAccess, /\["Adviser","Enterprise"\]\.includes\(item\.entitlement\?\.plan/);
});

test("charity administrators can revoke active adviser access from their dashboard", () => {
  assert.match(dashboardAccess, /activeClientAccess/);
  assert.match(dashboardAccess, /Revoke access/);
  assert.match(dashboardAccess, /action:"client-access-decide"/);
});

test("invitation acceptance requires an authenticated account", () => {
  assert.match(invitation, /action:"invitation-accept"/);
  assert.match(invitation, /Sign in to accept/);
  assert.match(accountPortal, /params\.get\("next"\)/);
});

test("the founder client-access form reaches its two-segment API route", () => {
  assert.match(founderRoute, /resource === "clients" && \(id === "link" \|\| action === "link"\)/);
});

test("founder directory controls stay separate from independent assessment scores", () => {
  assert.match(directoryControls, /credentials->'directory'/);
  assert.doesNotMatch(directoryControls, /UPDATE research_console\.assessments/);
  assert.match(founderRoute, /setHumanReviewed/);
  assert.match(founderRoute, /setDirectoryControls/);
});

test("public directory honours explicit controls and preserves curated defaults", () => {
  assert.match(directoryData, /control\?\.directory_configured/);
  assert.match(directoryData, /control\.public_visible === false/);
  assert.match(directoryData, /featuredPriority/);
});
