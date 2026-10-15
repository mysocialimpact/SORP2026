"use client";

import { useEffect, useState } from "react";

type Feedback = {
  id: string; created_at: string; rating?: number | null; category: string; user_name: string; email: string;
  organisation_name?: string | null; account_type: string; page_path: string; comment?: string | null;
  source_type: "user" | "automatic"; error_type?: string | null; technical_context?: Record<string, unknown>;
  status: "new" | "reviewing" | "actioning" | "resolved"; theme?: string | null; internal_notes?: string | null;
};
type Enquiry = {
  id: string; created_at: string; enquiry_type: string; user_name: string; email: string; organisation_name?: string | null;
  account_type: string; page_path: string; message: string; status: "new" | "actioning" | "resolved"; internal_notes?: string | null;
};
type Improvement = { id: string; feedback_id?: string | null; said: string; did: string; link_url?: string | null; published: boolean; published_at?: string | null; updated_at: string };
type Metrics = {
  summary: { new_feedback?: number; outstanding_problems?: number; average_rating?: string | number | null; resolved?: number; last_30_days?: number };
  trends: Array<{ category: string; submissions: number; average_rating?: string | number | null }>;
  recurring: Array<{ label: string; submissions: number }>;
};
type PageResult<T> = { rows: T[]; total: number; limit: number; offset: number };

async function founderCall(path: string, init?: RequestInit) {
  const response = await fetch(`/api/founder/${path}`, { ...init, headers: { "content-type": "application/json", ...(init?.headers || {}) }, cache: "no-store" });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "That founder action could not be completed.");
  return result;
}

const date = (value: string) => new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
const categoryLabel = (value: string) => ({ general: "General feedback", suggestion: "Suggestion", problem: "Reported problem" }[value] || value);

export function FounderFeedbackWorkspace() {
  const [tab, setTab] = useState<"feedback" | "enquiries" | "improvements">("feedback");
  const [feedback, setFeedback] = useState<PageResult<Feedback>>({ rows: [], total: 0, limit: 50, offset: 0 });
  const [enquiries, setEnquiries] = useState<PageResult<Enquiry>>({ rows: [], total: 0, limit: 50, offset: 0 });
  const [improvements, setImprovements] = useState<Improvement[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [selectedEnquiry, setSelectedEnquiry] = useState<Enquiry | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadOperations() {
    const [feedbackResult, enquiryResult, improvementResult, metricResult] = await Promise.all([
      founderCall("feedback?limit=50"), founderCall("enquiries?limit=50"), founderCall("improvements"), founderCall("feedback-metrics"),
    ]);
    setFeedback(feedbackResult); setEnquiries(enquiryResult); setImprovements(improvementResult); setMetrics(metricResult);
  }

  useEffect(() => {
    let active = true;
    void Promise.all([founderCall("feedback?limit=50"), founderCall("enquiries?limit=50"), founderCall("improvements"), founderCall("feedback-metrics")])
      .then(([feedbackResult, enquiryResult, improvementResult, metricResult]) => {
        if (!active) return;
        setFeedback(feedbackResult); setEnquiries(enquiryResult); setImprovements(improvementResult); setMetrics(metricResult);
      })
      .catch(cause => { if (active) setError(cause instanceof Error ? cause.message : "Errors and feedback could not be loaded."); });
    return () => { active = false; };
  }, []);

  async function search(event?: React.FormEvent) {
    event?.preventDefault(); setBusy(true); setError("");
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (query.trim()) params.set("q", query.trim());
      if (status) params.set("status", status);
      if (category && tab === "feedback") params.set("category", category);
      if (tab === "feedback") setFeedback(await founderCall(`feedback?${params}`));
      else if (tab === "enquiries") setEnquiries(await founderCall(`enquiries?${params}`));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Search could not be completed."); }
    finally { setBusy(false); }
  }

  async function loadOlder() {
    setBusy(true); setError("");
    try {
      const current = tab === "feedback" ? feedback : enquiries;
      const params = new URLSearchParams({ limit: String(current.limit), offset: String(current.rows.length) });
      if (query.trim()) params.set("q", query.trim());
      if (status) params.set("status", status);
      if (category && tab === "feedback") params.set("category", category);
      if (tab === "feedback") {
        const next = await founderCall(`feedback?${params}`) as PageResult<Feedback>;
        setFeedback(value => ({ ...next, rows: [...value.rows, ...next.rows] }));
      } else {
        const next = await founderCall(`enquiries?${params}`) as PageResult<Enquiry>;
        setEnquiries(value => ({ ...next, rows: [...value.rows, ...next.rows] }));
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Older records could not be loaded."); }
    finally { setBusy(false); }
  }

  async function saveFeedback(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selectedFeedback) return;
    const form = new FormData(event.currentTarget); setBusy(true); setError("");
    try {
      await founderCall(`feedback/${selectedFeedback.id}/update`, { method: "POST", body: JSON.stringify({ status: form.get("status"), theme: form.get("theme"), internalNotes: form.get("notes") }) });
      setNotice("Feedback status and founder notes saved."); setSelectedFeedback(null); await loadOperations();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Feedback could not be updated."); }
    finally { setBusy(false); }
  }

  async function saveEnquiry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selectedEnquiry) return;
    const form = new FormData(event.currentTarget); setBusy(true); setError("");
    try {
      await founderCall(`enquiries/${selectedEnquiry.id}/update`, { method: "POST", body: JSON.stringify({ status: form.get("status"), internalNotes: form.get("notes") }) });
      setNotice("Enquiry status and founder notes saved."); setSelectedEnquiry(null); await loadOperations();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Enquiry could not be updated."); }
    finally { setBusy(false); }
  }

  async function createImprovement(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const formElement = event.currentTarget; const form = new FormData(formElement); setBusy(true); setError("");
    try {
      await founderCall("improvements", { method: "POST", body: JSON.stringify({ feedbackId: form.get("feedbackId"), said: form.get("said"), did: form.get("did"), linkUrl: form.get("linkUrl"), published: form.get("published") === "on" }) });
      setNotice(form.get("published") === "on" ? "Improvement published to authenticated users." : "Improvement saved as a private draft."); formElement.reset(); await loadOperations();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Improvement could not be saved."); }
    finally { setBusy(false); }
  }

  async function updateImprovement(event: React.FormEvent<HTMLFormElement>, improvement: Improvement) {
    event.preventDefault(); const form = new FormData(event.currentTarget); setBusy(true); setError("");
    try {
      const published = form.get("published") === "on";
      await founderCall(`improvements/${improvement.id}/update`, { method: "POST", body: JSON.stringify({ said: form.get("said"), did: form.get("did"), linkUrl: form.get("linkUrl"), published }) });
      setNotice(published ? "Improvement is published." : "Improvement saved and unpublished."); await loadOperations();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Improvement could not be updated."); }
    finally { setBusy(false); }
  }

  return <section className="founder-feedback-workspace" aria-labelledby="founder-feedback-title">
    <header className="founder-feedback-heading"><div><p className="founder-kicker">Continuous improvement</p><h2 id="founder-feedback-title">Errors &amp; Feedback</h2><p>Listen, act, and show people what changed. Contact enquiries stay separate from product feedback.</p></div><nav aria-label="Errors and feedback views"><button className={tab === "feedback" ? "is-active" : ""} onClick={() => { setTab("feedback"); setStatus(""); }}>Feedback inbox</button><button className={tab === "enquiries" ? "is-active" : ""} onClick={() => { setTab("enquiries"); setStatus(""); }}>Marcus enquiries</button><button className={tab === "improvements" ? "is-active" : ""} onClick={() => setTab("improvements")}>You Said. We Did.</button></nav></header>
    {notice && <p className="founder-notice" role="status">{notice}</p>}{error && <p className="founder-error" role="alert">{error}</p>}
    {metrics && <><div className="founder-feedback-metrics" aria-label="Feedback overview"><div><strong>{metrics.summary.new_feedback || 0}</strong><span>New feedback</span></div><div><strong>{metrics.summary.outstanding_problems || 0}</strong><span>Outstanding problems</span></div><div><strong>{metrics.summary.average_rating || "N/A"}</strong><span>Average star rating</span></div><div><strong>{metrics.summary.resolved || 0}</strong><span>Resolved</span></div><div><strong>{metrics.summary.last_30_days || 0}</strong><span>Last 30 days</span></div></div>{metrics.recurring.length > 0 && <div className="founder-recurring"><strong>Recurring open problems</strong>{metrics.recurring.map(item => <span key={item.label}>{item.label} · {item.submissions}</span>)}</div>}</>}

    {tab !== "improvements" && <form className="founder-feedback-filters" onSubmit={search}><label>Search<input value={query} onChange={event => setQuery(event.target.value)} placeholder="Name, organisation, page or words" /></label><label>Status<select value={status} onChange={event => setStatus(event.target.value)}><option value="">All statuses</option><option value="new">New</option>{tab === "feedback" && <option value="reviewing">Reviewing</option>}<option value="actioning">Actioning</option><option value="resolved">Resolved</option></select></label>{tab === "feedback" && <label>Category<select value={category} onChange={event => setCategory(event.target.value)}><option value="">All categories</option><option value="general">General</option><option value="suggestion">Suggestion</option><option value="problem">Problem</option></select></label>}<button disabled={busy}>Apply filters</button></form>}

    {tab === "feedback" && <div className="founder-table-wrap"><table className="founder-table founder-feedback-table"><thead><tr><th>Date</th><th>Rating</th><th>Type</th><th>Person &amp; organisation</th><th>Page</th><th>Feedback</th><th>Status</th><th /></tr></thead><tbody>{feedback.rows.map(item => <tr key={item.id}><td>{date(item.created_at)}</td><td><span className="founder-stars" aria-label={item.rating ? `${item.rating} out of 5 stars` : "No rating"}>{item.rating ? `${"★".repeat(item.rating)}${"☆".repeat(5-item.rating)}` : "N/A"}</span></td><td><strong>{categoryLabel(item.category)}</strong><small>{item.source_type === "automatic" ? "Automatically detected technical error" : item.category === "problem" ? "User-submitted problem" : "User-submitted"}</small></td><td><strong>{item.user_name}</strong><small>{item.organisation_name || "Individual"} · {item.account_type}</small></td><td><code>{item.page_path}</code></td><td>{item.comment || <em>Rating only</em>}</td><td><span className={`founder-status is-${item.status}`}>{item.status}</span></td><td><button className="founder-row-action" onClick={() => setSelectedFeedback(item)}>Open →</button></td></tr>)}</tbody></table>{feedback.rows.length < feedback.total && <button className="founder-load-more" onClick={() => void loadOlder()} disabled={busy}>Load older feedback ({feedback.total - feedback.rows.length} remaining)</button>}{!feedback.rows.length && <p className="founder-empty">No feedback matches these filters.</p>}</div>}

    {tab === "enquiries" && <div className="founder-table-wrap"><table className="founder-table founder-feedback-table"><thead><tr><th>Date</th><th>Enquiry</th><th>Person &amp; organisation</th><th>Page</th><th>Message</th><th>Status</th><th /></tr></thead><tbody>{enquiries.rows.map(item => <tr key={item.id}><td>{date(item.created_at)}</td><td><strong>{item.enquiry_type === "advice" ? "Advice" : item.enquiry_type === "meeting" ? "Meeting" : "Question"}</strong></td><td><strong>{item.user_name}</strong><small>{item.organisation_name || "Individual"} · {item.account_type}</small></td><td><code>{item.page_path}</code></td><td>{item.message}</td><td><span className={`founder-status is-${item.status}`}>{item.status}</span></td><td><button className="founder-row-action" onClick={() => setSelectedEnquiry(item)}>Open →</button></td></tr>)}</tbody></table>{enquiries.rows.length < enquiries.total && <button className="founder-load-more" onClick={() => void loadOlder()} disabled={busy}>Load older enquiries ({enquiries.total - enquiries.rows.length} remaining)</button>}{!enquiries.rows.length && <p className="founder-empty">No enquiries match these filters.</p>}</div>}

    {tab === "improvements" && <div className="founder-improvements-admin"><form className="founder-improvement-create" onSubmit={createImprovement}><p className="founder-kicker">Create improvement</p><h3>Publish only what genuinely changed.</h3><label>Associate with feedback <select name="feedbackId" defaultValue=""><option value="">No linked submission</option>{feedback.rows.filter(item => item.category !== "general").map(item => <option key={item.id} value={item.id}>{item.user_name} · {(item.comment || categoryLabel(item.category)).slice(0, 80)}</option>)}</select></label><label>You said<textarea name="said" required maxLength={1000} placeholder="What users told us…" /></label><label>We did<textarea name="did" required maxLength={2000} placeholder="What genuinely changed…" /></label><label>Relevant internal link<input name="linkUrl" placeholder="/dashboard/" /></label><label className="founder-check"><input type="checkbox" name="published" /> Publish to authenticated users now</label><button className="founder-save" disabled={busy}>Save improvement →</button></form><div className="founder-improvement-list">{improvements.map(item => <form key={item.id} onSubmit={event => void updateImprovement(event, item)}><header><span className={`founder-status ${item.published ? "is-resolved" : "is-reviewing"}`}>{item.published ? "Published" : "Draft"}</span>{item.published_at && <time dateTime={item.published_at}>{date(item.published_at)}</time>}</header><label>You said<textarea name="said" required defaultValue={item.said} maxLength={1000} /></label><label>We did<textarea name="did" required defaultValue={item.did} maxLength={2000} /></label><label>Relevant link<input name="linkUrl" defaultValue={item.link_url || ""} /></label><label className="founder-check"><input type="checkbox" name="published" defaultChecked={item.published} /> Published</label><button className="founder-save" disabled={busy}>Save changes</button></form>)}{!improvements.length && <p>No improvements have been drafted yet.</p>}</div></div>}

    {selectedFeedback && <div className="founder-modal" role="dialog" aria-modal="true" aria-labelledby="feedback-detail-title"><form className="founder-modal-card founder-feedback-detail" onSubmit={saveFeedback}><button className="founder-close" type="button" onClick={() => setSelectedFeedback(null)} aria-label="Close">×</button><p className="founder-kicker">{selectedFeedback.source_type === "automatic" ? "Automatically detected technical error" : selectedFeedback.category === "problem" ? "User-submitted problem" : categoryLabel(selectedFeedback.category)}</p><h2 id="feedback-detail-title">{selectedFeedback.user_name}</h2><p>{selectedFeedback.organisation_name || "Individual"} · <a href={`mailto:${selectedFeedback.email}`}>{selectedFeedback.email}</a> · {date(selectedFeedback.created_at)}</p><blockquote>{selectedFeedback.comment || `${selectedFeedback.rating} out of 5 stars`}</blockquote><dl><div><dt>Page</dt><dd>{selectedFeedback.page_path}</dd></div><div><dt>Account type</dt><dd>{selectedFeedback.account_type}</dd></div>{selectedFeedback.error_type && <div><dt>Error type</dt><dd>{selectedFeedback.error_type}</dd></div>}</dl>{selectedFeedback.source_type === "automatic" && selectedFeedback.technical_context && <details><summary>Safe technical context</summary><pre>{JSON.stringify(selectedFeedback.technical_context, null, 2)}</pre></details>}<label>Status<select name="status" defaultValue={selectedFeedback.status}><option value="new">New</option><option value="reviewing">Reviewing</option><option value="actioning">Actioning</option><option value="resolved">Resolved</option></select></label><label>Recurring theme<input name="theme" defaultValue={selectedFeedback.theme || ""} placeholder="e.g. Report downloads" /></label><label>Internal founder notes<textarea name="notes" defaultValue={selectedFeedback.internal_notes || ""} rows={5} maxLength={5000} /></label><div className="founder-detail-actions"><a href={`mailto:${selectedFeedback.email}?subject=${encodeURIComponent("Your SORP 2026 feedback")}`}>Contact this user →</a><button className="founder-save" disabled={busy}>Save review</button></div></form></div>}

    {selectedEnquiry && <div className="founder-modal" role="dialog" aria-modal="true" aria-labelledby="enquiry-detail-title"><form className="founder-modal-card founder-feedback-detail" onSubmit={saveEnquiry}><button className="founder-close" type="button" onClick={() => setSelectedEnquiry(null)} aria-label="Close">×</button><p className="founder-kicker">Marcus enquiry · {selectedEnquiry.enquiry_type}</p><h2 id="enquiry-detail-title">{selectedEnquiry.user_name}</h2><p>{selectedEnquiry.organisation_name || "Individual"} · <a href={`mailto:${selectedEnquiry.email}`}>{selectedEnquiry.email}</a> · {date(selectedEnquiry.created_at)}</p><blockquote>{selectedEnquiry.message}</blockquote><label>Status<select name="status" defaultValue={selectedEnquiry.status}><option value="new">New</option><option value="actioning">Actioning</option><option value="resolved">Resolved</option></select></label><label>Internal founder notes<textarea name="notes" defaultValue={selectedEnquiry.internal_notes || ""} rows={5} maxLength={5000} /></label><div className="founder-detail-actions"><a href={`mailto:${selectedEnquiry.email}?subject=${encodeURIComponent("Your message to Marcus about SORP 2026")}`}>Reply by email →</a><button className="founder-save" disabled={busy}>Save enquiry</button></div></form></div>}
  </section>;
}
