/** Delivery Pillar methodology v1.0. Authored diagnostic content is explicit and versioned. */
export const DELIVERY_METHODOLOGY_VERSION = "delivery-v1.0" as const;
export const DELIVERY_SCALE = [
  { value: 1, label: "Not Yet Considered" },
  { value: 2, label: "Emerging" },
  { value: 3, label: "Developing" },
  { value: 4, label: "Established" },
  { value: 5, label: "Fully Embedded" },
] as const;

export type DeliveryQuestion = { number: number; id: string; question: string; why: string; stars: readonly [string, string, string, string, string] };
export const DELIVERY_SECTIONS = [
  {
    id: "delivery-section-1", title: "IMPACT DELIVERY & OPERATIONS",
    introduction: "Explore how clearly intended change is translated into practical, inclusive and dependable day-to-day delivery.",
    questions: [
      { number: 1, id: "DELIVERY01", question: "How clearly are your day-to-day activities connected to the outcomes your organisation intends to support?", why: "Delivery is purposeful when people understand how practical work is expected to contribute to intended outcomes. Mature organisations use that connection to shape activity, rather than assuming that delivering more automatically creates more impact.", stars: [
        "Activities are delivered without a clear connection to the outcomes the organisation intends to support.",
        "Some people can describe an intended connection, but it is informal and rarely influences everyday delivery.",
        "Most significant activities have a reasonable connection to intended outcomes, although gaps or inconsistencies remain.",
        "Teams consistently use clear outcome connections to plan, prioritise and coordinate relevant delivery.",
        "Outcome connections are embedded in delivery decisions, tested against experience and adapted when activities are not contributing as expected.",
      ] },
      { number: 2, id: "DELIVERY02", question: "How effectively does the design of your programmes or services respond to the needs and circumstances of the people you seek to support?", why: "Effective delivery starts with a practical understanding of people, context and barriers to participation. Mature design is accessible and proportionate, and changes when experience shows that people are not being served well.", stars: [
        "Programmes or services are designed with little evidence of the needs, circumstances or access barriers of intended participants.",
        "Some needs are considered, but design mainly reflects assumptions, established routines or the preferences of the organisation.",
        "Relevant needs and access issues inform parts of programme design, though important groups or circumstances may be missed.",
        "Programme design consistently reflects credible understanding of needs, circumstances, accessibility and practical participation barriers.",
        "Design remains responsive to changing needs, includes underserved perspectives and is refined when participation or experience reveals weaknesses.",
      ] },
      { number: 3, id: "DELIVERY03", question: "How reliably do operational plans, responsibilities and coordination support consistent delivery?", why: "Good intentions depend on workable plans and clear coordination. Mature practice gives the right people enough clarity to deliver reliably while allowing proportionate flexibility when circumstances change.", stars: [
        "Delivery relies mainly on individual effort, with unclear plans, responsibilities or coordination.",
        "Basic plans or routines exist, but responsibilities are often unclear and coordination depends on particular individuals.",
        "A workable approach supports most delivery, although handovers, dependencies or consistency still create recurring difficulties.",
        "Clear, proportionate plans and responsibilities enable teams to coordinate and deliver reliably across relevant work.",
        "Operational arrangements remain dependable through change, and teams review and improve coordination when experience exposes friction or failure.",
      ] },
      { number: 4, id: "DELIVERY04", question: "How effectively do managers identify and respond to practical delivery problems as they arise?", why: "Operational issues can affect quality, access and outcomes long before they appear in formal reports. Mature organisations surface problems early, make informed adjustments and learn from recurring causes rather than relying on crisis response.", stars: [
        "Delivery problems are often unnoticed, hidden or addressed only after serious disruption.",
        "Managers respond to obvious problems, but action is reactive and similar issues frequently recur.",
        "There are useful routes for identifying and resolving problems, although response quality varies between teams or situations.",
        "Managers consistently identify material delivery issues early, assign action and make proportionate operational adjustments.",
        "Problem-solving is timely and effective, with recurring causes examined and lessons used to strengthen future delivery arrangements.",
      ] },
    ],
  },
  {
    id: "delivery-section-2", title: "FINANCIAL MANAGEMENT & RESOURCE ALLOCATION",
    introduction: "Consider whether budgets, costing, management information and forecasts actively support delivery and sustainable choices.",
    questions: [
      { number: 5, id: "DELIVERY05", question: "How well are budgets connected to the activities and impact objectives they are intended to support?", why: "A budget should be more than a spending limit; it should express how resources support planned delivery. Mature budgeting makes important assumptions and trade-offs visible and helps managers align money with impact priorities.", stars: [
        "Budgets are not meaningfully connected to particular activities or impact objectives.",
        "Broad spending categories exist, but managers struggle to relate them to planned delivery or intended results.",
        "Major activities have identifiable budgets, although assumptions, shared costs or links to objectives are not consistently clear.",
        "Budgets consistently connect resources to activities and priorities, enabling informed management of delivery and trade-offs.",
        "Budget relationships are embedded in planning, regularly challenged and refined when costs, priorities or delivery assumptions change.",
      ] },
      { number: 6, id: "DELIVERY06", question: "How well do you understand the costs of delivering different programmes, services or activities?", why: "Managers need proportionate cost information to understand resource requirements and compare realistic choices. Mature costing includes relevant direct and shared costs without assuming that complex systems are necessary.", stars: [
        "We have little reliable understanding of what individual programmes, services or activities cost to deliver.",
        "Some obvious direct costs are known, but staff time, shared resources or other material costs are largely overlooked.",
        "Reasonable cost estimates exist for significant work, though allocation methods or updates are inconsistent.",
        "We use proportionate and reliable costing, including relevant shared resources, to understand major delivery activities.",
        "Cost understanding is routinely tested and updated, and managers use it confidently when designing, funding and adapting delivery.",
      ] },
      { number: 7, id: "DELIVERY07", question: "How effectively is financial management information used to improve operational decisions?", why: "Management accounts and other financial information add value when they shape practical choices, not simply when they are produced. Mature practice brings timely financial insight into decisions about staffing, activity, commitments and corrective action.", stars: [
        "Operational decisions are made with little timely or relevant financial information.",
        "Financial figures are available occasionally, but they are mainly retrospective and rarely change delivery decisions.",
        "Managers use relevant financial information for some decisions, although timing, interpretation or follow-through is uneven.",
        "Timely, understandable financial information consistently informs material operational decisions and corrective action.",
        "Financial insight is embedded in management conversations, tested alongside delivery information and improved when it fails to support good decisions.",
      ] },
      { number: 8, id: "DELIVERY08", question: "How effectively do financial forecasts inform delivery commitments, resource choices and sustainability?", why: "Forecasting helps an organisation see whether current plans remain affordable and where action is needed before money becomes a crisis. Mature forecasting is regularly updated and actively connects income, expenditure, cash and operational commitments.", stars: [
        "We have little visibility of future financial requirements or whether current delivery commitments are affordable.",
        "Basic forecasts are prepared occasionally, but they are unreliable, outdated or disconnected from operational choices.",
        "Forecasts cover significant income and expenditure and sometimes inform decisions, though scenarios or delivery implications are incomplete.",
        "Reliable, regularly updated forecasts consistently inform commitments, resource allocation and timely operational adjustments.",
        "Forecasting is embedded in planning, explores credible scenarios and enables leaders to adapt delivery early while protecting impact and financial resilience.",
      ] },
    ],
  },
  {
    id: "delivery-section-3", title: "PEOPLE, CAPACITY & PARTNERSHIPS",
    introduction: "Explore whether people, capacity and working relationships provide the practical capability needed for effective delivery.",
    questions: [
      { number: 9, id: "DELIVERY09", question: "How clearly do staff and volunteers understand their practical responsibilities for delivering the intended work?", why: "Delivery suffers when responsibilities, handovers or decision boundaries are unclear. Mature practice gives people enough clarity to act confidently while keeping roles proportionate to the organisation.", stars: [
        "People are often unsure who is responsible for important delivery tasks or decisions.",
        "Responsibilities are understood informally by some people, but gaps, duplication or reliance on individuals are common.",
        "Most key responsibilities are reasonably clear, although some handovers or decision boundaries remain uncertain.",
        "Staff and volunteers consistently understand relevant responsibilities, dependencies and routes for practical decisions.",
        "Role clarity remains effective through change, and responsibilities are reviewed when delivery experience exposes gaps or unnecessary complexity.",
      ] },
      { number: 10, id: "DELIVERY10", question: "How well are staff and volunteers equipped and supported to deliver their work effectively?", why: "Practical capability depends on relevant skills, information, tools and support, not merely goodwill. Mature organisations target support where it matters and check whether it improves delivery rather than rewarding training volume.", stars: [
        "People are expected to deliver without the essential skills, information, tools or support they need.",
        "Some support is available, but it is informal, reactive or poorly matched to delivery requirements.",
        "Most people receive useful preparation and support, although significant capability gaps remain in some roles or teams.",
        "Relevant staff and volunteers consistently have proportionate skills, tools, guidance and practical support for their responsibilities.",
        "Capability support is embedded and responsive, with its usefulness reviewed and changed as delivery needs, roles or risks evolve.",
      ] },
      { number: 11, id: "DELIVERY11", question: "How effectively do you identify and manage workload, capacity and resource constraints?", why: "Unmanaged pressure can reduce quality, exclude people and create risks for staff, volunteers and participants. Mature practice makes constraints visible and adjusts priorities, resources or expectations rather than normalising unsustainable delivery.", stars: [
        "Workload and capacity constraints are poorly understood and frequently undermine delivery or wellbeing.",
        "Serious pressures are recognised, but responses are usually late, temporary or dependent on individual resilience.",
        "Managers monitor significant capacity issues and make some adjustments, though recurring overload or bottlenecks remain.",
        "Capacity and workload are routinely considered, with priorities, resources or commitments adjusted when material constraints arise.",
        "The organisation anticipates pressure, tests whether responses work and strengthens resilience without treating permanent overwork as efficiency.",
      ] },
      { number: 12, id: "DELIVERY12", question: "How effectively do delivery partners coordinate responsibilities, resources and decisions?", why: "Partnerships create value only when practical expectations, information and accountability work across organisational boundaries. Mature coordination supports shared delivery while respecting each partner’s role and constraints.", stars: [
        "Partnered work proceeds without clear responsibilities, coordination or routes for resolving delivery issues.",
        "Basic expectations are discussed, but working arrangements are informal and misunderstandings frequently affect delivery.",
        "Roles and coordination are reasonably clear for significant partnerships, although information-sharing or escalation remains uneven.",
        "Partners consistently coordinate responsibilities, resources, information and decisions through proportionate working arrangements.",
        "Partnership arrangements are jointly reviewed, power and constraints are addressed openly, and learning improves collective delivery over time.",
      ] },
    ],
  },
  {
    id: "delivery-section-4", title: "PERFORMANCE, EFFICIENCY & VALUE FOR MONEY",
    introduction: "Consider how financial and non-financial insight supports intelligent choices about quality, efficiency and social value.",
    questions: [
      { number: 13, id: "DELIVERY13", question: "How effectively do managers consider financial and non-financial performance information together?", why: "Neither spending figures nor delivery volumes provide a complete management picture alone. Mature practice brings cost, activity, quality and outcome information together without confusing operational performance with proof of impact.", stars: [
        "Financial and delivery information are rarely considered together when managing performance.",
        "Managers compare a few headline figures, but relationships between cost, activity, quality and outcomes remain unclear.",
        "Combined information informs some reviews, although important measures or interpretations are inconsistent.",
        "Managers routinely use relevant financial and non-financial information together to understand performance and make practical decisions.",
        "Integrated management insight is embedded, limitations are recognised and measures are refined when they no longer support useful judgement.",
      ] },
      { number: 14, id: "DELIVERY14", question: "How effectively do you identify and address avoidable inefficiency without undermining quality or access?", why: "Efficiency means using resources well, not simply reducing expenditure. Mature organisations remove waste and friction while checking that changes do not reduce service quality, accessibility or the outcomes being pursued.", stars: [
        "We have little understanding of where time, money or other resources are being wasted.",
        "Obvious inefficiencies are addressed occasionally, often through cost cutting without examining effects on quality or access.",
        "Some recurring inefficiencies are identified and improved, though consequences for delivery are not always assessed.",
        "We consistently address material inefficiency while protecting appropriate quality, accessibility and delivery requirements.",
        "Efficiency improvement is systematic and evidence-informed, with consequences reviewed and gains redirected or sustained to strengthen social value.",
      ] },
      { number: 15, id: "DELIVERY15", question: "How well do you assess the cost-effectiveness and value for money of significant activities?", why: "Value for money balances resources with the quality, reach and results of delivery; the cheapest option is not necessarily the best. Mature judgement uses proportionate evidence and recognises equity, uncertainty and outcomes that cannot sensibly be reduced to money.", stars: [
        "We do not meaningfully consider whether significant activities provide value relative to the resources used.",
        "Value for money is discussed mainly as cost reduction, with little consideration of quality, reach or intended outcomes.",
        "We make reasonable cost-effectiveness judgements for some activities, but evidence or treatment of wider value is incomplete.",
        "Significant activities are consistently assessed using proportionate information about cost, quality, reach and relevant outcomes.",
        "Value-for-money judgement is embedded, explicitly considers equity and longer-term value, and is refined as costs and evidence change.",
      ] },
      { number: 16, id: "DELIVERY16", question: "How effectively do you use performance and cost information when deciding what to continue, change, expand or stop?", why: "Resource allocation requires explicit choices rather than allowing every activity to continue by default. Mature decisions consider evidence, strategic fit, full costs, practical constraints and likely consequences for people.", stars: [
        "Activities continue, change or end with little structured consideration of performance, cost or consequences.",
        "Decisions use isolated figures or immediate pressures, with limited comparison of realistic alternatives.",
        "Relevant performance and cost information informs some significant choices, although assumptions and consequences are not always explicit.",
        "Decisions about continuing, changing, expanding or stopping work consistently use proportionate performance, cost and contextual information.",
        "Decision practice is embedded and transparent, tests alternatives and revisits choices when actual costs, delivery or consequences differ from expectations.",
      ] },
    ],
  },
  {
    id: "delivery-section-5", title: "QUALITY, ADAPTATION & SUSTAINABILITY",
    introduction: "Explore whether delivery remains safe, reliable, adaptable and financially sustainable as circumstances change.",
    questions: [
      { number: 17, id: "DELIVERY17", question: "How consistently do you maintain and review appropriate quality in delivery?", why: "Reliable delivery needs a shared understanding of what good practice looks like in context. Mature quality management is proportionate, learns from variation and focuses on people’s experience rather than documentation alone.", stars: [
        "There is no shared understanding of acceptable delivery quality, and serious variation may go unnoticed.",
        "Some quality expectations exist, but they are informal, unevenly applied or checked only after problems arise.",
        "Useful quality arrangements cover most significant work, though application or follow-up remains inconsistent.",
        "Appropriate quality expectations are consistently applied, monitored and used to address material variation in delivery.",
        "Quality practice is embedded and proportionate, incorporates people’s experience and is improved when review shows that standards or methods are insufficient.",
      ] },
      { number: 18, id: "DELIVERY18", question: "How effectively do you manage operational and financial risks that could disrupt delivery or cause harm?", why: "Delivery can be undermined by financial shocks, service disruption, unsafe practice or unintended consequences. Mature risk management prioritises material risks, prepares workable responses and checks that safeguards function in practice.", stars: [
        "Material operational, financial or harm risks are poorly understood and usually addressed only after an incident.",
        "Some obvious risks and safeguards are recognised, but responsibilities, contingency arrangements or follow-through are unclear.",
        "Significant risks are identified and managed through reasonable controls, although gaps or untested assumptions remain.",
        "Material risks are consistently monitored, owned and addressed through proportionate safeguards and continuity arrangements.",
        "Risk management is embedded in delivery decisions, tests whether safeguards work and adapts promptly to incidents, emerging threats or unintended harm.",
      ] },
      { number: 19, id: "DELIVERY19", question: "How effectively do feedback and implementation learning lead to practical improvements?", why: "Learning matters when it changes delivery, not simply when it is collected or discussed. Mature organisations act on credible insight, explain choices and check whether adaptations produce a useful improvement.", stars: [
        "Feedback and delivery experience rarely lead to identifiable changes in practice.",
        "Individual teams make occasional adjustments, but learning is informal and important issues may be repeatedly missed.",
        "Relevant feedback and experience produce useful improvements in some areas, though prioritisation or follow-up is inconsistent.",
        "Managers consistently translate credible feedback and implementation learning into proportionate delivery improvements.",
        "Improvement is embedded: changes are tested, their effects are reviewed and lessons are shared or revised when an adaptation does not work.",
      ] },
      { number: 20, id: "DELIVERY20", question: "How well can successful delivery be sustained or expanded without weakening quality, impact or financial resilience?", why: "Growth is valuable only when the operating model, people and finances can support it. Mature organisations understand what makes delivery effective, test capacity and costs, and choose sustainable scale rather than expansion for its own sake.", stars: [
        "Continuation or growth decisions are made without understanding the capacity, costs or conditions required for effective delivery.",
        "The organisation can sustain current work only through fragile arrangements, and expansion is considered mainly as an opportunity for more activity.",
        "Important capacity and financial requirements are understood, but sustainability or scaling plans still contain significant gaps.",
        "Decisions about sustaining or expanding work consistently consider quality, capability, full costs, funding and operational resilience.",
        "The organisation can identify what makes delivery effective, tests sustainable approaches to scale and adapts ambitions when quality, impact or resilience would be weakened.",
      ] },
    ],
  },
] as const satisfies readonly { id: string; title: string; introduction: string; questions: readonly DeliveryQuestion[] }[];

export const DELIVERY_OPEN_QUESTIONS = [
  { number: 21, id: "DELIVERY_OPEN01", question: "What are the greatest practical obstacles to delivering the impact your organisation intends?", helperText: "Tell us about the operational realities that most affect your work, including anything that is difficult to resolve." },
  { number: 22, id: "DELIVERY_OPEN02", question: "Which financial or resource constraints have the biggest effect on delivery?", helperText: "This might include funding restrictions, cash flow, staffing, facilities, technology, partner capacity or competing priorities." },
  { number: 23, id: "DELIVERY_OPEN03", question: "Which activities, programmes or working arrangements currently work particularly well, and why?", helperText: "Share the practical strengths you would want to protect, sustain or build upon." },
  { number: 24, id: "DELIVERY_OPEN04", question: "Where could your delivery become more effective, efficient or valuable for the people you support?", helperText: "Consider quality, access, coordination, cost, capacity or decisions that could be improved." },
  { number: 25, id: "DELIVERY_OPEN05", question: "What are the most important delivery improvements you would like to make over the next 12 months?", helperText: "Describe your priorities and any financial, operational or professional support that would help." },
] as const;

export const DELIVERY_STAGES = [
  { title: "Delivery Assessment", description: "Complete the maturity questions and share the practical context behind your answers. Your score is a provisional self-assessment.", available: true },
  { title: "Supporting Evidence", description: "Optionally share relevant operational and financial materials that help explain how delivery works in practice.", available: true },
  { title: "MSI Review Checkpoint", description: "My Social Impact reviews the assessment and available evidence, identifies points for clarification and agrees the next steps.", available: false },
  { title: "Stakeholder Interviews", description: "MSI explores operational and financial practice with relevant leaders, managers, staff and partners.", available: false },
  { title: "Delivery Diagnostic", description: "Receive professional findings on delivery strengths, operational and financial weaknesses, value for money and practical priorities.", available: false },
  { title: "Delivery Blueprint", description: "Receive a structured approach connecting operational and financial improvements to your social impact objectives.", available: false },
] as const;

export const DELIVERY_EVIDENCE_CATEGORIES = [
  "Delivery or operational plan", "Programme budget", "Management accounts", "Financial forecast", "Programme costing",
  "Resource allocation plan", "Operational procedure", "Staff or volunteer guidance", "Training material", "Partnership agreement",
  "Quality monitoring", "Anonymised beneficiary feedback", "Improvement example", "Business continuity arrangement", "Other supporting evidence",
] as const;

export type DeliveryAnswer = { questionId: string; questionNumber: number; score: number | null; comment: string; answer: string };
export type DeliveryEvidence = { id: string; fileName: string; category: string; notes: string; size: number; uploadedAt: string };
export type DeliverySubmission = { assessmentId: string; methodologyVersion: typeof DELIVERY_METHODOLOGY_VERSION; submittedAt: string; score: number; maturity: string; answers: DeliveryAnswer[] };
export type DeliveryWorkspace = {
  assessmentId: string; methodologyVersion: typeof DELIVERY_METHODOLOGY_VERSION; organisationName: string;
  participant: { name: string; role: string; email: string };
  status: "not_started" | "draft" | "assessment_complete" | "evidence_submitted";
  reviewStatus: "not_submitted" | "awaiting_msi_review"; evidenceStatus: "not_started" | "in_progress" | "submitted";
  score: number | null; maturity: string; answers: DeliveryAnswer[]; evidence: DeliveryEvidence[]; submissions: DeliverySubmission[]; progress: number;
};

export function deliveryMaturity(score: number) {
  if (score < 1.8) return "Not Yet Considered";
  if (score < 2.6) return "Emerging";
  if (score < 3.4) return "Developing";
  if (score < 4.2) return "Established";
  return "Fully Embedded";
}

const deliveryIds = [...DELIVERY_SECTIONS.flatMap(section => section.questions.map(question => question.id)), ...DELIVERY_OPEN_QUESTIONS.map(question => question.id)];
export function newDeliveryWorkspace(account?: { name?: string; email?: string; organisation?: string }): DeliveryWorkspace {
  return {
    assessmentId: crypto.randomUUID(), methodologyVersion: DELIVERY_METHODOLOGY_VERSION, organisationName: account?.organisation || "Your organisation",
    participant: { name: account?.name || "", role: "", email: account?.email || "" },
    status: "not_started", reviewStatus: "not_submitted", evidenceStatus: "not_started", score: null, maturity: "Not Yet Considered",
    answers: deliveryIds.map((questionId, index) => ({ questionId, questionNumber: index + 1, score: null, comment: "", answer: "" })),
    evidence: [], submissions: [], progress: 0,
  };
}

function cleanDeliveryAnswers(value: unknown, initial: DeliveryAnswer[]) {
  const source = Array.isArray(value) ? value : [];
  return initial.map((fallback, index) => {
    const answer = source[index];
    return { ...fallback,
      score: Number.isInteger(answer?.score) && Number(answer.score) >= 1 && Number(answer.score) <= 5 ? Number(answer.score) : null,
      comment: typeof answer?.comment === "string" ? answer.comment.slice(0, 4000) : "",
      answer: typeof answer?.answer === "string" ? answer.answer.slice(0, 8000) : "",
    };
  });
}

export function normaliseDeliveryWorkspace(value: unknown, account?: { name?: string; email?: string; organisation?: string }): DeliveryWorkspace {
  const initial = newDeliveryWorkspace(account);
  if (!value || typeof value !== "object") return initial;
  const candidate = value as Partial<DeliveryWorkspace>;
  const evidence = Array.isArray(candidate.evidence) ? candidate.evidence.filter(item => item && typeof item.id === "string").map(item => ({
    id: item.id, fileName: String(item.fileName || "Document"), category: String(item.category || "Other supporting evidence"), notes: String(item.notes || ""), size: Number(item.size) || 0, uploadedAt: String(item.uploadedAt || ""),
  })) : [];
  const submissions = Array.isArray(candidate.submissions) ? candidate.submissions.filter(item => item && typeof item.assessmentId === "string" && item.methodologyVersion === DELIVERY_METHODOLOGY_VERSION && typeof item.score === "number").map(item => ({
    assessmentId: item.assessmentId, methodologyVersion: DELIVERY_METHODOLOGY_VERSION, submittedAt: String(item.submittedAt || ""), score: Number(item.score), maturity: String(item.maturity || ""), answers: cleanDeliveryAnswers(item.answers, initial.answers),
  })) : [];
  const statuses = new Set(["not_started", "draft", "assessment_complete", "evidence_submitted"]);
  const evidenceStatuses = new Set(["not_started", "in_progress", "submitted"]);
  const reviewStatuses = new Set(["not_submitted", "awaiting_msi_review"]);
  return { ...initial,
    assessmentId: typeof candidate.assessmentId === "string" ? candidate.assessmentId : initial.assessmentId,
    organisationName: typeof candidate.organisationName === "string" ? candidate.organisationName.slice(0, 180) : initial.organisationName,
    participant: { name: typeof candidate.participant?.name === "string" ? candidate.participant.name.slice(0, 120) : initial.participant.name, role: typeof candidate.participant?.role === "string" ? candidate.participant.role.slice(0, 120) : "", email: typeof candidate.participant?.email === "string" ? candidate.participant.email.slice(0, 254) : initial.participant.email },
    status: statuses.has(String(candidate.status)) ? candidate.status as DeliveryWorkspace["status"] : initial.status,
    reviewStatus: reviewStatuses.has(String(candidate.reviewStatus)) ? candidate.reviewStatus as DeliveryWorkspace["reviewStatus"] : initial.reviewStatus,
    evidenceStatus: evidenceStatuses.has(String(candidate.evidenceStatus)) ? candidate.evidenceStatus as DeliveryWorkspace["evidenceStatus"] : initial.evidenceStatus,
    score: typeof candidate.score === "number" && candidate.score >= 1 && candidate.score <= 5 ? candidate.score : null,
    maturity: typeof candidate.maturity === "string" ? candidate.maturity.slice(0, 80) : initial.maturity,
    answers: cleanDeliveryAnswers(candidate.answers, initial.answers), evidence, submissions, progress: Math.max(0, Math.min(100, Number(candidate.progress) || 0)),
  };
}

export function scoreDelivery(answers: DeliveryAnswer[]) {
  const ratings = answers.slice(0, 20).map(answer => answer.score);
  if (ratings.length !== 20 || ratings.some(value => !Number.isInteger(value) || Number(value) < 1 || Number(value) > 5)) return null;
  const score = Math.round((ratings.reduce<number>((sum, value) => sum + Number(value), 0) / 20) * 10) / 10;
  return { score, maturity: deliveryMaturity(score) };
}
