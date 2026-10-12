import "server-only";
import { listFirms } from "./repository";
import { safeResearchUrl } from "./fetch-public";
export type IdentityCandidate = {
  name: string;
  website: string;
  description: string;
  source: string;
};
export interface DiscoveryProvider {
  search(name: string): Promise<IdentityCandidate[]>;
}
export function discoveryConfigured() {
  return Boolean(process.env.BRAVE_SEARCH_API_KEY);
}
const brave: DiscoveryProvider = {
  async search(name) {
    const endpoint = new URL("https://api.search.brave.com/res/v1/web/search");
    endpoint.searchParams.set("q", `${name} UK accountants official website`);
    endpoint.searchParams.set("count", "5");
    endpoint.searchParams.set("country", "GB");
    const response = await fetch(endpoint, {
      headers: {
        Accept: "application/json",
        "X-Subscription-Token": process.env.BRAVE_SEARCH_API_KEY!,
      },
      signal: AbortSignal.timeout(12000),
      cache: "no-store",
      redirect: "error",
    });
    if (!response.ok)
      throw new Error(
        `Firm-name search is temporarily unavailable (${response.status}). You can still enter the official website.`,
      );
    const data = await response.json();
    return (data.web?.results ?? [])
      .slice(0, 5)
      .flatMap((r: { title: string; url: string; description: string }) => {
        try {
          return [
            {
              name: String(r.title).slice(0, 200),
              website: safeResearchUrl(r.url).href,
              description: String(r.description ?? "").slice(0, 600),
              source: "Brave Search — identity must be confirmed",
            },
          ];
        } catch {
          return [];
        }
      });
  },
};
export async function discoverFirm(input: string) {
  const term = input.trim();
  if (term.length < 2 || term.length > 200)
    throw new Error("Enter a firm name or website (2–200 characters).");
  let website: string | null = null;
  if (
    /^https?:\/\//i.test(term) ||
    /^(?:www\.)?[a-z\d-]+(?:\.[a-z\d-]+)+\/?$/i.test(term)
  )
    website = safeResearchUrl(
      /^https?:/i.test(term) ? term : "https://" + term,
    ).href;
  const result = await listFirms(
    new URLSearchParams({
      q: website ? new URL(website).hostname.replace(/^www\./, "") : term,
    }),
  );
  if (result.rows.length || website)
    return {
      matches: result.rows,
      candidates: [],
      website,
      configured: discoveryConfigured(),
      message: website
        ? "Confirm the firm’s identity and start website research."
        : "",
    };
  if (!discoveryConfigured())
    return {
      matches: [],
      candidates: [],
      website: null,
      configured: false,
      message:
        "Automatic name search needs a Brave Search API key. Paste the official website below to research and score this firm now.",
    };
  return {
    matches: [],
    candidates: await brave.search(term),
    website: null,
    configured: true,
    message:
      "Select a possible website and confirm the legal firm identity before researching. Search results are not verified registrations.",
  };
}
