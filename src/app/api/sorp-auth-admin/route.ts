import { founderCreateOrganisation, founderForRequest, founderInviteMember, founderOverview,
  founderRequestClientAccess, founderRevokeInvitation, founderRevokeMembership, founderSetPlan } from "@/lib/sorp-auth/admin";
import { independentAuthRoutesEnabled } from "@/lib/sorp-auth/switch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const json = (data: unknown, status = 200) => Response.json(data,
  { status, headers: { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" } });

export async function GET(request: Request) {
  if (!independentAuthRoutesEnabled()) return json({ error: "Not found." }, 404);
  try {
    const founder = await founderForRequest(request.headers);
    if (!founder.identity) return json({ error: "Founder access is required." }, founder.status);
    return json(await founderOverview());
  } catch { return json({ error: "The founder service is unavailable." }, 503); }
}

export async function POST(request: Request) {
  if (!independentAuthRoutesEnabled()) return json({ error: "Not found." }, 404);
  const url = new URL(request.url);
  const expected = `${request.headers.get("x-forwarded-proto") || url.protocol.slice(0, -1)}://${request.headers.get("host") || url.host}`;
  if (request.headers.get("origin") !== expected || request.headers.get("sec-fetch-site") === "cross-site") {
    return json({ error: "Please submit from this website." }, 403);
  }
  try {
    const founder = await founderForRequest(request.headers);
    if (!founder.identity) return json({ error: "Founder access is required." }, founder.status);
    const input = await request.json() as Record<string, unknown>;
    if (!input || typeof input !== "object" || Array.isArray(input)) return json({ error: "Invalid request." }, 400);
    const actor = founder.identity.account.id;
    if (input.action === "create-organisation") return json(await founderCreateOrganisation(actor, input), 201);
    if (input.action === "set-plan") return json(await founderSetPlan(actor, input));
    if (input.action === "revoke-membership") return json(await founderRevokeMembership(actor, input));
    if (input.action === "invite-member") return json(await founderInviteMember(actor, input), 201);
    if (input.action === "revoke-invitation") return json(await founderRevokeInvitation(actor, input));
    if (input.action === "request-client-access") return json(await founderRequestClientAccess(actor, input), 201);
    return json({ error: "Unknown founder action." }, 400);
  } catch { return json({ error: "The founder action was rejected." }, 400); }
}
