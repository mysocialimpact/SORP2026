"use client";

import { FormEvent, ReactNode, useEffect } from "react";
import {
  Dashboard,
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
  onClose: () => void;
  onPlan: (event: FormEvent<HTMLFormElement>) => void;
  onInvite: (event: FormEvent<HTMLFormElement>) => void;
  onRevokeComplimentary: () => void;
  onClientAccess: (event: FormEvent<HTMLFormElement>) => void;
  onOpenUser: (userId: string) => void;
};

export function OrganisationDrawer({ organisation, detail, data, busy, onClose, onPlan, onInvite, onRevokeComplimentary, onClientAccess, onOpenUser }: OrganisationProps) {
  return <Drawer title={organisation.name} onClose={onClose}>
    <div className="founder-record-summary">
      <div><span>Account type</span><strong>{organisation.type}</strong></div>
      <div><span>Subscription</span><strong>{organisation.plan}</strong></div>
      <div><span>Status</span><strong>{organisation.complimentary ? "Complimentary" : Number(organisation.payable_price) ? "Paid" : "Free"}</strong></div>
      <div><span>Registered</span><strong>{displayDate(organisation.created_at)}</strong></div>
      <div><span>Last activity</span><strong>{displayDate(organisation.last_activity || organisation.updated_at, true)}</strong></div>
    </div>

    <DrawerSection title="People">
      {detail?.users.length ? <div className="founder-table-wrap"><table className="founder-table">
        <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Last activity</th></tr></thead>
        <tbody>{detail.users.map(user => <tr key={user.id}><td><button className="founder-link" onClick={() => onOpenUser(user.id)}>{user.name}</button></td><td>{user.email}</td><td>{label(user.role)}</td><td>{label(user.status)}</td><td>{displayDate(user.lastActivity, true)}</td></tr>)}</tbody>
      </table></div> : <p className="founder-muted">No registered users are associated with this organisation.</p>}
      <form className="founder-inline-form" onSubmit={onInvite}>
        <label>Email<input name="email" type="email" required /></label>
        <label>Role<select name="role" defaultValue="member"><option value="owner">Owner</option><option value="admin">Administrator</option><option value="member">Member</option></select></label>
        <button disabled={busy}>Send invitation</button>
      </form>
      <p className="founder-note">The invitation is only recorded as sent after the configured email service accepts it.</p>
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
