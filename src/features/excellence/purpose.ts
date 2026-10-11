export const PURPOSE_SCALE = [
  { value: 1, label: "Not Yet Considered" },
  { value: 2, label: "Emerging" },
  { value: 3, label: "Developing" },
  { value: 4, label: "Established" },
  { value: 5, label: "Fully Embedded" }
] as const;

export const PURPOSE_SECTIONS = [
  {
    title: "Purpose Definition",
    introduction: "Explore how clearly your organisation understands and articulates why it exists.",
    questions: [
      "How clearly documented is your organisation's purpose?",
      "How clearly does your organisation understand why it exists?",
      "How distinct is your purpose from your products, services or activities?",
      "How relevant is your purpose to the organisation today?",
      "How consistently would senior leaders describe your purpose?"
    ]
  },
  {
    title: "Intended Change",
    introduction: "Consider the people, needs and long-term change at the heart of your purpose.",
    questions: [
      "How clearly have you defined the change your organisation wants to create?",
      "How clearly have you identified who benefits from your work?",
      "How clearly do you understand the needs or challenges your organisation exists to address?",
      "How clearly defined are your intended long-term outcomes?",
      "How well developed is your understanding of the difference your organisation wants to make?"
    ]
  },
  {
    title: "Purpose Development",
    introduction: "Reflect on how your purpose is shaped, reviewed and used to guide direction.",
    questions: [
      "How regularly is your purpose reviewed and refined?",
      "How much stakeholder input has shaped your purpose?",
      "How accurately does your current purpose reflect the reality of the organisation?",
      "How effectively does your purpose guide future direction?",
      "How mature is your organisation's thinking about purpose?"
    ]
  },
  {
    title: "Purpose Evidence",
    introduction: "Assess whether your purpose can be understood and tested through the evidence available.",
    questions: [
      "How well supported is your purpose by documented evidence?",
      "How clearly have you articulated the relationship between your purpose and intended impact?",
      "How well evidenced are examples of your purpose in practice?",
      "How clearly have underlying assumptions been identified and considered?",
      "How confident are you that an independent reviewer would understand your purpose from the evidence available?"
    ]
  }
] as const;

export const PURPOSE_OPEN_QUESTIONS = [
  "In your own words, why does your organisation exist?",
  "What positive change is your organisation trying to create?",
  "Who benefits most from your organisation's work and why?",
  "What do you believe are the greatest strengths of your organisation's purpose?",
  "What are the biggest opportunities to strengthen, clarify or develop your purpose over the next three years?"
] as const;

export const PURPOSE_STAGES = [
  { title: "Purpose Assessment", description: "Complete the structured maturity assessment.", available: true },
  { title: "Supporting Evidence", description: "Share useful documents and context for MSI review.", available: true },
  { title: "MSI Review Checkpoint", description: "Review and challenge with a My Social Impact adviser.", available: false },
  { title: "Stakeholder Interviews", description: "Explore perspectives from across your organisation.", available: false },
  { title: "Diagnostic", description: "Understand strengths, gaps and priority opportunities.", available: false },
  { title: "Blueprint", description: "Turn the diagnostic into a practical Purpose Blueprint.", available: false }
] as const;

export const PURPOSE_EVIDENCE_CATEGORIES = [
  "Purpose Statements",
  "Vision or Mission Statements",
  "Strategic Plans",
  "Business Plans",
  "Impact Reports",
  "Funding Applications",
  "Theory of Change Documents",
  "Stakeholder Research",
  "Presentations",
  "Other Relevant Documents"
] as const;

export type PurposeAnswer = { questionNumber: number; score: number | null; comment: string; answer: string };
export type PurposeEvidence = { id: string; fileName: string; category: string; notes: string; size: number; uploadedAt: string };
export type PurposeWorkspace = {
  assessmentId: string | null;
  organisationName: string;
  participant: { name: string; role: string; email: string };
  status: "not_started" | "draft" | "assessment_complete" | "complete";
  evidenceStatus: "not_started" | "in_progress" | "complete";
  score: number | null;
  maturity: string;
  answers: PurposeAnswer[];
  evidence: PurposeEvidence[];
  progress: number;
};

export function purposeMaturity(score: number) {
  if (score < 1.8) return "Not Yet Considered";
  if (score < 2.6) return "Emerging";
  if (score < 3.4) return "Developing";
  if (score < 4.2) return "Established";
  return "Fully Embedded";
}

export function newPurposeWorkspace(account?: { name?: string; email?: string; organisation?: string }): PurposeWorkspace {
  return {
    assessmentId: crypto.randomUUID(),
    organisationName: account?.organisation || "Your charity",
    participant: { name: account?.name || "", role: "", email: account?.email || "" },
    status: "not_started",
    evidenceStatus: "not_started",
    score: null,
    maturity: "Not Yet Considered",
    answers: Array.from({ length: 25 }, (_, index) => ({ questionNumber: index + 1, score: null, comment: "", answer: "" })),
    evidence: [],
    progress: 0,
  };
}

export function normalisePurposeWorkspace(value: unknown, account?: { name?: string; email?: string; organisation?: string }): PurposeWorkspace {
  const initial = newPurposeWorkspace(account);
  if (!value || typeof value !== "object") return initial;
  const candidate = value as Partial<PurposeWorkspace>;
  const answers = Array.isArray(candidate.answers) && candidate.answers.length === 25
    ? candidate.answers.map((answer, index) => ({
        questionNumber: index + 1,
        score: Number.isInteger(answer?.score) && Number(answer.score) >= 1 && Number(answer.score) <= 5 ? Number(answer.score) : null,
        comment: typeof answer?.comment === "string" ? answer.comment.slice(0, 4000) : "",
        answer: typeof answer?.answer === "string" ? answer.answer.slice(0, 8000) : "",
      }))
    : initial.answers;
  const evidence = Array.isArray(candidate.evidence) ? candidate.evidence.filter(item => item && typeof item.id === "string").map(item => ({
    id: item.id, fileName: String(item.fileName || "Document"), category: String(item.category || "Other Relevant Documents"),
    notes: String(item.notes || ""), size: Number(item.size) || 0, uploadedAt: String(item.uploadedAt || ""),
  })) : [];
  const allowedStatus = new Set(["not_started", "draft", "assessment_complete", "complete"]);
  const allowedEvidenceStatus = new Set(["not_started", "in_progress", "complete"]);
  return {
    ...initial,
    assessmentId: typeof candidate.assessmentId === "string" ? candidate.assessmentId : initial.assessmentId,
    organisationName: typeof candidate.organisationName === "string" ? candidate.organisationName.slice(0, 180) : initial.organisationName,
    participant: {
      name: typeof candidate.participant?.name === "string" ? candidate.participant.name.slice(0, 120) : initial.participant.name,
      role: typeof candidate.participant?.role === "string" ? candidate.participant.role.slice(0, 120) : "",
      email: typeof candidate.participant?.email === "string" ? candidate.participant.email.slice(0, 254) : initial.participant.email,
    },
    status: allowedStatus.has(String(candidate.status)) ? candidate.status as PurposeWorkspace["status"] : initial.status,
    evidenceStatus: allowedEvidenceStatus.has(String(candidate.evidenceStatus)) ? candidate.evidenceStatus as PurposeWorkspace["evidenceStatus"] : initial.evidenceStatus,
    score: typeof candidate.score === "number" && candidate.score >= 1 && candidate.score <= 5 ? candidate.score : null,
    maturity: typeof candidate.maturity === "string" ? candidate.maturity.slice(0, 80) : initial.maturity,
    answers, evidence, progress: Math.max(0, Math.min(100, Number(candidate.progress) || 0)),
  };
}

export function scorePurpose(answers: PurposeAnswer[]) {
  const scores = answers.slice(0, 20).map(answer => answer.score).filter((score): score is number => typeof score === "number");
  if (scores.length !== 20) return null;
  const score = Math.round((scores.reduce((sum, value) => sum + value, 0) / scores.length) * 10) / 10;
  return { score, maturity: purposeMaturity(score) };
}
