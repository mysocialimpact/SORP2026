const upstream = "https://sorp2026.mysocialimpact.org/api/ask";

export const runtime = "nodejs";
export const maxDuration = 60;

type HistoryItem = { role: "user" | "assistant"; content: string };

function jsonError(error: string, status: number) {
  return Response.json({ error }, { status });
}

function cleanHistory(value: unknown): HistoryItem[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is HistoryItem => Boolean(
    item && typeof item === "object" && "role" in item && (item.role === "user" || item.role === "assistant")
    && "content" in item && typeof item.content === "string",
  )).slice(-6).map(item => ({ role: item.role, content: item.content.slice(0, 1800) }));
}

function clientAddress(request: Request) {
  const candidate = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip")?.trim() || "";
  return /^[0-9a-f:.]{3,45}$/i.test(candidate) ? candidate : "";
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 32_000) return jsonError("That request is too large.", 413);

  let input: Record<string, unknown>;
  try {
    const value = await request.json();
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid");
    input = value as Record<string, unknown>;
  } catch {
    return jsonError("That question could not be read. Please try again.", 400);
  }

  const question = typeof input.question === "string" ? input.question.trim() : "";
  const sessionId = typeof input.sessionId === "string" ? input.sessionId : "";
  const requestId = typeof input.requestId === "string" ? input.requestId : "";
  const round = typeof input.round === "number" && Number.isInteger(input.round) ? input.round : 1;
  if (question.length < 3) return jsonError("Please enter a question about SORP 2026.", 400);
  if (question.length > 1200) return jsonError("Please shorten the question to 1,200 characters or fewer.", 400);
  if (!/^[a-f0-9-]{36}$/i.test(sessionId) || !/^[a-f0-9-]{36}$/i.test(requestId)) return jsonError("Please refresh Ask SORP and try again.", 400);
  if (round < 1 || round > 3) return jsonError("This free conversation includes three SORP questions.", 429);

  const headers: Record<string, string> = { "content-type": "application/json", accept: "application/json" };
  const address = clientAddress(request);
  if (address) headers["x-forwarded-for"] = address;

  try {
    const response = await fetch(upstream, {
      method: "POST",
      headers,
      body: JSON.stringify({ question, history: cleanHistory(input.history), round, sessionId, requestId }),
      cache: "no-store",
      signal: AbortSignal.timeout(55_000),
    });
    const body = await response.text();
    return new Response(body, {
      status: response.status,
      headers: {
        "content-type": response.headers.get("content-type")?.includes("application/json") ? "application/json" : "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  } catch (cause) {
    console.error("Ask SORP upstream request failed", cause instanceof Error ? cause.message : "unknown error");
    return jsonError("Ask SORP is temporarily unavailable. Your question is still here, please try again.", 502);
  }
}
