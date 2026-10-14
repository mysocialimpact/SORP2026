import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import { hashPassword } from "better-auth/crypto";
import { base32 } from "@better-auth/utils/base32";
import { createOTP } from "@better-auth/utils/otp";
import { Pool } from "pg";
import { sorpAuth } from "../src/lib/sorp-auth/auth";
import { independentIdentity } from "../src/lib/sorp-auth/identity";
import { prepareCustomer } from "../scripts/prepare-sorp-customer";
import { importTeam, validateTeamManifest } from "../scripts/import-sorp-team";
import { grantFounder } from "../scripts/grant-sorp-founder";
import { importAssessment, validateAssessmentExport } from "../scripts/import-sorp-assessment";
import { assessmentDigest } from "../src/lib/sorp-auth/digest";
import { independentAccountGET, independentAccountPOST } from "../src/lib/sorp-auth/compat";
import { teamWorkspace } from "../src/lib/sorp-auth/team";
import { founderForRequest, founderInviteMember, founderOverview,
  founderRequestClientAccess, founderRevokeMembership, founderSetPlan } from "../src/lib/sorp-auth/admin";
import { independentFounderGET, independentFounderPOST } from "../src/lib/sorp-auth/founder-console";

const url = process.env.SORP_AUTH_DATABASE_URL || "";
if (!/^postgres(?:ql)?:\/\/[^@]+@127\.0\.0\.1:55432\/sorp_test$/.test(url)) {
  throw new Error("Auth integration tests require the isolated local sorp_test database.");
}
const db = new Pool({ connectionString: url });
const auth = sorpAuth();
const founderId = randomUUID();
const adviserOrgId = randomUUID();
const customerId = randomUUID();
const exportUserId = randomUUID();
const customerOrgId = randomUUID();
const roundId = randomUUID();
const invitationId = randomUUID();
let signupId: string | undefined;
let createdOrgId: string | undefined;
let adviserClientOrgId: string | undefined;
const password = "correct-horse-battery-staple-2026";

before(async () => { await db.query('TRUNCATE sorp_auth."rateLimit"'); });

async function post(action: string, body: Record<string, unknown>, cookie = "", ip = "192.0.2.10") {
  return independentAccountPOST(new Request("http://localhost:3000/api/sorp-auth-compat", {
    method: "POST", headers: { "content-type": "application/json", origin: "http://localhost:3000",
      "x-forwarded-for": ip, ...(cookie ? { cookie } : {}) },
    body: JSON.stringify({ action, ...body }),
  }));
}

after(async () => {
  await db.query("DELETE FROM sorp_auth.team_response WHERE round_id=$1", [roundId]);
  await db.query("DELETE FROM sorp_auth.team_invitation WHERE round_id=$1", [roundId]);
  await db.query("DELETE FROM sorp_auth.team_round WHERE id=$1", [roundId]);
  await db.query("DELETE FROM sorp_auth.adviser_client_access WHERE adviser_organisation_id=$1", [adviserOrgId]);
  if (adviserClientOrgId) {
    await db.query("DELETE FROM sorp_auth.invitation WHERE organisation_id=$1", [adviserClientOrgId]);
    await db.query("DELETE FROM sorp_auth.membership WHERE organisation_id=$1", [adviserClientOrgId]);
    await db.query("DELETE FROM sorp_auth.entitlement WHERE organisation_id=$1", [adviserClientOrgId]);
    await db.query("DELETE FROM sorp_auth.organisation WHERE id=$1", [adviserClientOrgId]);
  }
  await db.query("DELETE FROM sorp_auth.membership WHERE organisation_id=$1", [customerOrgId]);
  await db.query("DELETE FROM sorp_auth.entitlement WHERE organisation_id=$1", [customerOrgId]);
  await db.query("DELETE FROM sorp_auth.organisation WHERE id=$1", [customerOrgId]);
  await db.query("DELETE FROM sorp_auth.founder_grant WHERE user_id=$1", [founderId]);
  await db.query("DELETE FROM sorp_auth.membership WHERE user_id=$1", [founderId]);
  await db.query("DELETE FROM sorp_auth.invitation WHERE organisation_id=$1", [adviserOrgId]);
  await db.query("DELETE FROM sorp_auth.entitlement WHERE organisation_id=$1", [adviserOrgId]);
  await db.query("DELETE FROM sorp_auth.organisation WHERE id=$1", [adviserOrgId]);
  if (createdOrgId) {
    await db.query("DELETE FROM sorp_auth.membership WHERE organisation_id=$1", [createdOrgId]);
    await db.query("DELETE FROM sorp_auth.invitation WHERE organisation_id=$1", [createdOrgId]);
    await db.query("DELETE FROM sorp_auth.entitlement WHERE organisation_id=$1", [createdOrgId]);
    await db.query("DELETE FROM sorp_auth.organisation WHERE id=$1", [createdOrgId]);
  }
  await db.query('DELETE FROM sorp_auth."user" WHERE id=$1', [founderId]);
  await db.query('DELETE FROM sorp_auth."user" WHERE id=$1', [customerId]);
  await db.query("DELETE FROM sorp_auth.account_import WHERE user_id=$1", [exportUserId]);
  await db.query('DELETE FROM sorp_auth."user" WHERE id=$1', [exportUserId]);
  if (signupId) await db.query('DELETE FROM sorp_auth."user" WHERE id=$1', [signupId]);
  await db.end();
});

test("registration requires email verification before an independent session", async () => {
  const email = `signup-${randomUUID()}@example.invalid`;
  const previousFetch = globalThis.fetch;
  let verificationLink = "";
  globalThis.fetch = async (input, init) => {
    assert.equal(String(input), "https://api.resend.com/emails");
    verificationLink = (JSON.parse(String(init?.body)) as { text: string }).text.match(/https?:\/\/\S+/)?.[0] || "";
    return Response.json({ id: "synthetic-message" });
  };
  try {
    const signup = await post("signup", { name: "Synthetic user", position: "Trustee", email,
      password, progress: { started: true, state: { currentStage: 2 } } }, "", "192.0.2.12");
    assert.equal(signup.status, 202, await signup.clone().text());
    const result = await signup.json() as { account: { id: string }; verificationRequired: boolean };
    signupId = result.account.id;
    assert.equal(result.verificationRequired, true);
    assert.equal(signup.headers.get("set-cookie"), null);
    assert.ok(verificationLink);
    assert.notEqual((await post("login", { email, password }, "", "192.0.2.12")).status, 200,
      "unverified email cannot issue an independent session");
    const verified = await auth.handler(new Request(verificationLink, { headers: { "x-forwarded-for": "192.0.2.12" } }));
    assert.ok([200, 302].includes(verified.status));
    const login = await post("login", { email, password }, "", "192.0.2.12");
    assert.equal(login.status, 200, await login.clone().text());
    const loggedIn = await login.json() as { account?: { id: string }; progress?: { started?: boolean } };
    assert.equal(loggedIn.account?.id, signupId);
    assert.equal(loggedIn.progress?.started, true);
  } finally { globalThis.fetch = previousFetch; }
});

test("a complete customer assessment imports by verified original ID without overwriting newer work", async () => {
  const email = `synthetic-${exportUserId}@brainstrust.org.uk`;
  await db.query('INSERT INTO sorp_auth."user" (id,name,email,"emailVerified") VALUES($1,$2,$3,false)',
    [exportUserId, "Synthetic export owner", email]);
  const progress = { started: true, state: { currentStage: 5, completedStages: [1, 2, 3, 4] },
    answers: { purpose: "synthetic assessment answer", activity: "synthetic detail" } };
  const data = validateAssessmentExport({ schemaVersion: 1, source: "legacy-sorp-session",
    account: { id: exportUserId, email }, lastSavedAt: "2026-10-14T10:00:00.000Z",
    progress, sha256: assessmentDigest(progress) });
  await assert.rejects(importAssessment(data, url), /verified mailbox/);
  await db.query('UPDATE sorp_auth."user" SET "emailVerified"=true WHERE id=$1', [exportUserId]);
  assert.equal(await importAssessment(data, url), "imported");
  assert.equal(await importAssessment(data, url), "already_imported");
  const saved = await db.query("SELECT progress,current_stage,last_saved_at FROM sorp_auth.account_progress WHERE user_id=$1",
    [exportUserId]);
  assert.deepEqual(saved.rows[0].progress, progress);
  assert.equal(saved.rows[0].current_stage, 5);
  assert.equal(saved.rows[0].last_saved_at.toISOString(), data.lastSavedAt);
  await assert.rejects(importAssessment({ ...data, progress: { changed: true },
    sha256: assessmentDigest({ changed: true }) }, url), /do not overwrite newer work/);
  assert.throws(() => validateAssessmentExport({ ...data, sha256: "0".repeat(64) }), /digest check/);
});

test("a customer claims the original ID with a new password and keeps the linked team response", async () => {
  const email = `customer-${customerId}@example.invalid`;
  assert.equal(await prepareCustomer({ id: customerId, email, name: "Synthetic customer" }, url), "prepared");
  assert.equal(await prepareCustomer({ id: customerId, email, name: "Synthetic customer" }, url), "already_prepared");
  const previousFetch = globalThis.fetch;
  const links: string[] = [];
  globalThis.fetch = async (input, init) => {
    assert.equal(String(input), "https://api.resend.com/emails");
    const link = (JSON.parse(String(init?.body)) as { text: string }).text.match(/https?:\/\/\S+/)?.[0];
    if (!link) throw new Error("The synthetic auth email has no link.");
    links.push(link);
    return Response.json({ id: "synthetic-message" });
  };
  try {
    const verification = await auth.handler(new Request("http://localhost:3000/api/sorp-auth/send-verification-email", {
      method: "POST", headers: { "content-type": "application/json", origin: "http://localhost:3000", "x-forwarded-for": "192.0.2.11" },
      body: JSON.stringify({ email }),
    }));
    assert.equal(verification.status, 200);
    assert.ok([200, 302].includes((await auth.handler(new Request(links.at(-1)!, { headers: { "x-forwarded-for": "192.0.2.11" } }))).status));
    const resetRequest = await post("request-reset", { email }, "", "192.0.2.11");
    assert.equal(resetRequest.status, 200);
    const token = new URLSearchParams(new URL(links.at(-1)!).hash.slice(1)).get("token");
    assert.ok(token);
    const reset = await auth.handler(new Request("http://localhost:3000/api/sorp-auth/reset-password", {
      method: "POST", headers: { "content-type": "application/json", origin: "http://localhost:3000", "x-forwarded-for": "192.0.2.11" },
      body: JSON.stringify({ token, newPassword: password }),
    }));
    assert.equal(reset.status, 200);
    const login = await post("login", { email, password }, "", "192.0.2.11");
    assert.equal(login.status, 200, await login.clone().text());
    assert.equal((await login.json() as { account: { id: string } }).account.id, customerId);
    const cookie = login.headers.get("set-cookie")?.split(";")[0];
    assert.ok(cookie);
    const now = "2026-10-14T09:37:22.704Z";
    const manifest = validateTeamManifest({
      account: { id: customerId, email },
      organisation: { id: customerOrgId, name: "Synthetic charity", programme: "team", seat_limit: 15,
        entitlement_source: "legacy", created_at: now, updated_at: now },
      membership: { id: randomUUID(), organisation_id: customerOrgId, account_id: customerId,
        role: "owner", created_at: now, updated_at: now },
      round: { id: roundId, organisation_id: customerOrgId, created_by_account_id: customerId,
        title: "Synthetic round", response_mode: "confidential", status: "open", created_at: now, updated_at: now, closed_at: null },
      invitation: { id: invitationId, round_id: roundId, email, name: "Synthetic participant",
        token_hash: "a".repeat(64), status: "completed", invited_at: now, started_at: now,
        completed_at: now, revoked_at: null, updated_at: now },
      response: { id: randomUUID(), round_id: roundId, invitation_id: invitationId,
        answers: JSON.stringify(Array(25).fill(3)), current_index: 24, overall: 3,
        pillar_scores: JSON.stringify(Array(5).fill(3)), maturity: "Developing",
        started_at: now, updated_at: now, completed_at: now },
    });
    await importTeam(manifest, url);
    const workspace = await teamWorkspace(customerId);
    assert.equal(workspace.organisation.id, customerOrgId);
    assert.equal(workspace.aggregate.completed, 1);
    assert.equal(workspace.aggregate.available, false);
    assert.equal("result" in workspace.invitations[0], false, "confidential individual scores stay hidden");
    await assert.rejects(teamWorkspace(signupId!), /Exactly one active charity team membership/);
    const invite = await post("team-invite", { email: `participant-${randomUUID()}@example.invalid`, name: "Synthetic participant" }, cookie);
    assert.equal(invite.status, 200);
    const invitationToken = (await invite.json() as { invitation: { invitationToken: string } }).invitation.invitationToken;
    const opened = await post("team-response-open", { invitationToken });
    assert.equal(opened.status, 200);
    assert.equal((await opened.json() as { response: { completed: boolean } }).response.completed, false);
    const saved = await post("team-response-save", { invitationToken, answers: Array(25).fill(4), currentIndex: 24 });
    assert.equal(saved.status, 200);
    assert.equal((await post("team-update-round", { responseMode: "named" }, cookie)).status, 403,
      "privacy cannot be changed after an invited participant starts");
    const submitted = await post("team-response-submit", { invitationToken, answers: Array(25).fill(4), currentIndex: 24 });
    assert.equal(submitted.status, 200);
    assert.equal((await teamWorkspace(customerId)).aggregate.completed, 2);
    const thirdInvite = await post("team-invite", { email: `third-${randomUUID()}@example.invalid` }, cookie);
    assert.equal(thirdInvite.status, 200);
    const thirdToken = (await thirdInvite.json() as { invitation: { invitationToken: string } }).invitation.invitationToken;
    assert.equal((await post("team-response-submit", { invitationToken: thirdToken,
      answers: Array(25).fill(5), currentIndex: 24 })).status, 200);
    const aggregate = await teamWorkspace(customerId);
    assert.equal(aggregate.aggregate.completed, 3);
    assert.equal(aggregate.aggregate.available, true);
    assert.equal("overall" in aggregate.aggregate ? aggregate.aggregate.overall : undefined, 4);
    assert.equal(aggregate.invitations.every(row => !("result" in row)), true,
      "individual confidential scores stay hidden even after the aggregate threshold");
    const revokedInvite = await post("team-invite", { email: `revoked-${randomUUID()}@example.invalid` }, cookie);
    const revokedInviteData = await revokedInvite.json() as { invitation: { invitationToken: string } };
    const revokedToken = revokedInviteData.invitation.invitationToken;
    const revokedHash = createHash("sha256").update(revokedToken).digest("hex");
    const revokedId = (await db.query("SELECT id FROM sorp_auth.team_invitation WHERE token_hash=$1", [revokedHash])).rows[0].id;
    assert.equal((await post("team-remove-invite", { invitationId: revokedId }, cookie)).status, 200);
    assert.equal((await post("team-response-open", { invitationToken: revokedToken })).status, 400);
    const preserved = await db.query("SELECT answers FROM sorp_auth.team_response WHERE invitation_id=$1", [invitationId]);
    assert.deepEqual(preserved.rows[0].answers, Array(25).fill(3));
    await db.query("UPDATE sorp_auth.team_invitation SET expires_at=now()-interval '1 second' WHERE token_hash=$1",
      [createHash("sha256").update(invitationToken).digest("hex")]);
    assert.equal((await post("team-response-open", { invitationToken })).status, 400,
      "expired team links cannot disclose a completed response");
  } finally { globalThis.fetch = previousFetch; }
});

test("founder access needs verified MFA and a new session, and revocation is immediate", async () => {
  const email = `founder-${founderId}@example.invalid`;
  await db.query('INSERT INTO sorp_auth."user" (id,name,email,"emailVerified","twoFactorEnabled") VALUES ($1,$2,$3,true,false)',
    [founderId, "Synthetic founder", email]);
  await db.query('INSERT INTO sorp_auth."account" (id,"accountId","providerId","userId",password,"updatedAt") VALUES ($1,$2,$3,$4,$5,now())',
    [randomUUID(), founderId, "credential", founderId, await hashPassword(password)]);
  const signIn = await post("login", { email, password });
  assert.equal(signIn.status, 200, await signIn.clone().text());
  const cookie = signIn.headers.get("set-cookie")?.split(";")[0];
  assert.ok(cookie?.startsWith("better-auth.session_token="));
  if (!cookie) throw new Error("SORP sign-in did not issue a session cookie.");
  const session = await auth.handler(new Request("http://localhost:3000/api/sorp-auth/get-session", {
    headers: { cookie, "x-forwarded-for": "192.0.2.10" },
  }));
  assert.equal((await session.json() as { user?: { id?: string } }).user?.id, founderId);
  assert.equal((await independentAccountGET(new Request("http://localhost:3000/api/sorp-auth-compat", { headers: { cookie } }))).status, 200);
  const savedProduct = await post("save-product", { productId: "social-impact-excellence", status: "in_progress",
    data: { synthetic: true } }, cookie);
  assert.equal(savedProduct.status, 200);
  const loadedProduct = await post("load-product", { productId: "social-impact-excellence" }, cookie);
  assert.deepEqual((await loadedProduct.json() as { productProgress?: { data?: unknown } }).productProgress?.data, { synthetic: true });
  await db.query("INSERT INTO sorp_auth.organisation(id,name,type) VALUES ($1,'Synthetic adviser','Adviser')", [adviserOrgId]);
  await db.query("INSERT INTO sorp_auth.entitlement(organisation_id,plan) VALUES ($1,'Adviser')", [adviserOrgId]);
  await db.query("INSERT INTO sorp_auth.membership(organisation_id,user_id,role) VALUES ($1,$2,'owner')", [adviserOrgId, founderId]);
  await assert.rejects(db.query("INSERT INTO sorp_auth.founder_grant(user_id,granted_at,grant_reason) VALUES ($1,now(),'synthetic test')", [founderId]), /verified second factor/);
  const bootstrap = { userId: founderId, email, operator: "Synthetic operator",
    reason: "Isolated integration verification", databaseUrl: url };
  await assert.rejects(grantFounder({ ...bootstrap, apply: false }), /verified email and TOTP/);
  assert.equal((await independentIdentity(new Headers({ cookie })))?.platformAccess.founder, false);
  const enabled = await auth.handler(new Request("http://localhost:3000/api/sorp-auth/two-factor/enable", {
    method: "POST", headers: { cookie, origin: "http://localhost:3000", "content-type": "application/json", "x-forwarded-for": "192.0.2.10" },
    body: JSON.stringify({ password, method: "totp" }),
  }));
  assert.equal(enabled.status, 200, await enabled.clone().text());
  const setup = await enabled.json() as { totpURI?: string };
  assert.ok(setup.totpURI);
  const encodedSecret = new URL(setup.totpURI).searchParams.get("secret");
  assert.ok(encodedSecret);
  const totp = createOTP(new TextDecoder().decode(base32.decode(encodedSecret)));
  const setupVerification = await auth.handler(new Request("http://localhost:3000/api/sorp-auth/two-factor/verify-totp", {
    method: "POST", headers: { cookie, origin: "http://localhost:3000", "content-type": "application/json", "x-forwarded-for": "192.0.2.10" },
    body: JSON.stringify({ code: await totp.totp() }),
  }));
  assert.equal(setupVerification.status, 200, await setupVerification.clone().text());
  const mfaCookie = setupVerification.headers.get("set-cookie")?.split(";")[0] || cookie;
  assert.equal(await grantFounder({ ...bootstrap, apply: false }), "ready");
  assert.equal((await db.query("SELECT count(*)::int n FROM sorp_auth.founder_grant WHERE user_id=$1", [founderId])).rows[0].n, 0);
  assert.equal(await grantFounder({ ...bootstrap, apply: true }), "granted");
  await assert.rejects(grantFounder({ ...bootstrap, apply: true }), /already has an active founder grant/);
  assert.equal((await independentIdentity(new Headers({ cookie: mfaCookie })))?.platformAccess.founder, false);
  await post("logout", {}, mfaCookie);
  const challenged = await auth.handler(new Request("http://localhost:3000/api/sorp-auth/sign-in/email", {
    method: "POST", headers: { origin: "http://localhost:3000", "content-type": "application/json", "x-forwarded-for": "192.0.2.10" },
    body: JSON.stringify({ email, password }),
  }));
  assert.equal(challenged.status, 200, await challenged.clone().text());
  assert.equal((await challenged.clone().json() as { twoFactorRedirect?: boolean }).twoFactorRedirect, true);
  const challengeCookie = challenged.headers.getSetCookie().map(value => value.split(";")[0])
    .find(value => value.startsWith("better-auth.two_factor="));
  assert.ok(challengeCookie, "sign-in must issue a second-factor challenge cookie");
  const verified = await auth.handler(new Request("http://localhost:3000/api/sorp-auth/two-factor/verify-totp", {
    method: "POST", headers: { cookie: challengeCookie, origin: "http://localhost:3000", "content-type": "application/json", "x-forwarded-for": "192.0.2.10" },
    body: JSON.stringify({ code: await totp.totp() }),
  }));
  assert.equal(verified.status, 200, await verified.clone().text());
  const founderCookie = verified.headers.get("set-cookie")?.split(";")[0];
  assert.ok(founderCookie);
  assert.equal((await independentIdentity(new Headers({ cookie: founderCookie })))?.platformAccess.founder, true);
  assert.equal((await founderForRequest(new Headers({ cookie: founderCookie }))).status, 200);
  const founderDashboard = await independentFounderGET({ email, name: "Synthetic founder" },
    "dashboard", undefined, new URL("http://localhost:3000/api/founder/dashboard"));
  assert.equal(founderDashboard?.status, 200);
  assert.equal((await founderDashboard?.json() as { metrics: { source: string } }).metrics.source,
    "Independent SORP account and permission records.");
  const createdResponse = await independentFounderPOST({ id: founderId }, "organisations", undefined,
    undefined, { name: "Synthetic new charity", type: "Charity" });
  assert.equal(createdResponse?.status, 201);
  const created = await createdResponse!.json() as { id: string };
  createdOrgId = created.id;
  assert.equal((await founderOverview()).organisations.some((row: { id?: string }) => row.id === createdOrgId), true);
  const plan = await founderSetPlan(founderId, { organisationId: adviserOrgId, plan: "Adviser",
    complimentary: true, reason: "Synthetic partner verification" });
  assert.equal(plan.status, "complimentary_partner");
  assert.equal(plan.payable_price_pence, 0);
  assert.equal(plan.complimentary_reason, "Synthetic partner verification");
  const detail = await independentFounderGET({ email }, "organisation", createdOrgId,
    new URL(`http://localhost:3000/api/founder/organisation/${createdOrgId}`));
  assert.equal((await detail?.json() as { organisation: { id: string } }).organisation.id, createdOrgId);
  const freePlan = await independentFounderPOST({ id: founderId }, "organisation", createdOrgId,
    "plan", { plan: "Plus", complimentary: true, duration: "30", reason: "Synthetic partner trial" });
  assert.equal(freePlan?.status, 200);
  assert.equal((await freePlan?.json() as { complimentary_reason: string }).complimentary_reason,
    "Synthetic partner trial");
  const access = await founderRequestClientAccess(founderId, { adviserOrganisationId: adviserOrgId,
    charityOrganisationId: customerOrgId, permissions: { progress: true, answers: false } });
  assert.equal(access.status, "requested");
  await assert.rejects(founderRequestClientAccess(founderId, { adviserOrganisationId: adviserOrgId,
    charityOrganisationId: customerOrgId,
    permissions: { progress: true, answers: true, edit: true } }), /not enabled/);
  assert.equal((await post("client-assessment-read", { adviserOrganisationId: adviserOrgId,
    charityOrganisationId: customerOrgId, view: "progress" }, founderCookie)).status, 403,
  "an unapproved adviser grant cannot read customer work");
  assert.equal((await post("client-access-decide", { accessId: access.id, decision: "approve" }, founderCookie)).status, 403,
    "an adviser cannot approve access to its client charity");
  const customerEmail = `customer-${customerId}@example.invalid`;
  const customerLogin = await post("login", { email: customerEmail, password }, "", "192.0.2.13");
  assert.equal(customerLogin.status, 200);
  const customerCookie = customerLogin.headers.get("set-cookie")?.split(";")[0];
  assert.ok(customerCookie);
  assert.equal((await independentIdentity(new Headers({ cookie: customerCookie })))?.platformAccess.founder, false,
    "a charity owner cannot acquire founder permission");
  assert.equal((await post("save", { progress: { state: { currentStage: 4 }, confidentialAnswer: "synthetic" } },
    customerCookie)).status, 200);
  const approved = await post("client-access-decide", { accessId: access.id, decision: "approve" }, customerCookie);
  assert.equal(approved.status, 200, await approved.clone().text());
  assert.equal((await db.query("SELECT status FROM sorp_auth.adviser_client_access WHERE id=$1", [access.id])).rows[0].status, "active");
  const clientProgress = await post("client-assessment-read", { adviserOrganisationId: adviserOrgId,
    charityOrganisationId: customerOrgId, view: "progress" }, founderCookie);
  assert.equal(clientProgress.status, 200);
  const listed = await clientProgress.json() as { assessments: Array<{ currentStage: number; progress?: unknown }> };
  assert.equal(listed.assessments[0].currentStage, 4);
  assert.equal("progress" in listed.assessments[0], false, "progress scope cannot disclose raw answers");
  assert.equal((await post("client-assessment-read", { adviserOrganisationId: adviserOrgId,
    charityOrganisationId: customerOrgId, view: "answers" }, founderCookie)).status, 403);
  assert.equal((await post("client-assessment-read", { adviserOrganisationId: adviserOrgId,
    charityOrganisationId: createdOrgId, view: "progress" }, founderCookie)).status, 403,
  "approval for one charity cannot be used to read another");
  const adviserPage = await post("adviser-workspace", { adviserOrganisationId: adviserOrgId }, founderCookie);
  assert.equal(adviserPage.status, 200);
  assert.equal((await adviserPage.json() as { clients: Array<{ organisationId: string }> }).clients[0].organisationId,
    customerOrgId);
  const clientPage = await post("adviser-client", { adviserOrganisationId: adviserOrgId,
    charityOrganisationId: customerOrgId }, founderCookie);
  assert.equal(clientPage.status, 200);
  assert.equal((await clientPage.json() as { assessments: Array<{ accountId: string }> }).assessments[0].accountId,
    customerId);
  const previousFetch = globalThis.fetch;
  const invitationLinks: string[] = [];
  globalThis.fetch = async (input, init) => {
    assert.equal(String(input), "https://api.resend.com/emails");
    const link = (JSON.parse(String(init?.body)) as { text: string }).text.match(/https?:\/\/\S+/)?.[0];
    if (!link) throw new Error("The synthetic invitation has no link.");
    invitationLinks.push(link);
    return Response.json({ id: "synthetic-message" });
  };
  try {
    const expired = await founderInviteMember(founderId, { organisationId: createdOrgId, email: customerEmail, role: "member" });
    await db.query("UPDATE sorp_auth.invitation SET expires_at=now()-interval '1 second' WHERE id=$1", [expired.id]);
    const expiredToken = new URL(invitationLinks.at(-1)!).pathname.split("/").filter(Boolean).at(-1);
    assert.equal((await post("invitation-accept", { invitationToken: expiredToken }, customerCookie)).status, 403);
    const invited = await founderInviteMember(founderId, { organisationId: createdOrgId, email: customerEmail, role: "member" });
    assert.equal(invited.sent, true);
    const token = new URL(invitationLinks.at(-1)!).pathname.split("/").filter(Boolean).at(-1);
    assert.equal((await post("invitation-accept", { invitationToken: token }, founderCookie)).status, 403,
      "a different verified email cannot take the invitation");
    assert.equal((await post("invitation-accept", { invitationToken: token }, customerCookie)).status, 200);
    assert.equal((await post("invitation-accept", { invitationToken: token }, customerCookie)).status, 403,
      "an invitation can be accepted only once");
    await founderRevokeMembership(founderId, { organisationId: createdOrgId, userId: customerId });
    assert.equal((await independentIdentity(new Headers({ cookie: customerCookie })))?.platformAccess.memberships.some(
      membership => membership.organisationId === createdOrgId), false);
    assert.equal((await post("adviser-create-client", { adviserOrganisationId: adviserOrgId,
      name: "Unauthorised charity", email: customerEmail,
      permissions: { progress: true, answers: true } }, customerCookie)).status, 403);
    const newClient = await post("adviser-create-client", { adviserOrganisationId: adviserOrgId,
      name: "Synthetic invited charity", email: customerEmail,
      permissions: { progress: true, answers: true, edit: false, invitations: false } }, founderCookie);
    assert.equal(newClient.status, 201, await newClient.clone().text());
    const clientSetup = await newClient.json() as { organisationId: string; accessId: string };
    adviserClientOrgId = clientSetup.organisationId;
    assert.equal((await post("adviser-client", { adviserOrganisationId: adviserOrgId,
      charityOrganisationId: adviserClientOrgId }, founderCookie)).status, 403,
    "sending an owner invitation cannot approve adviser access");
    const newOwnerToken = new URL(invitationLinks.at(-1)!).pathname.split("/").filter(Boolean).at(-1);
    assert.equal((await post("invitation-accept", { invitationToken: newOwnerToken }, customerCookie)).status, 200);
    assert.equal((await post("adviser-client", { adviserOrganisationId: adviserOrgId,
      charityOrganisationId: adviserClientOrgId }, founderCookie)).status, 403,
    "joining the charity still cannot approve adviser access implicitly");
    assert.equal((await post("client-access-decide", { accessId: clientSetup.accessId,
      decision: "approve" }, customerCookie)).status, 200);
    const delegated = await post("adviser-client", { adviserOrganisationId: adviserOrgId,
      charityOrganisationId: adviserClientOrgId }, founderCookie);
    assert.equal(delegated.status, 200);
    assert.equal((await delegated.json() as { assessments: Array<{ progress?: { confidentialAnswer?: string } }> })
      .assessments[0].progress?.confidentialAnswer, "synthetic");
    const colleague = await post("adviser-invite", { adviserOrganisationId: adviserOrgId,
      email: `colleague-${randomUUID()}@example.invalid`, role: "member" }, founderCookie);
    assert.equal(colleague.status, 201);
    assert.equal((await post("adviser-invite", { adviserOrganisationId: adviserOrgId,
      email: `colleague-${randomUUID()}@example.invalid`, role: "admin" }, customerCookie)).status, 403);
    assert.equal((await post("client-access-decide", { accessId: clientSetup.accessId,
      decision: "deny" }, customerCookie)).status, 200);
    assert.equal((await post("adviser-client", { adviserOrganisationId: adviserOrgId,
      charityOrganisationId: adviserClientOrgId }, founderCookie)).status, 403);
  } finally { globalThis.fetch = previousFetch; }
  assert.equal((await post("client-access-decide", { accessId: access.id, decision: "deny" }, customerCookie)).status, 200);
  assert.equal((await post("adviser-client", { adviserOrganisationId: adviserOrgId,
    charityOrganisationId: customerOrgId }, founderCookie)).status, 403,
  "charity revocation denies client assessment reads immediately");
  await founderRevokeMembership(founderId, { organisationId: adviserOrgId, userId: founderId });
  assert.equal((await post("client-assessment-read", { adviserOrganisationId: adviserOrgId,
    charityOrganisationId: customerOrgId, view: "progress" }, founderCookie)).status, 403,
  "revoked adviser membership denies reads immediately");
  await db.query("UPDATE sorp_auth.founder_grant SET revoked_at=now() WHERE user_id=$1", [founderId]);
  const revoked = await independentIdentity(new Headers({ cookie: founderCookie }));
  assert.equal(revoked?.platformAccess.memberships.length, 0);
  assert.equal(revoked?.platformAccess.founder, false);
  const signOut = await post("logout", {}, founderCookie);
  assert.equal(signOut.status, 200);
  assert.equal((await db.query('SELECT count(*)::int n FROM sorp_auth."session" WHERE "userId"=$1', [founderId])).rows[0].n, 0);
});
