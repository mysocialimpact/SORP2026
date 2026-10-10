import type { Finding } from "./sorp-public-model";

type Answer = Finding["answer"];

export function readinessKnowledgeStatus(answers: readonly Answer[]) {
  const total = answers.length;
  const notSure = answers.filter((answer) => answer === "not_sure").length;
  const answered = total - notSure;
  const insufficient = total > 0 && notSure >= Math.ceil(total / 2);
  return {
    total,
    answered,
    notSure,
    insufficient,
    label: insufficient ? "NOT YET KNOWN" : null,
    message: insufficient
      ? `There is insufficient confirmed information to judge current readiness confidently. ${answered} of ${total} questions were answered and ${notSure} were marked Not sure.`
      : notSure > 0
        ? `${answered} of ${total} questions were answered and ${notSure} were marked Not sure. The score may understate actual readiness because those areas are unconfirmed.`
        : `All ${total} questions were answered; none were marked Not sure.`,
  };
}

export function actionHierarchy(findings: readonly Finding[]) {
  const unique = [...new Map(findings.map((finding) => [finding.fieldId, finding])).values()];
  return {
    doNow: unique.filter((finding) => ["limited", "not_yet", "not_sure"].includes(finding.answer)),
    improve: unique.filter((finding) => ["mostly", "partly"].includes(finding.answer)),
    noAction: unique.filter((finding) => ["yes", "not_applicable"].includes(finding.answer)),
  };
}
