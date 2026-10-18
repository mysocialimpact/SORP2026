import test from "node:test";
import assert from "node:assert/strict";
import { publicAccountActions } from "../../src/lib/tool-access-policy.ts";

test("invitation details can be previewed before registration but acceptance stays authenticated", () => {
  assert.equal(publicAccountActions.has("invitation-preview"), true);
  assert.equal(publicAccountActions.has("invitation-accept"), false);
});
