import "server-only";
import { query, transaction } from "./db";
import { checkRobots, fetchPublic, safeResearchUrl } from "./fetch-public";
import { extractResearchPage, linkKind } from "./extract-page";
import type { PublicPage } from "./fetch-public";
import { openaiConfigured } from "./openai-response";
import { runAIResearch } from "./ai-research";
import { automaticAssessment } from "./automatic-assessment";
export async function startResearch(
  firmId: string,
  actor: string,
  options: { refresh?: boolean } = {},
) {
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
    if (!options.refresh) {
      const saved = (
        await c.query(
          "SELECT r.id FROM research_console.runs r JOIN research_console.assessments a ON a.run_id=r.id WHERE r.firm_id=$1 AND r.status='collected' AND r.completed_at>now()-interval '30 days' AND (a.methodology_id=(SELECT id FROM research_console.methodologies WHERE jsonb_array_length(rubric)>0 ORDER BY created_at DESC LIMIT 1)) AND NOT EXISTS(SELECT 1 FROM research_console.evidence e WHERE e.run_id=r.id AND e.state<>'Current') ORDER BY r.completed_at DESC LIMIT 1",
          [firmId],
        )
      ).rows[0];
      if (saved) return { ...saved, created: false, cached: true };
    }
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
export async function runResearch(runId: string, options: { reuseSearchRunId?: string } = {}) {
  const started = Date.now();
  const run = (
    await query<{ id: string; firm_id: string; status: string }>(
      "SELECT * FROM research_console.runs WHERE id=$1",
      [runId],
    )
  )[0];
  if (!run || run.status !== "running") return;
  const firm = (
    await query<{
      id: string;
      name: string;
      website: string;
      icaew_url: string;
    }>(
      "SELECT id,name,website,icaew_url FROM research_console.firms WHERE id=$1",
      [run.firm_id],
    )
  )[0];
  const limitations = [
    "Focused website collection, not an exhaustive search. Source passages support conservative provisional v1.1 scoring; human review is required.",
    "External talks, qualifications, clients and office details need human verification; a missing match is not absence of expertise.",
  ];
  let examined = 0;
  const robotsCache = new Map<string, Promise<PublicPage>>();
  const lastRequest = new Map<string, number>();
  const stage = async (s: string) =>
    query("UPDATE research_console.runs SET stage=$2 WHERE id=$1", [runId, s]);
  const examine = async (url: string, type: string) => {
    let httpStatus: number | null = null;
    try {
      const policy = await checkRobots(url, robotsCache);
      if (policy.notice && !limitations.includes(policy.notice))
        limitations.push(policy.notice);
      const origin = new URL(url).origin;
      const pause =
        policy.delay - (Date.now() - (lastRequest.get(origin) || 0));
      if (pause > 0) await new Promise((resolve) => setTimeout(resolve, pause));
      lastRequest.set(origin, Date.now());
      const page = await fetchPublic(url);
      httpStatus = page.status;
      if (page.status !== 200)
        throw new Error(`Page retrieval failed (HTTP ${page.status}).`);
      if (!page.type.includes("text/html"))
        throw new Error("This source is not an HTML page; inspect manually.");
      const extracted = extractResearchPage(page.body, page.url);
      if (extracted.text.length < 150)
        throw new Error(
          "Too little readable content; no meaningful assessment is possible.",
        );
      // A page and all its extracts commit together. Database errors cannot leave
      // a source marked examined while silently discarding its evidence.
      await transaction(async (c) => {
        await c.query(
          "SELECT id FROM research_console.firms WHERE id=$1 FOR UPDATE",
          [run.firm_id],
        );
        await c.query(
          "INSERT INTO research_console.sources(run_id,url,title,status,http_status) VALUES($1,$2,$3,'Examined',200)",
          [runId, page.url, extracted.title],
        );
        for (const e of extracted.evidence)
          await c.query(
            "INSERT INTO research_console.evidence(firm_id,run_id,source_type,category,title,summary,url,accessed_at,confidence,notes,provenance) VALUES($1,$2,$3,$4,$5,$6,$7,now(),'Needs review',$8,$9)",
            [
              run.firm_id,
              runId,
              type,
              e.category,
              extracted.title,
              e.summary,
              page.url,
              "Retrieved source passage; automated finding awaiting review.",
              JSON.stringify({ kind: "website", extractor: "2", runId }),
            ],
          );
        if (type === "Firm website") {
          for (const person of extracted.people) {
            const added = (
              await c.query(
                "INSERT INTO research_console.people(firm_id,name,role,qualifications,responsibilities,profile_url,notes) SELECT $1,$2,$3,$4,$5,$6,$7 WHERE NOT EXISTS(SELECT 1 FROM research_console.people WHERE firm_id=$1 AND lower(name)=lower($2)) RETURNING *",
                [
                  run.firm_id,
                  person.name,
                  person.role,
                  person.qualifications,
                  person.summary,
                  page.url,
                  "Automated website extraction — identity, qualifications and responsibilities await review. Run " +
                    runId,
                ],
              )
            ).rows[0];
            if (added)
              await c.query(
                "INSERT INTO research_console.history(firm_id,entity,entity_id,next,reason,actor) VALUES($1,'person',$2,$3,'Named staff profile extracted without replacing existing people','Website research')",
                [run.firm_id, added.id, JSON.stringify(added)],
              );
          }
          for (const office of extracted.offices) {
            const added = (
              await c.query(
                "INSERT INTO research_console.offices(firm_id,address,postcode,source_url,verification) SELECT $1,$2,$3,$4,'Unverified — retrieved from official website' WHERE NOT EXISTS(SELECT 1 FROM research_console.offices WHERE firm_id=$1 AND (lower(address)=lower($2) OR replace(upper(postcode),' ','')=replace($3,' ',''))) RETURNING *",
                [run.firm_id, office.address, office.postcode, page.url],
              )
            ).rows[0];
            if (added)
              await c.query(
                "INSERT INTO research_console.history(firm_id,entity,entity_id,next,reason,actor) VALUES($1,'office',$2,$3,'Office source retained without replacing existing offices','Website research')",
                [run.firm_id, added.id, JSON.stringify(added)],
              );
          }
        }
      });
      examined++;
      console.info(
        "Console research page",
        JSON.stringify({
          runId,
          url: page.url,
          status: "examined",
          evidence: extracted.evidence.length,
          people: extracted.people.length,
        }),
      );
      return { url: page.url, links: extracted.links };
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : "Source unavailable";
      await query(
        "INSERT INTO research_console.sources(run_id,url,status,error,http_status) VALUES($1,$2,$3,$4,$5)",
        [runId, url, "Unavailable", reason, httpStatus],
      );
      limitations.push(`${url}: ${reason}`);
      console.warn(
        "Console research source unavailable",
        JSON.stringify({ runId, url, reason, httpStatus }),
      );
      return null;
    }
  };
  try {
    if (openaiConfigured()) {
      await runAIResearch(runId, firm, options);
      return;
    }
    limitations.push(
      "OpenAI is not configured; only direct website research is available. Set OPENAI_API_KEY in SORP2026 Vercel to enable wider web research.",
    );
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
        [...new Set(links.map((href) => new URL(href, base).href))]
          .filter(
            (url) =>
              new URL(url).hostname.replace(/^www\./, "") === host &&
              !seen.has(url),
          )
          .slice(0, 80);
      const kindsVisited = new Map<string, number>();
      const priority = (url: string) =>
        (({
          charity: 60,
          sorp: 55,
          people: 50,
          offices: 40,
          services: 30,
          publications: 20,
        })[linkKind(url)] || 0) -
        100 * (kindsVisited.get(linkKind(url)) || 0);
      const urls = discover(home.links, home.url).map((url) => ({
        url,
        depth: 1,
      }));
      for (
        let pageCount = 0;
        urls.length && pageCount < 18 && Date.now() - started < 105000;
        pageCount++
      ) {
        urls.sort((a, b) => priority(b.url) - priority(a.url));
        const { url, depth } = urls.shift()!;
        kindsVisited.set(
          linkKind(url),
          (kindsVisited.get(linkKind(url)) || 0) + 1,
        );
        if (seen.has(url)) continue;
        seen.add(url);
        await stage(
          /sorp/i.test(url)
            ? "Checking SORP publications"
            : /team|people/i.test(url)
              ? "Looking for specialist people"
              : "Looking for charity expertise",
        );
        const found = await examine(url, "Firm website");
        if (found && depth < 3)
          urls.push(
            ...discover(found.links, found.url)
              .filter((u) => !urls.some((p) => p.url === u))
              .map((url) => ({ url, depth: depth + 1 })),
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
        "UPDATE research_console.runs SET status=$2,stage=CASE WHEN $2='assessing' THEN 'Applying provisional evidence criteria' ELSE 'Research blocked — no readable sources collected' END,completed_at=now(),limitations=$3 WHERE id=$1",
        [runId, examined ? "assessing" : "failed", limitations],
      );
      await c.query(
        "UPDATE research_console.firms SET status=$2,approved_at=NULL,updated_at=now() WHERE id=$1",
        [run.firm_id, examined ? "Researching" : "Needs more evidence"],
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
      if (assessment.total === null)
        await query(
          "UPDATE research_console.firms SET status='Needs more evidence' WHERE id=$1",
          [run.firm_id],
        );
      await query(
        "UPDATE research_console.runs SET status='collected',completed_at=now() WHERE id=$1",
        [runId],
      );
    }
  } catch (error) {
    console.error(
      "Console research failed",
      JSON.stringify({
        runId,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
    );
    await query(
      "UPDATE research_console.runs SET status='failed',stage='Research interrupted',completed_at=now(),limitations=array_append(limitations,$2) WHERE id=$1",
      [
        runId,
        error instanceof Error
          ? error.message.slice(0, 1500)
          : "Research could not finish. Collected sources are retained.",
      ],
    );
    await query(
      "UPDATE research_console.firms SET status='Needs more evidence' WHERE id=$1",
      [run.firm_id],
    );
  }
}
