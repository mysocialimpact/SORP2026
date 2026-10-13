"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  categories,
  evidenceLevel,
  levelNames,
  type Firm,
  type Evidence,
  type Assessment,
  type Methodology,
} from "@/lib/console/model";
import {
  api,
  useData,
  State,
  Form,
  fields,
  Badge,
  Source,
  DateText,
} from "./ui";
type Office = {
  id: string;
  address: string;
  town: string;
  region: string;
  country: string;
  postcode: string;
  telephone: string;
  source_url: string;
  verification: string;
};
type Person = {
  id: string;
  name: string;
  role: string;
  office: string;
  qualifications: string[] | null;
  dcha: boolean | null;
  responsibilities: string;
  profile_url: string;
  notes: string;
};
type Run = {
  id: string;
  status: string;
  stage: string;
  started_at: string;
  completed_at: string | null;
  limitations: string[];
};
type ReportData = {
  firm: Firm;
  evidence: Evidence[];
  assessments: Assessment[];
  methods: Methodology[];
  runs: Run[];
  offices: Office[];
  people: Person[];
  sources: {
    id: string;
    url: string;
    title: string;
    status: string;
    error: string;
    accessed_at: string;
  }[];
  reviews: {
    id: string;
    decision: string;
    notes: string;
    created_at: string;
    actor: string;
  }[];
  history: {
    id: string;
    entity: string;
    reason: string;
    created_at: string;
    previous: unknown;
    next: unknown;
  }[];
};
export function Report({ id }: { id: string }) {
  const { data, error, reload } = useData<ReportData>("firms/" + id);
  const [runUpdate, setActiveRun] = useState<Run | null>(null);
  const activeRun =
    runUpdate ||
    data?.runs.find((r) => ["running", "assessing"].includes(r.status)) ||
    null;
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  useEffect(() => {
    if (!activeRun || !["running", "assessing"].includes(activeRun.status))
      return;
    const timer = setInterval(() => {
      api<Run>("runs/" + activeRun.id)
        .then((r) => {
          setActiveRun(r);
          if (!["running", "assessing"].includes(r.status)) reload();
        })
        .catch((e) => setActionError(e.message));
    }, 2200);
    return () => clearInterval(timer);
  }, [activeRun, reload]);
  if (!data || error) return <State error={error} />;
  const f = data.firm;
  const a = data.assessments[0];
  const m = data.methods[0];
  const level = evidenceLevel(f.total, m.boundaries);
  const running = Boolean(
    activeRun && ["running", "assessing"].includes(activeRun.status),
  );
  async function research() {
    setBusy(true);
    setActionError("");
    try {
      if (!f.website) await api("firms/" + id + "/website-discovery", {});
      const run = await api<{ id: string }>("firms/" + id + "/research", {
        refresh: true,
      });
      setActiveRun({
        id: run.id,
        status: "running",
        stage: "Starting research",
        started_at: new Date().toISOString(),
        completed_at: null,
        limitations: [],
      });
      reload();
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Link className="rc-back" href="/console/firms/">
        ← All accountants
      </Link>
      {f.merged_into && (
        <div className="rc-notice">
          This identity was merged.{" "}
          <Link href={"/console/firm/" + f.merged_into + "/"}>
            Open the retained firm and research →
          </Link>
        </div>
      )}
      <section className="rc-dossier-header">
        <div>
          <p className="rc-eyebrow">THE EVIDENCE DOSSIER</p>
          <h1>{f.name}</h1>
          <Source
            url={f.website}
            label={
              f.website
                ? new URL(f.website).hostname + " →"
                : "Website not recorded"
            }
          />
          <div className="rc-report-tags">
            <Badge>{f.status}</Badge>
            <Badge>{f.review_status}</Badge>
            <Badge>{f.sorp || "SORP not assessed"}</Badge>
          </div>
          <p>
            Last completed research:{" "}
            <DateText value={f.research_completed_at} />
            <br />
            Confidence: {f.confidence || "Not assessed"} ·{" "}
            {a ? a.origin : "Incomplete — no score awarded"}
          </p>
        </div>
        <div className="rc-overall">
          <span>PUBLIC EVIDENCE SCORE</span>
          <strong>
            {f.total ?? "—"}
            <small>/100</small>
          </strong>
          <p>
            {level === null
              ? "Not yet scored"
              : `Level ${level} · ${levelNames[level]}`}
          </p>
          <Link href="/console/methodology/">
            How the evidence is assessed →
          </Link>
        </div>
      </section>
      <div className="rc-notice">
        {a?.origin.startsWith("Automated") && (
          <strong>Provisional — awaiting Marcus’s review. </strong>
        )}
        This assessment measures publicly available evidence of
        charity-accounting experience. It is not a rating of service quality.
      </div>
      <div className="rc-report-actions">
        <button
          className="rc-button"
          onClick={research}
          disabled={busy || running || Boolean(f.merged_into)}
        >
          {busy
            ? "Starting…"
            : running
              ? "Research underway…"
              : data.runs.length
                ? "Refresh research"
                : "Research this accountant"}{" "}
          <span>→</span>
        </button>
        <a className="rc-button rc-secondary" href="#review">
          Review & decide ↓
        </a>
        <a href="#add-evidence">Add evidence →</a>
        <button
          className="rc-text-button"
          disabled={running || busy}
          onClick={async () => {
            setBusy(true);
            setActionError("");
            try {
              const result = await api<{ total: number | null }>(
                "firms/" + id + "/auto-score",
                {},
              );
              if (result.total === null)
                setActionError(
                  "More source coverage is needed before scoring. Run website research or add further evidence.",
                );
              reload();
            } catch (e) {
              setActionError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          Apply provisional scoring →
        </button>
        {!f.website && (
          <small>
            Research will first search for this firm’s official website.
          </small>
        )}
      </div>
      {actionError && (
        <p className="rc-error" role="alert">
          {actionError}
        </p>
      )}
      {activeRun && (
        <div className="rc-run" role="status">
          {running && <span className="rc-spinner" />}
          <div>
            <strong>
              {["failed", "interrupted"].includes(activeRun.status)
                ? "Research incomplete — action needed"
                : activeRun.stage}
            </strong>
            <p>
              {running
                ? "Live stage from the saved research run. Collected sources will appear below."
                : ["failed", "interrupted"].includes(activeRun.status)
                  ? "The run did not complete. Any earlier evidence and assessments are retained."
                  : "Evidence is saved. Review the findings, provisional scores and source links below."}
            </p>
            {!running && activeRun.limitations?.length > 0 && (
              <ul>
                {activeRun.limitations.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            )}
            {running && (
              <button onClick={research}>
                Run interrupted? Retry research
              </button>
            )}
          </div>
        </div>
      )}
      <section className="rc-section">
        <div className="rc-section-heading">
          <div>
            <p className="rc-eyebrow">FIVE QUESTIONS. TRACEABLE ANSWERS.</p>
            <h2>Where the evidence leads.</h2>
          </div>
          <span>
            {a
              ? data.methods.find((v) => v.id === a.methodology_id)?.name
              : "Assessment incomplete"}
          </span>
        </div>
        <div className="rc-category-list">
          {categories.map((c, i) => {
            const supporting = data.evidence.filter(
              (e) =>
                e.category === c.id ||
                e.supported_categories?.includes(c.id) ||
                a?.evidence_ids[c.id]?.includes(e.id),
            );
            const score = a?.scores[c.id];
            return (
              <details className="rc-category" key={c.id}>
                <summary>
                  <span className="rc-category-number">0{i + 1}</span>
                  <div>
                    <h3>{c.name}</h3>
                    <div className="rc-bar">
                      <i
                        style={{
                          width:
                            score !== undefined
                              ? (score / c.max) * 100 + "%"
                              : "0%",
                        }}
                      />
                    </div>
                  </div>
                  <strong>
                    {score ?? "—"}
                    <small>/{c.max}</small>
                  </strong>
                  <span className="rc-expand">+</span>
                </summary>
                <div className="rc-category-content">
                  <h4>Why this score?</h4>
                  <p>
                    {a?.reasons[c.id] ||
                      "No score has been awarded. Collected evidence needs review against the methodology."}
                  </p>
                  <p>
                    <strong>Standard:</strong> {c.description}
                  </p>
                  <p>
                    Confidence: {a?.confidence || "Not assessed"}. Automated
                    awards are provisional; historical and manual assessments
                    retain their original reasoning.
                  </p>
                  {a?.awards
                    ?.filter((w) => w.category === c.id)
                    .map((w) => (
                      <div className="rc-panel" key={w.criterion_id}>
                        <strong>
                          {w.criterion_id} · +{w.points} points
                        </strong>
                        <p>{w.justification}</p>
                        <p>{w.quote}</p>
                        <Source url={w.source_url} />
                        <p className="rc-muted">
                          {w.confidence} · {w.origin}
                        </p>
                      </div>
                    ))}
                  {a && (
                    <p>
                      Evidence cited for this award:{" "}
                      {a.evidence_ids[c.id]?.length || 0}.{" "}
                      {a.evidence_ids[c.id]?.map((eid) => (
                        <a key={eid} href={"#evidence-" + eid}>
                          View cited evidence →{" "}
                        </a>
                      ))}
                    </p>
                  )}
                  <h4>Supporting research</h4>
                  {supporting.length ? (
                    supporting.map((e) => (
                      <EvidenceCard
                        key={e.id}
                        evidence={e}
                        firmId={id}
                        reload={reload}
                      />
                    ))
                  ) : (
                    <p>
                      No evidence recorded in this category. This is a research
                      gap, not a finding about the firm’s capabilities.
                    </p>
                  )}
                  <h4>Pages examined and unavailable</h4>
                  {data.sources.map((s) => (
                    <p key={s.id}>
                      <Source url={s.url} label={s.title || s.url} /> ·{" "}
                      {s.status}
                      {s.error ? " — " + s.error : ""}
                    </p>
                  ))}
                  <h4>What is missing?</h4>
                  <p>
                    {a?.gaps.join(" · ") ||
                      "Full source coverage and a documented category assessment are still needed."}
                  </p>
                  <Link href="/console/methodology/">
                    Open the methodology →
                  </Link>
                </div>
              </details>
            );
          })}
        </div>
      </section>
      <section className="rc-two rc-section">
        <div className="rc-panel">
          <p className="rc-eyebrow">CHECKS, NOT EXTRA POINTS</p>
          <h2>Verification notebook.</h2>
          <div className="rc-level-row">
            <span>ICAEW listing</span>
            <b>{f.icaew_url ? "Source supplied; inspect" : "Unverified"}</b>
          </div>
          <Source url={f.icaew_url} label="Open ICAEW record →" />
          <div className="rc-level-row">
            <span>ICAEW charity tag</span>
            <b>
              {f.icaew_tag === null
                ? "Unverified"
                : f.icaew_tag
                  ? "Imported tag"
                  : "Not recorded"}
            </b>
          </div>
          {[
            [
              "Charity service evidence",
              data.evidence.some((e) => e.category === "services")
                ? "Recorded — inspect sources"
                : "Not identified in saved evidence",
            ],
            [
              "Named people",
              data.people.length
                ? `${data.people.length} recorded`
                : "Not identified",
            ],
            [
              "DChA",
              data.people.some((p) => p.dcha === true)
                ? "Qualification evidence recorded"
                : "Unverified",
            ],
            [
              "Charity audit / examination",
              "Inspect service evidence; not inferred",
            ],
            [
              "Professional credentials / team",
              "Inspect person records; not inferred",
            ],
            ["SORP knowledge", f.sorp || "Not assessed"],
            [
              "Charity clients / external recognition",
              "Inspect the category evidence above",
            ],
          ].map(([k, v]) => (
            <div className="rc-level-row" key={k}>
              <span>{k}</span>
              <b>{v}</b>
            </div>
          ))}
        </div>
        <div className="rc-panel rc-gaps">
          <p className="rc-eyebrow">GOOD RESEARCH LEAVES ROOM FOR QUESTIONS</p>
          <h2>What don’t we know yet?</h2>
          {a?.gaps.length ? (
            <ul>
              {a.gaps.map((g, i) => (
                <li key={i}>{g}</li>
              ))}
            </ul>
          ) : (
            <p>
              No complete gap assessment has been saved. Check named people,
              qualifications, clients, external recognition and specific SORP
              2026 guidance.
            </p>
          )}
          <h3>A useful next step</h3>
          <p>
            {!f.website
              ? "Confirm the firm’s official website."
              : !data.runs.length
                ? "Collect the official website and inspect the original sources."
                : !a
                  ? "Verify the extracts, add missing sources and complete a manual assessment."
                  : "Review the evidence gaps and decide whether more research is needed."}
          </p>
          <p>
            Sources checked are a limited window into a firm’s work. We never
            interpret silence as proof of no expertise.
          </p>
        </div>
      </section>
      <section className="rc-section">
        <div className="rc-section-heading">
          <div>
            <p className="rc-eyebrow">FOLLOW THE FOOTNOTES</p>
            <h2>The source collection.</h2>
          </div>
          <span>{data.evidence.length} evidence items</span>
        </div>
        <div className="rc-evidence-grid">
          {data.evidence.map((e) => (
            <EvidenceCard key={e.id} evidence={e} firmId={id} reload={reload} />
          ))}
        </div>
        {!data.evidence.length && (
          <p className="rc-empty">
            No sources collected yet. Start research or add a source yourself.
          </p>
        )}
      </section>
      <section className="rc-two rc-section">
        <div className="rc-panel">
          <h2>People behind the practice.</h2>
          {data.people.length ? (
            data.people.map((p) => (
              <article className="rc-person" key={p.id}>
                <h3>{p.name}</h3>
                <p>{p.role}</p>
                <p>
                  {p.qualifications?.join(", ") ||
                    "Qualifications not verified"}{" "}
                  · DChA:{" "}
                  {p.dcha === null
                    ? "Unverified"
                    : p.dcha
                      ? "Recorded"
                      : "Not recorded"}
                </p>
                <p>
                  {p.responsibilities} {p.office}
                </p>
                <Source url={p.profile_url} />
                <small>{p.notes}</small>
              </article>
            ))
          ) : (
            <p>
              No structured person records yet. Names in collected extracts need
              verification before being added.
            </p>
          )}
        </div>
        <div className="rc-panel">
          <h2>One firm. Its offices.</h2>
          {data.offices.length ? (
            data.offices.map((o) => (
              <article className="rc-person" key={o.id}>
                <h3>{o.town || o.postcode || "Office"}</h3>
                <p>
                  {o.address}
                  <br />
                  {[o.region, o.country, o.postcode]
                    .filter(Boolean)
                    .join(" · ")}
                  <br />
                  {o.telephone}
                </p>
                <Badge>{o.verification}</Badge>
                <Source url={o.source_url} />
              </article>
            ))
          ) : (
            <p>No office details verified yet.</p>
          )}
        </div>
      </section>
      <section id="review" className="rc-section">
        <div className="rc-page-title">
          <p className="rc-eyebrow">YOUR EXPERIENCE COMPLETES THE PICTURE</p>
          <h2>Over to you, Marcus.</h2>
          <p>
            Inspect, challenge, correct and decide. Every change leaves a trail.
          </p>
        </div>
        <div className="rc-two">
          <div className="rc-panel">
            <h3>Your review decision</h3>
            <Form
              label="Save review"
              onDone={reload}
              submit={(f) => api("firms/" + id + "/review", fields(f))}
            >
              <label>
                Decision
                <select name="decision">
                  {[
                    "Note",
                    "Agree with assessment",
                    "Research completed — unscored",
                    "Approved",
                    "Not qualified",
                    "Needs more evidence",
                    "Recheck later",
                  ].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label>
                Internal notes
                <textarea name="notes" rows={4} maxLength={6000} />
              </label>
              <label>
                Recheck date (if applicable)
                <input name="recheck_at" type="date" />
              </label>
              <p className="rc-muted">
                Approval requires a completed assessment. New evidence or score
                changes require review again.
              </p>
            </Form>
          </div>
          <div className="rc-panel">
            <h3>Keep the identity accurate.</h3>
            <Form
              label="Save corrections"
              onDone={reload}
              submit={(f) => api("firms/" + id + "/correct", fields(f))}
            >
              <label>
                Firm name
                <input name="name" defaultValue={f.name} required />
              </label>
              <label>
                Official website
                <input
                  name="website"
                  type="url"
                  defaultValue={f.website || ""}
                />
              </label>
              <label>
                Trading / former names (one per line)
                <textarea name="aliases" defaultValue={f.aliases.join("\n")} />
              </label>
              <div className="rc-two">
                <label>
                  Queue priority (0–100)
                  <input
                    name="priority"
                    type="number"
                    min={0}
                    max={100}
                    defaultValue={f.priority}
                  />
                </label>
                <label>
                  Reason
                  <input name="reason" required />
                </label>
              </div>
            </Form>
          </div>
        </div>
        <details className="rc-panel rc-section">
          <summary>
            {a
              ? "Edit scores — preserve this assessment"
              : "Create a manual evidence assessment"}
          </summary>
          <AssessmentForm
            id={id}
            evidence={data.evidence}
            previous={a}
            reload={reload}
          />
        </details>
        <section id="add-evidence" className="rc-panel rc-section">
          <h3>Add a source or observation.</h3>
          <Form
            label="Save evidence"
            onDone={reload}
            submit={(f) => api("firms/" + id + "/evidence", fields(f))}
          >
            <div className="rc-two">
              <label>
                Source type
                <select name="source_type">
                  {[
                    "Firm website",
                    "ICAEW",
                    "External",
                    "Internal note",
                    "Marcus observation",
                  ].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>
              <label>
                Category
                <select name="category">
                  <option value="">Uncategorised</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Source / page title
                <input name="title" required maxLength={500} />
              </label>
              <label>
                Exact source URL
                <input name="url" type="url" placeholder="https://…" />
              </label>
            </div>
            <label>
              Evidence description or permitted short extract
              <textarea name="summary" required rows={3} maxLength={6000} />
            </label>
            <div className="rc-two">
              <label>
                Date you accessed the source
                <input name="accessed_at" type="date" />
              </label>
              <label>
                SORP evidence
                <select name="sorp">
                  {[
                    "Not assessed",
                    "None found",
                    "General SORP",
                    "Specific SORP 2026",
                  ].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              Uncertainties / notes
              <textarea name="notes" />
            </label>
          </Form>
        </section>
        <div className="rc-two rc-section">
          <details className="rc-panel">
            <summary>Add a verified person</summary>
            <Form
              label="Save person"
              onDone={reload}
              submit={(form) => api("firms/" + id + "/people", fields(form))}
            >
              <label>
                Name
                <input name="name" required />
              </label>
              <label>
                Role
                <input name="role" />
              </label>
              <label>
                Office
                <input name="office" />
              </label>
              <label>
                Verified qualifications (comma-separated)
                <input name="qualifications" />
              </label>
              <label>
                DChA
                <select name="dcha">
                  <option value="">Unverified</option>
                  <option value="true">Verified in source</option>
                  <option value="false">Not recorded in source</option>
                </select>
              </label>
              <label>
                Charity responsibilities
                <textarea name="responsibilities" />
              </label>
              <label>
                Professional profile / source URL
                <input type="url" name="source_url" required />
              </label>
              <label>
                Evidence notes
                <textarea name="notes" />
              </label>
            </Form>
          </details>
          <details className="rc-panel">
            <summary>Add a confirmed office</summary>
            <Form
              label="Save office"
              onDone={reload}
              submit={(form) => api("firms/" + id + "/offices", fields(form))}
            >
              {[
                ["address", "Full address"],
                ["town", "Town / city"],
                ["region", "County / region"],
                ["country", "Country"],
                ["postcode", "Postcode"],
                ["telephone", "Telephone"],
              ].map(([name, label]) => (
                <label key={name}>
                  {label}
                  <input name={name} required={name === "address"} />
                </label>
              ))}
              <label>
                Office source URL
                <input type="url" name="source_url" required />
              </label>
            </Form>
          </details>
        </div>
        <details className="rc-panel rc-section">
          <summary>Merge a confirmed duplicate</summary>
          <p>
            Use only after verifying that both records represent the same firm.
            Sources and research move to the retained record; the original
            identity and merge history remain recoverable. Approval must be
            reviewed again.
          </p>
          <Form
            label="Merge confirmed duplicate"
            submit={async (form) => {
              if (form.get("confirmed") !== "on")
                throw new Error("Confirm the identity match.");
              await api("firms/" + id + "/merge", {
                target: form.get("target"),
              });
              reload();
            }}
          >
            <label>
              Retained firm ID
              <input
                name="target"
                required
                placeholder="ID from the retained firm’s report URL"
              />
            </label>
            <label className="rc-checkbox">
              <input name="confirmed" type="checkbox" required />I verified both
              records are the same firm.
            </label>
          </Form>
        </details>
      </section>
      <section className="rc-panel rc-section">
        <h2>Research & decision history.</h2>
        {data.runs.map((r) => (
          <details key={r.id}>
            <summary>
              {r.stage} · <DateText value={r.started_at} />
            </summary>
            <ul>
              {r.limitations.map((l, i) => (
                <li key={i}>{l}</li>
              ))}
            </ul>
          </details>
        ))}
        {data.assessments.map((v) => (
          <details key={v.id}>
            <summary>
              {v.total}/100 · {v.origin} assessment ·{" "}
              <DateText value={v.created_at} />
            </summary>
            <p>
              Original methodology:{" "}
              {data.methods.find((m) => m.id === v.methodology_id)?.name} ·
              original evidence level{" "}
              {evidenceLevel(
                v.total,
                data.methods.find((m) => m.id === v.methodology_id)?.boundaries,
              )}
            </p>
            <pre>
              {JSON.stringify(
                {
                  scores: v.scores,
                  reasons: v.reasons,
                  evidence: v.evidence_ids,
                },
                null,
                2,
              )}
            </pre>
          </details>
        ))}
        {data.reviews.map((r) => (
          <div className="rc-history" key={r.id}>
            <Badge>{r.decision}</Badge>
            <p>{r.notes}</p>
            <small>
              <DateText value={r.created_at} /> · {r.actor}
            </small>
          </div>
        ))}
        <details>
          <summary>Full change trail</summary>
          {data.history.map((h) => (
            <details key={h.id}>
              <summary>
                {h.entity} · {h.reason} · <DateText value={h.created_at} />
              </summary>
              <pre>
                {JSON.stringify({ before: h.previous, after: h.next }, null, 2)}
              </pre>
            </details>
          ))}
        </details>
      </section>
    </>
  );
}
function EvidenceCard({
  evidence: e,
  firmId,
  reload,
}: {
  evidence: Evidence;
  firmId: string;
  reload: () => void;
}) {
  return (
    <article id={"evidence-" + e.id} className="rc-evidence">
      <div>
        <Badge>{e.source_type}</Badge>
        <small>
          {e.confidence} · {e.state}
        </small>
      </div>
      <h3>{e.title}</h3>
      <p>{e.summary}</p>
      <Source url={e.url} />
      <small>
        Accessed <DateText value={e.accessed_at} /> · {e.sorp}
      </small>
      {e.published_at && (
        <small>
          Published <DateText value={e.published_at} />
        </small>
      )}
      {e.people?.length > 0 && <p>People: {e.people.join(", ")}</p>}
      {e.notes && <p className="rc-muted">{e.notes}</p>}
      <details>
        <summary>Review this evidence</summary>
        <Form
          label="Save evidence flag"
          onDone={reload}
          submit={(f) =>
            api("firms/" + firmId + "/flag", {
              id: e.id,
              state: f.get("state"),
            })
          }
        >
          <label>
            State
            <select name="state" defaultValue={e.state}>
              {["Current", "Questionable", "Outdated"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
        </Form>
      </details>
    </article>
  );
}
function AssessmentForm({
  id,
  evidence,
  previous: a,
  reload,
}: {
  id: string;
  evidence: Evidence[];
  previous?: Assessment;
  reload: () => void;
}) {
  return (
    <Form
      label="Save assessment with history"
      onDone={reload}
      submit={(form) => {
        const scores: Record<string, number> = {},
          reasons: Record<string, string> = {},
          refs: Record<string, string[]> = {};
        for (const c of categories) {
          scores[c.id] = Number(form.get(c.id));
          reasons[c.id] = String(form.get(c.id + "-reason"));
          refs[c.id] = form.getAll(c.id + "-evidence").map(String);
        }
        return api("firms/" + id + "/assessment", {
          scores,
          reasons,
          evidence_ids: refs,
          complete: form.get("complete") === "on",
          confidence: form.get("confidence"),
          sorp: form.get("sorp"),
          gaps: form.get("gaps"),
        });
      }}
    >
      <p>
        Detailed point thresholds are not yet agreed. Explain your judgement
        against each category, and link current public evidence for every
        positive score. Zero means adequately researched with no qualifying
        evidence; it must not mean “not checked”.
      </p>
      {categories.map((c) => (
        <fieldset key={c.id}>
          <legend>
            {c.name} · maximum {c.max}
          </legend>
          <label>
            Score
            <input
              type="number"
              name={c.id}
              min={0}
              max={c.max}
              step={1}
              required
              defaultValue={a?.scores[c.id]}
            />
          </label>
          <label>
            Why this score? Include missing evidence and uncertainties.
            <textarea
              name={c.id + "-reason"}
              required
              minLength={15}
              defaultValue={a?.reasons[c.id]}
            />
          </label>
          <span>Supporting public sources</span>
          {evidence
            .filter(
              (e) =>
                (e.category === c.id ||
                  e.supported_categories?.includes(c.id)) &&
                e.url &&
                e.state === "Current",
            )
            .map((e) => (
              <label className="rc-checkbox" key={e.id}>
                <input
                  type="checkbox"
                  name={c.id + "-evidence"}
                  value={e.id}
                  defaultChecked={a?.evidence_ids[c.id]?.includes(e.id)}
                />
                {e.title} · {e.summary.slice(0, 100)}
              </label>
            ))}
        </fieldset>
      ))}
      <div className="rc-two">
        <label>
          Confidence
          <select name="confidence" defaultValue={a?.confidence || "Medium"}>
            {["Low", "Medium", "High"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label>
          SORP classification
          <select name="sorp" defaultValue={a?.sorp || "None found"}>
            {["None found", "General SORP", "Specific SORP 2026"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>
      <label>
        Evidence gaps (one per line)
        <textarea name="gaps" rows={4} defaultValue={a?.gaps.join("\n")} />
      </label>
      <label className="rc-checkbox">
        <input type="checkbox" required name="complete" />I have examined enough
        evidence to assess all five categories and explained the limits. No
        source claim has been counted twice.
      </label>
    </Form>
  );
}
export function Compare() {
  const params = useSearchParams();
  const ids = params.get("ids") || "";
  return (
    <>
      <div className="rc-page-title">
        <p className="rc-eyebrow">A DIFFERENT KIND OF COMPARISON</p>
        <h1>
          Put the evidence
          <br />
          <em>side by side.</em>
        </h1>
        <p>
          A higher evidence score does not necessarily mean a better accountant.
        </p>
      </div>
      {ids ? (
        <ComparisonResults ids={ids} />
      ) : (
        <div className="rc-panel rc-empty">
          <h2>Start with two good questions.</h2>
          <p>Select two to five firms in the database, then choose Compare.</p>
          <Link className="rc-button" href="/console/firms/">
            Choose accountants →
          </Link>
        </div>
      )}
    </>
  );
}
function ComparisonResults({ ids }: { ids: string }) {
  const { data, error } = useData<ReportData[]>(
    "compare?ids=" + encodeURIComponent(ids),
  );
  if (!data || error) return <State error={error} />;
  return (
    <div className="rc-comparison-scroll">
      <div
        className="rc-comparison"
        style={{
          gridTemplateColumns: `repeat(${data.length}, minmax(260px,1fr))`,
        }}
      >
        {data.map((r) => {
          const a = r.assessments[0];
          return (
            <article className="rc-panel" key={r.firm.id}>
              <Link href={"/console/firm/" + r.firm.id + "/"}>
                <h2>{r.firm.name} →</h2>
              </Link>
              <div className="rc-compare-score">
                {a?.total ?? "—"}
                <small>/100</small>
              </div>
              <Badge>
                {a
                  ? levelNames[evidenceLevel(a.total, r.methods[0].boundaries)!]
                  : "Not assessed"}
              </Badge>
              {categories.map((c) => (
                <div className="rc-compare-category" key={c.id}>
                  <span>{c.name}</span>
                  <strong>
                    {a?.scores[c.id] ?? "—"}/{c.max}
                  </strong>
                  <div className="rc-bar">
                    <i
                      style={{
                        width: a ? (a.scores[c.id] / c.max) * 100 + "%" : "0%",
                      }}
                    />
                  </div>
                </div>
              ))}
              <h3>SORP</h3>
              <p>{a?.sorp || "Not assessed"}</p>
              <h3>People</h3>
              <p>
                {r.people.map((p) => p.name).join(", ") ||
                  "No named people recorded"}
              </p>
              <h3>Charity services</h3>
              <p>
                {r.evidence.find(
                  (e) => e.category === "services" && e.state === "Current",
                )?.summary || "No evidence recorded"}
              </p>
              <h3>Evidence to inspect</h3>
              {r.evidence
                .filter(
                  (e) => e.state === "Current" && e.confidence === "Verified",
                )
                .slice(0, 3)
                .map((e) => (
                  <p key={e.id}>
                    {e.summary}
                    <br />
                    <Source url={e.url} />
                  </p>
                ))}
              <h3>Main gaps</h3>
              <p>{a?.gaps.join(" · ") || "Gap assessment incomplete"}</p>
              <h3>Completeness</h3>
              <p>
                {a
                  ? "Manually assessed · " + a.confidence + " confidence"
                  : "Incomplete"}
                <br />
                <DateText value={r.firm.research_completed_at} />
              </p>
            </article>
          );
        })}
      </div>
    </div>
  );
}
