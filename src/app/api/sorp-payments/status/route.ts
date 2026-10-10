export const runtime = "nodejs";

const endpoint = process.env.SORP_PAYMENT_SERVICE_URL || "https://milkmaid.theideasshed.com";

export async function POST(request: Request) {
  if (!process.env.SORP_PAYMENT_SERVICE_KEY) return Response.json({ error: "Payment verification is temporarily unavailable." }, { status: 503 });
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "We could not read that payment reference." }, { status: 400 }); }
  try {
    const response = await fetch(`${endpoint}/api/sorp-payment-status`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${process.env.SORP_PAYMENT_SERVICE_KEY}` },
      body: JSON.stringify(body),
    });
    return new Response(await response.text(), { status: response.status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
  } catch {
    return Response.json({ error: "We could not verify the payment yet. Please try again." }, { status: 502 });
  }
}
