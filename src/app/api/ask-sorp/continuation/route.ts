const origin = "https://sorp2026.mysocialimpact.org";

export const runtime = "nodejs";
export const maxDuration = 30;

function clean(value: unknown, length: number) {
  return typeof value === "string" ? value.trim().slice(0, length) : "";
}

function error(message: string, status: number) {
  return Response.json({ error: message }, { status, headers: { "cache-control": "no-store" } });
}

export async function GET() {
  try {
    const response = await fetch(`${origin}/api/ask-config`, { cache: "no-store", signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error("Configuration unavailable");
    const data = await response.json();
    const subscriptions = data?.config?.subscriptions;
    if (!subscriptions?.prices) throw new Error("Pricing unavailable");
    return Response.json({ offers: {
      professionalName: subscriptions.professionalName,
      practiceName: subscriptions.practiceName,
      professionalAllowance: subscriptions.professionalAllowance,
      fairUse: subscriptions.fairUse,
      foundingActive: subscriptions.foundingActive,
      foundingAvailable: false, // Availability must be verified in the original account checkout.
      prices: subscriptions.prices,
    } }, { headers: { "cache-control": "no-store" } });
  } catch {
    return error("Current access options are temporarily unavailable. Open the original Ask SORP site.", 503);
  }
}

export async function POST(request: Request) {
  if (Number(request.headers.get("content-length") || 0) > 32000) return error("That request is too large.", 413);
  let input: Record<string, unknown>;
  try {
    const body = await request.text();
    if (body.length > 32000) return error("That request is too large.", 413);
    input = JSON.parse(body);
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Invalid request");
  } catch { return error("Please check the details and try again.", 400); }

  const action = input.action;
  if (action !== "summary" && action !== "feedback") return error("Unsupported action.", 400);
  const sessionId = clean(input.sessionId, 100);
  if (!/^[a-f0-9-]{36}$/i.test(sessionId)) return error("Please refresh Ask SORP and try again.", 400);
  const conversation = Array.isArray(input.conversation) ? input.conversation.slice(0, 3) : [];
  if (action === "summary" && (!conversation.length || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(input.email, 254)))) {
    return error("Enter a valid email address after asking a question.", 400);
  }
  if (action === "feedback" && (conversation.length !== 3 || (!Number(input.rating) && !clean(input.comment, 2000)))) {
    return error("Complete three questions and add a rating or suggestion.", 400);
  }
  const details = {
    name: clean(input.name, 120), email: clean(input.email, 254),
    organisationName: clean(input.organisationName, 240),
    charityName: clean(input.charityName, 240), charityNumber: clean(input.charityNumber, 40),
    role: clean(input.role, 80), sessionId, contactConsent: input.contactConsent === true,
    shareConversation: input.shareConversation === true, website: "",
  };
  const payload = action === "summary"
    ? { action, ...details, conversation: conversation.map(turn => ({
        question: clean(turn?.question, 1200), shortAnswer: clean(turn?.shortAnswer, 3000),
        references: Array.isArray(turn?.references) ? turn.references.slice(0, 8).map((item: unknown) => clean(item, 40)) : [],
        modules: Array.isArray(turn?.modules) ? turn.modules.slice(0, 8).map((item: unknown) => clean(item, 180)) : [],
        interpretation: clean(turn?.interpretation, 4000), humanJudgement: clean(turn?.humanJudgement, 2400),
      })) }
    : { kind: "session", ...details, feedbackId: clean(input.feedbackId, 100), rating: Number(input.rating) || 0,
        comment: clean(input.comment, 2000), route: "/ask-sorp/workspace/",
        conversation: conversation.map(turn => ({
          question: clean(turn?.question, 1200), answer: clean(turn?.answer, 5000),
        })) };
  if (action === "feedback" && !/^[a-f0-9-]{36}$/i.test(clean(input.feedbackId, 100))) return error("Please refresh and try feedback again.", 400);

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
  const headers: Record<string, string> = { "content-type": "application/json", accept: "application/json" };
  if (/^[0-9a-f:.]{3,45}$/i.test(ip)) headers["x-forwarded-for"] = ip;
  try {
    const upstream = await fetch(`${origin}/api/${action === "summary" ? "book" : "ask-feedback"}`, {
      method: "POST", headers, body: JSON.stringify(payload), cache: "no-store", signal: AbortSignal.timeout(25000),
    });
    return new Response(await upstream.text(), {
      status: upstream.status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
    });
  } catch {
    return error("The original Ask SORP service could not complete this request. Your details remain in this workspace; please retry.", 502);
  }
}
