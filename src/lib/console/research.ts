import "server-only";
import { load } from "cheerio";
import { query, transaction } from "./db";
import { checkRobots, fetchPublic, safeResearchUrl } from "./fetch-public";
import { type Category } from "./model";
import { automaticAssessment } from "./automatic-assessment";
const terms: Record<Category, RegExp> = {
  services: /charit|not.for.profit|independent examination/i,
  people:
    /DChA|diploma in charity|charity (partner|specialist|team)|head of charit/i,
  sorp: /\bSORP\b/i,
  clients:
    /charit.{0,90}(client|case study|testimonial)|(client|case study|testimonial).{0,90}charit/i,
  recognition:
    /charit.{0,90}(speaker|webinar|award|conference)|(speaker|webinar|award|conference).{0,90}charit/i,
};
export async function startResearch(firmId: string, actor: string) {
  return transaction(async (c) => {
    const firm = (
      await c.query(
        "SELECT * FROM research_console.firms WHERE id=$1 AND merged_into IS NULL FOR UPDATE",
        [firmId],
      )
    ).rows[0];
    if (!firm) throw new Error("Firm not found.");
    if (!firm.website)
      throw new Error(
        "Confirm the firm’s official website before researching.",
      );
    safeResearchUrl(firm.website);
    await c.query(
      "UPDATE research_console.runs SET status='interrupted',stage='Interrupted — retry available',completed_at=now(),limitations=array_append(limitations,'Previous run exceeded its time limit.') WHERE firm_id=$1 AND status IN ('running','assessing') AND started_at<now()-interval '5 minutes'",
      [firmId],
    );
    const current = (
      await c.query(
        "SELECT id FROM research_console.runs WHERE firm_id=$1 AND status IN ('running','assessing')",
        [firmId],
      )
    ).rows[0];
    if (current) return { ...current, created: false };
    const run = (
      await c.query(
        "INSERT INTO research_console.runs(firm_id,actor) VALUES($1,$2) RETURNING id",
        [firmId, actor],
      )
    ).rows[0];
    await c.query(
      "UPDATE research_console.firms SET status='Researching',approved_at=NULL,review_status=CASE WHEN approved_at IS NOT NULL THEN 'Re-review needed' ELSE review_status END WHERE id=$1",
      [firmId],
    );
    return { ...run, created: true };
  });
}
export async function runResearch(runId: string) {
  const started = Date.now();
  const run = (
    await query<{ id: string; firm_id: string; status: string }>(
      "SELECT * FROM research_console.runs WHERE id=$1",
      [runId],
    )
  )[0];
  if (!run || run.status !== "running") return;
  const firm = (
    await query<{ website: string; icaew_url: string }>(
      "SELECT website,icaew_url FROM research_console.firms WHERE id=$1",
      [run.firm_id],
    )
  )[0];
  const limitations = [
    "Focused website collection, not an exhaustive search. Source passages support conservative provisional v1.1 scoring; human review is required.",
    "External talks, qualifications, clients and office details need human verification; a missing match is not absence of expertise.",
  ];
  let examined = 0;
  const stage = async (s: string) =>
    query("UPDATE research_console.runs SET stage=$2 WHERE id=$1", [runId, s]);
  const examine = async (url: string, type: string) => {
    try {
      await checkRobots(url);
      const page = await fetchPublic(url);
      if (page.status !== 200) throw new Error(`HTTP ${page.status}`);
      if (!page.type.includes("text/html"))
        throw new Error("This source is not an HTML page; inspect manually.");
      const $ = load(page.body);
      const links = $("a[href]")
        .map((_, a) => $(a).attr("href") || "")
        .get();
      const title = $("title").first().text().trim().slice(0, 500) || url;
      $("script,style,nav,footer,header,noscript,svg").remove();
      const text = $("main").length ? $("main").text() : $("body").text();
      const clean = text.replace(/\s+/g, " ").trim();
      if (clean.length < 150)
        throw new Error(
          "Too little readable text; JavaScript or manual research may be needed.",
        );
      await query(
        "INSERT INTO research_console.sources(run_id,url,title,status,http_status) VALUES($1,$2,$3,$4,$5)",
        [runId, page.url, title, "Examined", 200],
      );
      examined++;
      const passages = [
        ...new Set(
          $("main p,main li,article p,article li,p")
            .map((_, p) => $(p).text().replace(/\s+/g, " ").trim())
            .get()
            .filter((p) => p.length >= 60 && p.length <= 2400),
        ),
      ];
      if (!passages.length)
        passages.push(
          ...(clean.match(/.{1,1600}(?:[.!?]\s|$)/g) || [clean.slice(0, 1600)]),
        );
      for (const [category, regex] of Object.entries(terms)) {
        for (const extract of passages
          .filter((p) => regex.test(p))
          .slice(0, 4)) {
          await query(
            "INSERT INTO research_console.evidence(firm_id,run_id,source_type,category,title,summary,url,accessed_at,sorp,confidence,notes) VALUES($1,$2,$3,$4,$5,$6,$7,now(),$8,$9,$10)",
            [
              run.firm_id,
              runId,
              type,
              category,
              title,
              extract,
              page.url,
              "Not assessed",
              "Needs review",
              "Automatically retrieved verbatim passage. Provisional scoring requires explicit criterion support; human confirmation remains necessary.",
            ],
          );
        }
      }
      return {
        url: page.url,
        links,
      };
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : "Source unavailable";
      await query(
        "INSERT INTO research_console.sources(run_id,url,status,error) VALUES($1,$2,$3,$4)",
        [runId, url, "Unavailable", reason],
      );
      limitations.push(`${url}: ${reason}`);
      return null;
    }
  };
  try {
    await stage("Checking ICAEW information");
    if (firm.icaew_url) await examine(firm.icaew_url, "ICAEW");
    else
      limitations.push(
        "No confirmed ICAEW directory URL supplied. ICAEW listing and charity tag remain unverified.",
      );
    await stage("Exploring the official website");
    const home = await examine(firm.website, "Firm website");
    if (home) {
      const host = new URL(home.url).hostname.replace(/^www\./, "");
      const seen = new Set([home.url]);
      const discover = (links: string[], base: string) =>
        [
          ...new Set(
            links.flatMap((href) => {
              try {
                const u = new URL(href, base);
                u.hash = "";
                if (
                  u.hostname.replace(/^www\./, "") !== host ||
                  u.protocol !== "https:" ||
                  u.search ||
                  !/(charit|not-for-profit|sorp|team|people|sector|about|office|service|insight|publication|contact)/i.test(
                    u.pathname,
                  )
                )
                  return [];
                return [u.href];
              } catch {
                return [];
              }
            }),
          ),
        ]
          .filter((u) => !seen.has(u))
          .sort(
            (a, b) =>
              Number(/charit|sorp/.test(b)) - Number(/charit|sorp/.test(a)),
          )
          .slice(0, 25);
      const urls = discover(home.links, home.url).map((url) => ({
        url,
        depth: 1,
      }));
      for (
        let pageCount = 0;
        urls.length && pageCount < 11 && Date.now() - started < 105000;
        pageCount++
      ) {
        const { url, depth } = urls.shift()!;
        if (seen.has(url)) continue;
        seen.add(url);
        await stage(
          /sorp/i.test(url)
            ? "Checking SORP publications"
            : /team|people/i.test(url)
              ? "Looking for specialist people"
              : "Looking for charity expertise",
        );
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const found = await examine(url, "Firm website");
        if (found && depth < 2)
          urls.push(
            ...discover(found.links, found.url)
              .filter((u) => !urls.some((p) => p.url === u))
              .map((url) => ({ url, depth: 2 })),
          );
        urls.sort(
          (a, b) =>
            Number(/charit|sorp/.test(b.url)) -
            Number(/charit|sorp/.test(a.url)),
        );
      }
    }
    await stage("Preparing the evidence dossier");
    await transaction(async (c) => {
      await c.query(
        "UPDATE research_console.runs SET status=$2,stage='Collection finished — human assessment needed',completed_at=now(),limitations=$3 WHERE id=$1",
        [runId, examined ? "assessing" : "failed", limitations],
      );
      await c.query(
        "UPDATE research_console.firms SET status=$2,approved_at=NULL,updated_at=now() WHERE id=$1",
        [run.firm_id,examined?'Researching':'Needs more evidence'],
      );
    });
    if (examined) {
      await stage("Applying provisional evidence criteria");
      const assessment = await automaticAssessment(
        run.firm_id,
        "Website research engine",
        { runId },
      );
      await stage(
        assessment.total === null
          ? "Research saved — more evidence needed before scoring"
          : "Report ready — provisional score awaits your review",
      );
      if(assessment.total===null)await query("UPDATE research_console.firms SET status='Needs more evidence' WHERE id=$1",[run.firm_id]);
      await query("UPDATE research_console.runs SET status='collected',completed_at=now() WHERE id=$1",[runId]);
    }
  } catch {
    await query(
      "UPDATE research_console.runs SET status='failed',stage='Research interrupted',completed_at=now(),limitations=array_append(limitations,'Research could not finish. Retry is available; collected sources are retained.') WHERE id=$1",
      [runId],
    );
    await query(
      "UPDATE research_console.firms SET status='Needs more evidence' WHERE id=$1",
      [run.firm_id],
    );
  }
}
