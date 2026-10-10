import type { Finding, Lens } from "./sorp-public-model";

export const mandatoryAnswerOrder = ["yes", "mostly", "partly", "limited", "not_yet", "not_sure"] as const;
export type MandatoryAnswer = typeof mandatoryAnswerOrder[number];
export type MandatoryDistribution = Record<MandatoryAnswer, number>;

export const mandatoryAnswerLabels: Record<MandatoryAnswer, string> = {
  yes: "Yes, clearly",
  mostly: "Mostly",
  partly: "Partly",
  limited: "Limited",
  not_yet: "Not yet",
  not_sure: "Not sure",
};

export function mandatoryDistribution(findings: Finding[]): MandatoryDistribution {
  const distribution: MandatoryDistribution = { yes: 0, mostly: 0, partly: 0, limited: 0, not_yet: 0, not_sure: 0 };
  for (const finding of findings) {
    if (!finding.classification.startsWith("MUST") || finding.answer === "not_applicable") continue;
    if (mandatoryAnswerOrder.includes(finding.answer as MandatoryAnswer)) distribution[finding.answer as MandatoryAnswer]++;
  }
  return distribution;
}

export type MandatoryInterpretation = { headline: string; detail: string; confirmation?: string };

export function mandatoryInterpretationParts(distribution: MandatoryDistribution): MandatoryInterpretation {
  const applicable = mandatoryAnswerOrder.reduce((total, answer) => total + distribution[answer], 0);
  if (!applicable) return { headline: "No applicable mandatory requirements were established for this assessment.", detail: "" };
  const clear = distribution.yes;
  const close = distribution.mostly;
  const foundations = distribution.partly;
  const lower = distribution.limited + distribution.not_yet;
  const unknown = distribution.not_sure;
  const evidenced = clear + close;
  const materialUnknown = unknown >= 2 && unknown / applicable >= .2;
  let result: MandatoryInterpretation;

  if (clear / applicable >= .6) {
    result = {
      headline: "Most of your mandatory requirements are already clearly demonstrated.",
      detail: close === applicable - clear
        ? "The remainder are close and need clearer or more explicit reporting."
        : "Any remaining areas are shown below.",
    };
  } else if (close / applicable >= .5 && lower === 0) {
    result = {
      headline: "The substance is largely there.",
      detail: "Most mandatory requirements are already mostly demonstrated, but they need clearer or more explicit reporting before they can be treated as clearly demonstrated.",
      confirmation: "This looks more like strengthening the reporting than starting again.",
    };
  } else if (evidenced / applicable >= .7 && foundations === 0 && lower === 0) {
    result = {
      headline: "Much of the substance is already there.",
      detail: "The clearly demonstrated requirements meet the top evidence threshold; the mostly demonstrated requirements need clearer or more explicit reporting.",
      confirmation: "This looks more like strengthening the reporting than starting again.",
    };
  } else if (evidenced / applicable >= .5 && foundations > 0) {
    result = {
      headline: "Much of the substance is already there.",
      detail: "Several requirements need clearer reporting, and some need more substantive strengthening before they can be treated as clearly demonstrated.",
    };
  } else if (lower / applicable >= .3 || (foundations + lower) / applicable >= .6) {
    result = {
      headline: "Significant mandatory reporting gaps remain.",
      detail: "Some foundations are present, but substantial work remains before the mandatory requirements are consistently demonstrated.",
      confirmation: "The priorities below show where to focus first.",
    };
  } else if (foundations >= Math.max(close, lower)) {
    result = {
      headline: "You have useful foundations.",
      detail: "Several mandatory areas still need substantive strengthening before they can be clearly demonstrated.",
    };
  } else if (unknown >= Math.max(clear, close, foundations, lower)) {
    result = {
      headline: "The mandatory position cannot yet be confirmed.",
      detail: "More evidence or human confirmation is needed before we can reach a conclusion.",
    };
  } else {
    result = {
      headline: "The mandatory requirements show a mixed position.",
      detail: "Some reporting is already in place, while other requirements need clearer evidence, further work or confirmation.",
    };
  }
  if (materialUnknown) {
    const uncertainty = "Several mandatory requirements still need evidence or human confirmation before we can reach a conclusion.";
    result = { ...result, detail: result.detail ? `${result.detail} ${uncertainty}` : uncertainty };
  }
  return result;
}

export function mandatoryInterpretation(distribution: MandatoryDistribution) {
  const result = mandatoryInterpretationParts(distribution);
  return [result.headline, result.detail, result.confirmation].filter(Boolean).join(" ");
}

/** Presentation guard only: a non-clear MUST always needs a proportionate next step. */
export function mandatoryPriorityAction(finding: Pick<Finding, "classification" | "answer" | "action">, title: string) {
  if (!finding.classification.startsWith("MUST") || finding.answer === "yes" || !/no action|nothing (?:else )?(?:is )?needed|already strong enough|no further work/i.test(finding.action)) return finding.action;
  const subject = title.toLowerCase();
  if (finding.answer === "mostly") return `Strengthen the presentation so ${subject} is clearly demonstrated.`;
  if (finding.answer === "partly") return `Strengthen the reporting for ${subject}.`;
  if (finding.answer === "limited" || finding.answer === "not_yet") return `Address the reporting gap for ${subject}.`;
  return `Confirm what can be evidenced for ${subject}.`;
}

export function historicalSnapshotInterpretation(lens: Lens) {
  const distribution = mandatoryDistribution(lens.findings);
  const applicable = mandatoryAnswerOrder.reduce((total, answer) => total + distribution[answer], 0);
  return {
    distribution,
    applicable,
    clearlyDemonstrated: distribution.yes,
    interpretationParts: mandatoryInterpretationParts(distribution),
    interpretation: mandatoryInterpretation(distribution),
    reportingStrengthExplanation: "Reporting Strength measures how much strong reporting is present across the full framework. Mandatory status asks whether each required area is evidenced clearly enough to be treated as clearly demonstrated.",
    distinction: "A strong Reporting Strength score does not override unmet mandatory requirements. Both views matter.",
  };
}
