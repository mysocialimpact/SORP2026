import {
  enabled,
  sameOrigin,
  getSession,
  claimOperation,
  boundedBody,
} from "@/lib/onboarding/server";
export const runtime = "nodejs";
export const maxDuration = 40;
export async function POST(request: Request) {
  const fail = (error: string, status: number) =>
    Response.json(
      { error },
      { status, headers: { "cache-control": "no-store" } },
    );
  try {
    sameOrigin(request);
  } catch {
    return fail("Please record from this website.", 403);
  }
  if (!enabled())
    return fail(
      "Transcription is not connected in this preview. You can still type your answer.",
      503,
    );
  if (Number(request.headers.get("content-length")) > 3_600_000)
    return fail("Please record a shorter answer.", 413);
  try {
    const session = await getSession(request);
    if (!session) return fail("Please reopen your introduction.", 401);
    try {
      await claimOperation(session.id, "transcription");
    } catch {
      return fail(
        "We’ve reached the recording limit. Please type your next answer.",
        429,
      );
    }
    const bytes = await boundedBody(request, 3_600_000);
    const form = await new Response(new Uint8Array(bytes), {
        headers: { "content-type": request.headers.get("content-type") || "" },
      }).formData(),
      audio = form.get("audio");
    if (
      !(audio instanceof File) ||
      !audio.size ||
      audio.size > 3_500_000 ||
      !/^audio\/(webm|mp4|ogg|wav|mpeg)(;|$)/i.test(audio.type)
    )
      return fail("Choose a supported audio recording under 3.5 MB.", 400);
    const clean = new FormData();
    clean.append(
      "audio",
      audio,
      audio.type.includes("mp4") ? "introduction.m4a" : "introduction.webm",
    );
    const response = await fetch(
      process.env.SORP_TRANSCRIBE_API_URL ||
        "https://sorp2026.mysocialimpact.org/api/transcribe",
      {
        method: "POST",
        body: clean,
        redirect: "error",
        signal: AbortSignal.timeout(30000),
        cache: "no-store",
      },
    );
    const data = await response.json();
    if (!response.ok || typeof data.transcript !== "string")
      return fail(
        "The recording could not be transcribed. Retry or type your answer.",
        502,
      );
    return Response.json(
      { transcript: data.transcript.slice(0, 3000) },
      { headers: { "cache-control": "no-store" } },
    );
  } catch {
    return fail(
      "Transcription is temporarily unavailable. Retry or type your answer.",
      502,
    );
  }
}
