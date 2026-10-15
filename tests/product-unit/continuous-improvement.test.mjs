import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const component = await readFile(new URL("../../src/components/page-feedback.tsx", import.meta.url), "utf8");
const layout = await readFile(new URL("../../src/app/layout.tsx", import.meta.url), "utf8");
const route = await readFile(new URL("../../src/app/api/continuous-improvement/route.ts", import.meta.url), "utf8");
const founderRoute = await readFile(new URL("../../src/app/api/founder/[...path]/route.ts", import.meta.url), "utf8");
const founderUi = await readFile(new URL("../../src/components/founder/feedback-workspace.tsx", import.meta.url), "utf8");
const migration = await readFile(new URL("../../migrations/006_founder_feedback.sql", import.meta.url), "utf8");
const founderRuntimeMigration = await readFile(new URL("../../migrations/007_founder_control_runtime.sql", import.meta.url), "utf8");
const founderDatabase = await readFile(new URL("../../src/lib/founder/db.ts", import.meta.url), "utf8");

test("one global page-feedback component precedes Talk to us and supports five-star submissions", () => {
  assert.match(component, /Help us make this better\./);
  assert.match(component, /How useful was this page\?/);
  assert.match(component, /\[1, 2, 3, 4, 5\]/);
  assert.match(component, /if \(!rating \|\| state === "sending"\) return/);
  assert.match(component, /state === "sent"/);
  assert.match(component, /if \(!response\.ok \|\| !result\.accepted\) throw/);
  assert.match(component, /pagePath: pathname/);
  assert.ok(layout.indexOf("<PageFeedback />") < layout.indexOf("<SayHello />"));
  assert.ok(layout.indexOf("<SayHello />") < layout.indexOf("<Footer />"));
});

test("feedback accepts visitors, preserves signed-in identity and keeps contact separate", () => {
  assert.match(route, /platformIdentity\(request\.headers\.get\("cookie"\)/);
  assert.match(route, /accountId: `anonymous:\$\{anonymousId\}`/);
  assert.match(route, /founder_feedback/);
  assert.match(route, /founder_contact_enquiries/);
  assert.match(route, /created_at > now\(\) - interval '1 hour'/);
  assert.match(route, /input\.website/);
  assert.match(route, /Please submit from this website/);
  assert.match(route, /SELECT id FROM research_console\.founder_feedback WHERE submission_id=\$1/);
  assert.doesNotMatch(route, /password|session[_ -]?token|assessment answer/i);
});

test("the founder workspace manages feedback, enquiries and explicit improvements", () => {
  assert.match(founderUi, /Errors &amp; Feedback/);
  assert.match(founderUi, /User-submitted problem/);
  assert.match(founderUi, /Automatically detected technical error/);
  assert.match(founderUi, /Publish to authenticated users now/);
  assert.match(founderRoute, /improvement_published/);
  assert.match(founderRoute, /published_at=CASE WHEN \$4 THEN coalesce\(published_at,now\(\)\) ELSE NULL END/);
});

test("the migration constrains workflow state and grants only the existing runtime role", () => {
  assert.match(migration, /CHECK \(status IN \('new','reviewing','actioning','resolved'\)\)/);
  assert.match(migration, /CHECK \(rating BETWEEN 1 AND 5\)/);
  assert.match(migration, /REFERENCES research_console\.founder_feedback\(id\) ON DELETE SET NULL/);
  assert.match(migration, /REVOKE ALL .* FROM PUBLIC/);
  assert.match(migration, /GRANT SELECT, INSERT, UPDATE .* TO sorp_console_runtime/);
  assert.doesNotMatch(migration, /GRANT DELETE/);
});

test("runtime requests never attempt schema mutation and the founder ledger has a unique migration", () => {
  assert.doesNotMatch(founderDatabase, /CREATE TABLE|ALTER TABLE|CREATE INDEX/);
  assert.match(founderRuntimeMigration, /007-founder-control-runtime/);
  assert.match(founderRuntimeMigration, /founder_organisations/);
  assert.match(founderRuntimeMigration, /founder_client_access/);
  assert.match(founderRuntimeMigration, /GRANT SELECT, INSERT, UPDATE/);
  assert.doesNotMatch(founderRuntimeMigration, /GRANT (?:ALL|CREATE|DELETE)/);
});
