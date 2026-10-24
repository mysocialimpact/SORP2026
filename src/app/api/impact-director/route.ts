import { database } from "@/lib/console/db";
import { validDraft } from "@/features/director/model";
import { independentIdentity } from "@/lib/sorp-auth/identity";
import { independentAuthCutover } from "@/lib/sorp-auth/switch";
import { isIsolatedCustomerIdentity } from "../../../lib/customer-isolation.ts";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const json = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: { "cache-control": "private, no-store", vary: "Cookie" },
  });
async function account(request: Request) {
  if (!request.headers.get("cookie")) return null;
  if (independentAuthCutover()) {
    const identity = await independentIdentity(request.headers);
    if (isIsolatedCustomerIdentity(identity)) return null;
    return identity ? { id: identity.account.id, name: identity.account.name,
      organisation: identity.account.organisation } : null;
  }
  if (!process.env.SORP_BACKEND_ORIGIN)
    throw new Error("Account service unavailable");
  const response = await fetch(
    new URL("/api/readiness-account", process.env.SORP_BACKEND_ORIGIN),
    {
      headers: {
        cookie: request.headers.get("cookie")!,
        "x-sorp-destination": "sorp2026.org",
      },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(15000),
    },
  );
  if (response.status === 401) return null;
  if (!response.ok) throw new Error("Account service unavailable");
  const result = await response.json();
  if (isIsolatedCustomerIdentity(result)) return null;
  return result.signedIn === true && typeof result.account?.id === "string"
    ? {
        id: result.account.id as string,
        name: String(result.account.name || ""),
        organisation: String(result.account.organisation || ""),
      }
    : null;
}
export async function GET(request: Request) {
  try {
    const owner = await account(request);
    if (!owner) return json({ signedIn: false }, 401);
    const { rows } = await database().query(
      "SELECT data, revision, updated_at FROM msi_products.impact_director WHERE account_id = $1",
      [owner.id],
    );
    return json({ signedIn: true, account: owner, progress: rows[0] || null });
  } catch {
    return json(
      {
        error:
          "Your saved snapshot could not be opened. Please try again; nothing has been changed.",
      },
      503,
    );
  }
}
export async function POST(request: Request) {
  const origin = `${request.headers.get("x-forwarded-proto") || new URL(request.url).protocol.replace(":", "")}://${request.headers.get("host") || new URL(request.url).host}`;
  if (
    request.headers.get("origin") !== origin ||
    request.headers.get("sec-fetch-site") === "cross-site"
  )
    return json({ error: "Please save from this website." }, 403);
  try {
    const owner = await account(request);
    if (!owner)
      return json({ error: "Please sign in to save to your account." }, 401);
    // An explicit owner match also prevents a stale tab saving under a newly switched account.
    const text = await request.text();
    if (text.length > 65000)
      return json({ error: "These answers are too large to save." }, 413);
    let input;
    try {
      input = JSON.parse(text);
    } catch {
      return json({ error: "Invalid assessment." }, 400);
    }
    if (input.accountId !== owner.id)
      return json(
        { error: "Your signed-in account changed. Reload before saving." },
        409,
      );
    if (
      !validDraft(input.data) ||
      !Number.isInteger(input.revision) ||
      input.revision < 0
    )
      return json({ error: "Please check your assessment answers." }, 400);
    const result =
      input.revision === 0
        ? await database().query(
            "INSERT INTO msi_products.impact_director(account_id,data) VALUES($1,$2::jsonb) ON CONFLICT DO NOTHING RETURNING revision,updated_at",
            [owner.id, JSON.stringify(input.data)],
          )
        : await database().query(
            "UPDATE msi_products.impact_director SET data=$2::jsonb,revision=revision+1,updated_at=now() WHERE account_id=$1 AND revision=$3 RETURNING revision,updated_at",
            [owner.id, JSON.stringify(input.data), input.revision],
          );
    if (!result.rowCount)
      return json(
        {
          error:
            "A newer snapshot is already saved. Download your current answers, then reload to open the saved version.",
        },
        409,
      );
    return json({ saved: true, ...result.rows[0] });
  } catch {
    return json(
      {
        error:
          "Your snapshot has not been saved to your account. Keep this page open and try again.",
      },
      503,
    );
  }
}
