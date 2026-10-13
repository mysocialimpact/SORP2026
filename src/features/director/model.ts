export const AREAS = [
  {
    name: "Digital confidence",
    next: "Choose one everyday task and give colleagues a short, supported practice session. Ask what still feels difficult before buying anything new.",
    opportunity:
      "Human coaching and simpler workflows may help your team use the tools you already have.",
  },
  {
    name: "Data & information",
    next: "Map where one important piece of impact information lives, who owns it and how it reaches a decision. Identify one duplicate or missing handover.",
    opportunity:
      "A systems review can identify sensible connections between spreadsheets, databases and reporting tools.",
  },
  {
    name: "AI readiness",
    next: "Agree a small, low-risk AI trial using public or invented information. Decide who checks the output and what information must never be shared.",
    opportunity:
      "AI could help draft or summarise non-sensitive material, with a named person checking accuracy and appropriateness.",
  },
  {
    name: "People & leadership",
    next: "Name a lead for one improvement and protect a small amount of their time. Agree with colleagues what success would look like in a month.",
    opportunity:
      "An experienced Impact Director can help leaders prioritise, build confidence and keep manageable changes moving.",
  },
  {
    name: "Impact management",
    next: "Take one upcoming management decision and ask what evidence would genuinely help. Start there, rather than adding another indicator to your report.",
    opportunity:
      "Social Impact Excellence diagnostics can connect evidence, leadership and practical improvement; this snapshot is not a substitute for that assessment.",
  },
] as const;

// One shared scale; each statement describes a concrete organisational practice.
export const ANCHORS = [
  "Not yet true",
  "True in a few places",
  "Partly true",
  "Mostly true",
  "Consistently true",
];
export const QUESTIONS = [
  [
    0,
    "Our team feels comfortable using the digital tools needed for everyday work.",
  ],
  [0, "Colleagues can get practical help when a digital task is difficult."],
  [0, "We make time to learn useful features of the tools we already use."],
  [
    0,
    "Our digital tools are usable by the people who need them, including colleagues with access needs.",
  ],
  [1, "We know where to find the latest version of important information."],
  [
    1,
    "Our information is organised consistently enough for colleagues to understand it.",
  ],
  [
    1,
    "Information moves between our main systems without people repeatedly typing it in again.",
  ],
  [1, "We check important information for gaps or mistakes before using it."],
  [
    1,
    "We control who can access sensitive information and know how to share it safely.",
  ],
  [2, "Our team understands some practical ways AI could help with our work."],
  [
    2,
    "We have tried a small, low-risk use of AI and discussed what we learned.",
  ],
  [
    2,
    "We have clear guidance on what information colleagues may put into AI tools.",
  ],
  [2, "We know who would check AI-generated work before relying on it."],
  [
    3,
    "Our leaders are open to changing processes when there is a clear benefit.",
  ],
  [
    3,
    "Someone has responsibility for improving how our tools and information work together.",
  ],
  [
    3,
    "We can make time for a small improvement alongside our day-to-day work.",
  ],
  [3, "Colleagues help shape changes to the systems they use."],
  [
    4,
    "We can explain what difference we want to make and what useful evidence would look like.",
  ],
  [4, "Our managers use information about outcomes when making decisions."],
  [4, "We discuss what our evidence cannot tell us, as well as what it can."],
  [
    4,
    "We turn learning about our impact into specific actions and check what happens next.",
  ],
] as const;
export const REFLECTIONS = [
  "What software, databases or systems does your organisation currently use?",
  "What’s most frustrating or time-consuming about how information is collected, managed or used?",
  "If you had your own Impact Director, what would you most want help with?",
  "Anything else we should know about your organisation?",
];
export type Draft = {
  version: 1;
  ratings: number[];
  reflections: string[];
  step: number;
  completed: boolean;
  organisation: string;
};
export const emptyDraft = (): Draft => ({
  version: 1,
  ratings: Array(21).fill(0),
  reflections: Array(4).fill(""),
  step: -1,
  completed: false,
  organisation: "",
});
export function validDraft(value: unknown): value is Draft {
  if (!value || typeof value !== "object") return false;
  const d = value as Draft;
  return (
    d.version === 1 &&
    Array.isArray(d.ratings) &&
    d.ratings.length === 21 &&
    d.ratings.every((n) => Number.isInteger(n) && n >= 0 && n <= 5) &&
    Array.isArray(d.reflections) &&
    d.reflections.length === 4 &&
    d.reflections.every((s) => typeof s === "string" && s.length <= 10000) &&
    typeof d.organisation === "string" &&
    d.organisation.length <= 200 &&
    Number.isInteger(d.step) &&
    d.step >= -1 &&
    d.step <= 25 &&
    typeof d.completed === "boolean" &&
    (!d.completed || d.ratings.every((n) => n > 0)) &&
    (d.step !== 25 || d.completed)
  );
}
export function buildReport(draft: Draft) {
  if (!validDraft(draft) || !draft.completed)
    throw new Error("Complete all 21 ratings to see your report.");
  const areas = AREAS.map((area, index) => {
    const values = draft.ratings.filter((_, i) => QUESTIONS[i][0] === index);
    return {
      ...area,
      score:
        Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) /
        10,
      index,
    };
  });
  const overall =
    Math.round((areas.reduce((s, a) => s + a.score, 0) / areas.length) * 10) /
    10;
  const priorities = [...areas].sort((a, b) => a.score - b.score).slice(0, 3);
  const strengths = areas.filter((a) => a.score >= 4);
  const barriers = areas.filter((a) => a.score < 3);
  const uncertainties = QUESTIONS.filter((_, i) => draft.ratings[i] <= 2).map(
    (q) => q[1],
  );
  const agenda = [
    draft.reflections[2]
      ? `Your priority: ${draft.reflections[2]}`
      : "Agree which organisational priority an Impact Director should help with first.",
    draft.reflections[0]
      ? `Systems you mentioned: ${draft.reflections[0]}`
      : "Map the tools and systems you currently use; none were specified in this snapshot.",
    draft.reflections[1]
      ? `Your sticking point: ${draft.reflections[1]}`
      : "Find the most time-consuming information task and understand who it affects.",
    `Investigate ${priorities
      .slice(0, 2)
      .map((a) => a.name.toLowerCase())
      .join(
        " and ",
      )}: what lies behind your ratings, and what would a useful first improvement look like?`,
    uncertainties.length
      ? `Clarify your lower-rated practices: ${uncertainties.slice(0, 3).join(" ")}`
      : "Test your self-reported strengths against a real example, and agree where additional capacity could help.",
    "Agree one manageable experiment, a human owner, safeguards and a review date. Discuss whether specialist support would be useful.",
    ...(draft.reflections[3]
      ? [`Additional context you shared: ${draft.reflections[3]}`]
      : []),
  ];
  return {
    overall,
    areas,
    priorities,
    strengths,
    barriers,
    agenda,
    summary:
      overall >= 4
        ? "Strong foundations to build on"
        : overall >= 3
          ? "Useful foundations, with room to connect the dots"
          : "Start small. Build confidence. Make room for impact.",
  };
}
export function reportText(draft: Draft) {
  const r = buildReport(draft);
  return [
    `MY IMPACT DIRECTOR: YOUR READINESS SNAPSHOT`,
    draft.organisation,
    r.summary,
    `Overall: ${r.overall}/5`,
    "Self-reported, not independently verified. This is not a professional audit or a Social Impact Excellence maturity assessment.",
    "Each area's score is the mean of its ratings. The overall score is the equally weighted mean of the five areas. Scores are rounded to one decimal place.",
    ...r.areas.map((a) => `${a.name}: ${a.score}/5`),
    "THREE PRACTICAL NEXT STEPS",
    ...r.priorities.map((a) => a.next),
    "OPPORTUNITIES TO EXPLORE",
    ...r.priorities.map((a) => a.opportunity),
    "YOUR CONVERSATION AGENDA",
    ...r.agenda,
    "YOUR ANSWERS",
    ...QUESTIONS.map(
      (q, i) =>
        `${q[1]}: ${draft.ratings[i]}/5 (${ANCHORS[draft.ratings[i] - 1]})`,
    ),
    ...REFLECTIONS.map(
      (q, i) => `${q}\n${draft.reflections[i] || "Not provided"}`,
    ),
  ].join("\n\n");
}
