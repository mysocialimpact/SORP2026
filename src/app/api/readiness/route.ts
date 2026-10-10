export const runtime = "nodejs";
export const maxDuration = 60;

const endpoint = process.env.SORP_READINESS_API_URL || "https://sorp2026.mysocialimpact.org/api/readiness";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "We could not read that answer." }, { status: 400 });
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.text();
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("json")) {
      return Response.json({ error: response.ok
        ? "The readiness assistant returned an unexpected response. Please try again; your progress is safe."
        : "The readiness assistant is temporarily unavailable. Please try again; your progress is safe." }, { status: response.ok ? 502 : response.status, headers: { "cache-control": "no-store" } });
    }
    return new Response(payload, { status: response.status, headers: { "content-type": response.headers.get("content-type") || "application/json", "cache-control": "no-store" } });
  } catch {
    return Response.json({ error: "The readiness assistant could not be reached. Your progress is still saved in this browser." }, { status: 502 });
  }
}
