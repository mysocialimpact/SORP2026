/** The released Purpose numerical scale, retained verbatim for cross-pillar consistency. */
export const LEADERSHIP_SCALE = [
  { value: 1, label: "Not Yet Considered" },
  { value: 2, label: "Emerging" },
  { value: 3, label: "Developing" },
  { value: 4, label: "Established" },
  { value: 5, label: "Fully Embedded" }
] as const;

export function leadershipMaturity(score: number) {
  if (score < 1.8) return "Not Yet Considered";
  if (score < 2.6) return "Emerging";
  if (score < 3.4) return "Developing";
  if (score < 4.2) return "Established";
  return "Fully Embedded";
}

export const LEADERSHIP_SECTIONS = [
  { title: "Leadership Commitment", introduction: "Consider whether leaders make social impact a sustained organisational priority, including when pressures compete.", questions: [
    "How strongly does senior leadership demonstrate a genuine commitment to social impact?",
    "How consistently is social impact treated as an organisational priority by senior leadership?",
    "How clearly do senior leaders understand their responsibilities for social impact?",
    "How effectively does leadership maintain its commitment to social impact when faced with competing commercial or operational pressures?"
  ] },
  { title: "Governance & Accountability", introduction: "Explore whether responsibility, oversight and accountability for social impact are clear and meaningful.", questions: [
    "How clearly is responsibility for social impact assigned at senior leadership or board level?",
    "How effectively does the board or governing body oversee the organisation's social impact responsibilities?",
    "How clearly are responsibilities for managing social impact defined across the organisation?",
    "How effectively are leaders held accountable for fulfilling their social impact responsibilities?"
  ] },
  { title: "Leadership Decision-Making", introduction: "Reflect on how impact, potential harm, sustainability and resources feature in important leadership decisions.", questions: [
    "How consistently do leaders consider social impact when making important organisational decisions?",
    "How effectively does leadership consider potential negative social or environmental consequences when making decisions?",
    "How effectively does leadership balance financial sustainability with social impact ambitions?",
    "How effectively does leadership allocate attention and resources to social impact priorities?"
  ] },
  { title: "Leadership Capability & Culture", introduction: "Assess whether leaders have the capability and behaviours needed to create shared responsibility for impact.", questions: [
    "How well equipped are senior leaders to understand and oversee social impact?",
    "How effectively do leaders encourage a culture of responsibility for social impact?",
    "How effectively does leadership encourage constructive challenge and discussion about social impact?",
    "How effectively does leadership involve relevant stakeholders when considering important impact-related decisions?"
  ] },
  { title: "Leadership Review & Continuous Improvement", introduction: "Consider whether leadership learns, responds and maintains responsibility as circumstances change.", questions: [
    "How regularly does senior leadership formally review the organisation's social impact priorities and responsibilities?",
    "How effectively does leadership respond when concerns, weaknesses or failures relating to social impact are identified?",
    "How effectively does leadership use lessons and feedback to improve its approach to social impact?",
    "How effectively does the organisation maintain leadership responsibility for social impact through changes in personnel or organisational circumstances?"
  ] }
] as const;

export const LEADERSHIP_OPEN_QUESTIONS = [
  { question: "In your view, how committed is your organisation's leadership to creating positive social and environmental impact?", supportingText: "Please describe any particular strengths or concerns." },
  { question: "How does your organisation's leadership currently make important decisions when financial, operational and social impact priorities compete?", supportingText: "Please provide an example if possible." },
  { question: "What do you consider the greatest strengths of your organisation's leadership and governance in relation to social impact?" },
  { question: "What are the most significant leadership or governance challenges that could prevent your organisation from achieving its social impact ambitions?" },
  { question: "If you could change three things about how your organisation is led or governed in relation to social impact, what would they be?" }
] as const;

export const LEADERSHIP_STAGES = [
  { title: "Leadership Assessment", description: "Complete the structured maturity assessment.", available: true },
  { title: "Supporting Evidence", description: "Share useful documents and context for MSI review.", available: true },
  { title: "MSI Review Checkpoint", description: "Professional review, interpretation and constructive challenge with MSI.", available: false },
  { title: "Stakeholder Interviews", description: "MSI explores relevant leadership and governance perspectives.", available: false },
  { title: "Leadership Diagnostic", description: "Understand strengths, gaps and priority opportunities.", available: false },
  { title: "Leadership Blueprint", description: "Turn the diagnostic into practical recommendations for improvement.", available: false }
] as const;

export const LEADERSHIP_EVIDENCE_CATEGORIES = [
  "Governance structures", "Board terms of reference", "Organisational charts", "Leadership responsibility documents",
  "Board meeting agendas or minutes", "Strategic planning documents", "Leadership training or development plans",
  "Relevant policies", "Other supporting evidence"
] as const;

export type LeadershipAnswer = { questionId: string; questionNumber: number; score: number | null; comment: string; answer: string };
export type LeadershipEvidence = { id: string; fileName: string; category: string; notes: string; size: number; uploadedAt: string };
export type LeadershipWorkspace = {
  assessmentId: string | null;
  organisationName: string;
  participant: { name: string; role: string; email: string };
  status: "not_started" | "draft" | "assessment_complete" | "evidence_submitted";
  reviewStatus: "not_submitted" | "awaiting_msi_review";
  evidenceStatus: "not_started" | "in_progress" | "submitted";
  score: number | null;
  maturity: string;
  answers: LeadershipAnswer[];
  evidence: LeadershipEvidence[];
  progress: number;
};

function leadershipQuestionId(index: number) { return `leadership-${String(index + 1).padStart(2, "0")}`; }

export function newLeadershipWorkspace(account?: { name?: string; email?: string; organisation?: string }): LeadershipWorkspace {
  return {
    assessmentId: crypto.randomUUID(), organisationName: account?.organisation || "Your charity",
    participant: { name: account?.name || "", role: "", email: account?.email || "" },
    status: "not_started", reviewStatus: "not_submitted", evidenceStatus: "not_started", score: null,
    maturity: "Not Yet Considered", answers: Array.from({ length: 25 }, (_, index) => ({ questionId: leadershipQuestionId(index), questionNumber: index + 1, score: null, comment: "", answer: "" })),
    evidence: [], progress: 0,
  };
}

export function normaliseLeadershipWorkspace(value: unknown, account?: { name?: string; email?: string; organisation?: string }): LeadershipWorkspace {
  const initial = newLeadershipWorkspace(account);
  if (!value || typeof value !== "object") return initial;
  const candidate = value as Partial<LeadershipWorkspace>;
  const source = Array.isArray(candidate.answers) ? candidate.answers : [];
  const answers = initial.answers.map((fallback, index) => {
    const answer = source[index];
    return { ...fallback,
      score: Number.isInteger(answer?.score) && Number(answer.score) >= 1 && Number(answer.score) <= 5 ? Number(answer.score) : null,
      comment: typeof answer?.comment === "string" ? answer.comment.slice(0, 4000) : "",
      answer: typeof answer?.answer === "string" ? answer.answer.slice(0, 8000) : "",
    };
  });
  const evidence = Array.isArray(candidate.evidence) ? candidate.evidence.filter(item => item && typeof item.id === "string").map(item => ({
    id: item.id, fileName: String(item.fileName || "Document"), category: String(item.category || "Other supporting evidence"), notes: String(item.notes || ""), size: Number(item.size) || 0, uploadedAt: String(item.uploadedAt || ""),
  })) : [];
  const statuses = new Set(["not_started", "draft", "assessment_complete", "evidence_submitted"]);
  const evidenceStatuses = new Set(["not_started", "in_progress", "submitted"]);
  const reviewStatuses = new Set(["not_submitted", "awaiting_msi_review"]);
  return { ...initial,
    assessmentId: typeof candidate.assessmentId === "string" ? candidate.assessmentId : initial.assessmentId,
    organisationName: typeof candidate.organisationName === "string" ? candidate.organisationName.slice(0, 180) : initial.organisationName,
    participant: {
      name: typeof candidate.participant?.name === "string" ? candidate.participant.name.slice(0, 120) : initial.participant.name,
      role: typeof candidate.participant?.role === "string" ? candidate.participant.role.slice(0, 120) : "",
      email: typeof candidate.participant?.email === "string" ? candidate.participant.email.slice(0, 254) : initial.participant.email,
    },
    status: statuses.has(String(candidate.status)) ? candidate.status as LeadershipWorkspace["status"] : initial.status,
    reviewStatus: reviewStatuses.has(String(candidate.reviewStatus)) ? candidate.reviewStatus as LeadershipWorkspace["reviewStatus"] : initial.reviewStatus,
    evidenceStatus: evidenceStatuses.has(String(candidate.evidenceStatus)) ? candidate.evidenceStatus as LeadershipWorkspace["evidenceStatus"] : initial.evidenceStatus,
    score: typeof candidate.score === "number" && candidate.score >= 1 && candidate.score <= 5 ? candidate.score : null,
    maturity: typeof candidate.maturity === "string" ? candidate.maturity.slice(0, 80) : initial.maturity,
    answers, evidence, progress: Math.max(0, Math.min(100, Number(candidate.progress) || 0)),
  };
}

export function scoreLeadership(answers: LeadershipAnswer[]) {
  const ratings = answers.slice(0, 20).map(answer => answer.score);
  if (ratings.length !== 20 || ratings.some(value => !Number.isInteger(value) || Number(value) < 1 || Number(value) > 5)) return null;
  const score = Math.round((ratings.reduce<number>((sum, value) => sum + Number(value), 0) / 20) * 10) / 10;
  return { score, maturity: leadershipMaturity(score) };
}
