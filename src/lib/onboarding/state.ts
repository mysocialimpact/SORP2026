/** Public, serialisable facts. No credentials, permissions or inferred identity. */
export const fieldKeys = ["name", "email", "role", "organisation"] as const;
export type FieldKey = (typeof fieldKeys)[number];
export type Facts = Record<FieldKey, string> & {
  responsibilities: string;
  discovery: string;
  concerns: string;
  portfolio: string;
  charities: string[];
};
export type Objective =
  | "registration"
  | "charity"
  | "responsibilities"
  | "discovery"
  | "concerns"
  | "complete";
export type Conversation = {
  facts: Facts;
  turns: number;
  asked: Objective[];
  skipped: Objective[];
  confirmedCharity: string;
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
});
export const initialConversation = (): Conversation => ({
  facts: emptyFacts(),
  turns: 0,
  asked: [],
  skipped: [],
  confirmedCharity: "",
});
export const validEmail = (v: string) =>
  v.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
export const registrationReady = (f: Facts) =>
  f.name.trim().length >= 2 && validEmail(f.email) && f.role.trim().length >= 2;
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
  ] as const) {
    if (typeof value[key] === "string") {
      const text = value[key]
        .trim()
        .slice(
          0,
          ["concerns", "responsibilities"].includes(key)
            ? 600
            : key === "email"
              ? 254
              : 160,
        );
      if (text && (key !== "email" || validEmail(text))) result[key] = text;
    }
  }
  if (Array.isArray(value.charities))
    result.charities = [
      ...new Set(
        value.charities
          .filter((s): s is string => typeof s === "string")
          .map((s) => s.trim().slice(0, 160))
          .filter(Boolean),
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
): Partial<Facts> {
  const result: Partial<Facts> = {};
  const email = text.match(/[\w.!#$%&'*+/=?^`{|}~-]+@[\w-]+(?:\.[\w-]+)+/)?.[0];
  if (email && validEmail(email)) result.email = email.toLowerCase();
  const name = text.match(
    /(?:my name is|I[’']m|I am|name\s*:)\s+([\p{Lu}][\p{L}'’\-]+(?:\s+[\p{Lu}][\p{L}'’\-]+){0,3})(?=[,.!\s]|$)/u,
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
  const discovery = text.match(
    /(?:found you|heard about (?:you|SORP(?: 2026)?)|came across (?:you|SORP(?: 2026)?))(?:\s+(?:on|via|through|from))?\s+([^.!?]+)/i,
  )?.[1];
  if (discovery) result.discovery = discovery;
  const portfolio = text.match(
    /(?:work with|advise|support)\s+((?:about |around |approximately )?\d+\s+charit(?:y|ies))/i,
  )?.[1];
  if (portfolio) result.portfolio = portfolio;
  const references = text.match(
    /(?:including|charit(?:y|ies)(?: clients)?(?: are| is|:)|clients include)\s+([^.!?]+)/i,
  )?.[1];
  if (references)
    result.charities = references
      .split(/,\s*|\s+and\s+/)
      .map((s) => s.trim())
      .filter((s) => /^[\p{Lu}\d]/u.test(s))
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
  const objective = nextObjective(state);
  const simple = text.trim().replace(/[.!]$/, "");
  if (
    simple &&
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
      /^[\p{Lu}\d]/u.test(simple) &&
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
    if (
      objective === "registration" &&
      state.facts.name &&
      validEmail(state.facts.email) &&
      !state.facts.role &&
      simple.length < 100 &&
      !email
    )
      result.role = simple;
  }
  return cleanFacts(result);
}
export function nextObjective(s: Conversation): Objective {
  if (!registrationReady(s.facts))
    return s.turns >= TOTAL_TURN_CAP ? "complete" : "registration";
  if (s.turns >= OPTIONAL_TURN_CAP) return "complete";
  if (!s.confirmedCharity && !s.skipped.includes("charity")) return "charity";
  for (const key of ["responsibilities", "discovery", "concerns"] as const)
    if (!s.facts[key] && !s.skipped.includes(key)) return key;
  return "complete";
}
export function nextQuestion(s: Conversation): string {
  switch (nextObjective(s)) {
    case "registration": {
      const missing = [
        s.facts.name.trim().length < 2 && "your name",
        !validEmail(s.facts.email) && "your email address",
        s.facts.role.trim().length < 2 && "what you do",
      ].filter(Boolean);
      return !s.turns
        ? "Let’s start with you. What’s your name, email address and what do you do?"
        : `Thank you${s.facts.name ? `, ${s.facts.name.split(" ")[0]}` : ""}. Could you tell me ${missing.join(" and ")}?`;
    }
    case "charity":
      return s.facts.charities.length > 1
        ? `You mentioned ${s.facts.charities.join(", ")}. Which one would you like to start with?`
        : s.facts.charities.length === 1
          ? `You mentioned ${s.facts.charities[0]}. Shall we use that charity to get you started?`
          : "Which charity would you like to start with? One name or charity number is enough to help us prepare a more personal experience.";
    case "responsibilities":
      return /accountant|auditor|adviser/i.test(s.facts.role)
        ? "Do you mainly prepare accounts for charities, advise them more broadly, or a bit of both?"
        : /trustee|chair/i.test(s.facts.role)
          ? "Are you mainly involved in governance, financial oversight or something else?"
          : "What does your work involve day to day?";
    case "discovery":
      return "By the way, how did you come across us?";
    case "concerns":
      return "What keeps you up at night?";
    default:
      return registrationReady(s.facts)
        ? `A lovely place to start, ${s.facts.name.split(" ")[0]}.${s.confirmedCharity ? ` We’ll keep ${s.confirmedCharity} in view as you explore.` : ""} Your details are ready to review.`
        : "Let’s finish the remaining account details in your editable profile.";
  }
}
export function advance(
  s: Conversation,
  patch: Partial<Facts>,
  skip = false,
): Conversation {
  const objective = nextObjective(s);
  return {
    ...s,
    facts: mergeFacts(s.facts, patch),
    turns: Math.min(TOTAL_TURN_CAP, s.turns + 1),
    asked: [...new Set([...s.asked, objective])],
    skipped:
      skip && objective !== "registration"
        ? [...new Set([...s.skipped, objective])]
        : s.skipped,
  };
}
export function charityQueryFromAnswer(message: string, state: Conversation) {
  if (nextObjective(state) !== "charity") return "";
  const text = message.trim().replace(/[.!]$/, "");
  if (
    state.facts.charities.length === 1 &&
    /^(yes|yes please|sure|that’s right|that's right|please do)$/i.test(text)
  )
    return state.facts.charities[0];
  const matches = state.facts.charities.filter((c) =>
    text.toLowerCase().includes(c.toLowerCase()),
  );
  if (matches.length === 1) return matches[0];
  const named = text.match(
    /^(?:let[’']s start with|please use|use|start with|choose)\s+(.{2,120})$/i,
  )?.[1];
  if (named) return named;
  return state.facts.charities.length === 0 &&
    /^(?:[\p{Lu}][\p{L}'’ &-]{1,100}|(?:SC|NIC)?\d{5,8})$/u.test(text)
    ? text
    : "";
}
