import { AccessError } from "@/lib/access-error";
import { protectFounderRequest } from "@/lib/founder/auth";
import { readGrowth, writeGrowth } from "@/lib/growth/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const json = (value: unknown, status = 200) => Response.json(value, {
  status, headers: { "cache-control": "private, no-store", "x-robots-tag": "noindex, nofollow" },
});

async function handle(request: Request) {
  try {
    const actor = await protectFounderRequest(request);
    if (request.method === "GET") return json(await readGrowth(new URL(request.url).searchParams));
    const body = await request.text();
    if (body.length > 60_000) return json({ error: "This record is too long. Shorten it and try again." }, 413);
    const input = JSON.parse(body);
    if (!input || typeof input !== "object" || Array.isArray(input)) return json({ error: "Send a growth record." }, 400);
    return json(await writeGrowth(input, actor.email));
  } catch (error) {
    if (error instanceof AccessError) return json({ error: error.message }, error.status);
    if (error instanceof SyntaxError) return json({ error: "The record could not be read." }, 400);
    const code = (error as { code?: string })?.code;
    if (code === "23505") return json({ error: "A record already exists for this firm, charity or linked organisation. Search the directory before adding it again." }, 409);
    if (code === "42P01") return json({ error: "Growth records are not available in this environment yet." }, 503);
    console.error("[founder-growth] request failed", { code });
    return json({ error: "Growth records are temporarily unavailable. Try again." }, 503);
  }
}

export const GET = handle;
export const POST = handle;
