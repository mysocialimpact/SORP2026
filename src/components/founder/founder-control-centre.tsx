"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { FounderFeedbackWorkspace } from "./feedback-workspace";
import { ActivityList, Drawer, OrganisationDrawer, UserDrawer } from "./account-drawers";
import {
  Accountant,
  AccountantData,
  Dashboard,
  Invitation,
  Organisation,
  OrganisationDetail,
  PlanData,
  ProductKey,
  UserDetail,
  displayDate,
  founderCall,
  label,
  money,
} from "./founder-model";
import { ProductDashboard } from "./product-dashboard";
import { FOUNDER_VIEW_EVENT, founderViewFromHash, navigateFounderView, type FounderView } from "@/lib/founder-navigation";

export function FounderControlCentre() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [view, setView] = useState<FounderView>("home");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [invitationFeedback, setInvitationFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const [selectedOrganisation, setSelectedOrganisation] = useState<Organisation | null>(null);
  const [organisationDetail, setOrganisationDetail] = useState<OrganisationDetail | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [creating, setCreating] = useState(false);
  const [accountants, setAccountants] = useState<AccountantData | null>(null);
  const [selectedFirm, setSelectedFirm] = useState<Accountant | null>(null);
  const [plans, setPlans] = useState<PlanData | null>(null);

  const loadDashboard = async () => {
    const result = await founderCall<Dashboard>("dashboard");
    setData(result);
    setError("");
    return result;
  };

  useEffect(() => {
    let active = true;
    void founderCall<Dashboard>("dashboard")
      .then(result => { if (active) setData(result); })
      .catch((caught: unknown) => { if (active) setError(message(caught, "Unable to open the control centre.")); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const syncHash = () => setView(founderViewFromHash(window.location.hash));
    const syncEvent = (event: Event) => setView((event as CustomEvent<{ view?: FounderView }>).detail?.view || founderViewFromHash(window.location.hash));
    syncHash();
    window.addEventListener("hashchange", syncHash);
    window.addEventListener(FOUNDER_VIEW_EVENT, syncEvent);
    return () => {
      window.removeEventListener("hashchange", syncHash);
      window.removeEventListener(FOUNDER_VIEW_EVENT, syncEvent);
    };
  }, []);

  useEffect(() => {
    if (view === "accountants" && !accountants) {
      void founderCall<AccountantData>("accountants").then(setAccountants).catch(caught => setError(message(caught, "Unable to load firms.")));
    }
    if ((view === "billing" || view === "platform") && !plans) {
      void founderCall<PlanData>("plans").then(setPlans).catch(caught => setError(message(caught, "Unable to load plans.")));
    }
  }, [view, accountants, plans]);

  const results = useMemo(() => {
    if (!data || !query.trim()) return { organisations: data?.organisations || [], users: [] };
    const term = query.trim().toLowerCase();
    return {
      organisations: data.organisations.filter(row => [row.name, row.primary_email, row.type].some(value => String(value || "").toLowerCase().includes(term))),
      users: data.users.filter(row => [row.name, row.email, row.organisationName].some(value => String(value || "").toLowerCase().includes(term))),
    };
  }, [data, query]);

  const switchView = (next: FounderView) => {
    setView(next);
    navigateFounderView(next);
    window.requestAnimationFrame(() => document.querySelector(".founder-workspace")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const openOrganisation = async (candidate?: string | Organisation | null) => {
    if (!data || !candidate) return;
    const organisation = typeof candidate === "string"
      ? data.organisations.find(row => row.id === candidate || row.platform_organisation_id === candidate)
      : candidate;
    if (!organisation) { setError("That organisation is not available in the founder directory."); return; }
    setSelectedUser(null);
    setInvitationFeedback("");
    setSelectedOrganisation(organisation);
    setOrganisationDetail(null);
    try { setOrganisationDetail(await founderCall<OrganisationDetail>(`organisation/${organisation.id}`)); }
    catch (caught) { setError(message(caught, "Unable to open the organisation.")); }
  };

  const openUser = async (userId?: string) => {
    if (!userId) return;
    setSelectedOrganisation(null);
    try { setSelectedUser(await founderCall<UserDetail>(`user/${encodeURIComponent(userId)}`)); }
    catch (caught) { setError(message(caught, "Unable to open the user.")); }
  };

  const createOrganisation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await perform(async () => {
      await founderCall("organisations", { method: "POST", body: JSON.stringify({ name: form.get("name"), type: form.get("type") }) });
      await loadDashboard();
      setCreating(false);
      setNotice("Organisation created in the live account service and recorded in the audit history.");
    }, "Unable to create the organisation.");
  };

  const updatePlan = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedOrganisation) return;
    const form = new FormData(event.currentTarget);
    await perform(async () => {
      await founderCall(`organisation/${selectedOrganisation.id}/plan`, { method: "POST", body: JSON.stringify({ plan: form.get("plan"), complimentary: form.get("complimentary") === "on", duration: form.get("duration"), expiry: form.get("expiry"), reason: form.get("reason") }) });
      const refreshed = await loadDashboard();
      const organisation = refreshed.organisations.find(row => row.id === selectedOrganisation.id);
      if (organisation) await openOrganisationFrom(refreshed, organisation);
      setNotice("Subscription and entitlement updated. No payment was initiated.");
    }, "Unable to update the entitlement.");
  };

  const invite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedOrganisation) return;
    const element = event.currentTarget;
    const form = new FormData(element);
    const email = String(form.get("email") || "").trim().toLowerCase();
    const confirmedEmail = String(form.get("confirmEmail") || "").trim().toLowerCase();
    setBusy(true); setError(""); setNotice(""); setInvitationFeedback("");
    try {
      if (email !== confirmedEmail) throw new Error("The email addresses do not match. Check the recipient before sending.");
      const result = await founderCall<{ delivery?:string; platform?:Invitation }>(`organisation/${selectedOrganisation.id}/invite`, { method: "POST", body: JSON.stringify({ email, role: form.get("role") }) });
      element.reset();
      await loadDashboard();
      setOrganisationDetail(await founderCall<OrganisationDetail>(`organisation/${selectedOrganisation.id}`));
      const status = result.platform?.status || result.delivery || "pending";
      const feedback = status === "delivered" ? `Invitation delivered to ${email}.` : status === "sent" ? `Email provider accepted the invitation to ${email}.` : `Invitation created for ${email}. Email-provider confirmation is pending.`;
      setInvitationFeedback(feedback); setNotice(feedback);
    } catch (caught) {
      const failure = message(caught, "The invitation could not be sent.");
      setInvitationFeedback(failure); setError(failure);
      await loadDashboard().catch(() => undefined);
    } finally { setBusy(false); }
  };

  const revokeComplimentary = async () => {
    if (!selectedOrganisation || !window.confirm(`Move ${selectedOrganisation.name} safely to Free? Saved work will be retained.`)) return;
    await perform(async () => {
      await founderCall(`organisation/${selectedOrganisation.id}/revoke-complimentary`, { method: "POST", body: "{}" });
      setSelectedOrganisation(null);
      await loadDashboard();
      setNotice("Complimentary access revoked. Saved work was retained and no payment was initiated.");
    }, "Complimentary access could not be revoked.");
  };

  const requestClientAccess = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedOrganisation) return;
    const form = new FormData(event.currentTarget);
    await perform(async () => {
      await founderCall("clients/link", { method: "POST", body: JSON.stringify({ adviserOrganisationId:selectedOrganisation.id, charityOrganisationId:form.get("charity"), permissions:{ progress:true, answers:form.get("answers") === "on", edit:form.get("edit") === "on", invitations:form.get("invitations") === "on" } }) });
      await loadDashboard();
      setOrganisationDetail(await founderCall<OrganisationDetail>(`organisation/${selectedOrganisation.id}`));
      setNotice("Client access requested. Confidential records remain closed until the charity owner approves.");
    }, "Client access could not be requested.");
  };

  const revokeInvitation = async (id?: string) => {
    if (!id || !window.confirm("Revoke this pending invitation?")) return;
    await perform(async () => {
      await founderCall(`invitations/${id}/revoke`, { method:"POST", body:"{}" });
      await loadDashboard();
      if (selectedOrganisation) setOrganisationDetail(await founderCall<OrganisationDetail>(`organisation/${selectedOrganisation.id}`));
      setInvitationFeedback("Invitation revoked. Its previous link can no longer be accepted.");
      setNotice("Invitation revoked.");
    }, "The invitation could not be revoked.");
  };

  const resendInvitation = async (id?: string) => {
    if (!id) return;
    await perform(async () => {
      const result = await founderCall<{ invitation?:Invitation }>(`invitations/${id}/resend`, { method:"POST", body:"{}" });
      await loadDashboard();
      if (selectedOrganisation) setOrganisationDetail(await founderCall<OrganisationDetail>(`organisation/${selectedOrganisation.id}`));
      const status = result.invitation?.status || "pending";
      const feedback = status === "delivered" ? "Invitation delivered." : status === "sent" ? "Email provider accepted the resent invitation." : "Invitation resubmitted; email-provider confirmation is pending.";
      setInvitationFeedback(feedback); setNotice(feedback);
    }, "The invitation could not be resent.");
  };

  const openOrganisationFrom = async (dashboard: Dashboard, organisation: Organisation) => {
    setData(dashboard);
    setSelectedOrganisation(organisation);
    setOrganisationDetail(await founderCall<OrganisationDetail>(`organisation/${organisation.id}`));
  };

  const perform = async (work: () => Promise<void>, fallback: string) => {
    setBusy(true); setError(""); setNotice("");
    try { await work(); }
    catch (caught) { setError(message(caught, fallback)); }
    finally { setBusy(false); }
  };

  if (error && !data) return <div className="founder-shell founder-loading"><p className="founder-kicker">Founder Control Centre</p><h1>We couldn’t open the control centre.</h1><p role="alert">{error}</p></div>;
  if (!data) return <div className="founder-shell founder-loading"><p className="founder-kicker">Founder Control Centre</p><h1>Opening your workspace…</h1></div>;

  return <main className="founder-shell">
    {notice && <p className="founder-notice" role="status">{notice}</p>}
    {error && <p className="founder-error" role="alert">{error}<button onClick={() => setError("")}>Dismiss</button></p>}

    <div className="founder-workspace">
      {view === "home" && <HomeDashboard data={data} query={query} setQuery={setQuery} results={results} onOpenOrganisation={openOrganisation} onOpenUser={openUser} onSwitch={switchView} />}
      {(["readiness", "askSorp", "impactReports", "excellence", "impactDirector"] as FounderView[]).includes(view) && <ProductDashboard active={view as Exclude<ProductKey, "home">} data={data} onOpenOrganisation={openOrganisation} onOpenUser={openUser} />}
      {view === "organisations" && <OrganisationDirectory data={data} query={query} setQuery={setQuery} results={results} onOpenOrganisation={openOrganisation} onOpenUser={openUser} onCreate={() => setCreating(true)} />}
      {view === "billing" && <BillingWorkspace data={data} plans={plans} onOpenOrganisation={openOrganisation} />}
      {view === "accountants" && <AccountantWorkspace data={accountants} onSelect={setSelectedFirm} />}
      {view === "feedback" && <section className="founder-section"><FounderFeedbackWorkspace /></section>}
      {view === "platform" && <PlatformWorkspace data={data} plans={plans} onRevokeInvitation={revokeInvitation} onResendInvitation={resendInvitation} busy={busy} />}
    </div>

    {creating && <Drawer title="Create organisation" onClose={() => setCreating(false)}><form className="founder-form-grid" onSubmit={createOrganisation}><label className="founder-span">Organisation name<input name="name" required minLength={2} autoFocus /></label><label>Type<select name="type" defaultValue="Charity"><option>Charity</option><option>Adviser</option><option>Other</option></select></label><button disabled={busy}>Create organisation</button><p className="founder-note founder-span">This creates a real account record; it is not demonstration data.</p></form></Drawer>}
    {selectedOrganisation && <OrganisationDrawer organisation={selectedOrganisation} detail={organisationDetail} data={data} busy={busy} invitationFeedback={invitationFeedback} onClose={() => setSelectedOrganisation(null)} onPlan={updatePlan} onInvite={invite} onRevokeInvitation={revokeInvitation} onResendInvitation={resendInvitation} onRevokeComplimentary={revokeComplimentary} onClientAccess={requestClientAccess} onOpenUser={openUser} onRefresh={async () => { const [dashboard, detail] = await Promise.all([founderCall<Dashboard>("dashboard"), founderCall<OrganisationDetail>(`organisation/${selectedOrganisation.id}`)]); setData(dashboard); setOrganisationDetail(detail); }} />}
    {selectedUser && <UserDrawer detail={selectedUser} onClose={() => setSelectedUser(null)} onOpenOrganisation={openOrganisation} />}
    {selectedFirm && <FirmDrawer firm={selectedFirm} busy={busy} onClose={() => setSelectedFirm(null)} onSaved={refreshed => { setAccountants(refreshed); setSelectedFirm(refreshed.firms.find(row => row.id === selectedFirm.id) || null); }} onError={setError} onNotice={setNotice} />}
  </main>;
}

function message(caught: unknown, fallback: string) { return caught instanceof Error ? caught.message : fallback; }

function HomeDashboard({ data, query, setQuery, results, onOpenOrganisation, onOpenUser, onSwitch }: {
  data: Dashboard;
  query: string;
  setQuery: (value: string) => void;
  results: { organisations: Organisation[]; users: Dashboard["users"] };
  onOpenOrganisation: (candidate: string | Organisation) => void;
  onOpenUser: (id?: string) => void;
  onSwitch: (view: FounderView) => void;
}) {
  const metrics: Array<[number, string, FounderView]> = [
    [data.metrics.organisations, "Total organisations", "organisations"],
    [data.metrics.registeredUsers, "Registered users", "organisations"],
    [data.metrics.newOrganisationsThisWeek, "New this week", "organisations"],
    [data.metrics.recentlyActiveOrganisations, "Recently active", "organisations"],
    [data.metrics.activeSubscriptions, "Active subscriptions", "billing"],
    [data.metrics.complimentaryAccounts, "Complimentary accounts", "billing"],
    [data.metrics.organisationsAssessing, "Currently assessing", "readiness"],
  ];
  const organisations = query.trim() ? results.organisations : data.organisations.slice(0, 12);
  return <section className="founder-section">
    <div className="founder-stats founder-stats--overview">{metrics.map(([value, text, target]) => <button key={text} className="founder-stat" onClick={() => onSwitch(target)}><strong>{value}</strong><span>{text}</span></button>)}</div>

    <div className="founder-search-card">
      <label htmlFor="founder-search">Search organisations or users...</label>
      <div><span aria-hidden="true">⌕</span><input id="founder-search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search organisations or users..." autoComplete="off" /></div>
      {query.trim() && <div className="founder-search-results">
        {!results.organisations.length && !results.users.length && <p>No organisation or user matches “{query}”.</p>}
        {results.organisations.slice(0, 8).map(row => <button key={row.id} onClick={() => onOpenOrganisation(row)}><span className="founder-result-icon">O</span><span><strong>{row.name}</strong><small>{row.type} · {row.plan}</small></span><b>Open →</b></button>)}
        {results.users.slice(0, 8).map(row => <button key={row.id} onClick={() => onOpenUser(row.id)}><span className="founder-result-icon founder-result-icon--user">U</span><span><strong>{row.name}</strong><small>{row.email} · {row.organisationName || "No organisation"}</small></span><b>Open →</b></button>)}
      </div>}
    </div>

    <div className="founder-home-grid">
      <article><div className="founder-card-heading"><div><p className="founder-kicker">Recent activity</p><h2>What is happening</h2></div></div><ActivityList rows={(data.activity.length ? data.activity : data.audit).slice(0, 8)} /></article>
      <article><div className="founder-card-heading"><div><p className="founder-kicker">Requires attention</p><h2>{data.attention.length ? `${data.attention.length} item${data.attention.length === 1 ? "" : "s"}` : "All clear"}</h2></div>{data.attention.some(row => row.target === "feedback") && <button className="founder-text-button" onClick={() => onSwitch("feedback")}>Review →</button>}</div>
        {data.attention.length ? <ul className="founder-attention">{data.attention.slice(0, 8).map((row, index) => <li key={`${row.kind}-${row.id || index}`}><span>{row.kind.slice(0, 1).toUpperCase()}</span><div><strong>{row.title}</strong><p>{row.detail}</p></div></li>)}</ul> : <p className="founder-muted">No new enquiries, pending invitations, approval requests or imminent access issues.</p>}
      </article>
    </div>

    <div className="founder-section-title founder-section-title--table"><div><p className="founder-kicker">Organisations at a glance</p><h2>Customers and partners</h2></div><button className="founder-text-button" onClick={() => onSwitch("organisations")}>View directory →</button></div>
    <OrganisationTable organisations={organisations} onOpen={onOpenOrganisation} />
  </section>;
}

function OrganisationDirectory({ data, query, setQuery, results, onOpenOrganisation, onOpenUser, onCreate }: {
  data: Dashboard;
  query: string;
  setQuery: (value: string) => void;
  results: { organisations: Organisation[]; users: Dashboard["users"] };
  onOpenOrganisation: (candidate: Organisation) => void;
  onOpenUser: (id?: string) => void;
  onCreate: () => void;
}) {
  return <section className="founder-section">
    <div className="founder-section-title"><div><p className="founder-kicker">Organisations & users</p><h2>Account directory</h2></div><button className="founder-primary" onClick={onCreate}>+ New organisation</button></div>
    <div className="founder-directory-search"><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search organisations or users..." /></div>
    {query.trim() && results.users.length > 0 && <div className="founder-user-results"><h3>Matching users</h3>{results.users.map(user => <button key={user.id} onClick={() => onOpenUser(user.id)}><strong>{user.name}</strong><span>{user.email}</span><small>{user.organisationName || "No organisation"} · {label(user.role)}</small></button>)}</div>}
    <p className="founder-table-summary">Showing {results.organisations.length} of {data.organisations.length} organisations</p>
    <OrganisationTable organisations={results.organisations} onOpen={onOpenOrganisation} />
  </section>;
}

function OrganisationTable({ organisations, onOpen }: { organisations: Organisation[]; onOpen: (organisation: Organisation) => void }) {
  const [sort, setSort] = useState<{ key: "name" | "users" | "progress" | "lastActivity"; direction: "asc" | "desc" }>({ key: "lastActivity", direction: "desc" });
  const sorted = useMemo(() => [...organisations].sort((left, right) => {
    const values = {
      name: [left.name, right.name],
      users: [Number(left.member_count || 0), Number(right.member_count || 0)],
      progress: [Number(left.progress || 0), Number(right.progress || 0)],
      lastActivity: [Date.parse(left.last_activity || left.updated_at || "") || 0, Date.parse(right.last_activity || right.updated_at || "") || 0],
    }[sort.key];
    const comparison = typeof values[0] === "string"
      ? String(values[0]).localeCompare(String(values[1]))
      : Number(values[0]) - Number(values[1]);
    return sort.direction === "asc" ? comparison : -comparison;
  }), [organisations, sort]);
  const sortBy = (key: typeof sort.key) => setSort(current => ({ key, direction: current.key === key && current.direction === "asc" ? "desc" : "asc" }));
  const heading = (text: string, key: typeof sort.key) => <button className="founder-sort" onClick={() => sortBy(key)}>{text}<span aria-hidden="true">{sort.key === key ? (sort.direction === "asc" ? " ↑" : " ↓") : " ↕"}</span></button>;
  if (!organisations.length) return <div className="founder-empty"><strong>No matching organisations</strong><p>Try another organisation, person or email address.</p></div>;
  return <div className="founder-table-wrap"><table className="founder-table">
    <thead><tr><th aria-sort={sort.key === "name" ? (sort.direction === "asc" ? "ascending" : "descending") : "none"}>{heading("Organisation", "name")}</th><th aria-sort={sort.key === "users" ? (sort.direction === "asc" ? "ascending" : "descending") : "none"}>{heading("Users", "users")}</th><th>Products</th><th aria-sort={sort.key === "progress" ? (sort.direction === "asc" ? "ascending" : "descending") : "none"}>{heading("Progress", "progress")}</th><th aria-sort={sort.key === "lastActivity" ? (sort.direction === "asc" ? "ascending" : "descending") : "none"}>{heading("Last active", "lastActivity")}</th></tr></thead>
    <tbody>{sorted.map(row => {
      const activeProducts = Object.entries(row.products || {}).filter(([, status]) => status !== "not_started" && status !== "not_recorded").map(([name]) => label(name));
      return <tr key={row.id}><td><button className="founder-link founder-link--strong" onClick={() => onOpen(row)}>{row.name}</button><small>{row.type} · {row.plan}{row.complimentary ? " · Complimentary" : ""}</small></td><td>{row.member_count || 0}</td><td>{activeProducts.length ? activeProducts.join(", ") : "None recorded"}</td><td>{Number(row.progress || 0)}%</td><td>{displayDate(row.last_activity || row.updated_at, true)}</td></tr>;
    })}</tbody>
  </table></div>;
}

function BillingWorkspace({ data, plans, onOpenOrganisation }: { data: Dashboard; plans: PlanData | null; onOpenOrganisation: (organisation: Organisation) => void }) {
  return <section className="founder-section">
    <div className="founder-section-title"><div><p className="founder-kicker">Accounts & billing</p><h2>Plans and entitlements</h2></div><p>Entitlements are live. Automated billing and discounts remain clearly separated.</p></div>
    <div className="founder-plan-cards">{plans?.plans.map(plan => <article key={plan.name}><span>{plan.name}</span><strong>{money(plan.price)}</strong><p>{plan.description}</p><small>{data.metrics.planCounts[plan.name] || 0} organisation(s)</small></article>)}</div>
    <div className="founder-callout"><div><strong>Billing connection</strong><span>{plans?.billingConnected ? "Connected" : "Not connected"}</span></div><div><strong>Discount automation</strong><span>{plans?.discountsConnected ? "Connected" : "Not connected"}</span></div><p>Complimentary access can be granted safely from an organisation record. No Founder Centre action initiates a customer charge.</p></div>
    <div className="founder-section-title founder-section-title--table"><div><p className="founder-kicker">Account status</p><h2>Paid and complimentary access</h2></div></div>
    <div className="founder-table-wrap"><table className="founder-table"><thead><tr><th>Organisation</th><th>Plan</th><th>Published price</th><th>Payable</th><th>Access</th></tr></thead><tbody>{data.organisations.map(row => <tr key={row.id}><td><button className="founder-link founder-link--strong" onClick={() => onOpenOrganisation(row)}>{row.name}</button></td><td>{row.plan}</td><td>{money(row.published_price)}</td><td>{money(row.payable_price)}</td><td>{row.complimentary ? `Complimentary${row.complimentary_end ? ` until ${displayDate(row.complimentary_end)}` : ""}` : Number(row.payable_price) ? "Paid" : "Free"}</td></tr>)}</tbody></table></div>
  </section>;
}

function AccountantWorkspace({ data, onSelect }: { data: AccountantData | null; onSelect: (firm: Accountant) => void }) {
  const [query, setQuery] = useState("");
  const firms = useMemo(() => !data ? [] : data.firms.filter(row => !query || [row.name, row.location, row.domain].some(value => String(value || "").toLowerCase().includes(query.toLowerCase()))), [data, query]);
  return <section className="founder-section">
    <div className="founder-section-title"><div><p className="founder-kicker">Accountants & advisers</p><h2>Research and directory controls</h2></div><a className="founder-primary" href="/console/" target="_blank" rel="noreferrer">Open Research Console ↗</a></div>
    {!data ? <p>Loading the existing research database…</p> : <>
      <div className="founder-stats"><div className="founder-stat"><strong>{data.metrics.total}</strong><span>Firms</span></div><div className="founder-stat"><strong>{data.metrics.researched}</strong><span>Researched</span></div><div className="founder-stat"><strong>{data.metrics.humanReviewed}</strong><span>Human reviewed</span></div><div className="founder-stat"><strong>{data.metrics.publicListings}</strong><span>Public listings</span></div><div className="founder-stat"><strong>{data.metrics.featured}</strong><span>Featured</span></div></div>
      <p className="founder-privacy">Independent research scores remain separate from paid or featured placement.</p>
      <div className="founder-directory-search"><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search firm, town or domain..." /></div>
      <div className="founder-table-wrap"><table className="founder-table"><thead><tr><th>Firm</th><th>Location</th><th>Independent score</th><th>Research</th><th>Human review</th><th>Directory</th></tr></thead><tbody>{firms.map(firm => <tr key={firm.id}><td><button className="founder-link founder-link--strong" onClick={() => onSelect(firm)}>{firm.name}</button><small>{firm.domain || firm.website || "No website"}</small></td><td>{firm.location || "Not recorded"}</td><td>{firm.overall_score === null ? "N/A" : Number(firm.overall_score).toFixed(1)}</td><td>{firm.research_completed_at ? displayDate(firm.research_completed_at) : "Not complete"}</td><td>{firm.approved_at ? "Human Reviewed" : "Not reviewed"}</td><td>{firm.public_visible ? `${firm.featured ? "Featured · " : ""}Public` : "Hidden"}</td></tr>)}</tbody></table></div>
    </>}
  </section>;
}

function invitationStatus(status?:string) {
  return ({ preparing:"Pending", pending:"Pending", sent:"Successfully sent", delivered:"Delivered", failed:"Failed", accepted:"Accepted", revoked:"Revoked", expired:"Expired" } as Record<string,string>)[String(status)] || label(status);
}

function PlatformWorkspace({ data, plans, onRevokeInvitation, onResendInvitation, busy }: { data: Dashboard; plans: PlanData | null; onRevokeInvitation:(id?:string)=>void; onResendInvitation:(id?:string)=>void; busy:boolean }) {
  return <section className="founder-section">
    <div className="founder-section-title"><div><p className="founder-kicker">Platform management</p><h2>Administration and audit</h2></div><p>Real controls are connected; unavailable commercial capabilities are labelled.</p></div>
    <div className="founder-home-grid"><article><p className="founder-kicker">Invitations</p><h2>{data.invitations.length} recorded</h2>{data.invitations.length ? <ul className="founder-attention">{data.invitations.slice(0, 12).map((row, index) => { const canRetry=["pending","sent","failed","expired"].includes(String(row.status)); return <li key={row.id || index}><span>I</span><div><strong>{row.email}</strong><p>{row.organisation_name || row.organisationName || "Organisation"} · {label(row.role)} · {invitationStatus(row.status)}</p>{row.delivery_error ? <p role="alert">{row.delivery_error}</p> : null}<small>{row.accepted_at ? `Accepted ${displayDate(row.accepted_at, true)}` : row.delivered_at ? `Delivered ${displayDate(row.delivered_at, true)}` : row.last_sent_at ? `Last submitted ${displayDate(row.last_sent_at, true)}` : `Created ${displayDate(row.created_at || row.createdAt, true)}`}{row.delivery_attempts ? ` · ${row.delivery_attempts} attempt${row.delivery_attempts === 1 ? "" : "s"}` : ""}</small>{row.id ? <div><button className="founder-link" disabled={busy || !canRetry} onClick={()=>onResendInvitation(row.id)}>Resend Invitation</button>{!["accepted","revoked"].includes(String(row.status)) ? <button className="founder-link" disabled={busy} onClick={()=>onRevokeInvitation(row.id)}>Revoke invitation</button> : null}</div> : null}</div></li>; })}</ul> : <p className="founder-muted">No invitations recorded.</p>}</article>
      <article><p className="founder-kicker">Configuration</p><h2>Connection status</h2><dl className="founder-status-list"><div><dt>Plan entitlements</dt><dd>Connected</dd></div><div><dt>Complimentary access</dt><dd>Connected</dd></div><div><dt>Automated billing</dt><dd>{plans?.billingConnected ? "Connected" : "Not connected"}</dd></div><div><dt>Billing discounts</dt><dd>{plans?.discountsConnected ? "Connected" : "Not connected"}</dd></div></dl></article></div>
    <div className="founder-section-title founder-section-title--table"><div><p className="founder-kicker">Administrative audit history</p><h2>Meaningful founder changes</h2></div></div><ActivityList rows={data.audit.slice(0, 30)} />
  </section>;
}

function FirmDrawer({ firm, busy, onClose, onSaved, onError, onNotice }: { firm: Accountant; busy: boolean; onClose: () => void; onSaved: (data: AccountantData) => void; onError: (value: string) => void; onNotice: (value: string) => void }) {
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await founderCall(`accountants/${firm.id}/directory`, { method: "POST", body: JSON.stringify({ publicVisible: form.get("publicVisible") === "on", featured: form.get("featured") === "on", featuredPriority: Number(form.get("featuredPriority") || 0), placementLabel: form.get("placementLabel") }) });
      await founderCall(`accountants/${firm.id}/human-review`, { method: "POST", body: JSON.stringify({ reviewed: form.get("humanReviewed") === "on", notes: form.get("reviewNotes") }) });
      onSaved(await founderCall<AccountantData>("accountants"));
      onNotice("Directory controls saved. The independent research score was not changed.");
    } catch (caught) { onError(message(caught, "The directory controls could not be saved.")); }
  };
  return <Drawer title={firm.name} onClose={onClose}>
    <div className="founder-record-summary"><div><span>Independent score</span><strong>{firm.overall_score === null ? "Not scored" : Number(firm.overall_score).toFixed(1)}</strong></div><div><span>Research completed</span><strong>{displayDate(firm.research_completed_at)}</strong></div><div><span>Public listing</span><strong>{firm.public_visible ? "Visible" : "Hidden"}</strong></div></div>
    <div className="founder-firm-links"><a href={`/console/firms/${firm.id}`} target="_blank" rel="noreferrer">Full research report ↗</a>{firm.public_slug && <a href={`/accountants-advisers/${firm.public_slug}/`} target="_blank" rel="noreferrer">Public profile ↗</a>}</div>
    <form className="founder-form-grid" onSubmit={save}>
      <label className="founder-check"><input type="checkbox" name="humanReviewed" defaultChecked={Boolean(firm.approved_at)} /> Human Reviewed</label>
      <label className="founder-span">Review note<textarea name="reviewNotes" placeholder="Record what was checked" /></label>
      <label className="founder-check"><input type="checkbox" name="publicVisible" defaultChecked={firm.public_visible} /> Visible in public directory</label>
      <label className="founder-check"><input type="checkbox" name="featured" defaultChecked={firm.featured} /> Featured placement</label>
      <label>Featured priority<input type="number" name="featuredPriority" min="0" max="999" defaultValue={firm.featured_priority || 0} /></label>
      <label>Placement label<input name="placementLabel" defaultValue={firm.placement_label || "Featured"} /></label>
      <button disabled={busy}>Save directory controls</button>
      <p className="founder-note founder-span">Commercial placement must use a clear public label. Human Reviewed is only for genuine human review.</p>
    </form>
  </Drawer>;
}
