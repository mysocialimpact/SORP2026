import "server-only";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { sorpAuthPool } from "./auth";
import { independentIdentity } from "./identity";
import { sendSorpInvitationEmail } from "./email";

type Input = Record<string, unknown>;
const PRICES: Record<string, number> = { Free: 0, Plus: 2900, Adviser: 9900, Enterprise: 0 };

export async function founderForRequest(headers: Headers) {
  const identity = await independentIdentity(headers);
  if (!identity) return { identity: null, status: 401 } as const;
  if (!identity.platformAccess.founder) return { identity: null, status: 403 } as const;
  return { identity, status: 200 } as const;
}

export async function founderOverview() {
  const db = sorpAuthPool();
  const [organisations, users, invitations, access] = await Promise.all([
    db.query(`SELECT o.id,o.name,o.type,o.programme,o.seat_limit,o.entitlement_source,
      e.plan,e.published_price_pence,e.payable_price_pence,e.status entitlement_status,
      e.complimentary_end,count(m.id) FILTER (WHERE m.status='active')::int active_members
      FROM sorp_auth.organisation o LEFT JOIN sorp_auth.entitlement e ON e.organisation_id=o.id
      LEFT JOIN sorp_auth.membership m ON m.organisation_id=o.id GROUP BY o.id,e.organisation_id ORDER BY o.name LIMIT 500`),
    db.query('SELECT count(*)::int count FROM sorp_auth."user"'),
    db.query("SELECT count(*)::int count FROM sorp_auth.invitation WHERE status='pending' AND expires_at>now()"),
    db.query("SELECT count(*)::int count FROM sorp_auth.adviser_client_access WHERE status='requested'"),
  ]);
  return { organisations: organisations.rows, metrics: { organisations: organisations.rows.length,
    registeredUsers: users.rows[0]?.count || 0, pendingInvitations: invitations.rows[0]?.count || 0,
    pendingClientAccess: access.rows[0]?.count || 0 } };
}

export async function founderCreateOrganisation(actorId: string, input: Input) {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const type = input.type;
  const programme = input.programme || "snapshot";
  const seatLimit = Number(input.seatLimit ?? (programme === "team" ? 15 : 1));
  if (name.length < 2 || name.length > 200 || !["Charity", "Adviser", "Other"].includes(String(type)) ||
      !["snapshot", "team", "excellence"].includes(String(programme)) ||
      !Number.isInteger(seatLimit) || seatLimit < 1 || seatLimit > 100 ||
      (type !== "Charity" && programme !== "snapshot")) {
    throw new Error("The organisation details are invalid.");
  }
  const id = randomUUID();
  const client = await sorpAuthPool().connect();
  try {
    await client.query("BEGIN");
    await client.query(`INSERT INTO sorp_auth.organisation(id,name,type,programme,seat_limit)
      VALUES($1,$2,$3,$4,$5)`, [id, name, type, programme, seatLimit]);
    await client.query("INSERT INTO sorp_auth.entitlement(organisation_id) VALUES($1)", [id]);
    await client.query(`INSERT INTO sorp_auth.audit_event(actor_user_id,action,target_type,target_id)
      VALUES($1,'organisation_created','organisation',$2)`, [actorId, id]);
    await client.query("COMMIT");
    return { id, name, type, programme, seatLimit, plan: "Free" };
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
}

export async function founderSetPlan(actorId: string, input: Input) {
  const organisationId = String(input.organisationId || "");
  const plan = String(input.plan || "");
  const complimentary = input.complimentary === true;
  const reason = complimentary ? String(input.reason || "Complimentary Partner").trim().slice(0, 500) : null;
  const end = input.complimentaryEnd === null || input.complimentaryEnd === undefined
    ? null : new Date(String(input.complimentaryEnd));
  if (!Object.hasOwn(PRICES, plan) || !organisationId || (end && (Number.isNaN(end.getTime()) || end.getTime() <= Date.now()))) {
    throw new Error("The plan or complimentary expiry is invalid.");
  }
  const client = await sorpAuthPool().connect();
  try {
    await client.query("BEGIN");
    const updated = await client.query(`INSERT INTO sorp_auth.entitlement
      (organisation_id,plan,published_price_pence,payable_price_pence,status,
       complimentary_start,complimentary_end,complimentary_reason)
      VALUES($1,$2,$3,$4,$5,CASE WHEN $5='complimentary_partner' THEN now() ELSE NULL END,$6,$7)
      ON CONFLICT(organisation_id) DO UPDATE SET plan=excluded.plan,
      published_price_pence=excluded.published_price_pence,payable_price_pence=excluded.payable_price_pence,
      status=excluded.status,
      complimentary_start=CASE WHEN excluded.status='complimentary_partner'
        THEN coalesce(sorp_auth.entitlement.complimentary_start,now()) ELSE NULL END,
      complimentary_end=excluded.complimentary_end,
      complimentary_reason=excluded.complimentary_reason,updated_at=now()
      RETURNING *`, [organisationId, plan, PRICES[plan], complimentary ? 0 : PRICES[plan],
      complimentary ? "complimentary_partner" : "standard", complimentary ? end : null, reason]);
    await client.query(`INSERT INTO sorp_auth.audit_event(actor_user_id,action,target_type,target_id,metadata)
      VALUES($1,'plan_changed','organisation',$2,$3::jsonb)`,
    [actorId, organisationId, JSON.stringify({ plan, complimentary, reason })]);
    await client.query("COMMIT");
    return updated.rows[0];
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
}

export async function founderRevokeMembership(actorId: string, input: Input) {
  const organisationId = String(input.organisationId || "");
  const userId = String(input.userId || "");
  const client = await sorpAuthPool().connect();
  try {
    await client.query("BEGIN");
    const revoked = await client.query(`UPDATE sorp_auth.membership SET status='revoked',updated_at=now()
      WHERE organisation_id=$1 AND user_id=$2 AND status='active' RETURNING id`, [organisationId, userId]);
    if (!revoked.rowCount) throw new Error("No active membership matched.");
    await client.query(`INSERT INTO sorp_auth.audit_event(actor_user_id,action,target_type,target_id)
      VALUES($1,'membership_revoked','organisation',$2)`, [actorId, organisationId]);
    await client.query("COMMIT");
    return { revoked: true };
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
}

export async function founderInviteMember(actorId: string, input: Input) {
  const organisationId = String(input.organisationId || "");
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const role = String(input.role || "member");
  if (!organisationId || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 ||
      !["owner", "admin", "member"].includes(role)) throw new Error("The invitation details are invalid.");
  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const id = randomUUID();
  const existing = await sorpAuthPool().query(`SELECT 1 FROM sorp_auth.membership m
    JOIN sorp_auth."user" u ON u.id=m.user_id
    WHERE m.organisation_id=$1 AND lower(u.email)=$2 AND m.status='active'`, [organisationId, email]);
  if (existing.rowCount) throw new Error("That account is already a member.");
  await sorpAuthPool().query(`INSERT INTO sorp_auth.invitation
    (id,organisation_id,email,role,token_hash,invited_by,expires_at)
    VALUES($1,$2,$3,$4,$5,$6,now()+interval '7 days')`,
  [id, organisationId, email, role, tokenHash, actorId]);
  try {
    await sendSorpInvitationEmail(email, `${process.env.SORP_AUTH_BASE_URL}/invitation/${token}/`);
  } catch {
    await sorpAuthPool().query("UPDATE sorp_auth.invitation SET status='revoked',updated_at=now() WHERE id=$1", [id]);
    throw new Error("The invitation email could not be delivered.");
  }
  await sorpAuthPool().query(`INSERT INTO sorp_auth.audit_event(actor_user_id,action,target_type,target_id)
    VALUES($1,'organisation_invitation_sent','invitation',$2)`, [actorId, id]);
  return { id, sent: true, expiresInDays: 7 };
}

export async function founderRevokeInvitation(actorId: string, input: Input) {
  const id = String(input.invitationId || "");
  const row = await sorpAuthPool().query(`UPDATE sorp_auth.invitation SET status='revoked',updated_at=now()
    WHERE id=$1 AND status='pending' RETURNING id`, [id]);
  if (!row.rowCount) throw new Error("No pending invitation matched.");
  await sorpAuthPool().query(`INSERT INTO sorp_auth.audit_event(actor_user_id,action,target_type,target_id)
    VALUES($1,'organisation_invitation_revoked','invitation',$2)`, [actorId, id]);
  return { revoked: true };
}

export async function acceptOrganisationInvitation(userId: string, email: string, input: Input) {
  const token = input.token;
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) throw new Error("The invitation token is invalid.");
  const digest = createHash("sha256").update(token).digest("hex");
  const client = await sorpAuthPool().connect();
  try {
    await client.query("BEGIN");
    const found = await client.query<{ id: string; organisation_id: string; role: string; email: string }>(
      `SELECT id,organisation_id,role,email FROM sorp_auth.invitation
       WHERE token_hash=$1 AND status='pending' AND expires_at>now() FOR UPDATE`, [digest]);
    const invitation = found.rows[0];
    if (!invitation || invitation.email.toLowerCase() !== email.toLowerCase()) {
      throw new Error("The invitation is expired or belongs to another email.");
    }
    await client.query(`INSERT INTO sorp_auth.membership(organisation_id,user_id,role)
      VALUES($1,$2,$3) ON CONFLICT(organisation_id,user_id) DO UPDATE SET
      role=excluded.role,status='active',updated_at=now()`,
    [invitation.organisation_id, userId, invitation.role]);
    await client.query(`UPDATE sorp_auth.invitation SET status='accepted',accepted_by=$2,updated_at=now()
      WHERE id=$1`, [invitation.id, userId]);
    await client.query(`INSERT INTO sorp_auth.audit_event(actor_user_id,action,target_type,target_id)
      VALUES($1,'organisation_invitation_accepted','invitation',$2)`, [userId, invitation.id]);
    await client.query("COMMIT");
    return { accepted: true, organisationId: invitation.organisation_id };
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
}

export async function founderRequestClientAccess(actorId: string, input: Input) {
  const adviserId = String(input.adviserOrganisationId || "");
  const charityId = String(input.charityOrganisationId || "");
  const permissions = input.permissions as Input | undefined;
  if (!adviserId || !charityId || adviserId === charityId || !permissions || typeof permissions !== "object") {
    throw new Error("The client access request is invalid.");
  }
  if (permissions.edit === true || permissions.invitations === true) {
    throw new Error("Adviser editing and client invitation delegation are not enabled in the independent service.");
  }
  const allowed = { progress: permissions.progress === true, answers: permissions.answers === true,
    edit: permissions.edit === true, invitations: permissions.invitations === true };
  const client = await sorpAuthPool().connect();
  try {
    await client.query("BEGIN");
    const types = await client.query<{ id: string; type: string }>(
      "SELECT id,type FROM sorp_auth.organisation WHERE id IN ($1,$2) FOR UPDATE", [adviserId, charityId]);
    if (types.rows.find(row => row.id === adviserId)?.type !== "Adviser" ||
        types.rows.find(row => row.id === charityId)?.type !== "Charity") {
      throw new Error("Client access requires an adviser and a charity.");
    }
    const row = await client.query(`INSERT INTO sorp_auth.adviser_client_access
      (adviser_organisation_id,charity_organisation_id,permissions,status,requested_by)
      VALUES($1,$2,$3::jsonb,'requested',$4)
      ON CONFLICT(adviser_organisation_id,charity_organisation_id) DO UPDATE SET
      permissions=excluded.permissions,status='requested',requested_by=excluded.requested_by,
      approved_by=NULL,updated_at=now() RETURNING id,status`,
    [adviserId, charityId, JSON.stringify(allowed), actorId]);
    await client.query(`INSERT INTO sorp_auth.audit_event(actor_user_id,action,target_type,target_id)
      VALUES($1,'client_access_requested','client_access',$2)`, [actorId, String(row.rows[0].id)]);
    await client.query("COMMIT");
    return row.rows[0];
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
}

/** Only an active owner/admin of the linked charity can approve adviser access. */
export async function decideClientAccess(userId: string, input: Input) {
  const accessId = String(input.accessId || "");
  const decision = input.decision;
  if (!accessId || !["approve", "deny"].includes(String(decision))) throw new Error("The client decision is invalid.");
  const client = await sorpAuthPool().connect();
  try {
    await client.query("BEGIN");
    const updated = await client.query(`UPDATE sorp_auth.adviser_client_access a
      SET status=CASE WHEN a.status='active' THEN 'revoked' ELSE $3 END,
        approved_by=CASE WHEN $3='active' THEN $2 ELSE a.approved_by END,updated_at=now()
      WHERE a.id=$1 AND (a.status='requested' OR (a.status='active' AND $3='denied')) AND EXISTS(
        SELECT 1 FROM sorp_auth.membership m WHERE m.organisation_id=a.charity_organisation_id
        AND m.user_id=$2 AND m.status='active' AND m.role IN ('owner','admin'))
      RETURNING id,status`, [accessId, userId, decision === "approve" ? "active" : "denied"]);
    if (!updated.rowCount) throw new Error("The charity owner did not approve this request.");
    await client.query(`INSERT INTO sorp_auth.audit_event(actor_user_id,action,target_type,target_id)
      VALUES($1,$2,'client_access',$3)`, [userId,
      updated.rows[0].status === "revoked" ? "client_access_revoked" :
        decision === "approve" ? "client_access_approved" : "client_access_denied", accessId]);
    await client.query("COMMIT");
    return updated.rows[0];
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
}

/** A current adviser membership and a current charity approval are both required on every read. */
export async function readClientAssessment(userId: string, input: Input) {
  const adviserId = String(input.adviserOrganisationId || "");
  const charityId = String(input.charityOrganisationId || "");
  const view = input.view;
  if (!adviserId || !charityId || adviserId === charityId || (view !== "progress" && view !== "answers")) {
    throw new Error("The client assessment request is invalid.");
  }
  const client = await sorpAuthPool().connect();
  try {
    await client.query("BEGIN");
    const granted = await client.query<{ charity_name: string; permissions: Input }>(`
      SELECT c.name charity_name,a.permissions FROM sorp_auth.adviser_client_access a
      JOIN sorp_auth.organisation c ON c.id=a.charity_organisation_id AND c.type='Charity'
      JOIN sorp_auth.organisation adviser ON adviser.id=a.adviser_organisation_id AND adviser.type='Adviser'
      JOIN sorp_auth.membership m ON m.organisation_id=adviser.id
      JOIN sorp_auth.entitlement e ON e.organisation_id=adviser.id
      WHERE a.charity_organisation_id=$1 AND a.adviser_organisation_id=$2
        AND a.status='active' AND m.user_id=$3 AND m.status='active'
        AND e.plan IN ('Adviser','Enterprise') AND e.status<>'suspended'
        AND (e.status<>'complimentary_partner' OR e.complimentary_end IS NULL OR e.complimentary_end>now())
      FOR SHARE OF a,m,e`, [charityId, adviserId, userId]);
    const permission = view === "answers" ? "answers" : "progress";
    if (granted.rows.length !== 1 || granted.rows[0].permissions[permission] !== true) {
      throw new Error("The adviser has no approved access to this assessment.");
    }
    const assessment = await client.query<{ user_id: string; name: string; position: string;
      organisation: string; current_stage: number;
      completed_stages: number[]; last_saved_at: Date | null; progress?: unknown }>(`
      SELECT p.user_id,u.name,coalesce(profile.position,'') position,
        coalesce(profile.organisation_label,'') organisation,
        p.current_stage,p.completed_stages,p.last_saved_at
        ${view === "answers" ? ",p.progress" : ""}
      FROM sorp_auth.membership m JOIN sorp_auth.account_progress p ON p.user_id=m.user_id
      JOIN sorp_auth."user" u ON u.id=m.user_id
      LEFT JOIN sorp_auth.profile profile ON profile.user_id=u.id
      WHERE m.organisation_id=$1 AND m.status='active' ORDER BY p.last_saved_at DESC`, [charityId]);
    await client.query(`INSERT INTO sorp_auth.audit_event(actor_user_id,action,target_type,target_id)
      VALUES($1,$2,'organisation',$3)`, [userId,
      view === "answers" ? "client_answers_read" : "client_progress_read", charityId]);
    await client.query("COMMIT");
    return { organisationId: charityId, organisationName: granted.rows[0].charity_name,
      view, assessments: assessment.rows.map(row => ({ accountId: row.user_id,
        name: row.name, position: row.position, organisation: row.organisation,
        status: row.completed_stages.length === 7 ? "complete" : "in_progress",
        currentStage: row.current_stage, completedStages: row.completed_stages,
        lastSavedAt: row.last_saved_at?.toISOString() || null,
        ...(view === "answers" ? { progress: row.progress } : {}) })) };
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
}

export async function adviserWorkspace(userId: string, input: Input) {
  const adviserId = String(input.adviserOrganisationId || "");
  if (!adviserId) throw new Error("Choose an adviser organisation.");
  const db = sorpAuthPool();
  const organisation = await db.query<{ id: string; name: string; role: string;
    plan: string; status: string; published_price_pence: number; payable_price_pence: number;
    complimentary_end: Date | null }>(`
    SELECT o.id,o.name,m.role,e.plan,e.status,e.published_price_pence,
      e.payable_price_pence,e.complimentary_end
    FROM sorp_auth.membership m JOIN sorp_auth.organisation o ON o.id=m.organisation_id
    JOIN sorp_auth.entitlement e ON e.organisation_id=o.id
    WHERE o.id=$1 AND o.type='Adviser' AND m.user_id=$2 AND m.status='active'
      AND e.plan IN ('Adviser','Enterprise') AND e.status<>'suspended'
      AND (e.status<>'complimentary_partner' OR e.complimentary_end IS NULL OR e.complimentary_end>now())`,
  [adviserId, userId]);
  const own = organisation.rows[0];
  if (!own) throw new Error("This adviser workspace is unavailable.");
  const [clients, team] = await Promise.all([
    db.query<{ organisation_id: string; name: string; status: string;
      permissions: Input; member_count: number; updated_at: Date }>(`
      SELECT c.id organisation_id,c.name,a.status,a.permissions,
        count(cm.id) FILTER (WHERE cm.status='active')::int member_count,a.updated_at
      FROM sorp_auth.adviser_client_access a
      JOIN sorp_auth.organisation c ON c.id=a.charity_organisation_id AND c.type='Charity'
      LEFT JOIN sorp_auth.membership cm ON cm.organisation_id=c.id
      WHERE a.adviser_organisation_id=$1 AND a.status IN ('requested','active')
      GROUP BY a.id,c.id ORDER BY c.name`, [adviserId]),
    db.query<{ email: string; role: string; status: string }>(`
      SELECT u.email,m.role,m.status FROM sorp_auth.membership m
      JOIN sorp_auth."user" u ON u.id=m.user_id
      WHERE m.organisation_id=$1 ORDER BY u.email`, [adviserId]),
  ]);
  return { approvalRequired: true,
    organisation: { id: own.id, name: own.name, role: own.role,
      entitlement: { plan: own.plan, status: own.status,
        publishedPrice: own.published_price_pence, payablePrice: own.payable_price_pence,
        complimentaryEnd: own.complimentary_end?.toISOString() || null } },
    clients: clients.rows.map(row => ({ organisationId: row.organisation_id, name: row.name,
      status: row.status, permissions: row.permissions, memberCount: row.member_count,
      updatedAt: row.updated_at.toISOString() })), team: team.rows,
  };
}

export async function adviserClient(userId: string, input: Input) {
  const adviserId = String(input.adviserOrganisationId || "");
  const charityId = String(input.charityOrganisationId || "");
  const grant = await sorpAuthPool().query<{ permissions: Input }>(`
    SELECT permissions FROM sorp_auth.adviser_client_access
    WHERE adviser_organisation_id=$1 AND charity_organisation_id=$2 AND status='active'`,
  [adviserId, charityId]);
  const view = grant.rows[0]?.permissions.answers === true ? "answers" : "progress";
  return readClientAssessment(userId, { adviserOrganisationId: adviserId,
    charityOrganisationId: charityId, view });
}

const managerSql = `SELECT 1 FROM sorp_auth.membership m
    JOIN sorp_auth.organisation o ON o.id=m.organisation_id AND o.type='Adviser'
    JOIN sorp_auth.entitlement e ON e.organisation_id=o.id
    WHERE m.organisation_id=$1 AND m.user_id=$2 AND m.status='active'
      AND m.role IN ('owner','admin') AND e.plan IN ('Adviser','Enterprise')
      AND e.status<>'suspended' AND (e.status<>'complimentary_partner'
        OR e.complimentary_end IS NULL OR e.complimentary_end>now())
    FOR SHARE OF m,e`;

export async function adviserInviteMember(userId: string, input: Input) {
  const organisationId = String(input.adviserOrganisationId || "");
  const role = String(input.role || "member");
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  if (!organisationId || !["member", "admin"].includes(role) ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    throw new Error("The adviser invitation is invalid.");
  }
  const token = randomBytes(32).toString("hex");
  const invitationId = randomUUID();
  const client = await sorpAuthPool().connect();
  try {
    await client.query("BEGIN");
    if (!(await client.query(managerSql, [organisationId, userId])).rowCount) {
      throw new Error("Only an adviser owner or administrator can invite colleagues.");
    }
    const member = await client.query(`SELECT 1 FROM sorp_auth.membership m
      JOIN sorp_auth."user" u ON u.id=m.user_id WHERE m.organisation_id=$1
        AND lower(u.email)=$2 AND m.status='active'`, [organisationId, email]);
    if (member.rowCount) throw new Error("That colleague already belongs to this organisation.");
    await client.query(`INSERT INTO sorp_auth.invitation
      (id,organisation_id,email,role,token_hash,invited_by,expires_at)
      VALUES($1,$2,$3,$4,$5,$6,now()+interval '7 days')`,
    [invitationId, organisationId, email, role,
      createHash("sha256").update(token).digest("hex"), userId]);
    await sendSorpInvitationEmail(email, `${process.env.SORP_AUTH_BASE_URL}/invitation/${token}/`);
    await client.query(`INSERT INTO sorp_auth.audit_event(actor_user_id,action,target_type,target_id)
      VALUES($1,'adviser_colleague_invited','invitation',$2)`, [userId, invitationId]);
    await client.query("COMMIT");
    return { id: invitationId, sent: true, expiresInDays: 7 };
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
}

/** Create a new charity with a pending grant; accepting membership does not approve adviser access. */
export async function adviserCreateClient(userId: string, input: Input) {
  const adviserId = String(input.adviserOrganisationId || "");
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const permissions = input.permissions as Input | undefined;
  if (!adviserId || name.length < 2 || name.length > 200 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 ||
      !permissions || permissions.progress !== true ||
      permissions.edit === true || permissions.invitations === true) {
    throw new Error("The client invitation must request read-only access and a valid charity owner.");
  }
  const charityId = randomUUID();
  const invitationId = randomUUID();
  const token = randomBytes(32).toString("hex");
  const client = await sorpAuthPool().connect();
  try {
    await client.query("BEGIN");
    if (!(await client.query(managerSql, [adviserId, userId])).rowCount) {
      throw new Error("Only an adviser owner or administrator can invite clients.");
    }
    await client.query(`INSERT INTO sorp_auth.organisation(id,name,type,programme,seat_limit)
      VALUES($1,$2,'Charity','snapshot',1)`, [charityId, name]);
    await client.query("INSERT INTO sorp_auth.entitlement(organisation_id) VALUES($1)", [charityId]);
    const grant = await client.query<{ id: string }>(`INSERT INTO sorp_auth.adviser_client_access
      (adviser_organisation_id,charity_organisation_id,permissions,status,requested_by)
      VALUES($1,$2,$3::jsonb,'requested',$4) RETURNING id`,
    [adviserId, charityId, JSON.stringify({ progress: true, answers: permissions.answers === true,
      edit: false, invitations: false }), userId]);
    await client.query(`INSERT INTO sorp_auth.invitation
      (id,organisation_id,email,role,token_hash,invited_by,expires_at)
      VALUES($1,$2,$3,'owner',$4,$5,now()+interval '7 days')`,
    [invitationId, charityId, email, createHash("sha256").update(token).digest("hex"), userId]);
    await sendSorpInvitationEmail(email, `${process.env.SORP_AUTH_BASE_URL}/invitation/${token}/`);
    await client.query(`INSERT INTO sorp_auth.audit_event(actor_user_id,action,target_type,target_id)
      VALUES($1,'adviser_client_invited','organisation',$2)`, [userId, charityId]);
    await client.query("COMMIT");
    return { organisationId: charityId, accessId: grant.rows[0].id,
      invitationId, status: "requested", emailSent: true };
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
}
