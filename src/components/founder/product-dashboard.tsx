"use client";

import { Dashboard, ProductKey, ProductRecord, displayDate, label } from "./founder-model";

type Props = {
  active: Exclude<ProductKey, "home">;
  data: Dashboard;
  onOpenOrganisation: (organisationId?: string | null) => void;
  onOpenUser: (userId?: string) => void;
};

const definitions = {
  readiness: {
    kicker: "Are You SORP Ready?",
    title: "Readiness assessments",
    description: "A live view of every organisation that has started a SORP readiness assessment.",
  },
  askSorp: {
    kicker: "Ask SORP",
    title: "Usage overview",
    description: "Privacy-safe usage totals and organisation-level activity. Conversation content is not shown.",
  },
  impactReports: {
    kicker: "Charity Impact Reports",
    title: "Report workflow",
    description: "Real report-review requests, their current stage and recent activity.",
  },
  excellence: {
    kicker: "Social Impact Excellence",
    title: "Assessment progress",
    description: "Live assessment participation, progress and scores from the existing assessment engine.",
  },
  impactDirector: {
    kicker: "My Impact Director",
    title: "Engagement overview",
    description: "Recorded usage of My Impact Director. No enquiry or engagement status is inferred.",
  },
} as const;

function Stat({ value, labelText }: { value: string | number; labelText: string }) {
  return <div className="founder-stat"><strong>{value}</strong><span>{labelText}</span></div>;
}

function statusOf(row: ProductRecord) {
  if (row.feedbackReady) return "Feedback ready";
  return label(row.status);
}

function AssessmentRows({ rows, onOpenOrganisation, onOpenUser }: {
  rows: ProductRecord[];
  onOpenOrganisation: Props["onOpenOrganisation"];
  onOpenUser: Props["onOpenUser"];
}) {
  if (!rows.length) return <EmptyState text="No recorded assessment activity yet." />;
  return <div className="founder-table-wrap"><table className="founder-table">
    <thead><tr><th>Organisation</th><th>User</th><th>Status</th><th>Progress</th><th>Score</th><th>Last activity</th></tr></thead>
    <tbody>{rows.map((row, index) => <tr key={row.id || `${row.accountId}-${index}`}>
      <td><button className="founder-link" onClick={() => onOpenOrganisation(row.organisationId)}>{row.organisation || "No organisation"}</button></td>
      <td><button className="founder-link" onClick={() => onOpenUser(row.accountId)}>{row.user || row.email || "Account holder"}</button></td>
      <td><span className={`founder-status founder-status--${String(row.status || "not_started")}`}>{statusOf(row)}</span></td>
      <td>{Number(row.percentage || 0)}%</td>
      <td>{typeof row.score === "number" ? row.score.toFixed(1) : "Not calculated"}</td>
      <td>{displayDate(row.updatedAt || row.createdAt, true)}</td>
    </tr>)}</tbody>
  </table></div>;
}

export function ProductDashboard({ active, data, onOpenOrganisation, onOpenUser }: Props) {
  const definition = definitions[active];
  const readiness = data.products.readiness || [];
  const excellence = data.products.excellence || [];
  const reports = data.products.impactReports || [];
  const ask = data.products.askSorp || {};
  const director = data.products.impactDirector || [];

  const assessmentRows = active === "readiness" ? readiness : excellence;
  const average = assessmentRows.length
    ? Math.round(assessmentRows.reduce((total, row) => total + Number(row.percentage || 0), 0) / assessmentRows.length)
    : 0;

  return <section className="founder-section">
    <div className="founder-section-title"><div><p className="founder-kicker">{definition.kicker}</p><h2>{definition.title}</h2></div><p>{definition.description}</p></div>

    {(active === "readiness" || active === "excellence") && <>
      <div className="founder-stats">
        <Stat value={assessmentRows.length} labelText="Organisations and users started" />
        <Stat value={assessmentRows.filter(row => row.status === "in_progress").length} labelText="In progress" />
        <Stat value={assessmentRows.filter(row => row.status === "completed").length} labelText="Completed" />
        <Stat value={`${average}%`} labelText="Average completion" />
      </div>
      {active === "excellence" && <p className="founder-context">The existing Purpose, Leadership, Data, Delivery and Communications assessment and scoring remain unchanged.</p>}
      <AssessmentRows rows={assessmentRows} onOpenOrganisation={onOpenOrganisation} onOpenUser={onOpenUser} />
    </>}

    {active === "askSorp" && <>
      <div className="founder-stats">
        <Stat value={ask.metrics?.users || 0} labelText="Users" />
        <Stat value={ask.metrics?.conversations || 0} labelText="Conversations" />
        <Stat value={ask.metrics?.questions || 0} labelText="Questions" />
        <Stat value={ask.metrics?.completed || 0} labelText="Completed sessions" />
      </div>
      <p className="founder-privacy">{ask.note || "Only privacy-safe aggregate usage is available."}</p>
      {ask.users?.length ? <div className="founder-table-wrap"><table className="founder-table">
        <thead><tr><th>Organisation</th><th>User</th><th>Questions</th><th>Session</th><th>Last activity</th></tr></thead>
        <tbody>{ask.users.map(row => <tr key={row.sessionId}><td>{row.organisationName || "Not recorded"}</td><td>{row.name || "Account holder"}</td><td>{row.questions || 0}</td><td>{row.completed ? "Completed" : "Active"}</td><td>{displayDate(row.lastActivityAt, true)}</td></tr>)}</tbody>
      </table></div> : <EmptyState text="No Ask SORP usage has been recorded yet." />}
      {!ask.topics?.length && <p className="founder-context">Topic analytics are not currently collected, so no historical topics are invented here.</p>}
    </>}

    {active === "impactReports" && <>
      <div className="founder-stats">
        <Stat value={new Set(reports.map(row => row.organisationId).filter(Boolean)).size} labelText="Organisations" />
        <Stat value={reports.length} labelText="Reports requested" />
        <Stat value={reports.filter(row => !row.feedbackReady).length} labelText="In progress" />
        <Stat value={reports.filter(row => row.feedbackReady).length} labelText="Feedback ready" />
      </div>
      {reports.length ? <div className="founder-table-wrap"><table className="founder-table">
        <thead><tr><th>Organisation</th><th>User</th><th>Report</th><th>Stage</th><th>Last activity</th></tr></thead>
        <tbody>{reports.map((row, index) => <tr key={row.id || index}><td><button className="founder-link" onClick={() => onOpenOrganisation(row.organisationId)}>{row.organisation || "Not recorded"}</button></td><td><button className="founder-link" onClick={() => onOpenUser(row.accountId)}>{row.user || "Account holder"}</button></td><td>{row.filename || "Impact report"}</td><td>{statusOf(row)}</td><td>{displayDate(row.updatedAt, true)}</td></tr>)}</tbody>
      </table></div> : <EmptyState text="No impact report requests have been recorded yet." />}
    </>}

    {active === "impactDirector" && <>
      <div className="founder-stats">
        <Stat value={director.length} labelText="Recorded workspaces" />
        <Stat value={director.filter(row => Boolean((row.data as Record<string, unknown> | undefined)?.completed)).length} labelText="Completed" />
        <Stat value={director.filter(row => !(row.data as Record<string, unknown> | undefined)?.completed).length} labelText="In progress" />
      </div>
      {director.length ? <div className="founder-table-wrap"><table className="founder-table"><thead><tr><th>Organisation</th><th>User</th><th>Status</th><th>Revision</th><th>Last activity</th></tr></thead><tbody>{director.map((row, index) => <tr key={String(row.account_id || index)}><td><button className="founder-link" onClick={() => onOpenOrganisation(String(row.organisationId || ""))}>{String(row.organisation || "Not recorded")}</button></td><td><button className="founder-link" onClick={() => onOpenUser(String(row.accountId || row.account_id || ""))}>{String(row.user || "Account holder")}</button></td><td>{(row.data as Record<string, unknown> | undefined)?.completed ? "Completed" : "In progress"}</td><td>{String(row.revision || "—")}</td><td>{displayDate(row.updated_at, true)}</td></tr>)}</tbody></table></div> : <EmptyState text="No My Impact Director activity is recorded yet." />}
      <p className="founder-context">Enquiries and service requests are shown only when recorded by the enquiries workflow; usage is not treated as a paying engagement.</p>
    </>}
  </section>;
}

function EmptyState({ text }: { text: string }) {
  return <div className="founder-empty"><strong>Nothing to show yet</strong><p>{text}</p></div>;
}
