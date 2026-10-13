export type ReadinessProgress = {
  step?: string;
  sessionId?: string;
};

const completeSteps = new Set([
  "report-ready", "report", "email-ready", "final-feedback", "support",
  "before-go", "next", "help", "done",
]);

const untouchedSteps = new Set([undefined, "scope", "public-methodology", "intro", "benefits", "find"]);

export function isReadinessComplete(progress?: ReadinessProgress | null) {
  return completeSteps.has(progress?.step || "");
}

export function isReadinessStarted(progress?: ReadinessProgress | null) {
  return Boolean(progress?.sessionId) && !untouchedSteps.has(progress?.step);
}
