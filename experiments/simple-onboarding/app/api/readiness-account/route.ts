import { randomUUID } from "node:crypto";
import { load, body, save, sameOrigin, json } from "../../../lib/service";
import {
  accountReady,
  validEmail,
} from "../../../../../src/lib/onboarding/state.ts";
export async function GET() {
  return json({ signedIn: false, mock: true });
}
export async function POST(r: Request) {
  try {
    sameOrigin(r);
    const row = await load(r);
    if (!row) return json({ error: "Start your introduction." }, 401);
    const data = JSON.parse((await body(r)).toString());
    const s = row.payload;
    if (data.action !== "signup")
      return json(
        { error: "Production sign-in is disabled in this Preview." },
        403,
      );
    if (!accountReady(s.state))
      return json(
        { error: "All five registration requirements must be satisfied." },
        400,
      );
    if (
      !validEmail(data.email) ||
      data.email !== s.state.facts.email ||
      data.name !== s.state.facts.name ||
      typeof data.password !== "string" ||
      data.password.length < 12
    )
      return json(
        {
          error:
            "Use the reviewed profile and a test password of at least 12 characters.",
        },
        400,
      );
    await save(row, {
      ...s,
      account: {
        id: randomUUID(),
        name: s.state.facts.name,
        email: s.state.facts.email,
        mock: true,
        createdAt: new Date().toISOString(),
      },
    });
    return json({ signedIn: true, mock: true });
  } catch {
    return json({ error: "The isolated account could not be saved." }, 503);
  }
}
