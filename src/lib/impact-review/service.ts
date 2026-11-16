import "server-only";
import { createHash } from "node:crypto";
import { extractText, getDocumentProxy } from "unpdf";
import { load } from "cheerio";
import { query, transaction } from "@/lib/console/db";
import { fetchDocument, queueCharity } from "@/lib/onboarding/intelligence";
import { fetchPublic, safeResearchUrl, checkRobots } from "@/lib/console/fetch-public";
import type { PlatformIdentity } from "@/lib/platform/identity";
import type { Candidate } from "@/app/sorp-public-model";
import { REVIEW_VERSION, type Framework, type PageText } from "./rubric";
import { understand, advance, type Understanding, type Progress } from "./methodology";
import { searchWeb } from "./mid/ai";

export async function context(owner: PlatformIdentity) {
  const [record] = await query<{ candidate: Candidate }>(`SELECT c.candidate FROM research_console.onboarding_profiles p
    JOIN research_console.charity_intelligence c ON c.identity=p.charity_identity WHERE p.account_id=$1`, [owner.account.id]);
  const candidate = record?.candidate || null;
  const membership = candidate ? owner.memberships.find(m => m.type === "Charity" && ["owner","admin"].includes(m.role) && m.name.toLowerCase().trim() === candidate.name.toLowerCase().trim()) : undefined;
  return { candidate, organisation: candidate?.name || owner.account.organisation || owner.account.name,
    organisationId: membership?.organisationId || null, scope: membership ? `org:${membership.organisationId}` : `account:${owner.account.id}` };
}
type DocumentRow = { id: string; scope: string; organisation: string; title: string; source_url: string | null; reporting_period: string | null;
  confirmed_at: string | null; understanding?: Understanding; file_bytes?: Buffer; pages?: PageText[]; sha256?: string };
const scopes = (owner: PlatformIdentity) => [`account:${owner.account.id}`, ...owner.memberships.filter(m => m.type === "Charity" && ["owner","admin"].includes(m.role)).map(m => `org:${m.organisationId}`)];
export async function accessibleDocument(owner: PlatformIdentity, id: string) {
  if (!/^[a-f\d-]{36}$/i.test(id)) throw new Error("Choose a saved document.");
  const [doc] = await query<DocumentRow>("SELECT * FROM research_console.impact_report_documents WHERE id=$1 AND scope=ANY($2::text[])", [id,scopes(owner)]);
  if (!doc) throw new Error("This document is unavailable to your account.");
  return doc;
}
export async function listDocuments(owner: PlatformIdentity) {
  const documents = await query("SELECT id,organisation,title,source_url,reporting_period,confirmed_at,created_at FROM research_console.impact_report_documents WHERE scope=ANY($1::text[]) ORDER BY created_at DESC LIMIT 50", [scopes(owner)]);
  const reviews = await query(`SELECT r.* FROM research_console.impact_report_reviews r JOIN research_console.impact_report_documents d ON d.id=r.document_id
    WHERE d.scope=ANY($1::text[]) ORDER BY (r.version=$2) DESC,r.updated_at DESC`, [scopes(owner), REVIEW_VERSION]);
  return { documents,reviews:reviews.map(r=>r.version!==REVIEW_VERSION&&["queued","running"].includes(String(r.status))?{...r,status:"failed",error:"This earlier review was unfinished. Restart it with the updated methodology."}:r) };
}
export async function discover(owner: PlatformIdentity) {
  const c = await context(owner);
  if (!c.candidate) return { found: 0, message: "No confirmed charity is linked yet. You can upload a report below or choose your charity in My Account." };
  const [recent]=await query<{message:string}>("SELECT message FROM research_console.impact_report_searches WHERE scope=$1 AND checked_at>now()-interval '1 day'",[c.scope]);
  if(recent) return {message:recent.message};
  const identity = await queueCharity(c.candidate);
  const docs = await query<{ source_url: string; title: string; publication_date: string | null; kind: string }>(
    "SELECT source_url,title,publication_date,kind FROM research_console.charity_documents WHERE charity_identity=$1 ORDER BY (kind='impact-report') DESC,publication_date DESC NULLS LAST LIMIT 8", [identity]);
  // Reuse MID's cited search, then SORP's pinned, bounded PDF fetch validates each source.
  try {
    const links=await searchWeb(c.candidate.name+" charity "+c.candidate.registrationNumber+" "+(c.candidate.website||""));
    for(const link of links.slice(0,5)) {
      if(docs.some(d=>d.source_url===link.url))continue;
      try {
        const url=safeResearchUrl(link.url); await checkRobots(url.href);
        const bytes=await fetchDocument(url.href);
        if(bytes.subarray(0,5).toString()==="%PDF-")docs.push({source_url:url.href,title:link.title,publication_date:null,kind:/impact/i.test(link.title)?"impact-report":"annual-report"});
      }catch { /* Invalid, blocked or non-PDF source is excluded. */ }
    }
  }catch { /* Official site and saved sources remain available if search is unavailable. */ }
  // Search a bounded set of official website pages. No generated search results or guessed URLs.
  const pages = [c.candidate.website].filter(Boolean);
  for (let i=0;i<Math.min(pages.length,3);i++) {
    try {
      const url = safeResearchUrl(pages[i]); await checkRobots(url.href);
      const page = await fetchPublic(url.href); if (page.status !== 200 || !page.type.includes("html")) continue;
      const $ = load(page.body);
      $("a[href]").each((_,el) => {
        const title = $(el).text().replace(/\s+/g," ").trim();
        try {
          const link = safeResearchUrl(new URL($(el).attr("href")!,page.url).href);
          if (link.hostname !== url.hostname || !/impact|annual.report|trustees|our.results/i.test(title+link.pathname)) return;
          if (/\.pdf(?:$|\?)/i.test(link.href)) {
            if (!docs.some(d => d.source_url === link.href)) docs.push({source_url:link.href,title:title || "Published report",publication_date:null,kind:/impact/i.test(title+link.pathname)?"impact-report":"annual-report"});
          } else if (!pages.includes(link.href) && pages.length<3) pages.push(link.href);
        } catch { /* Invalid or external link. */ }
      });
    } catch { /* A failed search does not establish that no report exists. */ }
  }
  for (const d of docs.slice(0,12)) {
    await query(`INSERT INTO research_console.impact_report_documents(scope,account_id,organisation_id,organisation,title,source_url,reporting_period)
      VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(scope,source_url) DO NOTHING`, [c.scope,owner.account.id,c.organisationId,c.organisation,d.title.slice(0,300),safeResearchUrl(d.source_url).href,d.source_url===c.candidate.reportUrl?c.candidate.reportPeriod||null:null]);
  }
  const message=docs.length ? "We’ve found published reports to check. Choose the document you want reviewed." : "We couldn’t find a published impact report for your charity. Upload your latest impact report or annual report and we’ll review it for you.";
  await query("INSERT INTO research_console.impact_report_searches(scope,message) VALUES($1,$2) ON CONFLICT(scope) DO UPDATE SET message=$2,checked_at=now()",[c.scope,message]);
  return { found: docs.length, message };
}
export async function upload(owner: PlatformIdentity, file: File) {
  if (!file.name.toLowerCase().endsWith(".pdf") || file.size>4_000_000 || file.size<10) throw new Error("Choose a PDF up to 4 MB.");
  const bytes=Buffer.from(await file.arrayBuffer());
  if (bytes.subarray(0,5).toString()!=="%PDF-" || !bytes.subarray(-2048).includes(Buffer.from("%%EOF"))) throw new Error("This is not a complete PDF.");
  const c=await context(owner), sha=createHash("sha256").update(bytes).digest("hex");
  const [{count}] = await query<{count:string}>("SELECT count(*) FROM research_console.impact_report_documents WHERE account_id=$1 AND file_bytes IS NOT NULL",[owner.account.id]);
  if(Number(count)>=15) throw new Error("Your report storage limit has been reached. Please contact My Social Impact.");
  const [doc]=await query<{id:string}>(`INSERT INTO research_console.impact_report_documents(scope,account_id,organisation_id,organisation,title,sha256,file_bytes)
    VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(scope,sha256) DO UPDATE SET title=research_console.impact_report_documents.title RETURNING id`,[c.scope,owner.account.id,c.organisationId,c.organisation,file.name.slice(0,180),sha,bytes]);
  return doc;
}
export async function confirm(owner: PlatformIdentity, id: string) {
  await accessibleDocument(owner,id);
  await query("UPDATE research_console.impact_report_documents SET confirmed_at=now() WHERE id=$1",[id]);
}
export async function enqueue(owner: PlatformIdentity,id:string,framework:Framework) {
  const doc=await accessibleDocument(owner,id);
  if(!doc.confirmed_at) throw new Error("Confirm this document before requesting a review.");
  const [previous]=await query<{attempts:number;status:string}>("SELECT attempts,status FROM research_console.impact_report_reviews WHERE document_id=$1 AND framework=$2 AND version=$3",[id,framework,REVIEW_VERSION]);
  if(previous?.status==="failed" && previous.attempts>=3) throw new Error("This document could not be reviewed after three attempts. Please upload a searchable version or contact My Social Impact for help.");
  // One document per account, with both lenses and retries sharing the allowance.
  await transaction(async client=>{
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))",["impact-allowance:"+owner.account.id]);
    const {rows:[used]}=await client.query<{document_id:string}>("SELECT document_id FROM research_console.impact_report_allowances WHERE account_id=$1",[owner.account.id]);
    if(used && used.document_id!==id){
      const {rows:[successful]}=await client.query("SELECT 1 FROM research_console.impact_report_reviews WHERE document_id=$1 AND status<>'failed' LIMIT 1",[used.document_id]);
      if(successful)throw new Error("Your free report review has been used. Both frameworks remain available for that report. Talk to us about another report.");
      await client.query("UPDATE research_console.impact_report_allowances SET document_id=$2 WHERE account_id=$1",[owner.account.id,id]);
    }
    if(!used)await client.query("INSERT INTO research_console.impact_report_allowances(account_id,document_id) VALUES($1,$2)",[owner.account.id,id]);
    await client.query(`INSERT INTO research_console.impact_report_reviews(document_id,framework,version) VALUES($1,$2,$3)
      ON CONFLICT(document_id,framework,version) DO UPDATE SET status='queued',error=NULL,updated_at=now()
      WHERE impact_report_reviews.status='failed' AND impact_report_reviews.attempts<3`,[id,framework,REVIEW_VERSION]);
  });
}
export async function extractPages(bytes: Buffer): Promise<PageText[]> {
  // Same active-content exclusion as My Impact Director; never execute embedded PDF actions.
  if(/\/(JavaScript|JS|Launch|EmbeddedFile|RichMedia)\b/.test(bytes.toString("latin1")))throw new Error("This PDF contains active or embedded content. Please export a flattened PDF and try again.");
  const pdf=await getDocumentProxy(new Uint8Array(bytes),{isEvalSupported:false});
  try {
    if(pdf.numPages>200) throw new Error("This PDF exceeds 200 pages. Please upload a shorter impact report.");
    const {text}=await extractText(pdf,{mergePages:false});
    const pages=text.map((text,page)=>({page:page+1,text}));
    const length=pages.reduce((n,p)=>n+p.text.length,0);
    if(length<300) throw new Error("This PDF has too little readable text. Please upload a searchable PDF or contact us for help with a scanned report.");
    if(pages.filter(p=>p.text.trim().length<20).length>pages.length/3) throw new Error("A substantial part of this PDF could not be read. Please upload a searchable version for a reliable review.");
    if(length>180000) throw new Error("This report is too long for the preliminary review. Please upload a shorter report.");
    return pages;
  } finally { await pdf.destroy(); }
}
export async function processReview(id:string,framework:Framework) {
  const job=await transaction(async client=>{
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))",[id]);
    const claimed=await client.query<{document_id:string;progress:Progress}>(`UPDATE research_console.impact_report_reviews SET status='running',attempts=attempts+1,lease_until=now()+interval '4 minutes',updated_at=now()
    WHERE document_id=$1 AND framework=$2 AND version=$3 AND attempts<3 AND (status='queued' OR status='running' AND lease_until<now())
    AND NOT EXISTS(SELECT 1 FROM research_console.impact_report_reviews other WHERE other.document_id=$1 AND other.framework<>$2 AND other.status='running' AND other.lease_until>now()) RETURNING document_id,progress`,[id,framework,REVIEW_VERSION]);
    return claimed.rows[0];
  });
  if(!job) return false;
  try {
    const [doc]=await query<DocumentRow>("SELECT * FROM research_console.impact_report_documents WHERE id=$1",[id]);
    let pages=doc.pages;
    if(!pages) {
      if(doc.source_url) await checkRobots(doc.source_url);
      const bytes=doc.file_bytes || await fetchDocument(doc.source_url!);
      doc.file_bytes=bytes;
      pages=await extractPages(bytes);
      const sha=createHash("sha256").update(bytes).digest("hex");
      await query("UPDATE research_console.impact_report_documents SET file_bytes=$2,pages=$3,sha256=CASE WHEN EXISTS(SELECT 1 FROM research_console.impact_report_documents other WHERE other.sha256=$4 AND other.scope=impact_report_documents.scope AND other.id<>$1) THEN NULL ELSE $4 END WHERE id=$1",[id,bytes,JSON.stringify(pages),sha]);
    }
    const understanding=doc.understanding||await understand(pages,doc.organisation);
    if(!doc.understanding)await query("UPDATE research_console.impact_report_documents SET understanding=$2 WHERE id=$1",[id,JSON.stringify(understanding)]);
    const step=await advance(pages,framework,understanding,job.progress||{},doc.file_bytes!);
    await query("UPDATE research_console.impact_report_reviews SET status=$4,result=$5,progress=$6,error=NULL,attempts=0,lease_until=NULL,updated_at=now() WHERE document_id=$1 AND framework=$2 AND version=$3",[id,framework,REVIEW_VERSION,step.result?"complete":"queued",step.result?JSON.stringify(step.result):null,JSON.stringify(step.progress)]);
  } catch(error) {
    await query("UPDATE research_console.impact_report_reviews SET status='failed',error=$4,lease_until=NULL,updated_at=now() WHERE document_id=$1 AND framework=$2 AND version=$3",[id,framework,REVIEW_VERSION,error instanceof Error?error.message:"This report could not be reviewed."]);
  }
  return true;
}
export async function drainImpactReviews() {
 const started=Date.now();
 do {
  await query("UPDATE research_console.impact_report_reviews SET status='failed',error='Processing was interrupted repeatedly. Please contact My Social Impact or upload a searchable report.',updated_at=now() WHERE status='running' AND attempts>=3 AND lease_until<now()");
  const jobs=await query<{document_id:string;framework:Framework}>("SELECT document_id,framework FROM research_console.impact_report_reviews WHERE version=$1 AND attempts<3 AND (status='queued' OR status='running' AND lease_until<now()) ORDER BY updated_at LIMIT 1",[REVIEW_VERSION]);
  if(!jobs.length)break;
  for(const j of jobs) if(!await processReview(j.document_id,j.framework))return;
 }while(Date.now()-started<120000);
}
