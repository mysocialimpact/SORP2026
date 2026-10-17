import assert from "node:assert/strict";
import test from "node:test";
import { previewMailEnabled, assertPreviewRecipient } from "../src/lib/sorp-auth/preview-mail";

test("test inbox is unavailable in production, without opt-in, or outside its isolated database", () => {
  const keys = ["VERCEL_ENV", "SORP_AUTH_PREVIEW_MAIL", "SORP_AUTH_DATABASE_URL"] as const;
  const saved = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  try {
    process.env.SORP_AUTH_DATABASE_URL = "postgresql://test@localhost/sorp_flagship_pr94";
    process.env.SORP_AUTH_PREVIEW_MAIL = "true";
    process.env.VERCEL_ENV = "production";
    assert.equal(previewMailEnabled(), false);
    process.env.VERCEL_ENV = "preview";
    assert.equal(previewMailEnabled(), true);
    process.env.SORP_AUTH_DATABASE_URL = "postgresql://test@localhost/production";
    assert.equal(previewMailEnabled(), false);
    process.env.SORP_AUTH_DATABASE_URL = "postgresql://test@localhost/sorp_flagship_pr94";
    delete process.env.SORP_AUTH_PREVIEW_MAIL;
    assert.equal(previewMailEnabled(), false);
  } finally {
    for (const key of keys) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  }
});
test("test inbox accepts only reserved example.invalid recipients", () => {
  assert.doesNotThrow(() => assertPreviewRecipient("preview-qa@example.invalid"));
  for (const email of ["marcus@mysocialimpact.org", "will@brainstrust.org.uk", "qa@example.invalid.evil.com", "qa\n@example.invalid"]) {
    assert.throws(() => assertPreviewRecipient(email));
  }
});
