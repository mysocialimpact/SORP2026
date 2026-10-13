import { createHash } from "node:crypto";
import { categories, type Category, type Evidence } from "./model.ts";
import { provisionalRubric, type Criterion, validateRubric } from "./rubric.ts";
export type ScoringEvidence = Evidence & {
  supported_categories?: string[];
  provenance?: { kind?: string; [key: string]: unknown };
};
export type Award = {
  criterion_id: string;
  category: Category;
  points: number;
  evidence_id: string;
  source_url: string;
  justification: string;
  quote: string;
  confidence: string;
  origin: string;
  fact_key: string;
};
const charity =
  /charit(?:y|ies|able)|not[ -]for[ -]profit|non[ -]profit|third sector/i;
const service =
  /account(?:ing|s)|audit|independent examin|financial (?:reporting|statements)/i;
const technical =
  /tier(?:ed|s)?|leases?|revenue recognition|income recognition|cash.flow|disclosures?|restricted funds|reporting requirements|thresholds?|FRS\s*102|trustees.? (?:annual )?report/i;
// A topic label or promise of advice is not technical analysis. Require an
// identifiable rule, accounting treatment or reporting implication.
const substantive =
  /(?:three|3)[ -]tier|tiers?.{0,80}(?:£|\d)|leases?.{0,100}(?:balance sheet|right.of.use|liabilit|recogn)|(?:recognis|recogniz).{0,100}(?:leases?|revenue|income)|reserves.{0,60}(?:disclos|required)|(?:eligible|exempt|threshold).{0,100}(?:accrual|receipts|£|\d)|(?:income|revenue).{0,100}(?:recognition|contract|performance)|disclosures?.{0,80}(?:must|required|threshold)/i;
const negative =
  /\b(?:no|not|without|lacks?|unverified|unconfirmed)\b.{0,80}(?:evidence|website|named|specialist|DChA|qualification|SORP|client|publication|service|case stud|speaking|charit|responsib)|\bnot necessarily\b|\bnetwork.wide\b/i;
const names = (text: string) => [
  ...new Set(
    (
      text.match(
        /\b[A-Z][a-z]+(?:[-'][A-Z]?[a-z]+)?(?:\s+[A-Z][a-z]+(?:[-'][A-Z]?[a-z]+)?){1,3}\b/g,
      ) || []
    ).filter(
      (n) =>
        !/(?:Charity|Charities|Sector|Audit Register|Public|Financial|Independent|Dedicated|Statement|SORP|Hacker Young|Third Sector|Gift Aid|Institute|Council|Fuller Spurling)/.test(
          n,
        ),
    ),
  ),
];
function qualifies(
  id: string,
  e: ScoringEvidence,
  text: string,
  firmName = "",
): boolean {
  const url = e.url ?? "",
    official = e.source_type === "Firm website",
    external =
      e.source_type === "External" ||
      (e.source_type === "ICAEW" && !/find\.icaew\.com/i.test(url));
  const firmWords = new Set(
    firmName
      .toLowerCase()
      .replace(/[^a-z ]/g, " ")
      .split(/\s+/)
      .filter(Boolean),
  );
  const personNames = (e.provenance?.kind === "openai-search"
    ? (e.people ?? []).filter((name) => text.includes(name))
    : names(text)).filter(
    (n) =>
      n.toLowerCase().replace(/[^a-z]/g, "") !==
        new URL(url).hostname.replace(/^www\./, "").split(".")[0].replace(/[^a-z]/g, "") &&
      !n
        .toLowerCase()
        .split(/\s+/)
        .every((word) => firmWords.has(word)),
  );
  const c = charity.test(text),
    named = personNames.length > 0;
  if (
    /^B[1-4]$/.test(id) &&
    /recommend|testimonial|as (?:a|our) client|in a previous role/i.test(text)
  )
    return false;
  const namedInContext =
    named ||
    (e.provenance?.kind !== "openai-search" && /\/(?:team|people|meet-the-speakers)\/[a-z]+-[a-z]+\/?$/i.test(
      new URL(url).pathname,
    )); // A person-profile URL only corroborates identity; responsibility is still required.
  switch (id) {
    case "A1":
      return (
        official &&
        c &&
        service.test(text) &&
        !/factsheets?|\/resources?\//i.test(url) &&
        /(?:we|our).{0,80}(?:provid|offer|assist|servic|audit|team)|(?:dedicated|specialist).{0,45}(?:page|servic|team)/i.test(
          text,
        ) &&
        (/\/(?:services?|(?:business-)?sectors?|expertise)\/[^?#]*(?:charit|not-for-profit)/i.test(
          url,
        ) ||
          /\/(?:charit(?:y|ies)|not-for-profit)(?:-(?:accountants|accounting|services|audit))?\/?$/i.test(
            new URL(url).pathname,
          ) ||
          /dedicated.{0,35}(?:charit|not.for.profit).{0,35}(?:page|service)/i.test(
            text,
          ))
      );
    case "A2":
      return (
        official &&
        !/factsheets?|\/resources?\//i.test(url) &&
        c &&
        service.test(text) &&
        /we (?:provide|offer|prepare|audit|help|can assist)|our (?:services|audit|charity)|(?:page|service).{0,60}(?:covers|lists|describes|prepar|audit)|audits charities|independent examination of charity/i.test(
          text,
        )
      );
    case "A3":
      return (
        official &&
        c &&
        /(?:dedicated|specialist).{0,40}(?:team|service line)|(?:charit|not.for.profit).{0,35}(?:team|service line)|firm specialises in charit/i.test(
          text,
        )
      );
    case "A4":
      return (
        official &&
        c &&
        new Set(
          (
            text.match(
              /Gift Aid|VAT|governance|mergers?|grants?|tax|payroll|management accounts|fund accounting/gi,
            ) || []
          ).map((x) => x.toLowerCase()),
        ).size >= 2
      );
    case "B1":
      return (
        c &&
        namedInContext &&
        /\b(?:partners?|directors?|head|lead|senior|principal|consultant|presenter)\b/i.test(
          text,
        ) &&
        /(?:specialis|responsib|head|lead).{0,55}(?:charit|not[ -]for[ -]profit)|charit(?:y|ies).{0,30}(?:audit|account|work|team)|third sector|charit(?:y|ies).{0,35}(?:course|training)/i.test(
          text,
        )
      );
    case "B2":
      return (
        c &&
        namedInContext &&
        /\bDChA\b|Diploma in Charity Accounting/i.test(text) &&
        /FCA.{0,10}DChA|DChA.{0,80}(?:credentials|qualif)|holds.{0,40}DChA|awarded.{0,40}DChA/i.test(
          text,
        )
      );
    case "B3":
      return (
        c &&
        personNames.length >= 2 &&
        /charity.{0,30}specialists|specialists.{0,30}charity|charity.{0,30}(?:partners|team)/i.test(
          text,
        )
      );
    case "B4":
      return (
        c &&
        namedInContext &&
        /(?:\d+|twenty|thirty|nearly \d+) years?.{0,60}(?:charit|experience)|charit.{0,70}\d+ years?/i.test(
          text,
        )
      );
    case "C1":
      return (
        /\bSORP\b.{0,100}\b2026\b|2026.{0,30}\bSORP\b/i.test(text) &&
        substantive.test(text) &&
        /explain|discuss|guidance|require|appl|change|reporting|impact|covers|analysis/i.test(
          text,
        )
      );
    case "C2":
      return (
        /\bSORP\b/i.test(text) &&
        !/(?:SORP\s*2026|2026.{0,15}SORP)/i.test(text) &&
        substantive.test(text) &&
        /guidance|explain|require|prepar|reporting|accounting|disclos/i.test(
          text,
        ) &&
        text.length > 100
      );
    case "C3":
      return (
        /\bSORP\b/i.test(text) &&
        /(?:course|training|webinar)/i.test(text) &&
        /(?:presenter|deliver|led|present|six.hour|training course)/i.test(text)
      );
    case "C4":
      return (
        /\bSORP\b/i.test(text) &&
        named &&
        /(?:author|written by|presenter|presented by|led by|technical (?:director|partner))/i.test(
          text,
        )
      );
    case "D1":
      return (
        c &&
        named &&
        /(?:accounts for|appointed by|client is|client,?)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+/.test(
          text,
        ) &&
        /auditor|examiner|accountant|engagement/.test(text)
      );
    case "D2":
      return (
        c &&
        named &&
        /case study|engagement/i.test(text) &&
        /delivered|result|implemented|supported|achieved|saved/i.test(text) &&
        text.length >= 220
      );
    case "D3":
      return (
        c &&
        named &&
        external &&
        /testimonial|review.{0,40}(?:records|says)|trustees.{0,30}thank|chairman.{0,30}thank/i.test(
          text,
        )
      );
    case "D4":
      return (
        c &&
        /\b\d{2,}[+]?\s+(?:UK\s+)?(?:charit|not.for.profit)|(?:charit|not.for.profit).{0,20}clients.{0,20}\d{2,}/i.test(
          text,
        ) &&
        /(?:we|our firm|firm).{0,80}(?:work|act|support|serve|client)/i.test(
          text,
        ) &&
        !/network/i.test(text)
      );
    case "E1":
      return (
        c &&
        external &&
        namedInContext &&
        /speaker|speaking|presented|keynote/i.test(text) &&
        /conference|event|seminar/i.test(text)
      );
    case "E2":
      return (
        c &&
        external &&
        named &&
        /author|written by|contribut/i.test(text) &&
        technical.test(text) &&
        text.length >= 200
      );
    case "E3":
      return (
        c &&
        external &&
        /(?:ICAEW|ACCA|CIPFA|Bayes)/.test(text + " " + url) &&
        /deliver|presenter|teach|lecturer|led.{0,40}webinar|co.leading/i.test(
          text,
        )
      );
    case "E4":
      return (
        c &&
        external &&
        namedInContext &&
        /appointed.{0,30}(?:chair|trustee)|(?:chair|trustee|leadership).{0,30}(?:appointment|award)|awarded.{0,40}charit/i.test(
          text,
        )
      );
    default:
      return false;
  }
}
export function scoreEvidence(
  evidence: ScoringEvidence[],
  options: { sufficient: boolean; rubric?: Criterion[]; firmName?: string },
) {
  const rubric = validateRubric(options.rubric ?? provisionalRubric);
  if (!options.sufficient)
    return {
      state: "Not assessed" as const,
      total: null,
      scores: null,
      awards: [] as Award[],
      gaps: ["Insufficient source coverage for a meaningful assessment."],
    };
  const awards: Award[] = [],
    used = new Set<string>();
  const scores = Object.fromEntries(categories.map((c) => [c.id, 0])) as Record<
    Category,
    number
  >;
  for (const criterion of rubric) {
    if (!criterion.enabled || !criterion.points) continue;
    for (const e of [...evidence].sort((a, b) => a.id.localeCompare(b.id))) {
      if (
        e.state !== "Current" ||
        !e.url ||
        !/^https?:\/\//.test(e.url) ||
        !["Firm website", "External", "ICAEW"].includes(e.source_type) ||
        /find\.icaew\.com\//i.test(e.url)
      )
        continue;
      // Imported notes are paraphrases, not quotations. Live extracts are verbatim page passages.
      const text = e.summary.replace(/\s+/g, " ").trim();
      // A missing qualification/client finding must not erase a separate,
      // affirmative service or speaking finding. Keep mixed/negated sentences
      // conservative; 'not-for-profit' itself is never a negation.
      const affirmative = text.replace(/[*_`]/g, "")
        .split(/(?<=[.!?])\s+(?=[A-Z*])/)
        .filter((sentence) =>
          !negative.test(sentence.replace(/\bnot[ -]for[ -]profit\b/gi, "nonprofit")),
        )
        .join(" ");
      if (
        !affirmative ||
        !qualifies(criterion.id, e, affirmative, options.firmName)
      )
        continue;
      const group = ["C3", "E1", "E3"].includes(criterion.id)
        ? "training-event"
        : ["C1", "C2", "E2"].includes(criterion.id)
          ? "technical-publication"
          : criterion.id;
      const factKey = createHash("sha256")
        .update(group + "|" + e.url.split("#")[0])
        .digest("hex");
      if (used.has(factKey)) continue;
      const max = categories.find((c) => c.id === criterion.category)!.max;
      if (scores[criterion.category] + criterion.points > max)
        throw new Error("Category maximum exceeded.");
      used.add(factKey);
      scores[criterion.category] += criterion.points;
      awards.push({
        criterion_id: criterion.id,
        category: criterion.category,
        points: criterion.points,
        evidence_id: e.id,
        source_url: e.url,
        justification: `${criterion.label}. Supported by ${e.provenance?.kind === "pilot" ? "the imported pilot research note (source not freshly rechecked)" : e.provenance?.kind === "openai-search" ? "the cited OpenAI web-search paraphrase (not a verbatim quotation)" : "the retrieved source passage"}.`,
        quote: text,
        confidence:
          e.provenance?.kind === "pilot"
            ? "Medium — imported evidence"
            : "Medium — automated finding",
        origin: "Automated — awaiting human confirmation",
        fact_key: factKey,
      });
      break;
    }
  }
  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  return {
    state: total
      ? ("Assessed and scored" as const)
      : ("Assessed with no qualifying evidence" as const),
    total,
    scores,
    awards,
    gaps: rubric
      .filter((r) => r.enabled && !awards.some((a) => a.criterion_id === r.id))
      .map(
        (r) =>
          `${r.id}: ${r.label} — not established in the evidence examined.`,
      ),
  };
}
