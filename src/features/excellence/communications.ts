/** Communications Pillar methodology v1.0. Authored diagnostic content is explicit and versioned. */
export const COMMUNICATIONS_METHODOLOGY_VERSION = "communications-v1.0" as const;
export const COMMUNICATIONS_SCALE = [
  { value: 1, label: "Not Yet Considered" },
  { value: 2, label: "Emerging" },
  { value: 3, label: "Developing" },
  { value: 4, label: "Established" },
  { value: 5, label: "Fully Embedded" },
] as const;

export type CommunicationsQuestion = { number: number; id: string; question: string; why: string; stars: readonly [string, string, string, string, string] };
export const COMMUNICATIONS_SECTIONS = [
  {
    id: "communications-section-1", title: "CLARITY OF PURPOSE & IMPACT STORY",
    introduction: "Explore how clearly and consistently your organisation explains why it exists, who it serves and how its work is intended to create change.",
    questions: [
      { number: 1, id: "COMMUNICATIONS01", question: "How clearly does your organisation explain the social problem or need it addresses and why it exists?", why: "People need a clear, grounded explanation of the need before they can understand the organisation’s purpose or judge its relevance. Proportionate good practice uses plain language and credible context rather than relying on slogans or assuming prior knowledge.", stars: [
        "Communications rarely explain the social problem or need, or give conflicting reasons for the organisation’s existence.",
        "The need and purpose are mentioned, but explanations are broad, inconsistent or difficult for unfamiliar audiences to follow.",
        "Most significant communications give a clear account of the need and purpose, although evidence or context sometimes remains thin.",
        "Relevant audiences consistently receive a clear, credible and proportionate explanation of the need and why the organisation exists.",
        "The explanation is embedded, tested with audiences and refined when evidence, context or stakeholder understanding changes.",
      ] },
      { number: 2, id: "COMMUNICATIONS02", question: "How clearly does your organisation explain who its work is intended to benefit, without misleading generalisations?", why: "Clear descriptions of intended beneficiaries help stakeholders understand reach, inclusion and boundaries. Mature communication is specific enough to be meaningful, avoids implying that everyone is served equally and remains respectful of how people describe themselves.", stars: [
        "Communications do not clearly identify intended beneficiaries or use descriptions that are inaccurate, sweeping or potentially stigmatising.",
        "Some audiences or groups are named, but descriptions are vague, inconsistent or overlook important differences and exclusions.",
        "Intended beneficiaries are usually described accurately, although some channels still generalise or leave material boundaries unclear.",
        "Communications consistently explain who the work is for, relevant differences in need and who may not currently be reached.",
        "Descriptions are embedded, shaped with appropriate stakeholder insight and updated when language, reach or population circumstances change.",
      ] },
      { number: 3, id: "COMMUNICATIONS03", question: "How clearly does your organisation explain the connection between its activities and the changes it aims to achieve?", why: "Stakeholders should be able to see why particular activities are expected to contribute to intended outcomes. Proportionate communication makes the reasoning visible without overstating causation or turning a useful explanation into technical programme theory.", stars: [
        "Communications list activities but give little or no explanation of how those activities might contribute to meaningful change.",
        "A connection is sometimes implied, but it depends on assumptions and differs between channels or members of the organisation.",
        "Major activities are normally linked to intended changes, although important steps, assumptions or limitations are sometimes missing.",
        "Relevant communications consistently explain credible links between activities and intended outcomes in language audiences can understand.",
        "The impact story is embedded, tested against evidence and stakeholder questions, and improved when the expected connection proves unclear.",
      ] },
      { number: 4, id: "COMMUNICATIONS04", question: "How consistently does your organisation communicate its purpose and impact story across relevant channels and spokespeople?", why: "Consistency helps people recognise the organisation and trust what it says, while still allowing messages to suit different audiences. Mature practice provides a shared core story without forcing every channel or speaker to use identical words.", stars: [
        "Different channels or spokespeople give materially conflicting accounts of the organisation’s purpose, work or intended impact.",
        "A recognisable story exists in places, but it depends on individuals and changes substantially between communications.",
        "The central purpose and impact story are generally consistent, with occasional gaps, outdated wording or unexplained variation.",
        "Relevant staff, trustees and volunteers consistently communicate a shared core story while adapting it appropriately for each audience.",
        "Consistency is embedded and periodically checked, with discrepancies corrected and the shared story refined through evidence and feedback.",
      ] },
    ],
  },
  {
    id: "communications-section-2", title: "EVIDENCE, CREDIBILITY & TRANSPARENCY",
    introduction: "Consider whether impact claims are supported, carefully interpreted and balanced by honest accounts of uncertainty, setbacks and learning.",
    questions: [
      { number: 5, id: "COMMUNICATIONS05", question: "How reliably are public and stakeholder-facing impact claims supported by appropriate evidence?", why: "Claims influence trust, funding and decisions, so their strength should match the evidence available. Mature communication identifies a reasonable basis for significant claims and avoids presenting anecdote, output counts or aspiration as proven impact.", stars: [
        "Significant impact claims are commonly made without an identifiable evidence base or are contradicted by available information.",
        "Some claims refer to evidence, but support is selective, weak or difficult for audiences to identify and assess.",
        "Most material claims have an appropriate basis, although sourcing, interpretation or review remains inconsistent across communications.",
        "Material impact claims are consistently supported by proportionate evidence and presented at a strength that the evidence can sustain.",
        "Evidence standards are embedded, claims are challenged before publication and corrections follow when new evidence changes the picture.",
      ] },
      { number: 6, id: "COMMUNICATIONS06", question: "How clearly does your organisation distinguish activities, outputs, outcomes and impact when communicating results?", why: "Confusing delivery volume with change can mislead audiences about what has been achieved. Proportionate good practice clearly separates what was done, who was reached, what changed and the broader difference to which the organisation contributed.", stars: [
        "Communications routinely present activities or output numbers as outcomes or impact without explaining the distinction.",
        "Some distinctions are attempted, but terminology is inconsistent and headline results still blur delivery, change and wider impact.",
        "Major reports usually separate activities, outputs and outcomes, although impact language or less formal communications remain uneven.",
        "Relevant communications consistently distinguish delivery, reach, observed change and broader impact using understandable language.",
        "The distinctions are embedded, audience understanding is checked and terminology is improved when it creates confusion or overclaiming.",
      ] },
      { number: 7, id: "COMMUNICATIONS07", question: "How openly does your organisation explain limitations, uncertainty and the contribution of other factors behind reported results?", why: "Social outcomes are influenced by many people and circumstances, and evidence is rarely complete. Mature communication strengthens rather than weakens credibility by stating important limitations, uncertainty and the organisation’s realistic contribution.", stars: [
        "Reported results are presented as certain and wholly attributable to the organisation, with material limitations left unexplained.",
        "Occasional caveats appear, but they are generic, hidden or absent from the claims most likely to shape stakeholder judgement.",
        "Important limitations and external influences are acknowledged in formal reporting, though treatment varies between results or channels.",
        "Material uncertainty, evidence limits and other contributing factors are consistently explained alongside the relevant results.",
        "Transparent interpretation is embedded, proportionate to risk and refined through challenge when audiences could reasonably be misled.",
      ] },
      { number: 8, id: "COMMUNICATIONS08", question: "How honestly does your organisation communicate challenges, disappointing results and lessons alongside achievements?", why: "Balanced accounts help stakeholders make sound judgements and show that the organisation learns rather than conceals difficulty. Proportionate transparency focuses on material issues and constructive learning while respecting confidentiality and safeguarding.", stars: [
        "Communications present only positive achievements and conceal or dismiss known setbacks, disappointing results or material challenges.",
        "Challenges are mentioned occasionally, but descriptions are vague, defensive or disconnected from the action taken in response.",
        "Formal reports include some balanced learning, although openness depends on the issue, audience or confidence of individual authors.",
        "Relevant communications consistently present material achievements, difficulties, lessons and responses in a balanced and responsible way.",
        "Constructive candour is embedded, stakeholder trust is considered and lessons visibly influence both future work and future reporting.",
      ] },
    ],
  },
  {
    id: "communications-section-3", title: "STAKEHOLDER COMMUNICATION & ENGAGEMENT",
    introduction: "Explore whether communication is relevant, accessible and genuinely two-way, while representing people’s experiences responsibly.",
    questions: [
      { number: 9, id: "COMMUNICATIONS09", question: "How effectively does your organisation tailor communications to the information needs of its different stakeholders?", why: "Beneficiaries, staff, volunteers, trustees, funders, donors, partners and communities may need different information and levels of detail. Mature practice begins with stakeholder needs rather than sending the same message everywhere.", stars: [
        "The organisation uses largely identical communications regardless of who needs the information or what decisions they face.",
        "Some audiences receive different formats or messages, but choices are informal and significant information needs remain unmet.",
        "Major stakeholder groups usually receive relevant information, although tailoring is inconsistent or based mainly on internal assumptions.",
        "Communications are consistently planned around the distinct, proportionate information needs of relevant stakeholder groups.",
        "Audience tailoring is embedded, informed by direct insight and adapted when needs, relationships or stakeholder decisions change.",
      ] },
      { number: 10, id: "COMMUNICATIONS10", question: "How accessible and understandable are your communications for the people who need them?", why: "Information has little value if intended audiences cannot find, access or understand it. Proportionate good practice considers language, format, disability, digital access and literacy without assuming every organisation needs every possible format.", stars: [
        "Important communications create obvious language, format or access barriers for people who need the information.",
        "Basic accessibility is considered occasionally, but adjustments are reactive and depend on individuals requesting help.",
        "Common audience needs inform many communications, although some formats, channels or language remain unnecessarily difficult.",
        "Relevant communications consistently use clear language and proportionate accessible formats suited to known audience needs.",
        "Accessibility is embedded, tested with intended users and improved when feedback or participation identifies avoidable barriers.",
      ] },
      { number: 11, id: "COMMUNICATIONS11", question: "How effectively can stakeholders ask questions, share views and receive meaningful responses?", why: "Impact communication should create dialogue rather than simply broadcast information. Mature organisations provide realistic, safe routes for questions and views, respond meaningfully and make clear where a request cannot be acted upon.", stars: [
        "Stakeholders have no clear or safe route to ask questions, offer views or expect a meaningful response.",
        "Informal routes exist, but responses are inconsistent, slow or dependent on knowing the right person.",
        "Most relevant stakeholders can make contact and usually receive a response, although learning and accountability are uneven.",
        "Accessible two-way routes consistently support questions, views and timely, meaningful responses from responsible people.",
        "Dialogue is embedded, response quality is reviewed and recurring questions or concerns visibly influence communication and decisions.",
      ] },
      { number: 12, id: "COMMUNICATIONS12", question: "How responsibly does your organisation represent people’s experiences and stories, respecting dignity, consent and privacy?", why: "Personal stories can make impact understandable but may expose, stereotype or exploit the people represented. Mature practice uses informed consent, appropriate control and respectful context, and never treats an individual story as proof of typical impact.", stars: [
        "Stories or images are used without reliable consent or with material risks to dignity, privacy, safety or truthful representation.",
        "Consent is sometimes sought, but practice is informal and people have little clarity or control over future use.",
        "Most stories follow reasonable consent and privacy practice, although context, review or withdrawal arrangements remain inconsistent.",
        "Relevant communications consistently use informed consent, respectful framing, privacy safeguards and appropriate limits on wider claims.",
        "Responsible storytelling is embedded, power and potential harm are actively considered and practice improves through participant feedback.",
      ] },
    ],
  },
  {
    id: "communications-section-4", title: "REPORTING, DISCLOSURE & ACCOUNTABILITY",
    introduction: "Consider whether relevant stakeholders receive timely, proportionate and understandable accounts of performance, resources and commitments.",
    questions: [
      { number: 13, id: "COMMUNICATIONS13", question: "How effectively does your organisation provide timely, proportionate accounts of its activities, performance and outcomes?", why: "Stakeholders need a balanced account at a time when it can inform understanding and decisions. Mature reporting covers material activity and results without rewarding publication volume, elaborate design or unnecessary reporting burdens.", stars: [
        "Relevant stakeholders rarely receive a coherent or timely account of activities, performance and outcomes.",
        "Some reporting occurs, but it is late, incomplete or focused mainly on activity counts and positive news.",
        "Regular accounts cover major activities and some outcomes, although timeliness, balance or relevance varies by audience.",
        "Stakeholders consistently receive timely, proportionate and balanced accounts of material activity, performance and outcomes.",
        "Reporting is embedded, shaped by stakeholder use and refined when information proves late, excessive, missing or unhelpful.",
      ] },
      { number: 14, id: "COMMUNICATIONS14", question: "How clearly does your organisation explain how resources support its work and intended outcomes, consistently with financial reporting?", why: "People should be able to understand how money and other resources relate to the work described. Proportionate communication connects resources and delivery without inventing precision, contradicting accounts or implying that the lowest cost always creates the best value.", stars: [
        "Communications give little credible explanation of how resources support the work or conflict materially with financial information.",
        "Headline spending figures are shared, but links to activities and intended outcomes are vague, selective or difficult to reconcile.",
        "Major resource uses are reasonably connected to delivery, although assumptions, shared costs or consistency remain unclear.",
        "Relevant communications consistently explain proportionate links between resources, activities and intended outcomes in line with financial reporting.",
        "Resource explanations are embedded, tested for understanding and improved when costs, priorities or reporting relationships change.",
      ] },
      { number: 15, id: "COMMUNICATIONS15", question: "How clearly does your organisation communicate relevant responsibilities, commitments and progress against them?", why: "Public promises and formal commitments create expectations and should be accompanied by clear ownership and progress. Mature communication distinguishes aspiration from obligation and explains progress, delay or change rather than allowing commitments to disappear.", stars: [
        "Material responsibilities or commitments are unclear, forgotten or communicated without any meaningful account of progress.",
        "Some commitments are published, but ownership, timescales and subsequent progress are difficult for stakeholders to understand.",
        "Significant commitments usually have visible progress information, though updates or explanations of delay remain inconsistent.",
        "Relevant responsibilities, commitments, ownership and progress are consistently communicated with proportionate clarity and candour.",
        "Accountability communication is embedded, stakeholders can track material commitments and explanations improve when progress changes.",
      ] },
      { number: 16, id: "COMMUNICATIONS16", question: "How effectively does your organisation make relevant reports and disclosures available and understandable to the stakeholders who need them?", why: "Publishing a document does not ensure that stakeholders can find or use it. Mature practice makes relevant information reasonably discoverable, provides useful context and selects channels that match how intended audiences actually access information.", stars: [
        "Relevant reports or disclosures are unavailable, difficult to locate or presented without enough context to understand them.",
        "Some documents are published, but availability is inconsistent and assumes audiences already know what to search for.",
        "Most important information is reasonably available, although signposting, context or suitability for some audiences remains weak.",
        "Relevant stakeholders can consistently find and understand proportionate reports and disclosures through suitable channels.",
        "Availability is embedded and reviewed, with signposting, summaries or formats improved when stakeholder use reveals difficulty.",
      ] },
    ],
  },
  {
    id: "communications-section-5", title: "COMMUNICATIONS EFFECTIVENESS & IMPROVEMENT",
    introduction: "Explore whether the organisation checks reach and understanding, learns from feedback and improves the accuracy and usefulness of communication.",
    questions: [
      { number: 17, id: "COMMUNICATIONS17", question: "How does your organisation establish whether important communications reach their intended audiences?", why: "Sending or publishing information is not the same as reaching the people who need it. Mature practice uses proportionate indicators and direct checks suited to the audience, rather than rewarding follower counts or expensive analytics.", stars: [
        "The organisation does not check whether important communications reach the people for whom they are intended.",
        "Reach is inferred from distribution or broad platform figures, with little attention to missing or underserved audiences.",
        "Some important communications use reasonable reach indicators, although checks are inconsistent or rarely influence channel choices.",
        "Proportionate evidence consistently shows whether priority audiences are reached and identifies material gaps in coverage.",
        "Reach assessment is embedded, combines suitable evidence with stakeholder insight and changes channels when important groups are missed.",
      ] },
      { number: 18, id: "COMMUNICATIONS18", question: "How does your organisation establish whether stakeholders understand its messages and evidence?", why: "A message may be seen but still be misunderstood, particularly where evidence or reporting is complex. Proportionate good practice asks intended audiences what they understood and uses that insight to improve clarity rather than assuming publication equals comprehension.", stars: [
        "The organisation assumes that stakeholders understand important messages and does not check comprehension.",
        "Misunderstandings are noticed informally after problems arise, but there is no reliable way to identify recurring confusion.",
        "Understanding is checked for some significant communications, although methods, audiences or follow-up remain inconsistent.",
        "The organisation consistently uses proportionate checks to understand how priority audiences interpret important messages and evidence.",
        "Understanding checks are embedded, include potentially excluded audiences and visibly improve wording, evidence presentation and context.",
      ] },
      { number: 19, id: "COMMUNICATIONS19", question: "How effectively does your organisation use stakeholder feedback to improve its communications?", why: "Feedback becomes valuable when it changes communication practice rather than merely being collected. Mature organisations identify patterns, make proportionate improvements and explain responses, while recognising that not every suggestion can or should be adopted.", stars: [
        "Stakeholder feedback about communications is not sought, recorded or used to make improvements.",
        "Comments are received informally, but response depends on individuals and recurring issues often remain unresolved.",
        "Feedback informs some revisions, although collection, prioritisation or communication of the response is inconsistent.",
        "Relevant feedback is consistently reviewed and leads to proportionate improvements in content, channels, accessibility or engagement.",
        "Feedback-led improvement is embedded, patterns are tracked and stakeholders can see how their insight influenced communication practice.",
      ] },
      { number: 20, id: "COMMUNICATIONS20", question: "How consistently does your organisation review communications, correct material errors and improve clarity and credibility over time?", why: "Communications become outdated and mistakes can damage decisions and trust if left uncorrected. Mature practice assigns proportionate review responsibility, corrects material errors openly and uses learning to prevent similar weaknesses.", stars: [
        "Important communications are rarely reviewed and known material errors may remain uncorrected.",
        "Corrections happen after complaints or visible problems, but review responsibilities and learning are unclear.",
        "Significant content is reviewed periodically and obvious errors are corrected, though speed, transparency or follow-through varies.",
        "Proportionate review consistently keeps important communications current, corrects material errors and records useful improvement actions.",
        "Review and correction are embedded, recurring weaknesses are addressed and evidence shows sustained gains in clarity and credibility.",
      ] },
    ],
  },
] as const;

export const COMMUNICATIONS_OPEN_QUESTIONS = [
  { id: "COMMUNICATIONS_OPEN01", question: "What are your organisation’s greatest challenges in communicating its social impact?", helperText: "Describe the practical, cultural or confidence barriers that matter most." },
  { id: "COMMUNICATIONS_OPEN02", question: "Which stakeholders are hardest to reach or engage, and why?", helperText: "Include the audiences and barriers that would help MSI understand your context." },
  { id: "COMMUNICATIONS_OPEN03", question: "How confident are you in explaining the difference your organisation makes, and where do you feel least confident?", helperText: "Reflect on both the story you can tell and the areas that still feel uncertain." },
  { id: "COMMUNICATIONS_OPEN04", question: "Where could your reporting or communications be more transparent, balanced or useful?", helperText: "Consider the information or context that stakeholders may reasonably need." },
  { id: "COMMUNICATIONS_OPEN05", question: "What communications improvements would you most like MSI to help you achieve?", helperText: "Identify the practical changes where expert support could add most value." },
] as const;

export const COMMUNICATIONS_STAGES = [
  { title: "Communications Assessment", description: "A structured provisional self-assessment across 20 maturity questions and five optional reflections.", available: true },
  { title: "Supporting Evidence", description: "Optional, proportionate material that helps MSI understand how communication works in practice.", available: true },
  { title: "MSI Review Checkpoint", description: "Professional review, interpretation and constructive challenge from My Social Impact.", available: false },
  { title: "Stakeholder Interviews", description: "Conversations exploring how relevant people actually experience and understand your communications.", available: false },
  { title: "Communications Diagnostic", description: "A clear account of strengths, gaps, risks and opportunities based on the combined evidence.", available: false },
  { title: "Communications Blueprint", description: "Prioritised recommendations for improving clarity, credibility, engagement and accountability.", available: false },
] as const;

export const COMMUNICATIONS_EVIDENCE_CATEGORIES = [
  "Annual or trustees’ report", "Impact report", "Website content", "Newsletter", "Fundraising communication",
  "Stakeholder communication", "Beneficiary information material", "Internal report", "Consultation finding",
  "Anonymised stakeholder feedback", "Communication improvement example", "Other supporting evidence",
] as const;

export type CommunicationsAnswer = { questionId: string; questionNumber: number; score: number | null; comment: string; answer: string };
export type CommunicationsEvidence = { id: string; fileName: string; category: string; notes: string; size: number; uploadedAt: string };
export type CommunicationsSubmission = { assessmentId: string; methodologyVersion: typeof COMMUNICATIONS_METHODOLOGY_VERSION; submittedAt: string; score: number; maturity: string; answers: CommunicationsAnswer[] };
export type CommunicationsWorkspace = {
  assessmentId: string; methodologyVersion: typeof COMMUNICATIONS_METHODOLOGY_VERSION; organisationName: string;
  participant: { name: string; role: string; email: string };
  status: "not_started" | "draft" | "assessment_complete" | "evidence_submitted";
  reviewStatus: "not_submitted" | "awaiting_msi_review"; evidenceStatus: "not_started" | "in_progress" | "submitted";
  score: number | null; maturity: string; answers: CommunicationsAnswer[]; evidence: CommunicationsEvidence[]; submissions: CommunicationsSubmission[]; progress: number;
};

export function communicationsMaturity(score: number) {
  if (score < 1.8) return "Not Yet Considered";
  if (score < 2.6) return "Emerging";
  if (score < 3.4) return "Developing";
  if (score < 4.2) return "Established";
  return "Fully Embedded";
}

const communicationsIds = [...COMMUNICATIONS_SECTIONS.flatMap(section => section.questions.map(question => question.id)), ...COMMUNICATIONS_OPEN_QUESTIONS.map(question => question.id)];
export function newCommunicationsWorkspace(account?: { name?: string; email?: string; organisation?: string }): CommunicationsWorkspace {
  return {
    assessmentId: crypto.randomUUID(), methodologyVersion: COMMUNICATIONS_METHODOLOGY_VERSION, organisationName: account?.organisation || "Your organisation",
    participant: { name: account?.name || "", role: "", email: account?.email || "" },
    status: "not_started", reviewStatus: "not_submitted", evidenceStatus: "not_started", score: null, maturity: "Not Yet Considered",
    answers: communicationsIds.map((questionId, index) => ({ questionId, questionNumber: index + 1, score: null, comment: "", answer: "" })),
    evidence: [], submissions: [], progress: 0,
  };
}

function cleanCommunicationsAnswers(value: unknown, initial: CommunicationsAnswer[]) {
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

export function normaliseCommunicationsWorkspace(value: unknown, account?: { name?: string; email?: string; organisation?: string }): CommunicationsWorkspace {
  const initial = newCommunicationsWorkspace(account);
  if (!value || typeof value !== "object") return initial;
  const candidate = value as Partial<CommunicationsWorkspace>;
  const evidence = Array.isArray(candidate.evidence) ? candidate.evidence.filter(item => item && typeof item.id === "string").map(item => ({
    id: item.id, fileName: String(item.fileName || "Document"), category: String(item.category || "Other supporting evidence"), notes: String(item.notes || ""), size: Number(item.size) || 0, uploadedAt: String(item.uploadedAt || ""),
  })) : [];
  const submissions = Array.isArray(candidate.submissions) ? candidate.submissions.filter(item => item && typeof item.assessmentId === "string" && item.methodologyVersion === COMMUNICATIONS_METHODOLOGY_VERSION && typeof item.score === "number").map(item => ({
    assessmentId: item.assessmentId, methodologyVersion: COMMUNICATIONS_METHODOLOGY_VERSION, submittedAt: String(item.submittedAt || ""), score: Number(item.score), maturity: String(item.maturity || ""), answers: cleanCommunicationsAnswers(item.answers, initial.answers),
  })) : [];
  const statuses = new Set(["not_started", "draft", "assessment_complete", "evidence_submitted"]);
  const evidenceStatuses = new Set(["not_started", "in_progress", "submitted"]);
  const reviewStatuses = new Set(["not_submitted", "awaiting_msi_review"]);
  return { ...initial,
    assessmentId: typeof candidate.assessmentId === "string" ? candidate.assessmentId : initial.assessmentId,
    organisationName: typeof candidate.organisationName === "string" ? candidate.organisationName.slice(0, 180) : initial.organisationName,
    participant: { name: typeof candidate.participant?.name === "string" ? candidate.participant.name.slice(0, 120) : initial.participant.name, role: typeof candidate.participant?.role === "string" ? candidate.participant.role.slice(0, 120) : "", email: typeof candidate.participant?.email === "string" ? candidate.participant.email.slice(0, 254) : initial.participant.email },
    status: statuses.has(String(candidate.status)) ? candidate.status as CommunicationsWorkspace["status"] : initial.status,
    reviewStatus: reviewStatuses.has(String(candidate.reviewStatus)) ? candidate.reviewStatus as CommunicationsWorkspace["reviewStatus"] : initial.reviewStatus,
    evidenceStatus: evidenceStatuses.has(String(candidate.evidenceStatus)) ? candidate.evidenceStatus as CommunicationsWorkspace["evidenceStatus"] : initial.evidenceStatus,
    score: typeof candidate.score === "number" && candidate.score >= 1 && candidate.score <= 5 ? candidate.score : null,
    maturity: typeof candidate.maturity === "string" ? candidate.maturity.slice(0, 80) : initial.maturity,
    answers: cleanCommunicationsAnswers(candidate.answers, initial.answers), evidence, submissions, progress: Math.max(0, Math.min(100, Number(candidate.progress) || 0)),
  };
}

export function scoreCommunications(answers: CommunicationsAnswer[]) {
  const ratings = answers.slice(0, 20).map(answer => answer.score);
  if (ratings.length !== 20 || ratings.some(value => !Number.isInteger(value) || Number(value) < 1 || Number(value) > 5)) return null;
  const score = Math.round((ratings.reduce<number>((sum, value) => sum + Number(value), 0) / 20) * 10) / 10;
  return { score, maturity: communicationsMaturity(score) };
}
