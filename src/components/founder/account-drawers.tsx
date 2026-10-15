"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  Dashboard,
  Invitation,
  Organisation,
  OrganisationDetail,
  UserDetail,
  displayDate,
  label,
  money,
} from "./founder-model";

type OrganisationProps = {
  organisation: Organisation;
  detail: OrganisationDetail | null;
  data: Dashboard;
  busy: boolean;
  invitationFeedback: string;
  onClose: () => void;
  onPlan: (event: FormEvent<HTMLFormElement>) => void;
  onInvite: (event: FormEvent<HTMLFormElement>) => void;
  onRevokeInvitation: (id?: string) => void;
  onResendInvitation: (id?: string) => void;
  onRevokeComplimentary: () => void;
  onClientAccess: (event: FormEvent<HTMLFormElement>) => void;
  onOpenUser: (userId: string) => void;
  onRefresh: () => Promise<void>;
};

export function OrganisationDrawer({ organisation, detail, data, busy, invitationFeedback, onClose, onPlan, onInvite, onRevokeInvitation, onResendInvitation, onRevokeComplimentary, onClientAccess, onOpenUser, onRefresh }: OrganisationProps) {
  const inviteForm = useRef<HTMLFormElement>(null);
  const refreshAction = useRef(onRefresh);
  const [refreshing, setRefreshing] = useState(false);
  useEffect(() => { refreshAction.current = onRefresh; }, [onRefresh]);
  useEffect(() => {
    const interval = window.setInterval(() => { void refreshAction.current().catch(() => undefined); }, 20_000);
    return () => window.clearInterval(interval);
  }, [organisation.id]);
  const invitations = useMemo(() => data.invitations.filter(row => {
    const invitationOrganisation = row.organisation_id || row.organisationId;
    return invitationOrganisation ? invitationOrganisation === organisation.platform_organisation_id : (row.organisation_name || row.organisationName) === organisation.name;
  }), [data.invitations, organisation.name, organisation.platform_organisation_id]);
  const pending = invitations.filter(row => ["preparing", "pending", "sent", "delivered"].includes(String(row.status))).length;
  const failed = invitations.filter(row => row.status === "failed").length;
  const inviteAgain = (invitation: Invitation) => {
    const form = inviteForm.current;
    if (!form) return;
    const email = form.elements.namedItem("email") as HTMLInputElement | null;
    const confirmation = form.elements.namedItem("confirmEmail") as HTMLInputElement | null;
    const role = form.elements.namedItem("role") as HTMLSelectElement | null;
    if (email) email.value = invitation.email || "";
    if (confirmation) confirmation.value = invitation.email || "";
    if (role) role.value = invitation.role || "member";
    email?.focus();
  };
  const refresh = async () => { setRefreshing(true); try { await onRefresh(); } catch { /* The existing data remains visible. */ } finally { setRefreshing(false); } };
  return <Drawer title={organisation.name} onClose={onClose}>
    <div className="founder-record-summary">
      <div><span>Account type</span><strong>{organisation.type}</strong></div>
      <div><span>Subscription</span><strong>{organisation.plan}</strong></div>
      <div><span>Status</span><strong>{organisation.complimentary ? "Complimentary" : Number(organisation.payable_price) ? "Paid" : "Free"}</strong></div>
      <div><span>Registered</span><strong>{displayDate(organisation.created_at)}</strong></div>
      <div><span>Last activity</span><strong>{displayDate(organisation.last_activity || organisation.updated_at, true)}</strong></div>
    </div>

    <DrawerSection title="People">
      <div className="founder-people-summary">
        <a href="#registered-people"><strong>{detail?.users.length || 0}</strong><span>Registered</span></a>
        <a href="#organisation-invitations"><strong>{pending}</strong><span>Awaiting acceptance</span></a>
        <a href="#organisation-invitations"><strong>{failed}</strong><span>Failed</span></a>
      </div>
      <div id="registered-people" className="founder-people-block">
      <h4>Registered people</h4>
      {detail?.users.length ? <div className="founder-table-wrap"><table className="founder-table">
        <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Last activity</th><th>Action</th></tr></thead>
        <tbody>{detail.users.map(user => <tr key={user.id}><td><button className="founder-link" onClick={() => onOpenUser(user.id)}>{user.name}</button></td><td>{user.email}</td><td>{label(user.role)}</td><td>{label(user.status)}</td><td>{displayDate(user.lastActivity, true)}</td><td><button className="founder-link" onClick={() => onOpenUser(user.id)}>View user</button></td></tr>)}</tbody>
      </table></div> : <p className="founder-muted">No registered users are associated with this organisation.</p>}
      </div>
      <div className="founder-people-block">
      <h4>Invite someone</h4>
      <form ref={inviteForm} className="founder-inline-form" onSubmit={onInvite}>
        <label>Email<input name="email" type="email" required /></label>
        <label>Confirm email<input name="confirmEmail" type="email" required /></label>
        <label>Role<select name="role" defaultValue="member"><option value="owner">Owner</option><option value="admin">Administrator</option><option value="member">Member</option></select></label>
        <button disabled={busy}>Send invitation</button>
      </form>
      <p className="founder-note">The invitation is only recorded as sent after the configured email service accepts it.</p>
      {invitationFeedback && <p className="founder-invitation-feedback" role="status">{invitationFeedback}</p>}
      </div>
      <div id="organisation-invitations" className="founder-people-block">
        <div className="founder-invitation-heading"><div><p className="founder-kicker">Invitations</p><h4>Invitation tracker</h4></div><button className="founder-text-button" type="button" disabled={refreshing} onClick={() => void refresh()}>{refreshing ? "Refreshing…" : "Refresh"}</button></div>
        <p className="founder-invitation-counts">{invitations.filter(row => row.status === "accepted").length} Accepted <span>·</span> {pending} Awaiting acceptance <span>·</span> {failed} Failed</p>
        {invitations.length ? <div className="founder-invitation-list">{invitations.map(invitation => <InvitationRecord key={invitation.id || `${invitation.email}-${invitation.created_at}`} invitation={invitation} busy={busy} users={detail?.users || []} onOpenUser={onOpenUser} onResend={onResendInvitation} onRevoke={onRevokeInvitation} onInviteAgain={inviteAgain} />)}</div> : <p className="founder-muted">No invitations have been recorded for this organisation.</p>}
        <p className="founder-note">Updates refresh automatically while this account view is open. “Delivered” appears only when the provider confirms delivery.</p>
      </div>
    </DrawerSection>

    <DrawerSection title="Product progress">
      <div className="founder-product-list">
        <ProductSummary name="Are You SORP Ready?" rows={detail?.products.readiness || []} />
        <ProductSummary name="Ask SORP" note="Privacy-safe organisation usage is shown in the Ask SORP dashboard." />
        <ProductSummary name="Charity Impact Reports" rows={detail?.products.impactReports || []} />
        <ProductSummary name="Social Impact Excellence" rows={detail?.products.excellence || []} />
        <ProductSummary name="My Impact Director" rows={detail?.products.impactDirector || []} />
      </div>
    </DrawerSection>

    <DrawerSection title="Subscription and access">
      <form className="founder-form-grid" onSubmit={onPlan}>
        <label>Plan<select name="plan" defaultValue={organisation.plan}><option>Free</option><option>Plus</option><option>Adviser</option><option>Enterprise</option></select></label>
        <label className="founder-check"><input type="checkbox" name="complimentary" defaultChecked={organisation.complimentary} /> Complimentary access</label>
        <label>Duration<select name="duration" defaultValue={organisation.complimentary_end ? "custom" : "indefinite"}><option value="30">30 days</option><option value="90">90 days</option><option value="custom">Custom expiry</option><option value="indefinite">Indefinite</option></select></label>
        <label>Custom expiry<input type="date" name="expiry" defaultValue={organisation.complimentary_end?.slice(0, 10)} /></label>
        <label className="founder-span">Internal reason<textarea name="reason" defaultValue={organisation.complimentary_reason || "Complimentary Partner"} /></label>
        <button disabled={busy}>Save entitlement</button>
        {organisation.complimentary && <button type="button" className="founder-danger" onClick={onRevokeComplimentary} disabled={busy}>Move safely to Free</button>}
      </form>
      <p className="founder-note">Published price: {money(organisation.published_price)}. These controls change entitlements but never initiate a charge.</p>
    </DrawerSection>

    <DrawerSection title="Recent activity">
      <ActivityList rows={[...(detail?.activity || []), ...(detail?.history || [])].slice(0, 20)} />
    </DrawerSection>

    {organisation.type === "Adviser" && <DrawerSection title="Adviser access">
      <p className="founder-muted">{detail?.clients.length || 0} client relationship(s). Charity approval remains required before confidential information is shared.</p>
      {detail?.clients.length ? <ul className="founder-attention">{detail.clients.map((client, index) => <li key={String(client.id || index)}><span>C</span><div><strong>{String(client.charity_name || "Client")}</strong><p>{label(client.status)}</p></div></li>)}</ul> : null}
      <form className="founder-form-grid" onSubmit={onClientAccess}>
        <label className="founder-span">Charity<select name="charity" required defaultValue=""><option value="" disabled>Choose a charity</option>{data.organisations.filter(row => row.type === "Charity").map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
        <label className="founder-check"><input type="checkbox" name="answers" /> View individual answers</label>
        <label className="founder-check"><input type="checkbox" name="edit" /> Contribute to assessments</label>
        <label className="founder-check"><input type="checkbox" name="invitations" /> Manage client invitations</label>
        <button disabled={busy}>Request charity approval</button>
      </form>
      <p className="founder-note">An Adviser plan never grants automatic access to confidential charity data.</p>
    </DrawerSection>}
  </Drawer>;
}

function InvitationRecord({ invitation, busy, users, onOpenUser, onResend, onRevoke, onInviteAgain }: {
  invitation: Invitation;
  busy: boolean;
  users: Dashboard["users"];
  onOpenUser: (userId: string) => void;
  onResend: (id?: string) => void;
  onRevoke: (id?: string) => void;
  onInviteAgain: (invitation: Invitation) => void;
}) {
  const status = String(invitation.status || "pending");
  const accepted = status === "accepted";
  const failed = status === "failed";
  const terminal = ["expired", "revoked"].includes(status);
  const sentAt = invitation.last_sent_at || invitation.lastSentAt;
  const deliveredAt = invitation.delivered_at || invitation.deliveredAt;
  const acceptedAt = invitation.accepted_at || invitation.acceptedAt;
  const deliveryError = invitation.delivery_error || invitation.deliveryError;
  const member = users.find(user => user.email.toLowerCase() === String(invitation.email || "").toLowerCase());
  const stages = [
    { key:"created", label:"Created", complete:true },
    { key:"sent", label:"Sent", complete:["sent", "delivered", "accepted"].includes(status) },
    { key:"delivered", label:"Delivered", complete:["delivered", "accepted"].includes(status) && Boolean(deliveredAt) },
    { key:"accepted", label:"Accepted", complete:accepted },
  ];
  const statusNote = status === "pending" && sentAt ? "Submitted: provider confirmation unavailable" : status === "preparing" ? "Preparing email" : label(status);
  return <article className={`founder-invitation founder-invitation--${status}`}>
    <header><div><strong>{invitation.email}</strong><span>Role: {label(invitation.role)}</span></div><b className={`founder-invitation-status is-${status}`}>{statusNote}</b></header>
    {!failed && !terminal && <ol className="founder-invitation-progress" aria-label={`Invitation progress: ${statusNote}`}>
      {stages.map(stage => <li key={stage.key} className={stage.complete ? "is-complete" : ""}><i aria-hidden="true" /><span>{stage.label}</span></li>)}
    </ol>}
    <dl className="founder-invitation-dates">
      <div><dt>Invited</dt><dd>{displayDate(invitation.created_at || invitation.createdAt, true)}</dd></div>
      <div><dt>Sent</dt><dd>{displayDate(sentAt, true)}</dd></div>
      <div><dt>Delivered</dt><dd>{displayDate(deliveredAt, true)}</dd></div>
      <div><dt>Accepted</dt><dd>{displayDate(acceptedAt, true)}</dd></div>
    </dl>
    {deliveryError && <details className="founder-invitation-error"><summary>View failure details</summary><p role="alert">{deliveryError}</p></details>}
    <div className="founder-invitation-actions">
      {accepted && member ? <button type="button" className="founder-link" onClick={() => onOpenUser(member.id)}>View user</button> : null}
      {["preparing", "pending", "sent", "delivered", "failed", "expired"].includes(status) ? <button type="button" className="founder-link" disabled={busy} onClick={() => onResend(invitation.id)}>{failed ? "Retry sending" : status === "expired" ? "Send replacement invitation" : "Resend invitation"}</button> : null}
      {!["accepted", "revoked"].includes(status) ? <button type="button" className="founder-link founder-link--danger" disabled={busy} onClick={() => onRevoke(invitation.id)}>Revoke</button> : null}
      {status === "revoked" ? <button type="button" className="founder-link" onClick={() => onInviteAgain(invitation)}>Prepare new invitation</button> : null}
    </div>
  </article>;
}

function ProductSummary({ name, rows = [], note }: { name: string; rows?: Array<Record<string, unknown>>; note?: string }) {
  const first = rows[0];
  const status = !rows.length ? "Not started" : first.feedbackReady ? "Feedback ready" : label(first.status || ((first.data as Record<string, unknown> | undefined)?.completed ? "completed" : "in_progress"));
  return <article><div><strong>{name}</strong><span>{status}</span></div>{typeof first?.percentage === "number" && <p>{first.percentage}% complete</p>}{typeof first?.score === "number" && <p>Score {Number(first.score).toFixed(1)}</p>}{first && <p>Updated {displayDate(first.updatedAt || first.updated_at, true)}</p>}{note && <p>{note}</p>}</article>;
}

export function UserDrawer({ detail, onClose, onOpenOrganisation }: { detail: UserDetail; onClose: () => void; onOpenOrganisation: (id?: string | null) => void }) {
  const user = detail.user;
  return <Drawer title={user.name || user.email} onClose={onClose}>
    <div className="founder-record-summary">
      <div><span>Email</span><strong>{user.email}</strong></div>
      <div><span>Organisation</span><button className="founder-link" onClick={() => onOpenOrganisation(user.organisationId)}>{user.organisationName || "Not associated"}</button></div>
      <div><span>Role</span><strong>{label(user.role)}</strong></div>
      <div><span>Status</span><strong>{label(user.status)}</strong></div>
      <div><span>Registered</span><strong>{displayDate(user.createdAt)}</strong></div>
      <div><span>Last activity</span><strong>{displayDate(user.lastActivity, true)}</strong></div>
    </div>
    <DrawerSection title="Product participation">
      <div className="founder-product-list">
        <ProductSummary name="Are You SORP Ready?" rows={detail.readiness ? [detail.readiness] : []} />
        <ProductSummary name="Ask SORP" rows={(detail.askSorp || []).map(row => ({ ...row, status: row.completed ? "completed" : "active", updatedAt: row.lastActivityAt }))} />
        <ProductSummary name="Charity Impact Reports" rows={detail.reports || []} />
        <ProductSummary name="Social Impact Excellence" rows={(detail.products || []).filter(row => row.product_id === "social-impact-excellence")} />
        <ProductSummary name="My Impact Director" rows={detail.impactDirector ? [detail.impactDirector] : []} />
      </div>
    </DrawerSection>
    {detail.readiness?.progress && <DrawerSection title="Readiness assessment detail"><AssessmentSnapshot progress={detail.readiness.progress} /></DrawerSection>}
  </Drawer>;
}

function AssessmentSnapshot({ progress }: { progress: Record<string, unknown> }) {
  const state = progress.state && typeof progress.state === "object" ? progress.state as Record<string, unknown> : {};
  const answered = Object.values(state).filter(value => value !== null && value !== "" && value !== undefined).length;
  return <div className="founder-snapshot"><p><strong>{answered}</strong> stored response field(s)</p><p>Founder access uses the existing protected assessment record. Raw answers are not placed in tables or search results.</p><details><summary>Inspect structured assessment record</summary><pre>{JSON.stringify(progress, null, 2)}</pre></details></div>;
}

export function ActivityList({ rows }: { rows: Array<Record<string, unknown>> }) {
  if (!rows.length) return <p className="founder-muted">No relevant activity has been recorded yet.</p>;
  return <ol className="founder-activity">{rows.map((row, index) => <li key={String(row.id || `${row.kind}-${index}`)}><span className="founder-activity-dot" /><div><strong>{String(row.title || row.action || "Account activity")}</strong><p>{String(row.detail || row.actor || row.email || "Platform")}</p><time>{displayDate(row.at || row.created_at || row.updated_at, true)}</time></div></li>)}</ol>;
}

export function Drawer({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);
  return <div className="founder-drawer-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <aside className="founder-drawer" role="dialog" aria-modal="true" aria-labelledby="founder-drawer-title">
      <header><div><p className="founder-kicker">Founder account view</p><h2 id="founder-drawer-title">{title}</h2></div><button onClick={onClose} aria-label="Close">×</button></header>
      {children}
    </aside>
  </div>;
}

function DrawerSection({ title, children }: { title: string; children: ReactNode }) {
  return <section className="founder-drawer-section"><h3>{title}</h3>{children}</section>;
}
