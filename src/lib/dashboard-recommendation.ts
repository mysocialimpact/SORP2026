export type DashboardJourney = {
  readinessStarted: boolean;
  readinessComplete: boolean;
  readinessStep?: string;
  readinessIssues: number;
  reportFeedbackReady: boolean;
  excellenceAnswered: number;
  excellenceComplete: boolean;
};

export type DashboardRecommendation = {
  eyebrow: string;
  title: string;
  reason: string;
  action: string;
  href: string;
};

export function dashboardRecommendation(journey: DashboardJourney): DashboardRecommendation {
  if (!journey.readinessStarted) return {
    eyebrow: "Recommended next step",
    title: "Let’s find out if you’re SORP ready.",
    reason: "Your organisation does not yet have a saved readiness assessment. This is the established starting point for the SORP 2026 journey.",
    action: "Start your free assessment →",
    href: "/are-you-sorp-ready/review/?entry=intro",
  };
  if (!journey.readinessComplete) return {
    eyebrow: "Recommended next step",
    title: "You’re partway through your SORP assessment.",
    reason: "Your saved answers are waiting. Continue from the point already recorded in your account.",
    action: "Continue assessment →",
    href: "/are-you-sorp-ready/review/",
  };
  if (journey.readinessIssues > 0) return {
    eyebrow: "Recommended next step",
    title: "Review the areas that need attention.",
    reason: `Your saved readiness results identify ${journey.readinessIssues} ${journey.readinessIssues === 1 ? "area" : "areas"} to examine. No new assessment is required.`,
    action: "Review your priorities →",
    href: "/are-you-sorp-ready/review/",
  };
  if (["report-ready", "report", "email-ready"].includes(journey.readinessStep || "")) return {
    eyebrow: "Recommended next step",
    title: "Your SORP readiness results are ready.",
    reason: "The assessment is complete and the results already held in your account are ready to review.",
    action: "Review your results →",
    href: "/are-you-sorp-ready/review/",
  };
  if (journey.reportFeedbackReady) return {
    eyebrow: "Recommended next step",
    title: "Your Charity Impact Report feedback is ready.",
    reason: "A completed expert review is available in your account.",
    action: "Open your report feedback →",
    href: "/charity-impact-reports/review/",
  };
  if (journey.excellenceComplete) return {
    eyebrow: "Recommended next step",
    title: "Explore your social impact recommendations.",
    reason: "Your completed Social Impact Excellence assessment identifies the next opportunities recorded for your organisation.",
    action: "Explore your recommendations →",
    href: "/social-impact-excellence/results/",
  };
  if (journey.excellenceAnswered > 0) return {
    eyebrow: "Recommended next step",
    title: "Continue your Social Impact Excellence assessment.",
    reason: `${journey.excellenceAnswered} of 25 answers are safely stored in your account.`,
    action: "Continue assessment →",
    href: "/social-impact-excellence/assessment/",
  };
  return {
    eyebrow: "Recommended next step",
    title: "Keep your SORP readiness results close.",
    reason: "Your readiness assessment is complete. Reopen the saved results whenever you need to plan or brief your team.",
    action: "Review your results →",
    href: "/are-you-sorp-ready/review/",
  };
}
