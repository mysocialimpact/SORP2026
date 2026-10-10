export const runtime = "nodejs";
export const maxDuration = 60;

function reportEndpoint() {
  const configured = process.env.SORP_READINESS_API_URL || "https://sorp2026.mysocialimpact.org/api/readiness";
  return configured.replace(/\/api\/readiness\/?(?:\?.*)?$/, "/api/readiness/report");
}

export async function POST(request: Request) {
  let form: FormData;
  try { form = await request.formData(); } catch { return Response.json({ error: "We could not read that report upload." }, { status: 400 }); }
  try {
    const response = await fetch(reportEndpoint(), { method: "POST", body: form, cache: "no-store" });
    const payload = await response.text();
    return new Response(payload, {
      status: response.status,
      headers: { "content-type": response.headers.get("content-type") || "application/json", "cache-control": "no-store" },
    });
  } catch {
    return Response.json({ error: "The report review service could not be reached. Your assessment is still safe." }, { status: 502 });
  }
}
