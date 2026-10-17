/** Data Pillar methodology v1.0. Supplied diagnostic content is stored explicitly, never generated at runtime. */
export const DATA_METHODOLOGY_VERSION = "data-v1.0" as const;
export const DATA_SCALE = [
  { value: 1, label: "Not Yet Considered" },
  { value: 2, label: "Emerging" },
  { value: 3, label: "Developing" },
  { value: 4, label: "Established" },
  { value: 5, label: "Fully Embedded" }
] as const;

export type DataQuestion = { number: number; id: string; question: string; why: string; stars: readonly [string, string, string, string, string] };
export const DATA_SECTIONS = [
  {
    "id": "data-section-1",
    "title": "MEASURING WHAT MATTERS",
    "introduction": "Explore whether your measurement focuses on meaningful change and gives you a useful basis for understanding progress.",
    "questions": [
      {
        "number": 1,
        "id": "DATA01",
        "question": "How well do your impact indicators reflect the changes your organisation intends to contribute to?",
        "why": "Indicators should help you understand progress towards intended outcomes. Mature practice selects a manageable set of relevant measures and checks that they still reflect the changes that matter.",
        "stars": [
          "We have no clear indicators linked to our intended outcomes.",
          "We track a few convenient measures, but their connection to intended outcomes is weak or unclear.",
          "Some indicators reflect intended outcomes, but important changes are poorly covered or measures are inconsistently useful.",
          "We consistently use a proportionate set of indicators that reflects the outcomes we intend to contribute to.",
          "Our indicators provide useful insight into intended outcomes, and we test and refine their relevance as our work and understanding develop."
        ]
      },
      {
        "number": 2,
        "id": "DATA02",
        "question": "How clearly does your measurement distinguish what you do from the changes people or communities experience?",
        "why": "Activities describe what you do, outputs describe what is delivered, and outcomes describe what changes. Keeping these separate helps prevent service volumes or attendance figures being mistaken for evidence of impact.",
        "stars": [
          "We generally treat activity or service figures as evidence that people’s circumstances have improved.",
          "We recognise that delivery figures and outcomes differ, but our measurement rarely separates them.",
          "We distinguish activities, outputs and outcomes in some areas, but the distinction is applied inconsistently.",
          "Our measurement consistently separates delivery figures from evidence of changes experienced by people or communities.",
          "The distinction is embedded in our measurement, and we regularly check that outcome measures capture change rather than simply participation or delivery."
        ]
      },
      {
        "number": 3,
        "id": "DATA03",
        "question": "How well do you establish an appropriate starting point for understanding change?",
        "why": "Understanding change often requires knowing the situation before support or an intervention begins. Where individual baseline measurement is unsuitable, mature practice uses a credible alternative and recognises its limitations.",
        "stars": [
          "We have no meaningful starting point or reference for interpreting change.",
          "Starting information is occasionally available, but it is collected informally or is often unsuitable.",
          "We establish useful starting points for some outcomes, but relevant work still has significant gaps.",
          "We consistently establish suitable starting points or justified alternatives for the outcomes we assess.",
          "Our starting-point approaches work well in context, and we review their usefulness and address limitations affecting our understanding of change."
        ]
      },
      {
        "number": 4,
        "id": "DATA04",
        "question": "How well does the timing of your measurement capture the changes you need to understand?",
        "why": "Some outcomes emerge quickly, while others take longer or may not last. Mature measurement uses suitable follow-up points without creating unnecessary demands on people.",
        "stars": [
          "We do not consider when outcomes are likely to emerge or whether changes last.",
          "We gather occasional follow-up information, but timing mainly reflects convenience.",
          "Measurement timing suits some outcomes, but important changes may be missed or assessed too early.",
          "We consistently measure at appropriate points to understand relevant changes and, where needed, whether they last.",
          "We review what measurement timing reveals or misses and adapt follow-up to improve understanding while keeping demands proportionate."
        ]
      }
    ]
  },
  {
    "id": "data-section-2",
    "title": "GATHERING USEFUL EVIDENCE",
    "introduction": "Consider whether your collection methods produce relevant evidence while respecting people’s time, circumstances and perspectives.",
    "questions": [
      {
        "number": 5,
        "id": "DATA05",
        "question": "How consistently do people collecting impact information use a clear, shared approach?",
        "why": "Inconsistent collection can make results difficult to interpret or compare. A shared approach can be simple, provided people understand how to apply it and can make justified adaptations.",
        "stars": [
          "People collect impact information without a shared approach.",
          "Some shared questions or templates exist, but people use them differently or only occasionally.",
          "A recognisable collection approach is developing, but its application varies across relevant work.",
          "People consistently use a clear, proportionate collection approach, with appropriate adaptations understood.",
          "The shared approach works reliably in practice, and feedback from its use leads to improvements in collection consistency."
        ]
      },
      {
        "number": 6,
        "id": "DATA06",
        "question": "How well do your collection methods suit the people whose experiences you need to understand?",
        "why": "An unsuitable method can exclude people or produce misleading answers. Mature practice adapts how people contribute to reflect communication needs, access, context and potential discomfort.",
        "stars": [
          "We use collection methods without considering whether people can meaningfully take part.",
          "We make occasional adjustments when someone encounters an obvious barrier.",
          "Some methods are adapted to people’s needs, but avoidable barriers remain.",
          "Our collection methods routinely suit the people involved, with practical alternatives where needed.",
          "We check who can participate meaningfully, learn from their experiences and improve methods to reduce exclusion or discomfort."
        ]
      },
      {
        "number": 7,
        "id": "DATA07",
        "question": "How well does your evidence capture the perspectives of people affected by your work?",
        "why": "People affected by the work can reveal changes and concerns that organisational records miss. Mature practice actively seeks a credible range of perspectives, including experiences that are critical or less positive.",
        "stars": [
          "Our impact evidence contains little or no direct input from people affected by our work.",
          "We mainly hear from people who volunteer feedback or have especially positive experiences.",
          "We seek affected people’s perspectives, but some relevant groups or less positive experiences are poorly represented.",
          "We consistently seek a credible range of affected people’s perspectives, including critical or less positive experiences.",
          "We review whose voices are missing, address practical gaps and use the resulting range of perspectives to deepen our understanding."
        ]
      },
      {
        "number": 8,
        "id": "DATA08",
        "question": "How appropriately do you combine different types of evidence to understand outcomes?",
        "why": "Numbers can show patterns, while accounts of experience can help explain what those patterns mean. Mature practice uses complementary evidence where useful and investigates differences rather than forcing everything into one story.",
        "stars": [
          "We rely on isolated figures or stories without considering what they can and cannot tell us.",
          "We collect different types of evidence, but usually consider them separately.",
          "We sometimes bring different evidence together, but important findings still rely on a narrow source.",
          "We bring together suitable evidence, including numbers and people’s experiences where useful, to understand outcomes.",
          "We test interpretations against complementary sources and investigate disagreement between them to improve our understanding."
        ]
      }
    ]
  },
  {
    "id": "data-section-3",
    "title": "TRUSTWORTHY AND RESPONSIBLE DATA",
    "introduction": "Explore whether your evidence is dependable, usable and handled appropriately for the people and information involved.",
    "questions": [
      {
        "number": 9,
        "id": "DATA09",
        "question": "How effectively do you check the accuracy of the impact information you use?",
        "why": "Errors in recording, calculation or classification can distort conclusions. Proportionate checks help identify mistakes before information is relied upon.",
        "stars": [
          "We use impact information without checking for errors.",
          "We correct obvious mistakes when someone notices them, but checks are largely informal.",
          "We perform some accuracy checks, but coverage or follow-through is inconsistent.",
          "We routinely apply appropriate accuracy checks and correct material errors before relying on the information.",
          "Our checks catch meaningful errors, and we learn from recurring problems to improve accuracy at source."
        ]
      },
      {
        "number": 10,
        "id": "DATA10",
        "question": "How well do you understand gaps in the information you collect?",
        "why": "Missing information can give a distorted picture, particularly when some people or experiences are more likely to be absent. Mature practice understands the significance of gaps rather than treating incomplete records as complete evidence.",
        "stars": [
          "We do not know where important information is missing.",
          "We notice missing information occasionally, but do not assess its significance.",
          "We identify some important gaps, but do not consistently understand whose experiences or which outcomes are missing.",
          "We routinely assess important gaps and consider how they affect the picture our evidence provides.",
          "We investigate recurring gaps, take proportionate steps to reduce them and adjust our interpretation when gaps remain."
        ]
      },
      {
        "number": 11,
        "id": "DATA11",
        "question": "How reliably can the right people find and understand the impact information they need?",
        "why": "Evidence cannot support useful analysis if it is lost, confusing or dependent on one person’s memory. Mature practice makes relevant information understandable and retrievable by authorised people, using tools that suit the organisation.",
        "stars": [
          "Relevant impact information is difficult to locate or understand.",
          "Information can usually be found only with help from particular individuals.",
          "Some information is organised and understandable, but retrieval or interpretation remains inconsistent.",
          "Authorised people can reliably find relevant information and understand what it represents.",
          "Information remains usable through staff or system changes, and recurring difficulties lead to practical improvements in organisation or explanation."
        ]
      },
      {
        "number": 12,
        "id": "DATA12",
        "question": "How well do your impact-data practices protect the people whose information you hold?",
        "why": "Impact measurement can involve personal or sensitive experiences. Mature practice limits collection and exposure to what is justified and applies safeguards appropriate to the information and people involved.",
        "stars": [
          "We have not meaningfully considered how our impact-data practices could expose or harm people.",
          "We use some basic precautions, but important collection or handling risks remain unclear.",
          "We have relevant safeguards, but they are applied inconsistently or their effectiveness is uncertain.",
          "We consistently apply proportionate safeguards across collection, access, sharing and retention, limiting personal information to what is justified.",
          "We check that safeguards work in practice and improve them when risks, needs or weaknesses change."
        ]
      }
    ]
  },
  {
    "id": "data-section-4",
    "title": "MAKING SENSE OF FINDINGS",
    "introduction": "Consider how well you interpret evidence, recognise limitations and reach conclusions that the available information can support.",
    "questions": [
      {
        "number": 13,
        "id": "DATA13",
        "question": "How effectively do you analyse your evidence to understand progress towards outcomes?",
        "why": "Collecting information is only useful if you examine what it says about change. Mature analysis goes beyond totals to identify meaningful progress, lack of progress and questions needing further exploration.",
        "stars": [
          "We collect information but rarely analyse what it says about outcomes.",
          "We mainly produce totals or basic summaries with little interpretation of change.",
          "Some analysis explores progress towards outcomes, but it is irregular or incomplete.",
          "We routinely analyse relevant evidence to understand progress, lack of progress and significant patterns.",
          "Our analysis produces useful insight into outcomes, and we refine it when it fails to answer important questions."
        ]
      },
      {
        "number": 14,
        "id": "DATA14",
        "question": "How well do you examine differences in outcomes between relevant groups or circumstances?",
        "why": "Overall averages can hide uneven experiences or benefits. Mature practice explores relevant differences where evidence and privacy allow, without collecting unnecessary sensitive information or drawing conclusions from unreliable small samples.",
        "stars": [
          "We rely on overall results without considering whether outcomes differ.",
          "We notice occasional differences, but rarely explore them.",
          "We examine some relevant differences, but important variation may remain hidden.",
          "We proportionately examine relevant outcome differences and interpret them with appropriate care.",
          "We review which differences matter, investigate credible disparities and improve our understanding of uneven outcomes."
        ]
      },
      {
        "number": 15,
        "id": "DATA15",
        "question": "How clearly do your interpretations reflect the limitations of your evidence?",
        "why": "Evidence may be affected by bias, small numbers, missing responses or measurement weaknesses. Recognising these limitations helps you judge how much confidence to place in a finding.",
        "stars": [
          "We generally treat findings as conclusive without considering limitations.",
          "We acknowledge that limitations exist, but rarely connect them to particular findings.",
          "We identify some relevant limitations, but do not consistently adjust our conclusions.",
          "We consistently explain material limitations and match the confidence of our conclusions to the evidence.",
          "We actively test important assumptions, revisit uncertain interpretations and improve evidence where doing so would be useful."
        ]
      },
      {
        "number": 16,
        "id": "DATA16",
        "question": "How carefully do you assess your organisation’s contribution to the changes observed?",
        "why": "Changes can be influenced by other services, people and wider circumstances. Mature practice develops a reasoned account of contribution without claiming that all observed change was caused by the organisation.",
        "stars": [
          "We generally assume that changes observed after our work were caused by it.",
          "We recognise other influences but rarely consider them when interpreting outcomes.",
          "We consider our contribution and some other explanations, but the reasoning is uneven.",
          "We consistently assess our plausible contribution alongside other influences, using evidence appropriate to the context.",
          "We test important contribution assumptions against available evidence and refine our conclusions when credible alternative explanations emerge."
        ]
      }
    ]
  },
  {
    "id": "data-section-5",
    "title": "LEARNING AND IMPROVING MEASUREMENT",
    "introduction": "Explore whether evidence informs understanding and decisions, and whether your measurement remains useful as circumstances change.",
    "questions": [
      {
        "number": 17,
        "id": "DATA17",
        "question": "How routinely do people examine impact findings together to learn from them?",
        "why": "Shared reflection can reveal explanations and questions that a dashboard alone will miss. Mature practice creates useful opportunities to explore findings, including disappointing or unexpected results.",
        "stars": [
          "Impact findings are rarely discussed for learning.",
          "Findings are discussed occasionally, usually when a report is required or a problem arises.",
          "Learning discussions take place, but are irregular or focus mainly on positive results.",
          "Relevant people routinely examine findings together, including disappointing or unexpected results.",
          "These discussions consistently deepen understanding, and we improve how reflection works when it becomes superficial or unhelpful."
        ]
      },
      {
        "number": 18,
        "id": "DATA18",
        "question": "How clearly can you show that impact evidence has informed decisions?",
        "why": "Evidence should help people make better-informed choices, even when it supports continuing an existing approach. This question assesses the link between evidence and decisions, rather than the subsequent effectiveness of delivery.",
        "stars": [
          "We cannot identify decisions informed by impact evidence.",
          "We can recall isolated examples, but evidence usually plays little visible part in decisions.",
          "Evidence informs some decisions, but the connection is inconsistent or difficult to explain.",
          "We can consistently explain how relevant evidence informed significant choices, alongside other considerations.",
          "We revisit how evidence was used and improve decision-making when findings were overlooked, misunderstood or given inappropriate weight."
        ]
      },
      {
        "number": 19,
        "id": "DATA19",
        "question": "How effectively do you review whether your measurement is useful enough to justify the effort involved?",
        "why": "Measurement can become burdensome without improving understanding. Mature practice retains what is useful, changes what is weak and stops collection that no longer has a clear purpose.",
        "stars": [
          "We do not review whether measurement is useful or proportionate.",
          "We question burdensome measurement occasionally, but rarely change it.",
          "We review some measures or collection tasks, but unnecessary effort or low-value data persists.",
          "We regularly assess measurement usefulness against its demands and make proportionate changes.",
          "We check whether those changes improve usefulness and reduce avoidable burden, including the demands placed on participants."
        ]
      },
      {
        "number": 20,
        "id": "DATA20",
        "question": "How effectively do you follow up important unanswered questions about your impact?",
        "why": "No measurement system answers everything. Mature practice recognises important uncertainties, prioritises those worth investigating and uses proportionate ways to improve understanding.",
        "stars": [
          "Important unanswered questions about impact are not recognised or followed up.",
          "We can name some uncertainties, but have little approach to deciding which to investigate.",
          "We prioritise some evidence gaps, but follow-up is inconsistent.",
          "We identify important unanswered questions and follow them up proportionately, recording what remains uncertain.",
          "We check whether follow-up improves understanding and revise our learning priorities as new evidence or circumstances emerge."
        ]
      }
    ]
  }
] as const satisfies readonly { id: string; title: string; introduction: string; questions: readonly DataQuestion[] }[];
export const DATA_OPEN_QUESTIONS = [
  {
    "number": 21,
    "id": "DATA_OPEN01",
    "question": "How do you currently measure and understand the changes your organisation contributes to?",
    "helperText": "Describe your main approaches, the work they cover and who is involved. Everyday practice is more useful than a polished description."
  },
  {
    "number": 22,
    "id": "DATA_OPEN02",
    "question": "Which parts of your current impact evidence are most useful, and why?",
    "helperText": "Tell us about evidence you trust or regularly use. This might include figures, feedback, conversations, case examples or other sources."
  },
  {
    "number": 23,
    "id": "DATA_OPEN03",
    "question": "What are the most important gaps or difficulties in understanding your impact?",
    "helperText": "Consider what you struggle to measure or interpret, whose experiences may be missing, and any practical constraints."
  },
  {
    "number": 24,
    "id": "DATA_OPEN04",
    "question": "Can you describe a time when evidence helped you learn something or informed a decision?",
    "helperText": "What did the evidence suggest, what did you decide, and what remained uncertain? If no example comes to mind, that is useful context too."
  },
  {
    "number": 25,
    "id": "DATA_OPEN05",
    "question": "What would you most like to improve about your impact measurement and understanding over the next 12 months?",
    "helperText": "Describe your priorities and any support that would help. You do not need to propose a technical solution."
  }
] as const;

export const DATA_STAGES = [
  { title: "Data Assessment", description: "Complete the maturity questions and share the context behind your answers. Your score is a provisional self-assessment.", available: true },
  { title: "Supporting Evidence", description: "Optionally share relevant, proportionate materials to help explain your measurement practice.", available: true },
  { title: "MSI Review Checkpoint", description: "My Social Impact reviews the available information, identifies areas needing clarification and agrees the next steps.", available: false },
  { title: "Stakeholder Interviews", description: "My Social Impact normally conducts conversations with relevant stakeholders to explore practice, test assumptions and understand differing perspectives.", available: false },
  { title: "Data Diagnostic", description: "Receive professional findings on your measurement strengths, gaps and priorities, informed by the assessment, available evidence and stakeholder conversations.", available: false },
  { title: "Data Blueprint", description: "Receive recommendations for improving your impact measurement and understanding, based on the diagnostic.", available: false }
] as const;
export const DATA_EVIDENCE_CATEGORIES = [
  "Indicators or outcome-measurement framework", "Measurement plan", "Anonymised collection templates",
  "Survey or interview questions", "Aggregated results or outcome summaries", "Examples of analysis",
  "Data-quality checks", "Evidence-informed decision example", "Other supporting evidence"
] as const;

export type DataAnswer = { questionId: string; questionNumber: number; score: number | null; comment: string; answer: string };
export type DataEvidence = { id: string; fileName: string; category: string; notes: string; size: number; uploadedAt: string };
export type DataSubmission = { assessmentId: string; methodologyVersion: typeof DATA_METHODOLOGY_VERSION; submittedAt: string; score: number; maturity: string; answers: DataAnswer[] };
export type DataWorkspace = {
  assessmentId: string; methodologyVersion: typeof DATA_METHODOLOGY_VERSION; organisationName: string;
  participant: { name: string; role: string; email: string };
  status: "not_started" | "draft" | "assessment_complete" | "evidence_submitted";
  reviewStatus: "not_submitted" | "awaiting_msi_review"; evidenceStatus: "not_started" | "in_progress" | "submitted";
  score: number | null; maturity: string; answers: DataAnswer[]; evidence: DataEvidence[]; submissions: DataSubmission[]; progress: number;
};

export function dataMaturity(score: number) {
  if (score < 1.8) return "Not Yet Considered";
  if (score < 2.6) return "Emerging";
  if (score < 3.4) return "Developing";
  if (score < 4.2) return "Established";
  return "Fully Embedded";
}
const allIds = [...DATA_SECTIONS.flatMap(section => section.questions.map(question => question.id)), ...DATA_OPEN_QUESTIONS.map(question => question.id)];
export function newDataWorkspace(account?: { name?: string; email?: string; organisation?: string }): DataWorkspace {
  return {
    assessmentId: crypto.randomUUID(), methodologyVersion: DATA_METHODOLOGY_VERSION, organisationName: account?.organisation || "Your charity",
    participant: { name: account?.name || "", role: "", email: account?.email || "" },
    status: "not_started", reviewStatus: "not_submitted", evidenceStatus: "not_started", score: null, maturity: "Not Yet Considered",
    answers: allIds.map((questionId, index) => ({ questionId, questionNumber: index + 1, score: null, comment: "", answer: "" })),
    evidence: [], submissions: [], progress: 0,
  };
}
function cleanAnswers(value: unknown, initial: DataAnswer[]) {
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
export function normaliseDataWorkspace(value: unknown, account?: { name?: string; email?: string; organisation?: string }): DataWorkspace {
  const initial = newDataWorkspace(account);
  if (!value || typeof value !== "object") return initial;
  const candidate = value as Partial<DataWorkspace>;
  const evidence = Array.isArray(candidate.evidence) ? candidate.evidence.filter(item => item && typeof item.id === "string").map(item => ({
    id: item.id, fileName: String(item.fileName || "Document"), category: String(item.category || "Other supporting evidence"),
    notes: String(item.notes || ""), size: Number(item.size) || 0, uploadedAt: String(item.uploadedAt || ""),
  })) : [];
  const submissions = Array.isArray(candidate.submissions) ? candidate.submissions.filter(item => item && typeof item.assessmentId === "string" && item.methodologyVersion === DATA_METHODOLOGY_VERSION && typeof item.score === "number").map(item => ({
    assessmentId: item.assessmentId, methodologyVersion: DATA_METHODOLOGY_VERSION, submittedAt: String(item.submittedAt || ""),
    score: Number(item.score), maturity: String(item.maturity || ""), answers: cleanAnswers(item.answers, initial.answers),
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
    status: statuses.has(String(candidate.status)) ? candidate.status as DataWorkspace["status"] : initial.status,
    reviewStatus: reviewStatuses.has(String(candidate.reviewStatus)) ? candidate.reviewStatus as DataWorkspace["reviewStatus"] : initial.reviewStatus,
    evidenceStatus: evidenceStatuses.has(String(candidate.evidenceStatus)) ? candidate.evidenceStatus as DataWorkspace["evidenceStatus"] : initial.evidenceStatus,
    score: typeof candidate.score === "number" && candidate.score >= 1 && candidate.score <= 5 ? candidate.score : null,
    maturity: typeof candidate.maturity === "string" ? candidate.maturity.slice(0, 80) : initial.maturity,
    answers: cleanAnswers(candidate.answers, initial.answers), evidence, submissions, progress: Math.max(0, Math.min(100, Number(candidate.progress) || 0)),
  };
}
export function scoreData(answers: DataAnswer[]) {
  const ratings = answers.slice(0, 20).map(answer => answer.score);
  if (ratings.length !== 20 || ratings.some(value => !Number.isInteger(value) || Number(value) < 1 || Number(value) > 5)) return null;
  const score = Math.round((ratings.reduce<number>((sum, value) => sum + Number(value), 0) / 20) * 10) / 10;
  return { score, maturity: dataMaturity(score) };
}

