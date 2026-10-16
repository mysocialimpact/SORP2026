import type { Candidate } from "../../app/sorp-public-model";
/** Public, serialisable facts. No credentials, permissions or inferred identity. */
export const fieldKeys = ["name", "email", "role", "organisation"] as const;
export type FieldKey = (typeof fieldKeys)[number];
export type Facts = Record<FieldKey, string> & {
  responsibilities: string;
  discovery: string;
  concerns: string;
  portfolio: string;
  charities: string[];
  interests: string;
  context: string;
  organisationKind: "charity" | "firm" | "other" | "independent" | "unknown";
};
export type Objective =
  | "registration"
  | "charity"
  | "responsibilities"
  | "discovery"
  | "concerns"
  | "clarification"
  | "reflection"
  | "complete";
export type ProfessionalRelationship = {
  entity: string;
  entityNature?: "named_organisation";
  aliases: string[];
  kind: "charity" | "firm" | "organisation" | "unknown";
  relationship:
    | "client"
    | "employer"
    | "trustee"
    | "employee"
    | "volunteer"
    | "adviser"
    | "mentioned";
  period: "past" | "current" | "unspecified";
  confidence: "stated" | "uncertain";
  role: string;
  evidence: string;
  turn: number;
};
export type QuestionProposal = {
  objective: Objective;
  fields: string[];
  question: string;
  natural?: boolean;
};
export type DialogueMemory = {
  recent: { role: "user" | "assistant"; text: string }[];
  followUps: number;
  finalFollowUpUsed: boolean;
  reflecting: boolean;
};
export type Conversation = {
  facts: Facts;
  dialogue: DialogueMemory;
  turns: number;
  repairTurns: number;
  asked: Objective[];
  skipped: Objective[];
  lastIntent: Intent;
  clarification: "charity" | "meaning" | "question" | null;
  version: 3;
  professional: ProfessionalRelationship[];
  corrections: {
    field: FieldKey;
    previous: string;
    value: string;
    source: "form" | "message";
    turn: number;
  }[];
  finishRequested: boolean;
  afterCharity: QuestionProposal | null;
  response:
    (QuestionProposal & { contextKey: string; generated: boolean }) | null;
  acknowledged: string[];
  revision: number;
  knowledge: Partial<
    Record<
      keyof Facts,
      {
        status: "supplied" | "inferred" | "confirmed";
        source: "message" | "form" | "relationship";
        turn: number;
      }
    >
  >;
  charity: {
    proposed: string;
    confirmed: Candidate | null;
    candidates: Candidate[];
    declined: string[];
    phase: "suggest" | "lookup" | "confirm" | "confirmed";
  };
};
export const emptyFacts = (): Facts => ({
  name: "",
  email: "",
  role: "",
  organisation: "",
  responsibilities: "",
  discovery: "",
  concerns: "",
  portfolio: "",
  charities: [],
  interests: "",
  context: "",
  organisationKind: "unknown",
});
export const initialConversation = (): Conversation => ({
  facts: emptyFacts(),
  dialogue: { recent: [], followUps: 0, finalFollowUpUsed: false, reflecting: false },
  turns: 0,
  repairTurns: 0,
  asked: [],
  skipped: [],
  version: 3,
  professional: [],
  corrections: [],
  finishRequested: false,
  afterCharity: null,
  response: null,
  acknowledged: [],
  revision: 0,
  knowledge: {},
  lastIntent: "inform",
  clarification: null,
  charity: {
    proposed: "",
    confirmed: null,
    candidates: [],
    declined: [],
    phase: "suggest",
  },
});
export const validEmail = (v: string) =>
  v.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
export const registrationReady = (f: Facts) =>
  validEntity(f.name, "name") &&
  validEmail(f.email) &&
  validEntity(f.role, "role") &&
  (validEntity(f.organisation, "organisation") || f.organisationKind === "independent");
/** One validated charity must be explicitly confirmed before creating the account. */
export const accountReady = (s: Conversation) => registrationReady(s.facts) && !!s.charity.confirmed;
export const OPTIONAL_TURN_CAP = 6;
export const TOTAL_TURN_CAP = 10;
export function safeDestination(
  value: string | null | undefined,
  allowOnboarding = false,
): string {
  if (
    !value ||
    !value.startsWith("/") ||
    /[\\\u0000-\u0020]/.test(value) ||
    value.startsWith("//")
  )
    return "/dashboard/";
  try {
    const url = new URL(value, "https://sorp2026.org");
    if (
      url.origin !== "https://sorp2026.org" ||
      /^\/(api|login|logout)(\/|$)/.test(url.pathname) ||
      (!allowOnboarding && /^\/get-started(\/|$)/.test(url.pathname))
    )
      return "/dashboard/";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/dashboard/";
  }
}
export function cleanFacts(input: unknown): Partial<Facts> {
  if (!input || typeof input !== "object") return {};
  const value = input as Record<string, unknown>,
    result: Partial<Facts> = {};
  for (const key of [
    ...fieldKeys,
    "responsibilities",
    "discovery",
    "concerns",
    "portfolio",
    "interests",
    "context",
  ] as const) {
    if (typeof value[key] === "string") {
      const text = value[key]
        .trim()
        .slice(
          0,
          ["concerns", "responsibilities", "interests", "context"].includes(key)
            ? 600
            : key === "email"
              ? 254
              : 160,
        );
      if (
        text &&
        (key === "email"
          ? validEmail(text)
          : fieldKeys.includes(key as FieldKey)
            ? validEntity(text, key as FieldKey)
            : true)
      )
        result[key] = text;
    }
  }
  if (
    ["charity", "firm", "other", "independent", "unknown"].includes(
      String(value.organisationKind),
    )
  )
    result.organisationKind =
      value.organisationKind as Facts["organisationKind"];
  if (Array.isArray(value.charities))
    result.charities = [
      ...new Set(
        value.charities
          .filter((s): s is string => typeof s === "string")
          .map((s) => s.trim().slice(0, 160))
          .filter((v) => validEntity(v, "charity")),
      ),
    ].slice(0, 6);
  return result;
}
export function mergeFacts(facts: Facts, patch: Partial<Facts>): Facts {
  const cleaned = cleanFacts(patch);
  return {
    ...facts,
    ...cleaned,
    charities: [
      ...new Set([...facts.charities, ...(cleaned.charities || [])]),
    ].slice(0, 6),
  };
}
/** Conservative instant recognition. Ambiguous facts are left for the model or direct editing. */
export function extractImmediate(
  text: string,
  state: Conversation,
  contextual = true,
): Extraction {
  const result: Extraction = interpretImmediate(text, state);
  if (
    ["remind", "clarify", "question", "disagree"].includes(result.intent || "")
  )
    return result;
  const email = text.match(/[\w.!#$%&'*+/=?^`{|}~-]+@[\w-]+(?:\.[\w-]+)+/)?.[0];
  if (email && validEmail(email)) result.email = email.toLowerCase();
  const name = text.match(
    /(?:[Mm]y name is|I[’']m|I am|name\s*:)\s+([\p{Lu}][\p{L}'’\-]+(?:\s+[\p{Lu}][\p{L}'’\-]+){0,3})(?=[,.!\s]|$)/u,
  )?.[1];
  if (
    name &&
    name.length >= 2 &&
    !/^(Hello|Hi|Chartered(?: Accountant)?|CEO|Trustee|Accountant|Finance (?:Director|Manager)|Chief Executive|Fundraising Manager|Charity (?:CEO|Leader|Employee)|Auditor|Treasurer)$/i.test(
      name,
    )
  )
    result.name = name;
  const role = text.match(
    /\b(chartered accountant|charity (?:CEO|leader|employee)|accountant|auditor|trustee|treasurer|finance director|chief executive|CEO|fundraising manager|finance manager)\b/i,
  )?.[1];
  if (role) result.role = role.charAt(0).toUpperCase() + role.slice(1);
  const organisation = text.match(
    /(?:\b(?:accountant|auditor|trustee|director|manager|CEO)\s+(?:at|for)|\bI work (?:at|for))\s+([\p{Lu}][\p{L}\d'’&-]*(?:\s+[\p{Lu}][\p{L}\d'’&-]*){0,5})/u,
  )?.[1];
  if (organisation) result.organisation = organisation;
  if (!organisation && /\b(?:I(?:[’\']m| am) (?:self[- ]employed|a freelancer|working independently)|I work (?:independently|for myself)|I run my own independent practice)\b/i.test(text))
    result.organisationKind = "independent";
  const discovery = text.match(
    /(?:found you|heard about (?:you|SORP(?: 2026)?)|came across (?:you|SORP(?: 2026)?))(?:\s+(?:on|via|through|from))?\s+([^.!?]+)/i,
  )?.[1];
  if (discovery) result.discovery = discovery;
  const portfolio = text.match(
    /(?:work(?:ing)? with|advise|support)\s+((?:about |around |approximately )?\d+\s+charit(?:y|ies))/i,
  )?.[1];
  if (portfolio) result.portfolio = portfolio;
  const references = [
    ...text.matchAll(
      /(?:including|charit(?:y|ies)(?: clients)?(?: are| is|:)|clients include|work(?:ing)? with)\s+([^.!?]+)/gi,
    ),
  ];
  if (references.length)
    result.charities = references
      .flatMap((match) =>
        match[1].replace(/^.*?\bincluding\s+/i, "").split(/,\s*|\s+and\s+/),
      )
      .map((s) => s.trim())
      .filter(
        (s) =>
          /^[\p{Lu}\d]/u.test(s) &&
          !/^(?:another|other|a charity|about |around |approximately |\d+ charities)/i.test(
            s,
          ),
      )
      .slice(0, 6);
  const number = text.match(
    /(?:charity (?:number|no\.?|registration)\s*:?\s*)((?:SC|NIC)?\d{5,8})/i,
  )?.[1];
  if (number)
    result.charities = [...(result.charities || []), number.toUpperCase()];
  const concerns = text.match(
    /(?:I(?:[’']m| am) (?:worried|concerned) about|my (?:biggest )?(?:concern|challenge) is|what keeps me up at night is)\s+([^.!?]+(?:[.!?][^.!?]+)?)/i,
  )?.[1];
  if (concerns) result.concerns = concerns;
  const responsibilities = text.match(
    /(?:I (?:mainly |mostly )?(?:prepare|manage|lead|oversee|advise on))\s+[^.!?]+/i,
  )?.[0];
  if (responsibilities) result.responsibilities = responsibilities;
  const interests = text.match(
    /(?:I(?:[’']m| am) interested in|my interests? (?:is|are))\s+([^.!?]+)/i,
  )?.[1];
  if (interests) result.interests = interests;
  const choice = choiceFromAnswer(text, state);
  if (
    choice &&
    !["remind", "clarify", "question", "disagree"].includes(result.intent || "")
  )
    result.charityChoice = choice;
  if (
    /^(?:no(?: thanks)?|not that (?:one|charity)|that's my employer|that’s my employer)[.!]?$/i.test(
      text.trim(),
    )
  )
    result.charityDecision = "reject";
  const objective = nextObjective(state);
  const simple = text.trim().replace(/[.!]$/, "");
  if (
    contextual &&
    simple &&
    !Object.keys(result).some((k) => k !== "intent" && k !== "target") &&
    result.intent === "inform" &&
    !/^(?:actually|instead|change|correction)\b/i.test(simple) &&
    !/\?/.test(simple) &&
    !/^(skip|no thanks|not now)$/i.test(simple)
  ) {
    if (objective === "discovery" && !result.discovery)
      result.discovery = simple;
    if (objective === "concerns" && !result.concerns) result.concerns = simple;
    if (
      objective === "responsibilities" &&
      !result.responsibilities &&
      !result.email &&
      !result.name
    )
      result.responsibilities = simple;
    if (
      objective === "charity" &&
      /^(?:[\p{Lu}][\p{L}’'&-]+(?:\s+[\p{Lu}][\p{L}’'&-]+){0,6}|(?:SC|NIC)?\d{5,8})$/u.test(
        simple,
      ) &&
      !/^(?:Let[’']s|Please|Use|Start|Choose)\b/i.test(simple) &&
      !/^(?:yes|yes please|that’s right|that's right|sure|no)$/i.test(simple) &&
      !result.charities &&
      simple.length < 160 &&
      !result.email &&
      !result.name
    )
      result.charities = [simple];
    if (
      objective === "registration" &&
      !state.facts.name &&
      /^[\p{Lu}][\p{L}'’\-]+(?:\s+[\p{Lu}][\p{L}'’\-]+){0,3}$/u.test(simple) &&
      !/^(?:Hello(?: There)?|Hi(?: There)?|Hey|Thanks|Thank You|Yes(?: Please)?|No|Good (?:Morning|Afternoon|Evening))$/i.test(
        simple,
      ) &&
      !role
    )
      result.name = simple;
  }
  // Lexical outage handling cannot resolve temporal or third-person work context.
  // Preserve safe identity only rather than guess a current affiliation.
  if (
    /\b(?:used to|previously|former|in the past|I was|my (?:partner|wife|husband|colleague))\b/i.test(
      text,
    )
  ) {
    delete result.role;
    delete result.organisation;
    delete result.organisationKind;
    delete result.responsibilities;
    delete result.charities;
  }
  return { ...result, ...cleanFacts(result) };
}
/** The reducer owns all facts, inferred relationships, proposals and confirmation.
 * A proposal is never a registry confirmation and never starts preparation. */
export type Intent =
  | "inform"
  | "confirm"
  | "correct"
  | "remind"
  | "clarify"
  | "question"
  | "disagree";
export type Extraction = Partial<Facts> & {
  intent?: Intent;
  target?: keyof Facts | "unknown";
  reference?: string;
  charityChoice?: string;
  charityDecision?: "accept" | "reject";
  professional?: ProfessionalRelationship[];
  correctedFields?: FieldKey[];
  finishRequested?: boolean;
  questionProposal?: QuestionProposal;
  afterCharity?: QuestionProposal;
  utterance?: string;
  topicResponse?: { topic: "responsibilities" | "discovery" | "concerns" | "none"; status: "answered" | "declined" | "uncertain" | "not_answered"; followUp: boolean };
  notice?: string;
  closeOptional?: boolean;
  usage?: { input: number; output: number; estimatedUsd: number; calls?: number };
};
/** Successful semantic interpretation is authoritative: an incidental mention
 * of someone else's role must not survive as the user's role. Lexical recognition
 * is only an optimistic preview/fallback, never a competing copy of memory. */
export function reconcileExtraction(
  message: string,
  state: Conversation,
  semantic: Extraction,
): Extraction {
  const explicit = extractImmediate(message, state, false);
  const intent = semantic.intent || explicit.intent;
  if (intent && intent !== "inform" && intent !== "confirm")
    return {
      ...semantic,
      intent,
      target: semantic.target || explicit.target,
      reference: semantic.reference || explicit.reference,
      charityChoice: semantic.charityChoice || explicit.charityChoice,
      charityDecision: semantic.charityDecision || explicit.charityDecision,
    };
  return { ...semantic, intent };
}
/** Boundary validation is separate from language understanding. Sentences and
 * unresolved pronouns are never usable entity/search candidates, even if a model returns them. */
export function validEntity(
  value: string,
  field: FieldKey | "charity" = "charity",
): boolean {
  const v = value.trim();
  if (v.length < 2 || v.length > 160 || /[?!\n<>]|https?:\/\//i.test(v))
    return false;
  if (
    /^(?:I(?:[’']m| am| already| told| work| meant| said| found| heard| want| would| don[’']t)|you(?:[’']ve| have| already| asked)|actually\b|no[, ]|yes(?: please)?$|that(?:[’']s| is| one| charity)|the (?:other|same|first|second|last)|please\b|why\b|what\b|sorry\b|not (?:that|what)|none$|another charity$)/i.test(
      v,
    )
  )
    return false;
  if (
    /\b(?:told you|already (?:said|mentioned)|not what|want to (?:use|review)|shall we|would you|let[’']s|my (?:name|email|role) is)\b/i.test(
      v,
    )
  )
    return false;
  if (/^(?:[Ii]|[Ww]e|[Yy]ou|[Mm]y|[Oo]ur|[Yy]our)\s+[a-z]/u.test(v))
    return false;
  if (
    (field === "charity" || field === "organisation") &&
    /^(?:(?:my|our|the|a|an|another|some|several|many|local|small|about|around|approximately|\d+)\s+)*(?:charit(?:y|ies)|clients?|organi[sz]ations?|firms?|companies|company|employers?)$/i.test(
      v,
    )
  )
    return false;
  if (field === "name")
    return /^[\p{L}][\p{L} ’'\-]{1,79}$/u.test(v) && v.split(/\s+/).length <= 5;
  if (field === "email") return validEmail(v);
  return !/@/.test(v) && v.split(/\s+/).length < 16;
}
function interpretImmediate(text: string, s: Conversation): Extraction {
  const t = text.trim();
  const known = [
    ...charityOptions(s),
    s.charity.proposed,
    s.charity.confirmed?.name || "",
  ].filter(Boolean);
  const matches = known.filter(
    (v, i) =>
      known.findIndex((x) => same(x, v)) === i &&
      t.toLowerCase().includes(v.toLowerCase()),
  );
  if (
    /\b(?:already (?:told|said|mentioned|gave)|I told you|as I said)\b/i.test(t)
  )
    return {
      intent: "remind",
      target: "charities",
      reference:
        matches.length === 1 ? matches[0] : s.charity.proposed || undefined,
    };
  if (/(?:not what I meant|actually,? I meant[.…]*$)/i.test(t))
    return { intent: "clarify", target: "unknown" };
  if (
    /(?:work there|my employer).*(?:not|isn[’']t).*(?:charity|review)/i.test(t)
  )
    return {
      intent: "correct",
      target: "charities",
      charityDecision: "reject",
    };
  if (/^(?:no[, ]*)?(?:the )?other charity[.!]?$/i.test(t)) {
    const remaining = charityOptions(s).filter(
      (c) =>
        !same(c, s.charity.proposed) &&
        !same(c, s.charity.confirmed?.name || ""),
    );
    return remaining.length === 1
      ? { intent: "correct", target: "charities", charityChoice: remaining[0] }
      : { intent: "clarify", target: "charities" };
  }
  if (/\?|^(?:why|what|how|can you|could you)\b/i.test(t))
    return { intent: "question" };
  if (/^(?:no(?: thanks)?|that's wrong|that’s wrong|I disagree)[.!]?$/i.test(t))
    return {
      intent: "disagree",
      target: nextObjective(s) === "charity" ? "charities" : "unknown",
      ...(nextObjective(s) === "charity"
        ? { charityDecision: "reject" as const }
        : {}),
    };
  if (choiceFromAnswer(t, s))
    return {
      intent: /^(?:actually|no|switch|change)/i.test(t) ? "correct" : "confirm",
      target: "charities",
    };
  return { intent: "inform" };
}
const same = (a: string, b: string) =>
  a.trim().toLocaleLowerCase() === b.trim().toLocaleLowerCase();
export function charityOptions(s: Conversation): string[] {
  const values = [
    ...s.facts.charities.map(
      (c) =>
        s.professional.find(
          (r) =>
            entitySame(r.entity, c) || r.aliases.some((a) => entitySame(a, c)),
        )?.entity || c,
    ),
    ...s.professional
      .filter(
        (r) =>
          r.kind === "charity" ||
          (["trustee", "client"].includes(r.relationship) && r.kind !== "firm") ||
          (r.relationship === "adviser" && r.entityNature === "named_organisation" && r.kind !== "firm"),
      )
      .map((r) => r.entity),
  ];
  if (s.facts.organisation && s.facts.organisationKind === "charity")
    values.push(s.facts.organisation);
  return values.filter(
    (v, i) =>
      validEntity(v) &&
      values.findIndex((x) => entitySame(x, v)) === i &&
      !s.charity.declined.some((x) => same(x, v)),
  );
}
function relationships(s: Conversation): Conversation {
  const facts = { ...s.facts },
    knowledge = { ...s.knowledge };
  // Cross-field interpretation applies regardless of which extractor or form supplied the fields.
  if (
    !knowledge.organisationKind ||
    knowledge.organisationKind.source === "relationship"
  ) {
    const adviser = /accountant|auditor|advis[eo]r|consultant/i.test(
      facts.role,
    );
    facts.organisationKind = adviser
      ? "firm"
      : /trustee|treasurer|charity|nonprofit|non-profit/i.test(facts.role)
        ? "charity"
        : facts.organisationKind === "charity"
          ? "charity"
          : "unknown";
    knowledge.organisationKind = {
      status: "inferred",
      source: "relationship",
      turn: s.turns,
    };
  }
  const next = { ...s, facts, knowledge, charity: { ...s.charity } };
  if (!next.charity.confirmed && next.charity.phase === "suggest") {
    const choices = charityOptions(next);
    next.charity.proposed = choices.length === 1 ? choices[0] : "";
  }
  return next;
}
export function normaliseConversation(
  input: unknown,
  legacySelected: Candidate | null = null,
): Conversation {
  const raw = (
    input && typeof input === "object" ? input : {}
  ) as Partial<Conversation>;
  const base = initialConversation();
  const state: Conversation = {
    ...base,
    ...raw,
    version: 3,
    revision: Number.isInteger(raw.revision) ? raw.revision! : 0,
    facts: { ...base.facts, ...cleanFacts(raw.facts) },
    dialogue: {
      ...base.dialogue,
      ...raw.dialogue,
      recent: (raw.dialogue?.recent || []).slice(-8).map((m) => ({ role: m.role, text: m.text.slice(0, 1600) })),
    },
    charity: { ...base.charity, ...raw.charity },
    knowledge: { ...raw.knowledge },
    professional: mergeProfessional(
      [],
      raw.professional || [],
      raw.turns || 0,
      true,
    ),
    corrections: Array.isArray(raw.corrections)
      ? raw.corrections.slice(-12)
      : [],
    acknowledged: Array.isArray(raw.acknowledged)
      ? raw.acknowledged.slice(-12)
      : [],
    asked: raw.asked || [],
    skipped: raw.skipped || [],
  };
  // Preserve unfinished human edits as drafts; they do not satisfy validation.
  for (const key of fieldKeys)
    if (
      raw.knowledge?.[key]?.source === "form" &&
      typeof raw.facts?.[key] === "string"
    )
      state.facts[key] = raw.facts[key].slice(0, key === "email" ? 254 : 120);
  if (!raw.charity && legacySelected)
    state.charity = {
      ...base.charity,
      confirmed: legacySelected,
      proposed: legacySelected.name,
      phase: "confirmed",
    };
  for (const key of Object.keys(state.facts) as (keyof Facts)[])
    if (state.facts[key]?.length && !state.knowledge[key])
      state.knowledge[key] = {
        status: "supplied",
        source: "message",
        turn: state.turns,
      };
  if (!raw.version) delete state.knowledge.organisationKind;
  return relationships(state);
}
export function applyFacts(
  s: Conversation,
  patch: Partial<Facts>,
  source: "message" | "form" = "message",
): Conversation {
  const cleaned = cleanFacts(patch);
  if (source === "message")
    for (const key of fieldKeys)
      if (s.knowledge[key]?.status === "confirmed") delete cleaned[key];
  const facts = mergeFacts(s.facts, cleaned),
    knowledge = { ...s.knowledge };
  if (source === "form")
    for (const key of fieldKeys)
      if (typeof patch[key] === "string")
        facts[key] = patch[key]!.slice(0, key === "email" ? 254 : 120);
  for (const key of Object.keys(cleaned) as (keyof Facts)[])
    knowledge[key] = {
      status: source === "form" ? "confirmed" : "supplied",
      source,
      turn: s.turns,
    };
  if (source === "form")
    for (const key of fieldKeys)
      if (patch[key] !== undefined) {
        if (facts[key])
          knowledge[key] = {
            status: validEntity(facts[key], key) ? "confirmed" : "supplied",
            source,
            turn: s.turns,
          };
        else delete knowledge[key];
      }
  // An explicitly revised employer invalidates a prior classification, not a confirmed charity.
  if (
    patch.organisation !== undefined &&
    !same(patch.organisation, s.facts.organisation) &&
    !patch.organisationKind
  ) {
    delete knowledge.organisationKind;
    facts.organisationKind = "unknown";
  }
  const corrections = [...s.corrections];
  if (source === "form")
    for (const key of fieldKeys)
      if (
        patch[key] !== undefined &&
        s.facts[key] &&
        !same(s.facts[key], facts[key])
      )
        corrections.push({
          field: key,
          previous: s.facts[key],
          value: facts[key],
          source,
          turn: s.turns,
        });
  const professional = s.professional.map((r) =>
    source === "form" &&
    patch.organisation !== undefined &&
    entitySame(r.entity, s.facts.organisation) &&
    r.period === "current" &&
    ["employer", "employee", "trustee"].includes(r.relationship)
      ? {
          ...r,
          entity: facts.organisation,
          aliases: [],
          evidence: `Organisation corrected in profile`,
          turn: s.turns,
        }
      : r,
  );
  const changedWork =
    source === "form" &&
    (["role", "organisation"] as const).some(
      (k) => patch[k] !== undefined && !same(s.facts[k], facts[k]),
    );
  return relationships({
    ...s,
    facts,
    knowledge,
    professional,
    corrections: corrections.slice(-12),
    ...(changedWork ? { response: null, afterCharity: null } : {}),
  });
}
export function proposeCharity(s: Conversation, value: string): Conversation {
  if (!validEntity(value)) return { ...s, clarification: "charity" };
  const proposed = value.trim().slice(0, 160);
  return {
    ...s,
    skipped: s.skipped.filter((x) => x !== "charity"),
    charity: {
      ...s.charity,
      proposed,
      confirmed: null,
      candidates: [],
      phase: "lookup",
    },
  };
}
export function confirmCharity(
  s: Conversation,
  candidate: Candidate,
  recordEvent = true,
): Conversation {
  let confirmed: Conversation = {
      ...s,
      lastIntent: "confirm",
      clarification: null,
      dialogue: { ...s.dialogue, recent: recordEvent ? [...s.dialogue.recent,
        { role: "assistant" as const, text: nextQuestion(s).slice(0, 1600) },
        { role: "user" as const, text: `[Interface action: confirmed the displayed official charity record for ${candidate.name}.]` },
      ].slice(-8) : s.dialogue.recent },
      charity: {
        ...s.charity,
        proposed: s.charity.proposed || candidate.name,
        confirmed: candidate,
        candidates: [],
        phase: "confirmed",
      },
    };
  // The same optional move can follow an explicit UI confirmation. Supplying
  // rich context early must not remove the opportunity to respond to it.
  if (s.afterCharity?.objective === "reflection")
    confirmed = confirmationFollowUp(confirmed) || confirmed;
  return attachQuestion(confirmed, s.afterCharity || undefined);
}
export function confirmationFollowUp(s: Conversation): Conversation | null {
  if (!s.charity.confirmed || s.finishRequested || s.dialogue.followUps ||
      s.turns >= TOTAL_TURN_CAP - 1 || s.turns - s.repairTurns >= OPTIONAL_TURN_CAP ||
      !["responsibilities", "discovery", "concerns", "complete"].includes(nextObjective(s)) ||
      ![s.facts.responsibilities, s.facts.concerns, s.facts.interests, s.facts.portfolio].some(Boolean)) return null;
  return { ...s, dialogue: { ...s.dialogue, reflecting: true, followUps: s.dialogue.followUps + 1 } };
}
export function applyExtraction(
  s: Conversation,
  patch: Extraction,
): Conversation {
  const supplied = { ...patch };
  // Time is a first-class constraint: past work never fills today's employer or role.
  const professional = mergeProfessional(
    s.professional,
    patch.professional || [],
    s.turns,
  );
  // The form is a projection of typed memory. A single explicit current affiliation
  // can supply its organisation; historical/client/mentioned entities cannot.
  if (!supplied.organisation && !s.facts.organisation) {
    const affiliations = [
      ...new Set(
        (patch.professional || [])
          .filter(
            (r) =>
              r.period === "current" &&
              r.confidence === "stated" &&
              ["trustee", "employee", "employer", "volunteer"].includes(
                r.relationship,
              ),
          )
          .map((r) => r.entity),
      ),
    ];
    if (affiliations.length === 1) supplied.organisation = affiliations[0];
  }
  if (
    supplied.organisation &&
    professional.some(
      (r) =>
        entitySame(r.entity, supplied.organisation!) && r.period === "past",
    ) &&
    !professional.some(
      (r) =>
        entitySame(r.entity, supplied.organisation!) && r.period === "current",
    )
  )
    delete supplied.organisation;
  // Explicit corrections are the only conversational updates that can replace a confirmed edit.
  const knowledge = { ...s.knowledge };
  for (const key of patch.correctedFields || []) delete knowledge[key];
  let next = applyFacts(
    { ...s, professional, knowledge, response: null },
    supplied,
  );
  for (const key of patch.correctedFields || [])
    if (supplied[key] && next.facts[key] !== s.facts[key]) {
      next.knowledge[key] = {
        status: "confirmed",
        source: "message",
        turn: s.turns,
      };
      next.corrections = [
        ...next.corrections,
        {
          field: key,
          previous: s.facts[key],
          value: next.facts[key],
          source: "message" as const,
          turn: s.turns,
        },
      ].slice(-12);
    }
  // Retain additional professional insight, instead of replacing earlier context each turn.
  if (patch.intent !== "correct")
    for (const key of [
      "responsibilities",
      "interests",
      "concerns",
      "context",
    ] as const) {
      if (
        s.facts[key] &&
        next.facts[key] &&
        !s.facts[key].includes(next.facts[key]) &&
        !next.facts[key].includes(s.facts[key])
      )
        next.facts[key] = (s.facts[key] + "; " + next.facts[key]).slice(0, 600);
    }
  next.finishRequested = patch.finishRequested === true || s.finishRequested;
  next.afterCharity = patch.afterCharity || null;
  if (patch.charityDecision === "reject")
    next = relationships({
      ...next,
      charity: {
        ...next.charity,
        declined: [
          ...new Set(
            [...next.charity.declined, next.charity.proposed].filter(Boolean),
          ),
        ],
        confirmed: null,
        proposed: "",
        candidates: [],
        phase: "suggest",
      },
    });
  const intent = patch.intent || "inform";
  const choice = ["remind", "clarify", "question"].includes(intent)
    ? ""
    : patch.charityChoice ||
      (patch.charityDecision === "accept" ? next.charity.proposed : "");
  if (choice && validEntity(choice)) next = proposeCharity(next, choice);
  const reference =
    patch.reference &&
    charityOptions(next).find((v) => same(v, patch.reference!));
  if (intent === "remind" && reference)
    next = {
      ...next,
      charity: {
        ...next.charity,
        proposed: reference,
        phase: next.charity.confirmed ? "confirmed" : "suggest",
      },
    };
  return {
    ...next,
    lastIntent: intent,
    clarification:
      intent === "clarify"
        ? patch.target === "charities"
          ? "charity"
          : "meaning"
        : intent === "question"
          ? "question"
          : ["disagree", "correct", "clarify"].includes(intent) &&
              patch.target === "charities" &&
              !choice &&
              charityOptions(next).length > 1
            ? "charity"
            : intent === "disagree" && !patch.charityDecision
              ? "meaning"
              : null,
  };
}
/** A professional detour must not consume the only chance to understand a final
 * answer. Both opportunities still fit inside the same six-answer optional cap. */
export function canFollowUp(before: Conversation, after: Conversation, topic: Extraction["topicResponse"], skip = false): boolean {
  const objective = nextObjective(before);
  return !!(topic && topic.status !== "declined" && !skip && !after.finishRequested &&
    ["responsibilities", "discovery", "concerns"].includes(objective) &&
    ["discovery", "concerns", "complete"].includes(nextObjective(after)) &&
    after.turns < TOTAL_TURN_CAP && after.turns - after.repairTurns < OPTIONAL_TURN_CAP && before.dialogue.followUps < 2 &&
    (objective === "concerns" ? !before.dialogue.finalFollowUpUsed : before.dialogue.followUps === 0));
}
export function closeOptionalConversation(s: Conversation): Conversation | null {
  if (!accountReady(s) || s.clarification) return null;
  return { ...s, dialogue: { ...s.dialogue, reflecting: false },
    skipped: [...new Set([...s.skipped, ...(["responsibilities", "discovery", "concerns"] as Objective[])])] };
}
export function advance(
  s: Conversation,
  patch: Extraction,
  skip = false,
): Conversation {
  const objective = nextObjective(s);
  const repair = [
    "correct",
    "remind",
    "clarify",
    "question",
    "disagree",
  ].includes(patch.intent || "");
  const next = applyExtraction(
    {
      ...s,
      turns: Math.min(TOTAL_TURN_CAP, s.turns + 1),
      repairTurns: s.repairTurns + (repair ? 1 : 0),
    },
    patch,
  );
  // Topic participation is distinct from a professional fact. A joke, refusal,
  // uncertainty or personal answer can close an optional topic without becoming CRM data.
  const topic = patch.topicResponse;
  if (topic && ["responsibilities", "discovery", "concerns"].includes(topic.topic) &&
      (objective === topic.topic || (objective === "reflection" && topic.topic === "concerns")) &&
      topic.status !== "not_answered") {
    next.skipped = [...new Set([...next.skipped, topic.topic as Objective])];
    if (next.clarification === "question" || next.clarification === "meaning") next.clarification = null;
  }
  const reflecting = !!(topic?.followUp && canFollowUp(s, next, topic, skip));
  next.dialogue = {
    recent: patch.utterance ? [...s.dialogue.recent,
      { role: "assistant" as const, text: nextQuestion(s).slice(0, 1600) },
      { role: "user" as const, text: patch.utterance.slice(0, 1600) }].slice(-8) : s.dialogue.recent,
    followUps: s.dialogue.followUps + (reflecting ? 1 : 0),
    finalFollowUpUsed: s.dialogue.finalFollowUpUsed || (reflecting && objective === "concerns"),
    reflecting,
  };
  const progressed: Conversation = {
      ...next,
      asked: [...new Set([...s.asked, objective])],
      skipped:
        skip && objective !== "registration"
          ? [...new Set([...next.skipped, objective])]
          : next.skipped,
    };
  return attachQuestion(patch.closeOptional ? closeOptionalConversation(progressed) || progressed : progressed, patch.questionProposal);
}
export function nextObjective(s: Conversation): Objective {
  if (s.clarification && s.turns < TOTAL_TURN_CAP && !s.finishRequested)
    return "clarification";
  if (!registrationReady(s.facts)) return "registration";
  // Mandatory charity confirmation must not be bypassed by a skip, finish request or optional turn cap.
  if (!s.charity.confirmed) return "charity";
  if (s.finishRequested || s.turns >= TOTAL_TURN_CAP) return "complete";
  if (s.dialogue.reflecting && s.turns < TOTAL_TURN_CAP) return "reflection";
  if (s.turns - s.repairTurns >= OPTIONAL_TURN_CAP) return "complete";
  for (const key of ["responsibilities", "discovery", "concerns"] as const)
    if (!s.facts[key] && !s.skipped.includes(key)) return key;
  return "complete";
}
export function nextQuestion(s: Conversation): string {
  const proposal = s.response;
  if (proposal && suitableQuestion(s, proposal)) {
    if (proposal.natural) return proposal.question
      .replaceAll("{firstName}", s.facts.name.split(" ")[0])
      .replaceAll("{name}", s.facts.name)
      .replaceAll("{charityName}", s.charity.confirmed?.name || s.charity.proposed);
    const relation = s.professional.find(
      (r) => relationshipKey(r) === proposal.contextKey,
    );
    return `${relation && !proposal.question.toLowerCase().includes(relation.entity.toLowerCase()) ? relationshipLead(relation) : ""}${proposal.question.replaceAll("{firstName}", s.facts.name.split(" ")[0]).replaceAll("{name}", s.facts.name)}`;
  }
  return fallbackQuestion(s);
}
function fallbackQuestion(s: Conversation): string {
  if (s.clarification === "meaning")
    return "I may have misunderstood. Which detail should I correct? Your existing details are still here.";
  if (s.clarification === "charity") {
    const choices = charityOptions(s);
    return choices.length
      ? `Which did you mean: ${choices.join(", ")}? I’ll wait for your choice.`
      : "Which charity did you mean? I’ve kept your existing details.";
  }
  if (s.clarification === "question")
    return (
      "Your details personalise the five SORP tools. We’ll ask you to check an official record before selecting a charity, and optional questions can be skipped. You can correct anything in your profile. " +
      nextQuestion({ ...s, clarification: null })
    );
  switch (nextObjective(s)) {
    case "registration": {
      const missing = [
        !validEntity(s.facts.name, "name") && "your name",
        !validEmail(s.facts.email) && "your email address",
        !validEntity(s.facts.role, "role") && "what you do",
      ].filter(Boolean);
      const historical = s.professional.find((r) => r.period === "past");
      if (
        missing.length === 1 &&
        !validEntity(s.facts.role, "role") &&
        historical
      )
        return `${relationshipLead(historical)}What sort of work are you doing now?`;
      const acknowledgement = s.charity.proposed
        ? `I’ve noted ${s.charity.proposed} as a possible starting charity. `
        : "";
      return !s.turns &&
        !Object.values(s.facts).some(
          (v) => typeof v === "string" && v && v !== "unknown",
        )
        ? "Let’s start with you. What’s your name, email address and what do you do?"
        : `${acknowledgement}Thank you${s.facts.name ? `, ${s.facts.name.split(" ")[0]}` : ""}. Could you tell me ${missing.join(" and ")}?`;
    }
    case "charity": {
      if (s.charity.candidates.length)
        return "Let’s make sure we’ve found the right charity.";
      if (s.charity.phase === "lookup")
        return `Let’s find the official record for ${s.charity.proposed}. You can check it before confirming.`;
      const choices = charityOptions(s);
      return choices.length > 1
        ? `You mentioned ${choices.join(", ")}. Which one would you like to start with?`
        : s.charity.proposed
          ? s.professional.some(
              (r) =>
                entitySame(r.entity, s.charity.proposed) && r.period === "past",
            )
            ? `You mentioned ${s.charity.proposed} previously. Would you like to start with that charity, or another one?`
            : `${s.lastIntent === "remind" ? "You’re right —" : "You mentioned"} ${s.charity.proposed}. Shall we use that as your starting charity?`
          : "Which charity would you like to start with? One name or charity number is enough to help us prepare a more personal experience.";
    }
    case "responsibilities":
      return /accountant|auditor|advis[eo]r/i.test(s.facts.role)
        ? "Do you mainly prepare accounts for charities, advise them more broadly, or a bit of both?"
        : /trustee|chair/i.test(s.facts.role)
          ? "Are you mainly involved in governance, financial oversight or something else?"
          : "What does your work involve day to day?";
    case "discovery":
      return "By the way, how did you come across us?";
    case "concerns":
      return "What keeps you up at night?";
    case "reflection":
      return "Would you like to say a little more about that, or continue with your profile?";
    default:
      return registrationReady(s.facts)
        ? `Your profile details are ready to review.${s.charity.confirmed ? ` ${s.charity.confirmed.name} is your confirmed starting charity.` : ""} You can create your account when you’re ready.`
        : "Let’s finish the remaining account details in your editable profile.";
  }
}
function choiceFromAnswer(message: string, s: Conversation): string {
  const text = message.trim().replace(/[.!]$/, "");
  const named = text.match(
    /^(?:actually[, ]*|no[, ]*)?(?:let[’']s (?:start with|use)|please use|use|start with|choose|switch to|change (?:it|that) to)\s+(.{2,120}?)(?:\s+instead)?$/i,
  )?.[1];
  if (named && validEntity(named)) return named;
  if (nextObjective(s) !== "charity") return "";
  if (
    !(s.charity.phase === "suggest" && charityOptions(s).length > 1) &&
    s.charity.proposed &&
    /^(yes|yes please|sure|that’s right|that's right|please do)$/i.test(text)
  )
    return s.charity.proposed;
  const matches = charityOptions(s).filter((c) =>
    text.toLowerCase().includes(c.toLowerCase()),
  );
  if (
    matches.length === 1 &&
    text.length < 180 &&
    !/\b(?:work with|including|clients|trustee|accountant)\b/i.test(text)
  )
    return matches[0];
  return "";
}
/** Compatibility export; lookup is driven by the resulting state, not the previous stage. */
export function charityQueryFromAnswer(message: string, state: Conversation) {
  return choiceFromAnswer(message, state);
}

/** Relationship identities are local mention identities, never regulator identities. */
export const entitySame = (a: string, b: string) =>
  a
    .trim()
    .replace(/^the\s+/i, "")
    .toLocaleLowerCase() ===
  b
    .trim()
    .replace(/^the\s+/i, "")
    .toLocaleLowerCase();
export const relationshipKey = (r: ProfessionalRelationship) =>
  `${r.entity.toLocaleLowerCase()}:${r.relationship}:${r.period}`;
export function mergeProfessional(
  existing: ProfessionalRelationship[],
  incoming: ProfessionalRelationship[],
  turn: number,
  preserveTurn = false,
): ProfessionalRelationship[] {
  const result = existing.map((r) => ({ ...r, aliases: [...r.aliases] }));
  for (const raw of incoming.slice(0, 10)) {
    if (
      !validEntity(raw.entity) ||
      !["past", "current", "unspecified"].includes(raw.period) ||
      ![
        "client",
        "employer",
        "trustee",
        "employee",
        "volunteer",
        "adviser",
        "mentioned",
      ].includes(raw.relationship)
    )
      continue;
    const r = {
      ...raw,
      aliases: (raw.aliases || []).filter((a) => validEntity(a)).slice(0, 4),
      evidence: raw.evidence.slice(0, 600),
      turn:
        preserveTurn && Number.isInteger(raw.turn)
          ? Math.max(0, Math.min(turn, raw.turn))
          : turn,
    };
    const entity = result.find(
      (old) =>
        entitySame(old.entity, r.entity) ||
        old.aliases.some((a) => entitySame(a, r.entity)),
    );
    if (entity) r.entity = entity.entity;
    const index = result.findIndex(
      (old) => relationshipKey(old) === relationshipKey(r),
    );
    if (index >= 0)
      result[index] = {
        ...result[index],
        ...r,
        aliases: [...new Set([...result[index].aliases, ...r.aliases])].slice(
          0,
          4,
        ),
      };
    else result.push(r);
  }
  return result.slice(-12);
}
export function missingRegistration(s: Conversation): FieldKey[] {
  return fieldKeys.filter(
    (k) => !(k === "organisation" && s.facts.organisationKind === "independent") && !validEntity(s.facts[k], k),
  );
}
export function questionPlan(s: Conversation) {
  const objective = nextObjective(s);
  const missing = missingRegistration(s);
  const fields =
    objective === "registration"
      ? missing
      : objective === "charity"
        ? ["charity"]
        : ["responsibilities", "discovery", "concerns"].includes(objective)
          ? [objective]
          : [];
  const context = s.professional
    .filter((r) => !s.acknowledged.includes(relationshipKey(r)))
    .sort((a, b) => b.turn - a.turn)[0];
  return {
    objective,
    fields,
    context,
    registrationComplete: registrationReady(s.facts),
    charityConfirmed: !!s.charity.confirmed,
    canContinue: accountReady(s),
    remainingTurns: Math.max(0, TOTAL_TURN_CAP - s.turns),
  };
}
function relationshipLead(r: ProfessionalRelationship) {
  const activity =
    r.relationship === "client" || r.relationship === "adviser"
      ? "working with"
      : r.relationship === "employer" || r.relationship === "employee"
        ? "working at"
        : r.relationship === "trustee"
          ? "being a trustee at"
          : r.relationship === "volunteer"
            ? "volunteering with"
            : "a connection with";
  return `You mentioned ${activity} ${r.entity}${r.period === "past" ? " previously" : ""}. `;
}
export function suitableQuestion(
  s: Conversation,
  p: QuestionProposal,
): boolean {
  const plan = questionPlan(s);
  if (p.natural) return suitableDialogue(s, p);
  if (p.objective !== plan.objective || !p.question || p.question.length > 320)
    return false;
  if (
    ["complete", "concerns", "charity", "clarification"].includes(
      plan.objective,
    )
  )
    return false;
  if (
    !p.fields.length ||
    p.fields.some((f) => !plan.fields.includes(f as FieldKey))
  )
    return false;
  if (
    plan.objective === "registration" &&
    plan.fields.includes("role") &&
    s.professional.some((r) => r.period === "past") &&
    !/\b(?:now|current(?:ly)?|today|these days|at (?:the )?moment|present)\b/i.test(
      p.question,
    )
  )
    return false;
  // Reject text asking for known registration facts, regardless of the proposal's metadata.
  const requests: { [key: string]: RegExp } = {
    name: /\b(?:your (?:full )?name|what.*called)\b/i,
    email: /\b(?:your email|email address)\b/i,
    role: /\b(?:what (?:do you do|you do)|your (?:professional )?role|what.*work.*(?:now|currently))\b/i,
  };
  for (const key of ["name", "email", "role"] as const)
    if (validEntity(s.facts[key], key) && requests[key].test(p.question))
      return false;
  if (
    /https?:|password|verified|I(?:’|')ve (?:found|checked)|accounts are ready/i.test(
      p.question,
    )
  )
    return false;
  // Only placeholders may carry personal names, so later edits cannot leave stale wording.
  const names = [
    s.facts.name,
    ...s.corrections
      .filter((c) => c.field === "name")
      .flatMap((c) => [c.previous, c.value]),
  ].filter(Boolean);
  if (
    names.some((name) =>
      p.question
        .toLowerCase()
        .split(/[^\p{L}'’-]+/u)
        .includes(name.split(/\s+/)[0].toLowerCase()),
    )
  )
    return false;
  return (p.question.match(/\?/g) || []).length === 1;
}
/** Language may react freely, but cannot change the controller's objective or claim actions. */
export function suitableDialogue(s: Conversation, p: QuestionProposal): boolean {
  const plan = questionPlan(s);
  if (p.objective !== plan.objective || !p.question || p.question.length > 900 ||
      p.fields.some((f) => !plan.fields.includes(f as FieldKey))) return false;
  if (plan.objective === "registration" && !p.fields.some((f) => missingRegistration(s).includes(f as FieldKey))) return false;
  if (["responsibilities", "discovery", "concerns", "charity"].includes(plan.objective) && !p.fields.includes(plan.fields[0])) return false;
  const questions = p.question.match(/[^.!?]*\?/g) || [];
  if (questions.length > 2 || (plan.objective === "complete" && questions.length)) return false;
  if (["registration", "responsibilities", "discovery", "reflection"].includes(plan.objective) && !questions.length) return false;
  if (plan.objective === "concerns" && !p.question.includes("What keeps you up at night?")) return false;
  if (plan.objective !== "concerns" && /what keeps you up at night\?/i.test(p.question)) return false;
  if (!s.charity.candidates.length && /(?:official|charity) (?:record|match|card).{0,25}(?:shown|displayed)|(?:check|select|confirm).{0,35}(?:record|card) (?:shown|displayed)/i.test(p.question)) return false;
  // Unverified relationship kinds must not let prose arbitrarily select one
  // organisation from several unresolved client references.
  if (plan.objective === "charity" && s.charity.phase === "suggest" && !s.charity.proposed) {
    const options = charityOptions(s), spoken = p.question.toLocaleLowerCase();
    const mentioned = options.filter(name => spoken.includes(name.toLocaleLowerCase().replace(/^the /, "")));
    if (options.length > 1 && mentioned.length > 0 && mentioned.length < options.length) return false;
  }
  if (/https?:|(?:your|a) password|(?:I|we)(?:’|')ve (?:found|checked|verified|downloaded)|accounts are ready|(?:introduction|conversation|details) (?:is|are|has been|have been) saved/i.test(p.question)) return false;
  // Check questions, not acknowledgements: saying “your role” is not necessarily asking it again.
  for (const q of questions) {
    if (s.facts.email && /(?:what|give|share|tell|provide).*(?:email address|your email)/i.test(q)) return false;
    if (s.facts.name && /(?:what|give|share|tell|provide).*(?:full name|your name)/i.test(q)) return false;
  }
  return true;
}
function attachQuestion(
  s: Conversation,
  proposal?: QuestionProposal,
): Conversation {
  const plan = questionPlan(s);
  const context = plan.context;
  const accepted = proposal && suitableQuestion(s, proposal);
  return {
    ...s,
    response: accepted
      ? {
          ...proposal,
          generated: true,
          contextKey: context ? relationshipKey(context) : "",
        }
      : null,
    acknowledged:
      context && accepted
        ? [...new Set([...s.acknowledged, relationshipKey(context)])].slice(-12)
        : s.acknowledged,
  };
}
