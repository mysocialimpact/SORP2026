import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const founderAuth = await readFile(new URL("../../src/lib/founder/auth.ts", import.meta.url), "utf8");
const adviser = await readFile(new URL("../../src/components/adviser/adviser-workspace.tsx", import.meta.url), "utf8");
const invitation = await readFile(new URL("../../src/components/platform/invitation-acceptance.tsx", import.meta.url), "utf8");

test("the founder page requires the server-issued platform founder role", () => {
  assert.match(founderAuth, /data\.platformAccess\?\.founder !== true/);
  assert.doesNotMatch(founderAuth, /account\.email.*FOUNDER_EMAIL/);
});

test("the adviser UI uses the permission-enforcing account actions", () => {
  assert.match(adviser, /action:"adviser-workspace"/);
  assert.match(adviser, /action:"adviser-client"/);
  assert.match(adviser, /status!=="active"/);
  assert.match(adviser, /No assessment data is visible yet/);
});

test("invitation acceptance requires an authenticated account", () => {
  assert.match(invitation, /action:"invitation-accept"/);
  assert.match(invitation, /Sign in to accept/);
});
