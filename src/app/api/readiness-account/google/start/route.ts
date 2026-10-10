import { readinessAccountOauthUrl } from "../../../../booking-google";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try { return Response.redirect(readinessAccountOauthUrl(), 302); }
  catch (error) { return Response.redirect(`${new URL(request.url).origin}/are-you-sorp-ready/review/?account_error=${encodeURIComponent(error instanceof Error ? error.message : "Google sign-in could not start.")}`, 302); }
}
