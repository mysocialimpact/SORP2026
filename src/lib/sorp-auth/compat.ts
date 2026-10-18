import "server-only";
import { sorpAuth, sorpAuthPool } from "./auth";
import { independentIdentity } from "./identity";
import { openTeamResponse, removeTeamInvitation, saveTeamResponse, teamInvite,
  teamWorkspace, updateTeamRound } from "./team";
import { acceptOrganisationInvitation, adviserClient, adviserCreateClient, adviserInviteClientMember,
  adviserInviteMember, adviserLoadClientAssessment, adviserSaveClientAssessment,
  adviserWorkspace, createOwnOrganisation, decideClientAccess,
  previewOrganisationInvitation, readClientAssessment } from "./admin";
import { listReportReviews, prepareReportUpload } from "./report-review";

type Input = Record<string, unknown>;
const PRODUCTS = new Set(["social-impact-excellence", "charity-impact-reports"]);
const STATUSES = new Set(["not_started", "in_progress", "complete", "awaiting_payment", "paid", "in_review", "feedback_ready", "closed"]);

function json(data: unknown, status = 200, headers?: HeadersInit) {
  const output = new Headers(headers);
  output.set("cache-control", "private, no-store");
  return Response.json(data, { status, headers: output });
}

function error(message: string, status: number) { return json({ error: message }, status); }

function record(value: unknown): value is Input {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function accountPayload(identity: NonNullable<Awaited<ReturnType<typeof independentIdentity>>>) {
  return { account: identity.account, progress: identity.progress, platformAccess: identity.platformAccess };
}

async function callProvider(request: Request, path: string, body: Input) {
  const target = new URL(`/api/sorp-auth/${path}`, request.url);
  return sorpAuth().handler(new Request(target, {
    method: "POST", headers: request.headers, body: JSON.stringify(body),
  }));
}

function providerError(status: number) {
  if (status === 429) return error("Too many attempts. Please wait before trying again.", 429);
  if (status === 403) return error("Check your email verification before signing in.", 403);
  return error("The account details could not be verified.", status >= 500 ? 503 : 401);
}

function progressSummary(progress: Input) {
  const state = record(progress.state) ? progress.state : {};
  const currentStage = Math.min(7, Math.max(1, Number(state.currentStage) || 1));
  const completedStages = Array.isArray(state.completedStages)
    ? [...new Set(state.completedStages.filter((stage): stage is number => Number.isInteger(stage) && stage >= 1 && stage <= 7))]
    : [];
  return { currentStage, completedStages, organisation: typeof state.charityName === "string" ? state.charityName.trim().slice(0, 180) : "" };
}

async function saveProgress(userId: string, progress: unknown) {
  if (!record(progress)) return false;
  const encoded = JSON.stringify(progress);
  if (encoded.length > 1_500_000) return false;
  const summary = progressSummary(progress);
  await sorpAuthPool().query(`INSERT INTO sorp_auth.account_progress
    (user_id,progress,current_stage,completed_stages,last_saved_at)
    VALUES($1,$2::jsonb,$3,$4::jsonb,now()) ON CONFLICT(user_id) DO UPDATE SET
    progress=excluded.progress,current_stage=excluded.current_stage,
    completed_stages=excluded.completed_stages,last_saved_at=now(),updated_at=now()`,
  [userId, encoded, summary.currentStage, JSON.stringify(summary.completedStages)]);
  if (summary.organisation) await sorpAuthPool().query(`UPDATE sorp_auth.profile
    SET organisation_label=$2,updated_at=now() WHERE user_id=$1`, [userId, summary.organisation]);
  return true;
}

export async function independentAccountGET(request: Request) {
  if (new URL(request.url).searchParams.get("feature") === "password-reset") {
    return json({ available: true });
  }
  const identity = await independentIdentity(request.headers);
  return json(identity ? { signedIn: true, authProvider: "sorp", ...accountPayload(identity) } : { signedIn: false });
}

/** Preview of the current UI's basic account actions, without an old-service fallback. */
export async function independentAccountPOST(request: Request) {
  const url = new URL(request.url);
  const expected = `${request.headers.get("x-forwarded-proto") || url.protocol.slice(0, -1)}://${request.headers.get("host") || url.host}`;
  if (request.headers.get("origin") !== expected || request.headers.get("sec-fetch-site") === "cross-site") {
    return error("Please submit from this website.", 403);
  }
  if (!request.headers.get("content-type")?.startsWith("application/json")) return error("Send account details as JSON.", 415);
  const raw = await request.text();
  if (raw.length > 1_600_000) return error("The account request is too large.", 413);
  let input: Input;
  try { input = JSON.parse(raw) as Input; }
  catch { return error("The account request could not be read.", 400); }
  if (!record(input)) return error("Send account details as an object.", 400);
  const action = input.action;

  if (action === "request-reset") {
    if (typeof input.email !== "string") return error("Enter a valid email address.", 400);
    const response = await callProvider(request, "request-password-reset", { email: input.email.trim().toLowerCase() });
    if (!response.ok) return providerError(response.status);
    return json({ ok: true, message: "If this address has an account, check your inbox for a reset link." });
  }
  if (action === "reset-password") {
    if (typeof input.token !== "string" || typeof input.password !== "string") return error("The reset link or password is invalid.", 400);
    const response = await callProvider(request, "reset-password", { token: input.token, newPassword: input.password });
    if (!response.ok) return error("The reset link has expired or is invalid.", response.status === 429 ? 429 : 400);
    return json({ ok: true });
  }
  if (action === "login") {
    if (typeof input.email !== "string" || typeof input.password !== "string") return error("Enter your email and password.", 400);
    const response = await callProvider(request, "sign-in/email", { email: input.email.trim().toLowerCase(), password: input.password });
    if (!response.ok) return providerError(response.status);
    const cookie = response.headers.get("set-cookie");
    if (!cookie) return error("Additional account verification is required before sign-in.", 403);
    const headers = new Headers(request.headers);
    headers.set("cookie", [request.headers.get("cookie"), cookie.split(";")[0]].filter(Boolean).join("; "));
    const identity = await independentIdentity(headers);
    if (!identity) return error("Check your email verification before signing in.", 403);
    return json(accountPayload(identity), 200, { "set-cookie": cookie });
  }
  if (action === "signup") {
    if (typeof input.email !== "string" || typeof input.password !== "string" ||
        typeof input.name !== "string" || typeof input.position !== "string" || !record(input.progress)) {
      return error("Complete your account details and assessment before signing up.", 400);
    }
    const name = input.name.trim().slice(0, 120);
    const position = input.position.trim().slice(0, 120);
    if (name.length < 2 || position.length < 2) return error("Add your name and role.", 400);
    if (JSON.stringify(input.progress).length > 1_500_000) return error("The assessment is too large to save.", 413);
    const response = await callProvider(request, "sign-up/email", {
      email: input.email.trim().toLowerCase(), password: input.password, name,
    });
    if (!response.ok) return providerError(response.status);
    const created = await response.json() as { user?: { id?: string; email?: string } };
    if (!created.user?.id) return error("The account could not be prepared.", 503);
    const organisation = typeof input.organisation === "string" ? input.organisation.trim().slice(0, 180) : "";
    await sorpAuthPool().query(`INSERT INTO sorp_auth.profile(user_id,position,organisation_label)
      VALUES($1,$2,$3) ON CONFLICT(user_id) DO NOTHING`, [created.user.id, position, organisation]);
    if (!await saveProgress(created.user.id, input.progress)) return error("The assessment could not be saved.", 400);
    return json({ verificationRequired: true,
      account: { id: created.user.id, email: created.user.email, name, position } }, 202);
  }

  if (action === "invitation-preview") {
    try { return json(await previewOrganisationInvitation({ token: input.invitationToken || input.token })); }
    catch { return error("This invitation is invalid or unavailable.", 404); }
  }

  if (action === "team-response-open" || action === "team-response-save" || action === "team-response-submit") {
    try {
      return json(action === "team-response-open" ? await openTeamResponse(input)
        : await saveTeamResponse(input, action === "team-response-submit"));
    } catch { return error("The invitation or response is invalid or unavailable.", 400); }
  }

  const identity = await independentIdentity(request.headers);
  if (!identity) return error("Please sign in to your verified SORP account.", 401);
  if (action === "create-own-organisation") {
    try { return json(await createOwnOrganisation(identity.account.id, input), 201); }
    catch { return error("The organisation could not be created. Check its name and your existing workspaces.", 400); }
  }
  if (action === "list-report-reviews") return json(await listReportReviews(identity.account.id));
  if (action === "create-report-upload") {
    try { return json(await prepareReportUpload(request, identity.account.id, identity.progress, input), 201); }
    catch (cause) { const message = cause instanceof Error ? cause.message : "";
      return error(message.includes("storage limit") ? message :
        "Complete your readiness review, choose an available charity workspace and a valid PDF no larger than 15 MB.", 403); }
  }
  if (action === "invitation-accept") {
    try { return json(await acceptOrganisationInvitation(identity.account.id, identity.account.email,
      { token: input.invitationToken || input.token })); }
    catch { return error("The invitation is expired or belongs to another account.", 403); }
  }
  if (action === "client-access-decide") {
    try { return json(await decideClientAccess(identity.account.id, input)); }
    catch { return error("Only the linked charity owner or administrator can decide this request.", 403); }
  }
  if (action === "client-assessment-read") {
    try { return json(await readClientAssessment(identity.account.id, input)); }
    catch { return error("The adviser has no approved access to this assessment.", 403); }
  }
  if (action === "adviser-workspace" || action === "adviser-client") {
    try { return json(action === "adviser-workspace"
      ? await adviserWorkspace(identity.account.id, input) : await adviserClient(identity.account.id, input)); }
    catch { return error("This adviser workspace or client assessment is unavailable.", 403); }
  }
  if (action === "adviser-assessment-load" || action === "adviser-assessment-save") {
    try { return json(action === "adviser-assessment-load"
      ? await adviserLoadClientAssessment(identity.account.id, input)
      : await adviserSaveClientAssessment(identity.account.id, input)); }
    catch { return error("The adviser does not have approved permission to edit this client assessment.", 403); }
  }
  if (action === "adviser-client-invite") {
    try { return json(await adviserInviteClientMember(identity.account.id, input), 201); }
    catch { return error("The adviser does not have approved permission to invite people to this client.", 403); }
  }
  if (action === "adviser-invite" || action === "adviser-create-client") {
    try { return json(action === "adviser-invite"
      ? await adviserInviteMember(identity.account.id, input)
      : await adviserCreateClient(identity.account.id, input), 201); }
    catch { return error("Only an adviser owner or administrator can send this invitation.", 403); }
  }
  if (["team-workspace", "team-invite", "team-update-round", "team-remove-invite"].includes(String(action))) {
    try {
      if (action === "team-workspace") return json(await teamWorkspace(identity.account.id));
      if (action === "team-invite") return json(await teamInvite(identity.account.id, input));
      if (action === "team-update-round") return json(await updateTeamRound(identity.account.id, input));
      return json(await removeTeamInvitation(identity.account.id, input));
    } catch { return error("The team action is unavailable for this organisation.", 403); }
  }
  if (action === "logout") {
    const response = await callProvider(request, "sign-out", {});
    if (!response.ok) return providerError(response.status);
    return json({ signedOut: true }, 200, { "set-cookie": response.headers.get("set-cookie") || "" });
  }
  if (action === "update-profile") {
    if (typeof input.position !== "string" || typeof input.organisation !== "string") return error("Enter your role and organisation as text.", 400);
    const position = input.position.trim();
    const organisation = input.organisation.trim();
    if (position.length > 120 || organisation.length > 180) return error("Those account details are too long.", 400);
    await sorpAuthPool().query(`INSERT INTO sorp_auth.profile(user_id,position,organisation_label)
      VALUES($1,$2,$3) ON CONFLICT(user_id) DO UPDATE SET
      position=excluded.position,organisation_label=excluded.organisation_label,updated_at=now()`,
    [identity.account.id, position, organisation]);
    const updated = await independentIdentity(request.headers);
    return json({ account: updated?.account });
  }
  if (action === "save") {
    if (!await saveProgress(identity.account.id, input.progress)) return error("The saved assessment is invalid or too large.", 400);
    const updated = await independentIdentity(request.headers);
    return json({ account: updated!.account });
  }
  if (action === "load-product") {
    const productId = String(input.productId || "");
    if (!PRODUCTS.has(productId)) return error("Unknown platform product.", 400);
    const saved = await sorpAuthPool().query<{ status: string; data: unknown; created_at: Date; updated_at: Date }>(
      "SELECT status,data,created_at,updated_at FROM sorp_auth.product_progress WHERE user_id=$1 AND product_id=$2",
      [identity.account.id, productId]);
    const row = saved.rows[0];
    return json({ account: identity.account, productId,
      productProgress: row ? { status: row.status, data: row.data, createdAt: row.created_at.toISOString(),
        updatedAt: row.updated_at.toISOString() } : null });
  }
  if (action === "save-product") {
    const productId = String(input.productId || "");
    const status = String(input.status || "in_progress");
    if (!PRODUCTS.has(productId) || !STATUSES.has(status) || !record(input.data) || JSON.stringify(input.data).length > 750_000) {
      return error("The product progress is invalid.", 400);
    }
    const saved = await sorpAuthPool().query<{ status: string; data: unknown; created_at: Date; updated_at: Date }>(
      `INSERT INTO sorp_auth.product_progress(user_id,product_id,status,data)
       VALUES($1,$2,$3,$4::jsonb) ON CONFLICT(user_id,product_id) DO UPDATE SET
       status=excluded.status,data=excluded.data,updated_at=now()
       RETURNING status,data,created_at,updated_at`,
      [identity.account.id, productId, status, JSON.stringify(input.data)]);
    const row = saved.rows[0];
    return json({ productId, productProgress: { status: row.status, data: row.data,
      createdAt: row.created_at.toISOString(), updatedAt: row.updated_at.toISOString() } });
  }
  return error("This account action is not available in the independent preview.", 501);
}
