import { request } from "node:https";
import { lookup } from "node:dns/promises";
import ipaddr from "ipaddr.js";
import robotsParser from "robots-parser";
export const agent = "SORPResearchBot/1.0 (+https://sorp2026.org/console/)";
export function assertPublicAddress(address: string) {
  if (!ipaddr.isValid(address) || ipaddr.process(address).range() !== "unicast")
    throw new Error("Private or reserved network address blocked.");
}
export function safeResearchUrl(input: string) {
  const url = new URL(input);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    (url.port && url.port !== "443") ||
    url.hostname.endsWith(".local") ||
    url.hostname === "localhost"
  )
    throw new Error("Research requires a public HTTPS website.");
  return url;
}
export async function fetchPublic(
  input: string,
  redirects = 0,
): Promise<{ url: string; status: number; body: string; type: string }> {
  const url = safeResearchUrl(input);
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = await lookup(host, { all: true });
  if (!addresses.length) throw new Error("No public address found.");
  addresses.forEach((a) => assertPublicAddress(a.address));
  const address = addresses[0];
  const result = await new Promise<{
    status: number;
    body: string;
    type: string;
    location?: string;
  }>((resolve, reject) => {
    const req = request(
      url,
      {
        headers: {
          "User-Agent": agent,
          Accept: "text/html,text/plain;q=0.9",
          "Accept-Encoding": "identity",
        },
        lookup: (_h, options, cb) =>
          options.all
            ? cb(null, [address])
            : cb(null, address.address, address.family),
        timeout: 8000,
      },
      (res) => {
        const chunks: Buffer[] = [];
        let bytes = 0;
        res.on("data", (chunk: Buffer) => {
          bytes += chunk.length;
          if (bytes > 1500000) {
            res.destroy(new Error("Page exceeds research size limit."));
            return;
          }
          chunks.push(chunk);
        });
        res.on("error", reject);
        res.on("end", () =>
          resolve({
            status: res.statusCode || 0,
            body: Buffer.concat(chunks).toString("utf8"),
            type: String(res.headers["content-type"] || ""),
            location: res.headers.location,
          }),
        );
      },
    );
    req.on("timeout", () => req.destroy(new Error("Website timed out.")));
    req.on("error", reject);
    req.end();
  });
  if (result.status >= 300 && result.status < 400 && result.location) {
    if (redirects >= 3) throw new Error("Too many redirects.");
    const next = safeResearchUrl(new URL(result.location, url).href);
    if (
      next.hostname.replace(/^www\./, "") !== url.hostname.replace(/^www\./, "")
    )
      throw new Error(
        "Redirect to another website needs manual identity confirmation.",
      );
    return fetchPublic(next.href, redirects + 1);
  }
  return { ...result, url: url.href };
}
export type PublicPage = Awaited<ReturnType<typeof fetchPublic>>;
export function inspectRobots(url: string, robots: PublicPage) {
  const parsed = safeResearchUrl(url);
  // RFC 9309 §2.3.1.3: an unavailable robots resource is not a Disallow.
  // A security challenge, authentication requirement or rate limit is a block.
  if (
    /sorry, you have been blocked|cf-chl-|cf-challenge|captcha|attention required.*cloudflare/i.test(
      robots.body,
    )
  )
    throw new Error(
      "Website security blocks automated access. No challenge bypass was attempted.",
    );
  if (robots.status === 401 || robots.status === 429)
    throw new Error(
      `Website access restricted (HTTP ${robots.status}); research stopped.`,
    );
  if (robots.status >= 400 && robots.status < 500)
    return {
      notice: `Robots file unavailable (HTTP ${robots.status}); public pages checked under RFC 9309.`,
      delay: 2000,
    };
  if (robots.status !== 200)
    throw new Error(
      `Robots policy unreachable (HTTP ${robots.status}); research stopped.`,
    );
  if (robots.type.includes("html"))
    throw new Error(
      "Robots policy returned HTML rather than rules; research stopped.",
    );
  const rules = robotsParser(new URL("/robots.txt", parsed).href, robots.body);
  if (rules.isAllowed(parsed.href, agent) === false)
    throw new Error("Research is disallowed by robots.txt.");
  const delay = Math.max(2000, (rules.getCrawlDelay(agent) || 0) * 1000);
  if (delay > 10000)
    throw new Error(
      "Site requests a crawl delay longer than this research session can support.",
    );
  return { notice: null, delay };
}
export async function checkRobots(
  url: string,
  cache?: Map<string, Promise<PublicPage>>,
) {
  const parsed = safeResearchUrl(url);
  const key = new URL("/robots.txt", parsed).href;
  let request = cache?.get(key);
  if (!request) {
    request = fetchPublic(key);
    cache?.set(key, request);
  }
  return inspectRobots(url, await request);
}
