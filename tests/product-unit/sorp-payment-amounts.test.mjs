import assert from "node:assert/strict";
import test from "node:test";
import { supportPence } from "../../src/app/sorp-payment-amounts.ts";

test("preset support amounts map exactly to Stripe pence", () => {
  assert.equal(supportPence(5, ""), 500);
  assert.equal(supportPence(10, ""), 1000);
  assert.equal(supportPence(20, ""), 2000);
});

test("custom GBP amounts retain pence exactly", () => {
  assert.equal(supportPence("other", "11"), 1100);
  assert.equal(supportPence("other", "11.25"), 1125);
  assert.equal(supportPence("other", "1.01"), 101);
});

test("invalid and out-of-range amounts cannot reach Checkout", () => {
  for (const value of ["", "0", "0.99", "-5", "1.001", "1,000", "abc", "1000.01"]) {
    assert.equal(supportPence("other", value), null, value);
  }
});
