import "server-only";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { sorpAuthPool } from "./auth";

type Input = Record<string, unknown>;
type TeamOwner = { organisation_id: string; name: string; programme: string; seat_limit: number;
  entitlement_source: string; round_id: string | null; title: string | null;
  response_mode: string | null; round_status: string | null };

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

async function ownedTeam(userId: string) {
  const rows = await sorpAuthPool().query<TeamOwner>(`SELECT o.id organisation_id,o.name,o.programme,
    o.seat_limit,o.entitlement_source,r.id round_id,r.title,r.response_mode,r.status round_status
    FROM sorp_auth.membership m JOIN sorp_auth.organisation o ON o.id=m.organisation_id
    LEFT JOIN sorp_auth.team_round r ON r.organisation_id=o.id AND r.status='open'
    WHERE m.user_id=$1 AND m.status='active' AND m.role IN ('owner','admin')
      AND o.type='Charity' ORDER BY o.created_at,r.created_at DESC`, [userId]);
  if (rows.rows.length !== 1) throw new Error("Exactly one active charity team membership is required.");
  return rows.rows[0];
}

export async function teamWorkspace(userId: string) {
  const owner = await ownedTeam(userId);
  if (!owner.round_id) return { organisation: { id: owner.organisation_id, name: owner.name,
    programme: owner.programme, seatLimit: owner.seat_limit, entitlementSource: owner.entitlement_source },
    round: null, invitations: [], aggregate: { available: false, required: 3, completed: 0 } };
  const invitations = await sorpAuthPool().query<{
    id: string; email: string; name: string; status: string; invited_at: Date;
    started_at: Date | null; completed_at: Date | null; overall: number | null;
    pillar_scores: number[] | null; maturity: string | null;
  }>(`SELECT i.id,i.email,i.name,i.status,i.invited_at,i.started_at,i.completed_at,
      x.overall,x.pillar_scores,x.maturity
     FROM sorp_auth.team_invitation i LEFT JOIN sorp_auth.team_response x ON x.invitation_id=i.id
     WHERE i.round_id=$1 AND i.status<>'revoked' ORDER BY i.invited_at`, [owner.round_id]);
  const completed = invitations.rows.filter(row => row.status === "completed" && row.overall !== null);
  const available = completed.length >= 3;
  const mean = (numbers: number[]) => Math.round(numbers.reduce((sum, number) => sum + number, 0) / numbers.length * 10) / 10;
  const overall = available ? mean(completed.map(row => Number(row.overall))) : undefined;
  const pillarScores = available ? Array.from({ length: 5 }, (_, index) =>
    mean(completed.map(row => Number(row.pillar_scores?.[index] || 0)))) : undefined;
  return {
    organisation: { id: owner.organisation_id, name: owner.name, programme: owner.programme,
      seatLimit: owner.seat_limit, entitlementSource: owner.entitlement_source },
    round: { id: owner.round_id, title: owner.title, responseMode: owner.response_mode, status: owner.round_status },
    invitations: invitations.rows.map(row => ({ id: row.id, email: row.email, name: row.name,
      status: row.status, invitedAt: row.invited_at.toISOString(),
      startedAt: row.started_at?.toISOString() || null, completedAt: row.completed_at?.toISOString() || null,
      ...(owner.response_mode === "named" && row.status === "completed" && row.overall !== null
        ? { result: { overall: Number(row.overall), pillarScores: row.pillar_scores, maturity: row.maturity } } : {}) })),
    aggregate: { available, required: 3, completed: completed.length,
      ...(available ? { overall, pillarScores,
        maturity: ["Not Yet Considered", "Emerging", "Developing", "Established", "Fully Embedded"]
          [Math.max(0, Math.min(4, Math.round(overall!) - 1))] } : {}) },
  };
}

export async function teamInvite(userId: string, input: Input) {
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const name = typeof input.name === "string" ? input.name.trim().slice(0, 120) : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new Error("Enter a valid invitation email.");
  const owner = await ownedTeam(userId);
  if (owner.programme === "snapshot" || !owner.round_id) throw new Error("Team invitations are not available for this organisation.");
  const client = await sorpAuthPool().connect();
  try {
    await client.query("BEGIN");
    const round = await client.query("SELECT id FROM sorp_auth.team_round WHERE id=$1 AND status='open' FOR UPDATE", [owner.round_id]);
    if (!round.rowCount) throw new Error("The team round is closed.");
    const existing = await client.query<{ count: string; duplicate: boolean }>(`SELECT count(*)::text count,
      bool_or(lower(email)=$2) duplicate FROM sorp_auth.team_invitation
      WHERE round_id=$1 AND status<>'revoked'`, [owner.round_id, email]);
    if (Number(existing.rows[0].count) >= owner.seat_limit || existing.rows[0].duplicate) {
      throw new Error("This round is full or the email has already been invited.");
    }
    const token = randomBytes(32).toString("hex");
    await client.query(`INSERT INTO sorp_auth.team_invitation
      (id,round_id,email,name,token_hash,status,invited_at,expires_at,updated_at)
      VALUES($1,$2,$3,$4,$5,'invited',now(),now()+interval '14 days',now())`,
    [randomUUID(), owner.round_id, email, name, hash(token)]);
    await client.query(`INSERT INTO sorp_auth.audit_event(actor_user_id,action,target_type,target_id)
      VALUES($1,'team_invitation_created','organisation',$2)`, [userId, owner.organisation_id]);
    await client.query("COMMIT");
    return { invitation: { invitationToken: token, email, name } };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}

export async function updateTeamRound(userId: string, input: Input) {
  const mode = input.responseMode;
  if (mode !== "named" && mode !== "confidential") throw new Error("Unknown response privacy setting.");
  const owner = await ownedTeam(userId);
  if (!owner.round_id) throw new Error("No team round is open.");
  const changed = await sorpAuthPool().query(`UPDATE sorp_auth.team_round SET response_mode=$2,updated_at=now()
    WHERE id=$1 AND NOT EXISTS(SELECT 1 FROM sorp_auth.team_invitation
      WHERE round_id=$1 AND started_at IS NOT NULL) RETURNING id`, [owner.round_id, mode]);
  if (!changed.rowCount) throw new Error("Privacy cannot change after a participant starts.");
  return { updated: true };
}

export async function removeTeamInvitation(userId: string, input: Input) {
  const owner = await ownedTeam(userId);
  if (!owner.round_id || typeof input.invitationId !== "string") throw new Error("Unknown invitation.");
  const removed = await sorpAuthPool().query(`UPDATE sorp_auth.team_invitation
    SET status='revoked',revoked_at=now(),updated_at=now()
    WHERE id=$1 AND round_id=$2 AND status IN ('invited','started') RETURNING id`,
  [input.invitationId, owner.round_id]);
  if (!removed.rowCount) throw new Error("That invitation cannot be removed.");
  return { removed: true };
}

function invitationToken(input: Input) {
  const token = input.invitationToken;
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) throw new Error("The invitation link is invalid.");
  return hash(token);
}

export async function openTeamResponse(input: Input) {
  const tokenHash = invitationToken(input);
  const found = await sorpAuthPool().query<{
    invitation_id: string; participant_name: string; email: string; status: string;
    organisation_name: string; round_title: string; response_mode: string;
    answers: (number | null)[] | null; current_index: number | null; completed_at: Date | null;
  }>(`SELECT i.id invitation_id,i.name participant_name,i.email,i.status,
      o.name organisation_name,r.title round_title,r.response_mode,
      x.answers,x.current_index,x.completed_at
    FROM sorp_auth.team_invitation i JOIN sorp_auth.team_round r ON r.id=i.round_id
    JOIN sorp_auth.organisation o ON o.id=r.organisation_id
    LEFT JOIN sorp_auth.team_response x ON x.invitation_id=i.id
    WHERE i.token_hash=$1 AND i.status<>'revoked' AND i.expires_at>now() AND r.status='open'`, [tokenHash]);
  const row = found.rows[0];
  if (!row) throw new Error("The invitation link is invalid or closed.");
  return { organisationName: row.organisation_name, roundTitle: row.round_title,
    responseMode: row.response_mode, participant: { name: row.participant_name, email: row.email },
    response: { answers: row.answers || Array(25).fill(null), currentIndex: row.current_index || 0,
      completed: row.status === "completed" || Boolean(row.completed_at) } };
}

export async function saveTeamResponse(input: Input, submit: boolean) {
  const tokenHash = invitationToken(input);
  const answers = input.answers;
  const index = input.currentIndex;
  if (!Array.isArray(answers) || answers.length !== 25 ||
      answers.some(answer => answer !== null && (!Number.isInteger(answer) || answer < 1 || answer > 5)) ||
      !Number.isInteger(index) || Number(index) < 0 || Number(index) > 24 ||
      (submit && answers.some(answer => answer === null))) {
    throw new Error("The assessment response is incomplete or invalid.");
  }
  const client = await sorpAuthPool().connect();
  try {
    await client.query("BEGIN");
    const found = await client.query<{ id: string; round_id: string; status: string }>(
      `SELECT i.id,i.round_id,i.status FROM sorp_auth.team_invitation i
       JOIN sorp_auth.team_round r ON r.id=i.round_id
       WHERE i.token_hash=$1 AND i.status IN ('invited','started') AND i.expires_at>now()
         AND r.status='open' FOR UPDATE OF i,r`, [tokenHash]);
    const invite = found.rows[0];
    if (!invite) throw new Error("The invitation is unavailable or already completed.");
    const numeric = answers as number[];
    const overall = submit ? numeric.reduce((sum, number) => sum + number, 0) / 25 : null;
    const pillarScores = submit ? Array.from({ length: 5 }, (_, pillar) =>
      numeric.slice(pillar * 5, pillar * 5 + 5).reduce((sum, number) => sum + number, 0) / 5) : [];
    const maturity = submit ? ["Not Yet Considered", "Emerging", "Developing", "Established", "Fully Embedded"]
      [Math.max(0, Math.min(4, Math.round(overall!) - 1))] : null;
    await client.query(`INSERT INTO sorp_auth.team_response
      (id,round_id,invitation_id,answers,current_index,overall,pillar_scores,maturity,started_at,updated_at,completed_at)
      VALUES($1,$2,$3,$4::jsonb,$5,$6,$7::jsonb,$8,now(),now(),$9)
      ON CONFLICT(invitation_id) DO UPDATE SET answers=excluded.answers,current_index=excluded.current_index,
      overall=excluded.overall,pillar_scores=excluded.pillar_scores,maturity=excluded.maturity,
      updated_at=now(),completed_at=excluded.completed_at`,
    [randomUUID(), invite.round_id, invite.id, JSON.stringify(answers), index, overall,
      JSON.stringify(pillarScores), maturity, submit ? new Date() : null]);
    await client.query(`UPDATE sorp_auth.team_invitation SET status=$2,
      started_at=coalesce(started_at,now()),completed_at=$3,updated_at=now() WHERE id=$1`,
    [invite.id, submit ? "completed" : "started", submit ? new Date() : null]);
    await client.query("COMMIT");
    return { ok: true, response: { answers, currentIndex: index, completed: submit } };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}
