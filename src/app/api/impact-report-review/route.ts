import { after } from "next/server";
import { protectPlatformRequest } from "@/lib/platform/auth";
import { AccessError } from "@/lib/access-error";
import { query } from "@/lib/console/db";
import { accessibleDocument, context, discover, listDocuments, upload, confirm, enqueue, drainImpactReviews } from "@/lib/impact-review/service";
export const runtime="nodejs";
export const maxDuration=300;
const json=(value:unknown,status=200)=>Response.json(value,{status,headers:{"cache-control":"private, no-store","x-robots-tag":"noindex"}});
export async function GET(request:Request) {
  try {
    const owner=await protectPlatformRequest(request), url=new URL(request.url);
    if(url.searchParams.get("founder")==="1") {
      if(!owner.founder) return json({error:"Founder access required."},403);
      return json({documents:await query(`SELECT d.id,d.organisation,d.title,d.source_url,d.confirmed_at,d.created_at,
        coalesce(jsonb_agg(jsonb_build_object('framework',r.framework,'status',r.status,'updated_at',r.updated_at)) FILTER(WHERE r.framework IS NOT NULL),'[]') reviews
        FROM research_console.impact_report_documents d LEFT JOIN research_console.impact_report_reviews r ON r.document_id=d.id
        GROUP BY d.id ORDER BY d.created_at DESC LIMIT 100`)});
    }
    if(url.searchParams.has("download")) {
      const doc=await accessibleDocument(owner,url.searchParams.get("download")!);
      if(!doc.file_bytes) return json({error:"The document has not been retrieved yet. Inspect its original source."},404);
      return new Response(new Uint8Array(doc.file_bytes),{headers:{"content-type":"application/pdf","content-disposition":"attachment; filename=impact-report.pdf","cache-control":"private, no-store","x-content-type-options":"nosniff"}});
    }
    const data=await listDocuments(owner);
    after(()=>drainImpactReviews());
    return json({...data,context:await context(owner)});
  } catch(e) {return failure(e);}
}
export async function POST(request:Request) {
  try {
    const owner=await protectPlatformRequest(request);
    if(request.headers.get("content-type")?.startsWith("multipart/form-data")) {
      if(Number(request.headers.get("content-length"))>4_100_000) return json({error:"Choose a PDF up to 4 MB."},413);
      const form=await request.formData(), file=form.get("file");
      if(!(file instanceof File)) return json({error:"Choose a PDF."},400);
      return json(await upload(owner,file));
    }
    const raw=await request.text(); if(raw.length>2000) return json({error:"Request too large."},413);
    const body=JSON.parse(raw);
    if(body.action==="discover") {
      // Existing discoveries persist; repeated visits do not crawl again.
      const existing=await listDocuments(owner);
      if(existing.documents.length) return json({found:existing.documents.length,message:"Your previously found reports are ready below."});
      return json(await discover(owner));
    }
    if(body.action==="confirm") {await confirm(owner,String(body.id));return json({ok:true});}
    if(body.action==="review" && ["claims","excellence"].includes(body.framework)) {
      await enqueue(owner,String(body.id),body.framework); after(()=>drainImpactReviews());return json({queued:true});
    }
    return json({error:"Unknown review action."},400);
  } catch(e) {return failure(e);}
}
function failure(e:unknown) {
  if(e instanceof AccessError) return json({error:e.message},e.status);
  console.error("Impact report request failed",e instanceof Error?e.message:"unknown");
  return json({error:e instanceof Error && !/relation|permission|database|connect|syntax/i.test(e.message)?e.message:"The report service could not finish. Your saved work is unchanged. Please retry."},400);
}
