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
        lookup: (_h, _o, cb) => cb(null, address.address, address.family),
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
export async function checkRobots(url: string) {
  const parsed = safeResearchUrl(url);
  const robots = await fetchPublic(new URL("/robots.txt", parsed).href);
  if (robots.status === 404) return;
  if (robots.status !== 200)
    throw new Error(
      `Robots policy could not be checked (HTTP ${robots.status}); inspect this source manually.`,
    );
  if (robots.type.includes("html"))
    throw new Error("Robots policy returned a web page; manual check needed.");
  const rules = robotsParser(new URL("/robots.txt", parsed).href, robots.body);
  if (rules.isAllowed(parsed.href, agent) === false)
    throw new Error("Research is disallowed by robots.txt.");
  const delay = rules.getCrawlDelay(agent);
  if (delay && delay > 2)
    throw new Error(
      "Site requests a longer crawl delay; use manual research for this source.",
    );
}
