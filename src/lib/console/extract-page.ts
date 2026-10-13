import { load } from "cheerio";
import type { Category } from "./model.ts";
const clean = (s: string) => s.replace(/\s+/g, " ").trim();
const categories: Record<Category, RegExp> = {
  services: /charit|not.for.profit|independent examination/i,
  people:
    /DChA|diploma in charity|partner|director|specialist|team|responsib|qualified/i,
  sorp: /\bSORP\b/i,
  clients:
    /charit.{0,120}(client|case study|testimonial)|(client|case study|testimonial).{0,120}charit/i,
  recognition:
    /charit.{0,120}(speaker|webinar|award|conference)|(speaker|webinar|award|conference).{0,120}charit/i,
};
export function linkKind(url: string) {
  const path = new URL(url).pathname;
  return /team|people|partners?(?:\/|$)|staff|leadership|our-experts/i.test(
    path,
  )
    ? "people"
    : /contact|office|location/i.test(path)
      ? "offices"
      : /sorp/i.test(path)
        ? "sorp"
        : /charit|not.for.profit/i.test(path)
          ? "charity"
          : /service|sector|expertise/i.test(path)
            ? "services"
            : "publications";
}
export function extractResearchPage(html: string, url: string) {
  const $ = load(html),
    title = clean($("title").first().text()).slice(0, 500) || url;
  const host = new URL(url).hostname.replace(/^www\./, "");
  const links = [
    ...new Set(
      $("a[href]")
        .map((_, a) => {
          try {
            const target = new URL($(a).attr("href")!, url);
            target.hash = "";
            if (
              target.protocol !== "https:" ||
              target.hostname.replace(/^www\./, "") !== host ||
              target.search ||
              /\.(pdf|zip|jpg|png)$/i.test(target.pathname)
            )
              return null;
            return /charit|not.for.profit|sorp|team|people|partner|staff|sector|about|office|location|service|insight|publication|contact|factsheet|specialist|resource|expertise|sitemap|site-map/i.test(
              target.pathname + " " + $(a).text(),
            )
              ? target.href
              : null;
          } catch {
            return null;
          }
        })
        .get()
        .filter(Boolean),
    ),
  ];
  const officeText = [
    ...new Set(
      $('address,[itemprop="address"]')
        .map((_, e) => clean($(e).text()))
        .get(),
    ),
  ];
  $("script,style,nav,footer,header,noscript,svg,form").remove();
  const root = $("main").length ? $("main") : $("body");
  const text = clean(root.text());
  const blocks = root
    .find("h1,h2,h3,h4,p,li,address")
    .map((_, e) => clean($(e).text()))
    .get()
    .filter((s) => s.length >= 15 && s.length <= 4000);
  const passages = [...new Set(blocks.filter((s) => s.length >= 45))];
  const evidence: { category: Category; summary: string }[] = [];
  for (const [category, pattern] of Object.entries(categories)) {
    const seen = new Set<string>();
    for (let i = 0; i < passages.length; i++)
      if (pattern.test(passages[i])) {
        const summary =
          category === "sorp"
            ? passages
                .slice(Math.max(0, i - 1), i + 3)
                .join(" ")
                .slice(0, 6500)
            : passages[i];
        if (!seen.has(summary)) {
          evidence.push({ category: category as Category, summary });
          seen.add(summary);
        }
        if (seen.size >= 8) break;
      }
  }
  const people: {
    name: string;
    role: string;
    qualifications: string[];
    summary: string;
  }[] = [];
  if (linkKind(url) === "people") {
    root.find("h1,h2,h3,h4").each((_, e) => {
      const heading = clean($(e).text());
      const match = heading.match(
        /^([A-Z][a-zÀ-ž'-]+(?:\s+(?:[A-Z][a-zÀ-ž'-]+|da|de|van)){1,5})(?:\s+((?:(?:BFP|FCA|ACA|ACCA|FCCA|DChA|CTA|IFA|AAT|ATT|BSc|BA|MA|ACMA|CGMA)\b[ ,]*)+))?\s*[–—|:-]\s*(.+)$/,
      );
      if (
        !match ||
        !/partner|director|manager|founder|account|audit|tax|payroll|trainee|consultant|principal|technician|apprentice|placement/i.test(
          match[3],
        )
      )
        return;
      const biography = clean($(e).nextUntil("h1,h2,h3,h4,hr").text()).slice(
        0,
        2000,
      );
      const summary = heading + (biography ? " " + biography : "");
      people.push({
        name: match[1],
        role: match[3],
        qualifications:
          match[2]?.match(
            /\b(?:BFP|FCA|ACA|ACCA|FCCA|DChA|CTA|IFA|AAT|ATT|BSc|BA|MA|ACMA|CGMA)\b/g,
          ) || [],
        summary,
      });
      evidence.push({ category: "people", summary });
    });
  }
  if (linkKind(url) === "offices")
    for (const p of passages)
      if (p.length < 500 && /\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/i.test(p))
        officeText.push(p);
  const offices = [...new Set(officeText)]
    .filter((s) => s.length > 15 && s.length < 500)
    .flatMap((address) => {
      const postcode = address
        .match(/\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/i)?.[0]
        .toUpperCase();
      return postcode ? [{ address, postcode }] : [];
    });
  return { title, text, links, evidence, people, offices };
}
