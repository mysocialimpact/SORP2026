import { after } from "next/server";
import { query, transaction } from "@/lib/console/db";
import { protectPlatformRequest } from "@/lib/platform/auth";
import { AccessError } from "@/lib/access-error";
import {
  advance,
  cleanFacts,
  extractImmediate,
  mergeFacts,
  nextQuestion,
  nextObjective,
  TOTAL_TURN_CAP,
  fieldKeys,
  emptyFacts,
} from "@/lib/onboarding/state";
import {
  enabled,
  sameOrigin,
  getSession,
  createSession,
  claimRequest,
  claimOperation,
  attributionFrom,
  extractWithModel,
  sessionCookie,
  boundedBody,
} from "@/lib/onboarding/server";
import {
  charityIdentity,
  queueCharity,
  prepareCharity,
  cachedCharityDocument,
} from "@/lib/onboarding/intelligence";
import type { Candidate } from "@/app/sorp-public-model";
export const runtime = "nodejs";
export const maxDuration = 180;
const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { "cache-control": "no-store" } });
export async function GET(
  request: Request,
  { params }: { params: Promise<{ action: string }> },
) {
  const { action } = await params;
  if (!enabled()) return json({ available: false }, 503);
  try {
    if (action === "document") {
      const identity = await protectPlatformRequest(request);
      const document = await cachedCharityDocument(
        identity.account.id,
        new URL(request.url).searchParams.get("source") || "",
      );
      if (!document)
        return json(
          { error: "No prepared document is available for this account." },
          404,
        );
      return new Response(new Uint8Array(document.bytes), {
        headers: {
          "content-type": "application/pdf",
          "content-disposition":
            'attachment; filename="charity-public-report.pdf"',
          "cache-control": "private, no-store",
          "x-content-type-options": "nosniff",
        },
      });
    }
    if (action === "context") {
      const identity = await protectPlatformRequest(request);
      const [profile] = await query<{
        facts: unknown;
        charity_identity: string;
      }>(
        `SELECT facts,charity_identity FROM research_console.onboarding_profiles WHERE account_id=$1`,
        [identity.account.id],
      );
      if (!profile) return json({ account: identity.account, charity: null });
      const [charity] = profile.charity_identity
        ? await query(
            `SELECT identity,candidate,status,profile,updated_at FROM research_console.charity_intelligence WHERE identity=$1`,
            [profile.charity_identity],
          )
        : [];
      const documents = profile.charity_identity
        ? await query(
            `SELECT source_url,kind,title,publication_date,retrieved_at,status FROM research_console.charity_documents WHERE charity_identity=$1`,
            [profile.charity_identity],
          )
        : [];
      return json({
        account: identity.account,
        facts: profile.facts,
        charity,
        documents,
      });
    }
    const session = await getSession(request);
    if (!session) return json({ available: true });
    return json({
      available: true,
      state: session.state,
      messages: session.messages,
      selected: session.selected,
    });
  } catch (error) {
    return json(
      {
        error:
          error instanceof AccessError
            ? error.message
            : "Your saved introduction is temporarily unavailable.",
      },
      error instanceof AccessError ? error.status : 503,
    );
  }
}
export async function POST(
  request: Request,
  { params }: { params: Promise<{ action: string }> },
) {
  const { action } = await params;
  try {
    sameOrigin(request);
  } catch {
    return json({ error: "Please submit from this website." }, 403);
  }
  if (!enabled())
    return json(
      {
        error:
          "Conversation assistance is not connected in this preview. You can type your details or use the form.",
        available: false,
      },
      503,
    );
  try {
    const raw = new TextDecoder().decode(await boundedBody(request, 16000));
    if (Buffer.byteLength(raw) > 16000)
      return json({ error: "Please keep your answer shorter." }, 413);
    const body = JSON.parse(raw);
    if (!body || typeof body !== "object" || Array.isArray(body))
      return json({ error: "Invalid request." }, 400);
    if (action === "start") {
      const existing = await getSession(request);
      if (existing)
        return json({
          state: existing.state,
          messages: existing.messages,
          selected: existing.selected,
        });
      const id = await createSession(attributionFrom(body.attribution));
      const response = json({ available: true });
      response.headers.append(
        "set-cookie",
        `${sessionCookie}=${id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400${request.headers.get("x-forwarded-proto") === "https" || new URL(request.url).protocol === "https:" ? "; Secure" : ""}`,
      );
      return response;
    }
    const session = await getSession(request);
    if (!session && action === "complete") {
      // Verification may happen on a different device or after the 24-hour draft
      // expires. Recover only from this verified account's own saved signup data.
      const identity = await protectPlatformRequest(request);
      const { GET: existingAccount } = await import(
        "@/app/api/readiness-account/route"
      );
      const response = await existingAccount(
        new Request(new URL("/api/readiness-account/", request.url), {
          headers: request.headers,
        }),
      );
      const account = await response.json();
      const saved = account.progress?.onboarding;
      if (
        !response.ok ||
        account.signedIn !== true ||
        account.account?.id !== identity.account.id ||
        !saved?.facts
      )
        return json({ saved: false });
      const facts = mergeFacts(emptyFacts(), cleanFacts(saved.facts));
      facts.email = identity.account.email;
      facts.name = identity.account.name;
      let charity: string | null = null;
      try {
        const key = charityIdentity(saved.selected);
        const [known] = await query(
          "SELECT identity FROM research_console.charity_intelligence WHERE identity=$1",
          [key],
        );
        if (known) charity = key;
      } catch {
        /* Unconfirmed client metadata never creates a public charity record. */
      }
      const messages = (Array.isArray(saved.messages) ? saved.messages : [])
        .slice(-22)
        .filter(
          (m: { role?: unknown; text?: unknown }) =>
            ["user", "assistant"].includes(String(m?.role)) &&
            typeof m.text === "string",
        )
        .map((m: { role: string; text: string }) => ({
          role: m.role,
          text: m.text.slice(0, 3000),
        }));
      await query(
        `INSERT INTO research_console.onboarding_profiles(account_id,facts,messages,charity_identity,attribution) VALUES($1,$2,$3,$4,$5) ON CONFLICT(account_id) DO NOTHING`,
        [
          identity.account.id,
          JSON.stringify(facts),
          JSON.stringify(messages),
          charity,
          JSON.stringify(attributionFrom(saved.attribution)),
        ],
      );
      return json({ saved: true });
    }
    if (!session)
      return json({ error: "Please reopen your introduction." }, 401);
    await claimRequest(session.id, action === "search");
    if (action === "turn") {
      if (
        typeof body.message !== "string" ||
        !body.message.trim() ||
        body.message.length > 3000
      )
        return json({ error: "Use an answer of up to 3,000 characters." }, 400);
      // Reserve the turn atomically. Parallel/replayed replies cannot spend twice.
      const [reserved] = await query(
        `UPDATE research_console.onboarding_sessions SET state=jsonb_set(state,'{turns}',to_jsonb((state->>'turns')::int+1)) WHERE id=$1 AND (state->>'turns')::int=$2 AND (state->>'turns')::int<$3 RETURNING id`,
        [session.id, session.state.turns, TOTAL_TURN_CAP],
      );
      if (!reserved)
        return json(
          {
            error:
              "That answer is already being processed, or the conversation is complete. Please use your editable profile.",
          },
          409,
        );
      if (/\b(?:my )?password\s*(?:is|:|=)/i.test(body.message))
        return json(
          { error: "Keep passwords in the secure account fields." },
          400,
        );
      const edited = mergeFacts(session.state.facts, cleanFacts(body.fields));
      for (const key of fieldKeys)
        if (typeof body.fields?.[key] === "string")
          edited[key] = body.fields[key]
            .trim()
            .slice(0, key === "email" ? 254 : 120);
      const state = { ...session.state, facts: edited };
      let patch = extractImmediate(body.message, state),
        notice = "";
      if (!body.skip) {
        try {
          patch = mergeFacts(
            { ...edited, ...patch },
            await extractWithModel(body.message, state, session.id),
          );
        } catch (e) {
          notice =
            e instanceof Error
              ? e.message
              : "Please check your editable profile.";
        }
      }
      const next = advance(state, patch, body.skip === true);
      const question = nextQuestion(next);
      const messages = [
        ...session.messages,
        { role: "user", text: body.message },
        { role: "assistant", text: question },
      ].slice(-22);
      await query(
        "UPDATE research_console.onboarding_sessions SET state=$2,messages=$3 WHERE id=$1",
        [session.id, JSON.stringify(next), JSON.stringify(messages)],
      );
      return json({
        state: next,
        question,
        notice,
        objective: nextObjective(next),
      });
    }
    if (action === "search") {
      if (
        typeof body.query !== "string" ||
        body.query.trim().length < 2 ||
        body.query.length > 160
      )
        return json({ error: "Add a charity name or number." }, 400);
      await claimOperation(session.id, "search");
      const base =
        process.env.SORP_READINESS_API_URL ||
        "https://sorp2026.mysocialimpact.org/api/readiness";
      const response = await fetch(new URL("/api/published-review", base), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          operation: "find",
          query: body.query,
          sessionId: session.id,
        }),
        signal: AbortSignal.timeout(25000),
        redirect: "error",
        cache: "no-store",
      });
      if (!response.ok)
        throw new Error(
          "Charity lookup is unavailable. Please try again or choose a charity later.",
        );
      const data = await response.json();
      const candidates: Candidate[] = (
        Array.isArray(data.research?.candidates) ? data.research.candidates : []
      )
        .slice(0, 4)
        .filter((c: Candidate) => {
          try {
            charityIdentity(c);
            return true;
          } catch {
            return false;
          }
        });
      await query(
        "UPDATE research_console.onboarding_sessions SET candidates=$2 WHERE id=$1",
        [session.id, JSON.stringify(candidates)],
      );
      return json({ candidates });
    }
    if (action === "confirm") {
      if (
        !Number.isInteger(body.index) ||
        body.index < 0 ||
        body.index >= session.candidates.length
      )
        return json(
          { error: "Search again to confirm an official match." },
          400,
        );
      const selected = session.candidates[body.index];
      const identity = await queueCharity(selected);
      const state = { ...session.state, confirmedCharity: selected.name };
      await query(
        "UPDATE research_console.onboarding_sessions SET selected=$2,state=$3 WHERE id=$1",
        [session.id, JSON.stringify(selected), JSON.stringify(state)],
      );
      after(async () => {
        await prepareCharity(identity).catch(() => undefined);
      });
      return json({
        selected,
        state,
        question: nextQuestion(state),
        preparation: "queued",
      });
    }
    if (action === "complete") {
      const identity = await protectPlatformRequest(request);
      // Browser facts never select an account. Only the verified existing session does.
      const facts = mergeFacts(session.state.facts, cleanFacts(body.fields));
      facts.name = identity.account.name;
      facts.email = identity.account.email;
      const charity = session.selected
        ? charityIdentity(session.selected)
        : null;
      await transaction(async (c) => {
        const {
          rows: [locked],
        } = await c.query(
          "SELECT account_id FROM research_console.onboarding_sessions WHERE id=$1 FOR UPDATE",
          [session.id],
        );
        if (
          !locked ||
          (locked.account_id && locked.account_id !== identity.account.id)
        )
          throw new Error("This introduction belongs to another account.");
        await c.query(
          `INSERT INTO research_console.onboarding_profiles(account_id,facts,messages,charity_identity,attribution) VALUES($1,$2,$3,$4,$5) ON CONFLICT(account_id) DO NOTHING`,
          [
            identity.account.id,
            JSON.stringify(facts),
            JSON.stringify(session.messages),
            charity,
            JSON.stringify(session.attribution),
          ],
        );
        await c.query(
          "UPDATE research_console.onboarding_sessions SET account_id=$2 WHERE id=$1",
          [session.id, identity.account.id],
        );
      });
      return json({ saved: true });
    }
    return json({ error: "Unknown onboarding action." }, 404);
  } catch (error) {
    return json(
      {
        error:
          error instanceof AccessError
            ? error.message
            : error instanceof SyntaxError
              ? "We could not read that answer."
              : "We couldn’t save that yet. Please retry; your editable profile is still here.",
      },
      error instanceof AccessError
        ? error.status
        : error instanceof SyntaxError
          ? 400
          : 503,
    );
  }
}
