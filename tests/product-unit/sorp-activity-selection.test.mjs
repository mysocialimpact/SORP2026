import assert from "node:assert/strict";
import test from "node:test";
import { buildActivitySubmission, toggleActivityChoice } from "../../src/app/sorp-activity-selection.ts";

test("activity choices remain multi-select until the user deliberately continues", () => {
  let selected = toggleActivityChoice([], "Volunteers are significant");
  selected = toggleActivityChoice(selected, "Grant-making is significant");
  assert.deepEqual(selected, ["Volunteers are significant", "Grant-making is significant"]);

  selected = toggleActivityChoice(selected, "Volunteers are significant");
  assert.deepEqual(selected, ["Grant-making is significant"]);
});

test("not sure and none are exclusive activity choices", () => {
  assert.deepEqual(toggleActivityChoice(["Volunteers are significant"], "Not sure"), ["Not sure"]);
  assert.deepEqual(toggleActivityChoice(["Not sure"], "Grant-making is significant"), ["Grant-making is significant"]);
  assert.deepEqual(toggleActivityChoice(["Grant-making is significant"], "None of these apply"), ["None of these apply"]);
});

test("activity submission keeps every selection and optional detail", () => {
  const submission = buildActivitySubmission(
    ["Volunteers are significant", "Grant-making is significant"],
    [
      { label: "VOLUNTEERS", value: "Volunteers are significant" },
      { label: "GRANT-MAKING", value: "Grant-making is significant" },
    ],
    "Around 40 volunteers support delivery.",
  );
  assert.equal(submission.value, "Volunteers are significant. Grant-making is significant\n\nAround 40 volunteers support delivery.");
  assert.equal(submission.display, "VOLUNTEERS · GRANT-MAKING\n\nAround 40 volunteers support delivery.");
});
