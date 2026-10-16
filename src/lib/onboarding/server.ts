import "server-only";
import { interpretWithModel } from "./model";
import { randomBytes } from "node:crypto";
import { query, transaction } from "@/lib/console/db";
import {
  initialConversation,
  type Conversation,
  type Extraction,
  normaliseConversation,
} from "./state";
import type { Candidate } from "@/app/sorp-public-model";
export const enabled = () =>
  process.env.SORP_ONBOARDING_ENABLED === "true" &&
  !!process.env.CONSOLE_DATABASE_URL;
export type Session = {
  id: string;
  state: Conversation;
  messages: { role: string; text: string }[];
  candidates: Candidate[];
  selected: Candidate | null;
  attribution: Record<string, string>;
  account_id: string | null;
};
export const sessionCookie = "sorp_onboarding";
export function sessionId(request: Request) {
  return (
    request.headers
      .get("cookie")
      ?.match(/(?:^|;\s*)sorp_onboarding=([a-f0-9]{64})(?:;|$)/)?.[1] || ""
  );
}
export function sameOrigin(request: Request) {
  const url = new URL(request.url);
  const expected = `${request.headers.get("x-forwarded-proto") || url.protocol.slice(0, -1)}://${request.headers.get("host") || url.host}`;
  if (
    request.headers.get("origin") !== expected ||
    request.headers.get("sec-fetch-site") === "cross-site"
  )
    throw new Error("Please submit from this website.");
}
export async function getSession(
  request: Request,
): Promise<Session | undefined> {
  const session = (
    await query<Session>(
      "SELECT * FROM research_console.onboarding_sessions WHERE id=$1 AND expires_at>now()",
      [sessionId(request)],
    )
  )[0];
  if (session) {
    session.state = normaliseConversation(session.state, session.selected);
    // Migrate the old server-returned search results; new state owns them thereafter.
    if (
      session.state.charity.phase === "suggest" &&
      session.candidates.length &&
      !session.state.charity.confirmed
    ) {
      session.state.charity.candidates = session.candidates;
      session.state.charity.phase = "confirm";
    }
  }
  return session;
}
/** Atomic snapshot replacement. All mutation paths use the same revision gate. */
export async function saveSession(
  session: Session,
  next: Conversation,
  messages = session.messages,
) {
  const state = { ...next, revision: session.state.revision + 1 };
  const rows = await query(
    `UPDATE research_console.onboarding_sessions SET state=$2,messages=$3,selected=$4,candidates=$5 WHERE id=$1 AND coalesce((state->>'revision')::int,0)=$6 AND expires_at>now() RETURNING id`,
    [
      session.id,
      JSON.stringify(state),
      JSON.stringify(messages),
      JSON.stringify(state.charity.confirmed),
      JSON.stringify(state.charity.candidates),
      session.state.revision,
    ],
  );
  if (!rows.length) throw new StaleConversation();
  return {
    ...session,
    state,
    messages,
    selected: state.charity.confirmed,
    candidates: state.charity.candidates,
  };
}
export class StaleConversation extends Error {
  constructor() {
    super(
      "Your introduction changed in another request. Your latest saved details have been restored; please review and retry.",
    );
  }
}
export async function createSession(attribution: Record<string, string>) {
  const id = randomBytes(32).toString("hex");
  await transaction(async (c) => {
    await c.query(
      "SELECT pg_advisory_xact_lock(hashtext('onboarding-admission'))",
    );
    const { rows } = await c.query(
      "SELECT count(*)::int n FROM research_console.onboarding_sessions WHERE created_at>now()-interval '1 hour'",
    );
    if (rows[0].n >= 200)
      throw new Error(
        "Introductions are busy. Please use the form or try again later.",
      );
    await c.query(
      "INSERT INTO research_console.onboarding_sessions(id,state,attribution) VALUES($1,$2,$3)",
      [id, JSON.stringify(initialConversation()), JSON.stringify(attribution)],
    );
    await c.query(
      "DELETE FROM research_console.onboarding_sessions WHERE expires_at<now()",
    );
  });
  return id;
}
export async function claimRequest(id: string, search = false) {
  const rows = await query(
    `UPDATE research_console.onboarding_sessions SET requests=requests+1${search ? ", searches=searches+1" : ""} WHERE id=$1 AND requests<35 AND expires_at>now() ${search ? "AND searches<4" : ""} RETURNING id`,
    [id],
  );
  if (!rows.length)
    throw new Error(
      "We’ve reached the conversation limit. You can finish using the editable form.",
    );
}
export function attributionFrom(value: unknown) {
  const result: Record<string, string> = {};
  if (value && typeof value === "object")
    for (const key of [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "referrer",
    ]) {
      const v = (value as Record<string, unknown>)[key];
      if (typeof v === "string") result[key] = v.slice(0, 200);
    }
  return result;
}
export async function extractWithModel(
  message: string,
  state: Conversation,
  id: string,
): Promise<Extraction> {
  const key = process.env.OPENAI_API_KEY || process.env.OPEN_API_KEY;
  if (!key)
    throw new Error(
      "Conversation assistance is unavailable. You can keep editing your profile.",
    );
  await transaction(async (c) => {
    await c.query(
      "SELECT pg_advisory_xact_lock(hashtext('onboarding-ai-budget'))",
    );
    const {
      rows: [usage],
    } = await c.query(
      `SELECT coalesce(sum(reserved_usd) FILTER(WHERE created_at>date_trunc('day',now())),0)::float daily, coalesce(sum(reserved_usd),0)::float monthly FROM research_console.onboarding_usage WHERE created_at>date_trunc('month',now())`,
    );
    const daily = Number(process.env.SORP_ONBOARDING_DAILY_USD ?? 1),
      monthly = Number(process.env.SORP_ONBOARDING_MONTHLY_USD ?? 10);
    if (
      !Number.isFinite(daily) ||
      !Number.isFinite(monthly) ||
      usage.daily + 0.02 > Math.min(daily, 5) ||
      usage.monthly + 0.02 > Math.min(monthly, 50)
    )
      throw new Error(
        "Conversation assistance has reached its budget. Your editable form still works.",
      );
    await c.query(
      "INSERT INTO research_console.onboarding_usage(session_id) VALUES($1)",
      [id],
    );
  });
  return interpretWithModel(message, state);
}

export async function claimOperation(
  id: string,
  action: "search" | "transcription",
) {
  await transaction(async (c) => {
    await c.query(
      "SELECT pg_advisory_xact_lock(hashtext('onboarding-operation-budget'))",
    );
    const {
      rows: [usage],
    } = await c.query(
      `SELECT count(*) FILTER(WHERE created_at>now()-interval '1 hour')::int hourly,count(*)::int daily,count(*) FILTER(WHERE session_id=$2)::int personal FROM research_console.onboarding_operations WHERE action=$1 AND created_at>now()-interval '24 hours'`,
      [action, id],
    );
    if (
      usage.hourly >= 30 ||
      usage.daily >= 100 ||
      usage.personal >= (action === "search" ? 4 : 3)
    )
      throw new Error(
        "This service has reached its request limit. You can continue using the form.",
      );
    await c.query(
      "INSERT INTO research_console.onboarding_operations(session_id,action) VALUES($1,$2)",
      [id, action],
    );
  });
}
export async function boundedBody(request: Request, maximum: number) {
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  const parts: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maximum) {
        await reader.cancel();
        throw new Error("Request exceeds its size limit.");
      }
      parts.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const result = new Uint8Array(bytes);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.byteLength;
  }
  return result;
}
