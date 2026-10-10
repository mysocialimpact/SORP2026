export type ActivityAction = { label: string; value: string };

export function isExclusiveActivityChoice(value: string) {
  return /\bnone of these\b|\bnot sure\b/i.test(value);
}

export function toggleActivityChoice(current: string[], value: string) {
  if (isExclusiveActivityChoice(value)) return current.includes(value) ? [] : [value];
  const withoutExclusive = current.filter((choice) => !isExclusiveActivityChoice(choice));
  return withoutExclusive.includes(value) ? withoutExclusive.filter((choice) => choice !== value) : [...withoutExclusive, value];
}

export function buildActivitySubmission(selections: string[], actions: ActivityAction[], detail: string) {
  const note = detail.trim();
  const labels = selections.map((value) => actions.find((action) => action.value === value)?.label || value);
  return {
    value: [selections.join(". "), note].filter(Boolean).join("\n\n"),
    display: [labels.join(" · "), note].filter(Boolean).join("\n\n"),
  };
}
