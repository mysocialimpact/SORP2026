export const runtime = "edge";

const endpoint = process.env.SORP_TRANSCRIBE_API_URL || "https://sorp2026.mysocialimpact.org/api/transcribe";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const response = await fetch(endpoint, { method: "POST", body: form });
    const payload = await response.text();
    return new Response(payload, { status: response.status, headers: { "content-type": response.headers.get("content-type") || "application/json", "cache-control": "no-store" } });
  } catch {
    return Response.json({ error: "The recording could not be transcribed. You can still type your answer." }, { status: 502 });
  }
}
