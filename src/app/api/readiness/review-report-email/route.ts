import { POST as sendReport } from "../report-email/route.ts";

export const runtime = "nodejs";

// The public review sends once the report itself is complete, before optional
// feedback or support screens. Older completed sessions may still send "done".
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try { body = await request.clone().json(); }
  catch { return Response.json({ error: "We could not read those email details." }, { status: 400 }); }
  if (!body || !["report-complete", "done"].includes(String(body.deliveryStage || ""))) {
    return Response.json({ error: "Report email is available only when the personalised report is complete." }, { status: 409 });
  }
  const origin = new URL(request.url).origin;
  const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
  const tracked = (minutes: 30 | 60) => `${origin}/api/growth-click?review=${minutes}&sessionId=${encodeURIComponent(sessionId)}`;
  const commercialJourney = {
    heading: "Talk your report through with My Social Impact",
    explanation: "We’ll go through your report, answer questions and agree the most useful next steps.",
    reviews: [
      { duration: 30, price: "£50", label: "30-minute SORP Review — £50", cta: "BOOK 30 MINUTES", url: tracked(30) },
      { duration: 60, price: "£100", label: "60-minute SORP Review — £100", cta: "BOOK 60 MINUTES", url: tracked(60) },
    ],
    implementationSupport: "Need help making the changes? After your review, we can help you implement what is needed. Practical SORP-readiness and Social Impact Excellence support starts from £250, depending on the work required. This can include addressing reporting priorities and beginning a year-round approach to defining, measuring, managing and communicating impact.",
    serviceBoundary: "The assessment identifies the important areas worth discussing. The human review is where MSI discusses what work, if any, the charity actually needs.",
  };
  const result = body.result && typeof body.result === "object" ? body.result as Record<string, unknown> : {};
  const enriched = { ...body, commercialJourney, result: { ...result, commercialJourney } };
  const forwarded = new Request(request.url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(enriched) });
  return sendReport(forwarded);
}
