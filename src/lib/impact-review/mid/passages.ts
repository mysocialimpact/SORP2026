// Reused from mysocialimpact/my-social-impact, apps/my-impact-director at a647844.
import { z } from "zod";
import { claimSchema, criterionSchema, type Page } from "./assessment";

// Models select source IDs; the server copies the original text and page.
// This avoids transcription drift without relaxing citation verification.
export type Passage = { id: string; page: number; quote: string };
export function sourcePassages(pages: Page[]): Passage[] {
  return pages.flatMap((page) => {
    if (!page.readable) return [];
    const passages: Passage[] = [];
    let offset = 0;
    while (offset < page.text.length) {
      let end = Math.min(offset + 700, page.text.length);
      if (end < page.text.length) {
        const boundary = Math.max(
          page.text.lastIndexOf("\n", end),
          page.text.lastIndexOf(". ", end),
        );
        if (boundary > offset + 80) end = boundary + 1;
        else {
          const space = page.text.lastIndexOf(" ", end);
          if (space > offset + 80) end = space;
        }
      }
      const quote = page.text.slice(offset, end).trim();
      if (quote.length >= 12)
        passages.push({
          id: `P${page.page}.${passages.length + 1}`,
          page: page.page,
          quote,
        });
      offset = end;
    }
    return passages;
  });
}
const references = z.array(z.string()).max(8);
export const referencedClaimsSchema = z
  .object({
    claims: z
      .array(
        claimSchema
          .omit({ text: true, page: true, evidence: true })
          .extend({ passageId: z.string(), evidenceIds: references })
          .strict(),
      )
      .max(40),
  })
  .strict();
export const referencedFindingsSchema = z
  .object({
    findings: z
      .array(
        criterionSchema
          .omit({ evidence: true })
          .extend({ evidenceIds: references })
          .strict(),
      )
      .length(4),
  })
  .strict();
function citation(id: string, passages: Passage[]) {
  const found = passages.find((p) => p.id === id);
  if (!found) throw new Error(`Unverified quotation reference ${id}.`);
  return { page: found.page, quote: found.quote };
}
export function resolveClaims(
  input: z.infer<typeof referencedClaimsSchema>,
  passages: Passage[],
) {
  return {
    claims: input.claims.map(({ passageId, evidenceIds, ...claim }) => {
      const source = citation(passageId, passages);
      return {
        ...claim,
        text: source.quote,
        page: source.page,
        evidence: evidenceIds.map((id) => citation(id, passages)),
      };
    }),
  };
}
export function resolveFindings(
  input: z.infer<typeof referencedFindingsSchema>,
  passages: Passage[],
) {
  return input.findings.map(({ evidenceIds, ...finding }) => ({
    ...finding,
    evidence: evidenceIds.map((id) => citation(id, passages)),
  }));
}

