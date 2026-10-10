export type AnswerValue = "yes" | "mostly" | "partly" | "not_yet" | "not_sure";
export type AdditionalAnswerValue = AnswerValue | "not_applicable";
export type Classification = "MUST" | "SHOULD" | "MAY" | "JUDGEMENT" | "MSI_READINESS";
export type Tier = "tier1" | "tier2" | "tier3";

export type AssessmentSetup = {
  legalStatus?: string;
  role: string;
  jurisdiction: string;
  startDate: string;
  endDate: string;
  accounts: string;
  accountsReview?: "" | "pending" | "accepted" | "unconfirmed" | "skipped";
  income: string;
  nearBoundary: boolean;
  activities: string[];
};

export type CoreQuestion = {
  id: number;
  section: "objectives" | "achievements" | "learning" | "reporting";
  question: string;
  helper?: string;
  explanation: string;
  sources: string[];
  classification: Record<Tier, Classification>;
  affectsScore: true;
  generatesFlag: true;
};

export type AdditionalCheck = {
  id: "volunteers" | "grant_making" | "social_investment" | "fundraising" | "investments" | "group" | "sustainability";
  title: string;
  question: string;
  explanation: string;
  sources: string[];
  classification: Record<Tier, Classification | null>;
  affectsScore: false;
  generatesFlag: true;
};

export const answerOptions: { value: AnswerValue; label: string; score: number }[] = [
  { value: "yes", label: "Yes, clearly", score: 4 },
  { value: "mostly", label: "Mostly", score: 3 },
  { value: "partly", label: "Partly", score: 2 },
  { value: "not_yet", label: "Not yet", score: 1 },
  { value: "not_sure", label: "Not sure", score: 0 },
];

export const sectionLabels = {
  objectives: "Objectives & activities",
  achievements: "Achievements & performance",
  learning: "Plans for future periods",
  reporting: "Trustees’ Annual Report readiness",
} as const;

export const readinessAreas = [
  { section: "objectives", title: "PURPOSE", label: sectionLabels.objectives, first: 1, last: 4 },
  { section: "achievements", title: "PERFORMANCE", label: sectionLabels.achievements, first: 5, last: 10 },
  { section: "learning", title: "LEARNING", label: sectionLabels.learning, first: 11, last: 13 },
  { section: "reporting", title: "REPORTING", label: sectionLabels.reporting, first: 14, last: 15 },
] as const;

export function scoreReadinessAreas(answers: Readonly<Record<number, AnswerValue | undefined>>) {
  return readinessAreas.map((area) => {
    const questions = coreQuestions.filter((question) => question.section === area.section);
    const points = questions.reduce((total, question) => total + scoreForAnswer(answers[question.id]), 0);
    return { ...area, score: Math.round(points / (questions.length * answerOptions[0].score) * 100) };
  });
}

export const readinessStages = [
  "Your charity & SORP context",
  "Quick Readiness Review",
  "Objectives & activities",
  "Achievements & performance",
  "Plans for future periods",
  "Trustees’ Annual Report readiness",
  "Additional SORP checks",
  "Your Full Readiness Review",
] as const;

export function stageForQuestion(question: CoreQuestion) {
  return { objectives: 3, achievements: 4, learning: 5, reporting: 6 }[question.section];
}

const tiered = (tier1: Classification, tier2: Classification, tier3: Classification): Record<Tier, Classification> => ({ tier1, tier2, tier3 });

export const coreQuestions: CoreQuestion[] = [
  {
    id: 1,
    section: "objectives",
    question: "Can you clearly explain your charity’s purposes and the main activities you undertake to further them?",
    explanation: "SORP requires charities to explain their purposes and main activities.",
    sources: ["1.19"],
    classification: tiered("MUST", "MUST", "MUST"),
    affectsScore: true,
    generatesFlag: true,
  },
  {
    id: 2,
    section: "objectives",
    question: "Can you explain how your main activities further your charitable purposes and create public benefit?",
    explanation: "For England, Wales and Northern Ireland, SORP includes specific public-benefit reporting requirements. In Scotland, the exact wording differs, but the question remains useful for understanding purpose and impact.",
    sources: ["1.20"],
    classification: tiered("MUST", "MUST", "MUST"),
    affectsScore: true,
    generatesFlag: true,
  },
  {
    id: 3,
    section: "objectives",
    question: "Have you set clear aims and objectives for this reporting period — and can you explain how they relate to your longer-term aims?",
    explanation: "Tier 2 and Tier 3 charities must give a more detailed understanding of short- and longer-term aims. For Tier 1, this remains useful readiness and good reporting practice rather than an additional Tier 2 MUST.",
    sources: ["1.23", "1.24"],
    classification: tiered("MSI_READINESS", "MUST", "MUST"),
    affectsScore: true,
    generatesFlag: true,
  },
  {
    id: 4,
    section: "objectives",
    question: "Can you explain how your significant programmes, projects or services contribute to your aims — including the change or difference you are trying to create?",
    explanation: "This reflects the SORP focus on significant activities, their contribution to stated aims and the changes or differences the charity seeks to make.",
    sources: ["1.22", "1.24"],
    classification: tiered("SHOULD", "MUST", "MUST"),
    affectsScore: true,
    generatesFlag: true,
  },
  {
    id: 5,
    section: "achievements",
    question: "Have you decided what success looks like — and what measures or indicators you use to assess performance?",
    explanation: "SORP asks Tier 2 and Tier 3 charities to consider the criteria or measures used to assess success and recommends reporting measures or indicators.",
    sources: ["1.24", "1.31"],
    classification: tiered("MSI_READINESS", "MUST", "MUST"),
    affectsScore: true,
    generatesFlag: true,
  },
  {
    id: 6,
    section: "achievements",
    question: "Can you distinguish between what you did, what you delivered, and what changed as a result?",
    helper: "Activities → Outputs → Outcomes / Impact",
    explanation: "SORP discusses activities, outputs, outcomes and impact when explaining charity performance.",
    sources: ["1.8", "1.31"],
    classification: tiered("MSI_READINESS", "SHOULD", "SHOULD"),
    affectsScore: true,
    generatesFlag: true,
  },
  {
    id: 7,
    section: "achievements",
    question: "Do you collect enough useful evidence to support what you say about outcomes and impact?",
    explanation: "SORP may require the charity to explain impact, but whether the evidence is sufficiently strong and proportionate depends on the charity’s circumstances. SORP does not prescribe one universal evidence methodology.",
    sources: ["1.30", "1.31"],
    classification: tiered("JUDGEMENT", "JUDGEMENT", "JUDGEMENT"),
    affectsScore: true,
    generatesFlag: true,
  },
  {
    id: 8,
    section: "achievements",
    question: "Can you summarise your main achievements and explain the difference your work has made to beneficiaries — and, where relevant, wider society?",
    explanation: "All tiers must summarise the charity’s main achievements. SORP asks trustees to consider the difference made to beneficiaries and wider benefits to society.",
    sources: ["1.27"],
    classification: tiered("MUST", "MUST", "MUST"),
    affectsScore: true,
    generatesFlag: true,
  },
  {
    id: 9,
    section: "achievements",
    question: "Can you compare what actually happened with the aims, objectives or targets you set for the period?",
    explanation: "Tier 2 and Tier 3 reports must explain how well activities were carried out and how far achievements met the aims and objectives set. For Tier 1 this may go beyond the minimum but strengthens the report.",
    sources: ["1.28"],
    classification: tiered("MSI_READINESS", "MUST", "MUST"),
    affectsScore: true,
    generatesFlag: true,
  },
  {
    id: 10,
    section: "achievements",
    question: "Can you explain the impact your charity is making and, where relevant, the longer-term effects of your work without claiming more than your evidence supports?",
    explanation: "Tier 2 and Tier 3 reports must explain impact and consider longer-term effects. ‘Without claiming more than your evidence supports’ is an MSI quality principle, not verbatim SORP wording.",
    sources: ["1.30"],
    classification: tiered("JUDGEMENT", "MUST", "MUST"),
    affectsScore: true,
    generatesFlag: true,
  },
  {
    id: 11,
    section: "learning",
    question: "Can you report what did not go as well as expected, as well as your successes, in a fair and balanced way?",
    explanation: "SORP describes the report as an opportunity to acknowledge successes, failures and learning, and says it should provide a fair, balanced and understandable review.",
    sources: ["1.5", "1.9"],
    classification: tiered("SHOULD", "SHOULD", "SHOULD"),
    affectsScore: true,
    generatesFlag: true,
  },
  {
    id: 12,
    section: "learning",
    question: "Can you identify the important positive and negative factors that affected your results — including things outside your control?",
    explanation: "Tier 2 and Tier 3 reporting should comment on significant positive and negative factors affecting objectives and, where relevant, their influence on future plans.",
    sources: ["1.32"],
    classification: tiered("MSI_READINESS", "SHOULD", "SHOULD"),
    affectsScore: true,
    generatesFlag: true,
  },
  {
    id: 13,
    section: "learning",
    question: "Can you explain your plans for the future — including how experience or lessons learned are influencing priorities, activities or the use of resources?",
    explanation: "All tiers must provide a summary of future plans. Tier 2 and Tier 3 have additional requirements, and SORP recommends explaining how learning influenced future plans and resource allocation.",
    sources: ["1.47", "1.48", "1.49"],
    classification: tiered("MUST", "MUST", "MUST"),
    affectsScore: true,
    generatesFlag: true,
  },
  {
    id: 14,
    section: "reporting",
    question: "Do your Trustees’ Annual Report, activities, achievements and financial information tell a consistent story about how resources were used to pursue your purposes?",
    explanation: "SORP expects the report and accounts to be consistent and to help users understand the relationship between purposes, activities, achievements, resources and expenditure.",
    sources: ["Scope paragraph 5", "1.8", "1.22"],
    classification: tiered("MUST", "MUST", "MUST"),
    affectsScore: true,
    generatesFlag: true,
  },
  {
    id: 15,
    section: "reporting",
    question: "If you had to prepare the impact-reporting parts of your SORP 2026 Trustees’ Annual Report today, could you readily find and explain the information you would need?",
    helper: "Think about aims, activities, measures, evidence, outcomes, impact, learning and future plans.",
    explanation: "This is an MSI readiness question, not a direct SORP disclosure requirement. It tests whether the information is available before year-end.",
    sources: ["MSI readiness question informed by 1.8–1.15"],
    classification: tiered("MSI_READINESS", "MSI_READINESS", "MSI_READINESS"),
    affectsScore: true,
    generatesFlag: true,
  },
];

export const additionalChecks: AdditionalCheck[] = [
  {
    id: "volunteers",
    title: "Volunteers",
    question: "Can you explain the scale and nature of the contribution volunteers make, including the activities they support?",
    explanation: "The report must explain the scale and nature of volunteer input. Tier 2 and Tier 3 charities should also provide information about volunteer numbers and the activities they support.",
    sources: ["1.21", "1.26"],
    classification: { tier1: "MUST", tier2: "MUST", tier3: "MUST" },
    affectsScore: false,
    generatesFlag: true,
  },
  {
    id: "grant_making",
    title: "Grant-making",
    question: "If grant-making is a material part of your work, can you explain your policy for selecting who receives grants and how the grant-making supports your charitable aims?",
    explanation: "For Tier 2 and Tier 3, where grant-making is material, the report must explain the selection policy. The relationship to charitable aims also helps users understand the activity.",
    sources: ["1.25"],
    classification: { tier1: "JUDGEMENT", tier2: "MUST", tier3: "MUST" },
    affectsScore: false,
    generatesFlag: true,
  },
  {
    id: "social_investment",
    title: "Social investment",
    question: "If social investment is a material part of your activities, can you explain your social investment policies and how those investments contribute to your aims and objectives?",
    explanation: "For Tier 2 and Tier 3, where social investment is material, the report must explain the policies and contribution to aims and objectives.",
    sources: ["1.25"],
    classification: { tier1: "JUDGEMENT", tier2: "MUST", tier3: "MUST" },
    affectsScore: false,
    generatesFlag: true,
  },
  {
    id: "fundraising",
    title: "Fundraising",
    question: "Can you explain how material fundraising activities performed against their objectives and, where material costs were incurred, the effect of that spending on fundraising returns?",
    explanation: "This is an additional Tier 3 reporting requirement where fundraising activities and expenditure are material.",
    sources: ["1.33"],
    classification: { tier1: null, tier2: null, tier3: "MUST" },
    affectsScore: false,
    generatesFlag: true,
  },
  {
    id: "investments",
    title: "Material financial investments",
    question: "Where material financial investments are held, can you review their performance against the investment objectives set?",
    explanation: "Tier 2 and Tier 3 reports must review the performance of material financial investments against the objectives set.",
    sources: ["1.29"],
    classification: { tier1: null, tier2: "MUST", tier3: "MUST" },
    affectsScore: false,
    generatesFlag: true,
  },
  {
    id: "group",
    title: "Subsidiaries / charity group",
    question: "Does your reporting cover the relevant activities, performance and impact of material subsidiaries as well as the parent charity?",
    explanation: "For Tier 2 and Tier 3, the report must explain how well the charity and any subsidiaries carried out their activities and met their aims.",
    sources: ["1.28"],
    classification: { tier1: "JUDGEMENT", tier2: "MUST", tier3: "MUST" },
    affectsScore: false,
    generatesFlag: true,
  },
  {
    id: "sustainability",
    title: "Sustainability / ESG matters",
    question: "Can you summarise how the charity is responding to and managing environmental, governance and social matters?",
    explanation: "For Tier 3 this is a MUST reporting area. Tier 1 and Tier 2 trustees MAY choose to explain how the charity is responding to and managing these matters.",
    sources: ["1.60", "1.61"],
    classification: { tier1: "MAY", tier2: "MAY", tier3: "MUST" },
    affectsScore: false,
    generatesFlag: true,
  },
];

export const scoreForAnswer = (answer?: AnswerValue) => answerOptions.find((option) => option.value === answer)?.score ?? 0;

export function tierFromSetup(setup: AssessmentSetup): Tier | null {
  if (setup.nearBoundary || setup.income === "unsure") return null;
  if (setup.income === "tier3") return "tier3";
  if (setup.income === "tier2") return "tier2";
  if (setup.income === "tier1_low" || setup.income === "tier1_high") return "tier1";
  return null;
}

export function tierLabel(setup: AssessmentSetup) {
  if (setup.nearBoundary) return "Tier 1 / Tier 2 borderline";
  if (setup.income === "unsure" || !setup.income) return "Not yet confirmed";
  return tierFromSetup(setup)?.replace("tier", "Tier ") ?? "Not yet confirmed";
}

export function classificationFor(question: CoreQuestion | AdditionalCheck, setup: AssessmentSetup): Classification {
  const tier = tierFromSetup(setup);
  if (!tier) {
    const possible = [question.classification.tier1, question.classification.tier2, question.classification.tier3].filter(Boolean);
    if (possible.length && possible.every((classification) => classification === possible[0])) return possible[0] as Classification;
    return "JUDGEMENT";
  }
  if (question.id === 2 && ["scotland", "roi", "elsewhere"].includes(setup.jurisdiction)) return "JUDGEMENT";
  return question.classification[tier] ?? "JUDGEMENT";
}

export function eligibilityFor(setup: AssessmentSetup) {
  const reasons: string[] = [];
  let status = "YES — SORP 2026 APPEARS TO APPLY";
  let tone = "yes";

  if (["roi", "not_sure"].includes(setup.jurisdiction) || setup.accounts === "not_sure") {
    status = "PROVISIONAL — WE NEED TO KEEP AN EYE ON THIS";
    tone = "provisional";
  }
  if (setup.jurisdiction === "elsewhere" || setup.accounts === "receipts" || (setup.startDate && setup.startDate < "2026-01-01")) {
    status = "SORP 2026 MAY NOT APPLY TO THESE ACCOUNTS";
    tone = "not_applicable";
  }

  if (["ew", "scotland", "ni"].includes(setup.jurisdiction)) reasons.push("You selected a UK charity jurisdiction.");
  if (setup.jurisdiction === "roi") reasons.push("In the Republic of Ireland, SORP 2026 sets out recommended good practice rather than having exactly the same status as in the UK.");
  if (setup.jurisdiction === "elsewhere") reasons.push("This assessment is designed around Charities SORP 2026 and may not be the appropriate reporting framework outside the UK and Republic of Ireland.");
  if (setup.jurisdiction === "not_sure") reasons.push("Your jurisdiction is not yet confirmed, so this assessment remains provisional.");
  if (setup.startDate >= "2026-01-01") reasons.push("Your reporting period begins on or after 1 January 2026.");
  if (setup.startDate && setup.startDate < "2026-01-01") reasons.push("SORP 2026 would not normally apply to this reporting period unless it is adopted early. You can continue to understand what applies next.");
  if (setup.accounts === "accruals") reasons.push("You told us the charity prepares accruals accounts.");
  if (setup.accounts === "receipts") reasons.push("SORP 2026 does not apply to receipts and payments accounts. You can continue to understand what would apply if the charity moves to accruals reporting.");
  if (setup.accounts === "not_sure") reasons.push("We have not confirmed whether the charity prepares accruals accounts, so the result will remain provisional.");

  return { status, tone, reasons };
}

export function relevantAdditionalChecks(setup: AssessmentSetup) {
  const selected = new Set(setup.activities);
  const uncertainActivities = selected.has("not_sure");
  const tier = tierFromSetup(setup);
  return additionalChecks.filter((check) => {
    if (["volunteers", "grant_making", "social_investment"].includes(check.id)) return selected.has(check.id) || uncertainActivities;
    if (check.id === "fundraising") return tier === "tier3" && selected.has("fundraising");
    if (check.id === "investments") return (tier === "tier2" || tier === "tier3" || !tier) && selected.has("investments");
    if (check.id === "group") return selected.has("group");
    if (check.id === "sustainability") return tier === "tier3";
    return false;
  });
}
