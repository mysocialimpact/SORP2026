import { oauthUrl } from "../../../../booking-google";

export const runtime = "nodejs";
export async function GET() {
  try { return Response.redirect(oauthUrl(), 302); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Google authorisation could not start." }, { status: 503 }); }
}
