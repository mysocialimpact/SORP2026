import { after } from "next/server";
import { processTurn, fallbackTurn } from "@/lib/onboarding/engine";
import { query, transaction } from "@/lib/console/db";
import { protectPlatformRequest } from "@/lib/platform/auth";
import { AccessError } from "@/lib/access-error";
import {
  cleanFacts,
  mergeFacts,
  nextQuestion,
  nextObjective,
  TOTAL_TURN_CAP,
  applyFacts,
  proposeCharity,
  confirmCharity,
  validEntity,
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
  saveSession,
  StaleConversation,
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
const snapshot = (session: Awaited<ReturnType<typeof getSession>>) =>
  session
    ? {
        state: session.state,
        messages: session.messages,
        question: nextQuestion(session.state),
        selected: session.state.charity.confirmed,
      }
    : {};
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
    if (error instanceof StaleConversation)
      return json(
        { ...snapshot(await getSession(request)), error: error.message },
        409,
      );
    return json(
      {
        ...snapshot(await getSession(request).catch(() => undefined)),
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
      const { GET: existingAccount } =
        await import("@/app/api/readiness-account/route");
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
          JSON.stringify({
            ...facts,
            professionalContext: saved.professionalContext || {},
          }),
          JSON.stringify(messages),
          charity,
          JSON.stringify(attributionFrom(saved.attribution)),
        ],
      );
      return json({ saved: true });
    }
    if (!session)
      return json({ error: "Please reopen your introduction." }, 401);
    if (
      typeof body.revision === "number" &&
      body.revision !== session.state.revision
    )
      return json(
        {
          ...snapshot(session),
          error:
            "Your introduction changed. We’ve restored your latest saved details; please review and retry.",
        },
        409,
      );
    await claimRequest(session.id, action === "search");
    if (action === "edit") {
      const next = applyFacts(session.state, body.fields || {}, "form");
      const saved = await saveSession(session, next);
      return json(snapshot(saved));
    }
    if (action === "turn") {
      if (
        typeof body.message !== "string" ||
        !body.message.trim() ||
        body.message.length > 3000
      )
        return json({ error: "Use an answer of up to 3,000 characters." }, 400);
      if (session.state.turns >= TOTAL_TURN_CAP)
        return json(
          { error: "Please finish with your editable profile." },
          409,
        );
      if (/\b(?:my )?password\s*(?:is|:|=)/i.test(body.message))
        return json(
          { error: "Keep passwords in the secure account fields." },
          400,
        );
      const before = applyFacts(session.state, body.fields || {}, "form");
      const userMessages = [
        ...session.messages,
        { role: "user", text: body.message },
      ].slice(-21);
      // Reserve the turn and retain input, without committing unvalidated extraction.
      const reserved = await saveSession(
        session,
        { ...before, turns: before.turns + 1 },
        userMessages,
      );
      let next = before,
        notice = "";
      try {
        const processed = await processTurn(
          before,
          body.message,
          (message, state, skip) => extractWithModel(message, state, session.id, skip),
          body.skip === true,
        );
        next = processed.state;
        notice = processed.extraction.notice || "";
      } catch (e) {
        next = fallbackTurn(before, body.message, body.skip === true);
        notice =
          e instanceof Error
            ? e.message
            : "Please retry or use your editable profile.";
      }
      const messages = [
        ...userMessages,
        { role: "assistant", text: nextQuestion(next) },
      ].slice(-22);
      const saved = await saveSession(reserved, next, messages);
      return json({
        ...snapshot(saved),
        notice,
        objective: nextObjective(saved.state),
        lookup:
          saved.state.charity.phase === "lookup"
            ? saved.state.charity.proposed
            : "",
      });
    }
    if (action === "search") {
      if (
        typeof body.query !== "string" ||
        body.query.trim().length < 2 ||
        !validEntity(body.query)
      )
        return json({ error: "Add a charity name or number." }, 400);
      const searching = await saveSession(
        session,
        proposeCharity(session.state, body.query),
      );
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
      const next = {
        ...searching.state,
        charity: {
          ...searching.state.charity,
          candidates,
          phase: "confirm" as const,
        },
      };
      const saved = await saveSession(
        searching,
        next,
        [
          ...searching.messages,
          { role: "assistant", text: nextQuestion(next) },
        ].slice(-22),
      );
      return json({ ...snapshot(saved), candidates });
    }
    if (action === "confirm") {
      const candidates = session.state.charity.candidates;
      if (
        !Number.isInteger(body.index) ||
        body.index < 0 ||
        body.index >= candidates.length
      )
        return json(
          { error: "Search again to confirm an official match." },
          400,
        );
      const selected = candidates[body.index];
      const next = confirmCharity(session.state, selected);
      const messages = [
        ...session.messages,
        {
          role: "assistant",
          text: nextQuestion(next),
        },
      ].slice(-22);
      const saved = await saveSession(session, next, messages);
      // No lookup or inferred entity can enqueue public research. Only this explicit confirmation does.
      after(async () => {
        const current = await getSession(request);
        if (
          current?.state.charity.confirmed?.officialUrl !== selected.officialUrl
        )
          return;
        const identity = await queueCharity(selected);
        await prepareCharity(identity).catch(() => undefined);
      });
      return json({ ...snapshot(saved), preparation: "queued" });
    }
    if (action === "complete") {
      const identity = await protectPlatformRequest(request);
      // Browser facts never select an account. Only the verified existing session does.
      const facts = mergeFacts(session.state.facts, cleanFacts(body.fields));
      facts.name = identity.account.name;
      facts.email = identity.account.email;
      const charity = session.state.charity.confirmed
        ? charityIdentity(session.state.charity.confirmed)
        : null;
      if (session.state.charity.confirmed)
        await queueCharity(session.state.charity.confirmed);
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
            JSON.stringify({
              ...facts,
              professionalContext: {
                relationships: session.state.professional,
                corrections: session.state.corrections,
                knowledge: session.state.knowledge,
              },
            }),
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
    if (error instanceof StaleConversation)
      return json(
        { ...snapshot(await getSession(request)), error: error.message },
        409,
      );
    return json(
      {
        ...snapshot(await getSession(request).catch(() => undefined)),
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
