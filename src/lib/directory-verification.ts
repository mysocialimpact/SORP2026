export type VerificationDecision = {
  approved: boolean;
  decidedAt: string;
  actor: string;
  note: string;
};

/** Only an explicit, reasoned editorial decision changes this designation. */
export function verificationDecision(
  previous: VerificationDecision | undefined,
  requested: unknown,
  reason: unknown,
  actor: string,
): VerificationDecision | undefined {
  if (typeof requested !== "boolean" || requested === Boolean(previous?.approved)) return previous;
  const note = String(reason || "").trim().slice(0, 2000);
  if (!note) throw new Error("Record the reason for awarding or withdrawing MSI verification.");
  return { approved: requested, decidedAt: new Date().toISOString(), actor, note };
}
