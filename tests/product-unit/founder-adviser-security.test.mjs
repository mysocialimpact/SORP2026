import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const founderAuth = await readFile(new URL("../../src/lib/founder/auth.ts", import.meta.url), "utf8");
const adviser = await readFile(new URL("../../src/components/adviser/adviser-workspace.tsx", import.meta.url), "utf8");
const invitation = await readFile(new URL("../../src/components/platform/invitation-acceptance.tsx", import.meta.url), "utf8");
const dashboardAccess = await readFile(new URL("../../src/components/console/founder-link.tsx", import.meta.url), "utf8");
const accountSettings = await readFile(new URL("../../src/components/account-settings.tsx", import.meta.url), "utf8");
const platformAuth = await readFile(new URL("../../src/lib/platform/auth.ts", import.meta.url), "utf8");
const onboarding = await readFile(new URL("../../src/features/onboarding/onboarding.tsx", import.meta.url), "utf8");
const accountPortal = await readFile(new URL("../../src/components/account-portal.tsx", import.meta.url), "utf8");
const founderRoute = await readFile(new URL("../../src/app/api/founder/[...path]/route.ts", import.meta.url), "utf8");
const consoleAuth = await readFile(new URL("../../src/lib/console/auth.ts", import.meta.url), "utf8");
const directoryControls = await readFile(new URL("../../src/lib/console/directory-controls.ts", import.meta.url), "utf8");
const directoryData = await readFile(new URL("../../src/lib/directory-data.ts", import.meta.url), "utf8");
const accountDrawers = await readFile(new URL("../../src/components/founder/account-drawers.tsx", import.meta.url), "utf8");
const independentAdmin = await readFile(new URL("../../src/lib/sorp-auth/admin.ts", import.meta.url), "utf8");
const independentCompat = await readFile(new URL("../../src/lib/sorp-auth/compat.ts", import.meta.url), "utf8");
const readinessConversation = await readFile(new URL("../../src/app/sorp-readiness-conversation.tsx", import.meta.url), "utf8");

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

test("delegated assessment writes recheck an active grant, adviser membership, entitlement and charity member", () => {
  assert.match(independentAdmin, /access\.permissions->>'edit'='true'/);
  assert.match(independentAdmin, /client_member\.user_id=\$4 AND client_member\.status='active'/);
  assert.match(independentAdmin, /entitlement\.plan IN \('Adviser','Enterprise'\)/);
  assert.match(independentAdmin, /client_assessment_saved/);
  assert.match(independentCompat, /action === "adviser-assessment-load"/);
  assert.match(independentCompat, /action === "adviser-assessment-save"/);
  assert.match(readinessConversation, /action: delegated \? "adviser-assessment-save" : "save"/);
});

test("client invitations require their own approved permission", () => {
  assert.match(independentAdmin, /access\.permissions->>'invitations'='true'/);
  assert.match(independentAdmin, /adviser_client_member_invited/);
  assert.match(independentCompat, /action === "adviser-client-invite"/);
  assert.match(adviser, /selected\.permissions\.invitations&&<form/);
});

test("founder membership controls preserve a last active owner", () => {
  assert.match(independentAdmin, /Promote another active owner before changing the last owner/);
  assert.match(independentAdmin, /membership_updated/);
  assert.match(accountDrawers, /onMembershipChange/);
});

test("expired or revoked adviser entitlements do not expose the adviser workspace", () => {
  assert.match(platformAuth, /\["Adviser", "Enterprise"\]\.includes\(membership\.entitlement\?\.plan/);
  assert.match(dashboardAccess, /\["Adviser","Enterprise"\]\.includes\(item\.entitlement\?\.plan/);
});

test("charity administrators manage adviser access in Settings with confirmation", () => {
  assert.doesNotMatch(dashboardAccess, /Revoke access/);
  assert.match(accountSettings, /activeClientAccess/);
  assert.match(accountSettings, /window\.confirm/);
  assert.match(accountSettings, /action:"client-access-decide"/);
  assert.match(accountSettings, /\["owner","admin"\]/);
});

test("invitation signup preserves context and acceptance still requires authentication", () => {
  assert.match(invitation, /action:"invitation-preview"/);
  assert.match(invitation, /action:"invitation-accept"/);
  assert.match(invitation, /Create my account/);
  assert.match(invitation, /Already use SORP 2026 with/);
  assert.match(accountPortal, /params\.get\("next"\)/);
  assert.match(invitation, /get-started\/\?next=/);
  assert.doesNotMatch(accountPortal, /action: "signup"/);
  assert.match(onboarding, /invitationToken: invitationTokenFromDestination\(destination\)/);
  assert.match(invitation, /different account/);
});

test("the organisation drawer exposes truthful invitation tracking and existing secure actions", () => {
  assert.match(accountDrawers, /Invitation tracker/);
  assert.match(accountDrawers, /provider confirmation unavailable/);
  assert.match(accountDrawers, /deliveredAt/);
  assert.match(accountDrawers, /acceptedAt/);
  assert.match(accountDrawers, /onResend\(invitation\.id\)/);
  assert.match(accountDrawers, /onRevoke\(invitation\.id\)/);
  assert.match(accountDrawers, /window\.setInterval/);
  assert.doesNotMatch(accountDrawers, /token_hash|tokenHash/);
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
