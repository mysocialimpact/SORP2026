import assert from "node:assert/strict";
import test from "node:test";
import { complimentaryAccessEnd } from "../../src/lib/founder/complimentary-access.ts";

const now = new Date("2026-01-31T12:30:00.000Z");

test("complimentary access supports founder-selected days and weeks", () => {
  assert.equal(complimentaryAccessEnd({ complimentary:true, duration:"period", durationAmount:"10", durationUnit:"days" }, now), "2026-02-10T12:30:00.000Z");
  assert.equal(complimentaryAccessEnd({ complimentary:true, duration:"period", durationAmount:"3", durationUnit:"weeks" }, now), "2026-02-21T12:30:00.000Z");
});

test("calendar months clamp to the final valid day of the target month", () => {
  assert.equal(complimentaryAccessEnd({ complimentary:true, duration:"period", durationAmount:"1", durationUnit:"months" }, now), "2026-02-28T12:30:00.000Z");
});

test("a chosen expiry remains active through the selected date", () => {
  assert.equal(complimentaryAccessEnd({ complimentary:true, duration:"custom", expiry:"2026-03-15" }, now), "2026-03-15T23:59:59.999Z");
});

test("indefinite and non-complimentary plans do not receive an expiry", () => {
  assert.equal(complimentaryAccessEnd({ complimentary:true, duration:"indefinite" }, now), null);
  assert.equal(complimentaryAccessEnd({ complimentary:false, duration:"period", durationAmount:"1", durationUnit:"days" }, now), null);
});

test("invalid, past and excessive durations are rejected", () => {
  assert.throws(() => complimentaryAccessEnd({ complimentary:true, duration:"period", durationAmount:"0", durationUnit:"days" }, now), /valid access period/);
  assert.throws(() => complimentaryAccessEnd({ complimentary:true, duration:"period", durationAmount:"121", durationUnit:"months" }, now), /valid access period/);
  assert.throws(() => complimentaryAccessEnd({ complimentary:true, duration:"custom", expiry:"2025-12-01" }, now), /future expiry date/);
});
