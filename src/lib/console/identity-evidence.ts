import type { AIResponse } from "./openai-response.ts";
import { citationUrl } from "./ai-evidence.ts";

// Discovery establishes an identity, not a scoring claim. Search can cite a
// register in its answer while consulting the firm's own site. Keep both kinds
// of provider provenance; the scoring parser still requires paragraph citations.
export function identitySources(response: AIResponse) {
  const urls = new Set<string>();
  const add = (value: string) => {
    try {
      urls.add(citationUrl(value));
    } catch {
      /* unsafe URLs are not sources */
    }
  };
  for (const item of response.output) {
    if (item.type === "web_search_call" && item.status === "completed")
      for (const source of item.action?.sources ?? []) add(source.url);
    for (const content of item.content ?? []) {
      if (content.type !== "output_text" || !content.text) continue;
      for (const annotation of content.annotations ?? [])
        if (
          annotation.type === "url_citation" &&
          Number.isInteger(annotation.start_index) &&
          Number.isInteger(annotation.end_index) &&
          annotation.start_index! >= 0 &&
          annotation.end_index! > annotation.start_index! &&
          annotation.end_index! <= content.text.length
        )
          add(annotation.url);
    }
  }
  return [...urls];
}

export function officialIdentitySource(
  website: string,
  source: string,
  sources: string[],
) {
  const url = new URL(citationUrl(website));
  const cited = citationUrl(source);
  const host = url.hostname.replace(/^www\./, "");
  // A listing can support an identity, but must never become its official site.
  if (
    /(^|\.)(gov\.uk|icaew\.com|linkedin\.com|facebook\.com|wikipedia\.org|instagram\.com|reddit\.com|youtube\.com|x\.com|twitter\.com)$/.test(
      host,
    )
  )
    return false;
  return (
    sources.includes(cited) &&
    new URL(cited).hostname.replace(/^www\./, "") === host
  );
}
