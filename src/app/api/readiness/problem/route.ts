export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.text();
    if (body.length > 8_000) return Response.json({ error: "That message is too long. Please shorten it or email marcus@mysocialimpact.org." }, { status: 413 });
    const base = process.env.SORP_READINESS_API_URL || "https://sorp2026.mysocialimpact.org/api/readiness";
    const response = await fetch(new URL("/api/public-homework-message", base), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.headers.get("content-type")?.includes("json")) throw new Error("Unexpected message response");
    return new Response(await response.text(), { status: response.status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
  } catch {
    return Response.json({ error: "We could not submit that message just now. Please email marcus@mysocialimpact.org; your assessment progress is still saved." }, { status: 502 });
  }
}
