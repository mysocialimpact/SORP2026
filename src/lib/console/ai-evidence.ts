import type { AIResponse } from "./openai-response.ts";
import { categories, type Category } from "./model.ts";
export type CitedPassage = {
  id: number;
  url: string;
  title: string;
  summary: string;
};
export function citationUrl(value: string) {
  const u = new URL(value);
  if (
    !["http:", "https:"].includes(u.protocol) ||
    u.username ||
    u.password ||
    u.port ||
    u.hostname === "localhost" ||
    !u.hostname.includes(".") ||
    /^\d+\.\d+\.\d+\.\d+$/.test(u.hostname) ||
    u.hostname.includes(":")
  )
    throw new Error("Invalid public citation URL.");
  u.hash = "";
  u.searchParams.delete("utm_source");
  return u.href;
}
export function citedPassages(data: AIResponse): CitedPassage[] {
  const result: CitedPassage[] = [];
  for (const item of data.output) {
    for (const c of item.content ?? []) {
      if (c.type !== "output_text" || !c.text) continue;
      for (const a of c.annotations ?? []) {
        if (
          a.type !== "url_citation" ||
          !Number.isInteger(a.start_index) ||
          !Number.isInteger(a.end_index)
        )
          continue;
        const start = a.start_index!,
          end = a.end_index!;
        if (start < 0 || end < start || end > c.text.length) continue;
        const left = c.text.lastIndexOf("\n\n", start),
          right = c.text.indexOf("\n\n", end);
        const summary = c.text
          .slice(left < 0 ? 0 : left + 2, right < 0 ? c.text.length : right)
          .replace(/\s+/g, " ")
          .trim();
        if (summary.length < 35 || summary.length > 8000) continue;
        try {
          const url = citationUrl(a.url);
          if (!result.some((p) => p.url === url && p.summary === summary))
            result.push({
              id: result.length,
              url,
              title: a.title || new URL(url).hostname,
              summary,
            });
        } catch {
          /* invalid citations never become evidence */
        }
      }
    }
  }
  // A paragraph citing two different URLs does not establish which URL backs
  // which claim. Omit it rather than awarding points to the wrong source.
  return result.filter(
    (p) =>
      new Set(
        result
          .filter((other) => other.summary === p.summary)
          .map((other) => other.url),
      ).size === 1,
  );
}
export const objectSchema = (properties: Record<string, unknown>) => ({
  type: "object",
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});
const str = { type: "string" };
export const extractionSchema = objectSchema({
  identity_matches: { type: "boolean" },
  coverage: {
    type: "array",
    items: objectSchema({
      category: { type: "string", enum: categories.map((c) => c.id) },
      checked: { type: "boolean" },
      limitation: str,
    }),
  },
  evidence: {
    type: "array",
    items: objectSchema({
      passage_id: { type: "integer" },
      category: { type: "string", enum: categories.map((c) => c.id) },
    }),
  },
  people: {
    type: "array",
    items: objectSchema({
      passage_id: { type: "integer" },
      name: str,
      role: str,
      qualifications: { type: "array", items: str },
    }),
  },
});
export type ResearchExtraction = {
  identity_matches: boolean;
  coverage: Array<{ category: Category; checked: boolean; limitation: string }>;
  evidence: Array<{ passage_id: number; category: Category }>;
  people: Array<{
    passage_id: number;
    name: string;
    role: string;
    qualifications: string[];
  }>;
};
export function validateExtraction(
  data: ResearchExtraction,
  passages: CitedPassage[],
) {
  if (data.identity_matches !== true)
    throw new Error(
      "Search could not confidently match the intended firm. Confirm the official identity before retrying.",
    );
  if (
    !Array.isArray(data.coverage) ||
    data.coverage.length !== 5 ||
    categories.some(
      (c) => data.coverage.filter((x) => x.category === c.id).length !== 1,
    )
  )
    throw new Error(
      "Research did not return coverage for all five categories.",
    );
  if (
    !Array.isArray(data.evidence) ||
    data.evidence.length > 100 ||
    data.evidence.some(
      (e) =>
        !passages.some((p) => p.id === e.passage_id) ||
        !categories.some((c) => c.id === e.category),
    )
  )
    throw new Error(
      "Evidence extraction contains an invalid citation or category.",
    );
  if (!Array.isArray(data.people) || data.people.length > 50)
    throw new Error("Invalid people extraction.");
  for (const p of data.people) {
    const source = passages.find((s) => s.id === p.passage_id)?.summary ?? "";
    if (
      !p.name ||
      p.name.length > 150 ||
      !source.includes(p.name) ||
      !p.role ||
      !source.includes(p.role) ||
      !Array.isArray(p.qualifications) ||
      p.qualifications.some((q) => !q || !source.includes(q))
    )
      throw new Error(
        "A person or qualification was not supported by its cited passage.",
      );
  }
  return data;
}
