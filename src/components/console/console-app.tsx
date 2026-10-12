"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  categories,
  levelNames,
  statuses,
  type Firm,
  type Methodology,
} from "@/lib/console/model";
import {
  api,
  useData,
  State,
  Form,
  fields,
  Badge,
  FirmTable,
  Source,
  DateText,
} from "./ui";
import { Report, Compare } from "./report";
type Dashboard = {
  sinceLastVisit: number | null;
  counts: {
    imported: number;
    researched: number;
    icaew_researched: number;
    scored: number;
    awaiting: number;
    approved: number;
    remaining: number;
    week: number;
    specialists: number;
  };
  flows: { status: string; count: number }[];
  recent: Firm[];
  baseline: null | {
    total: number;
    source_url: string;
    established_at: string;
    method: string;
    limitations: string;
  };
  method: Methodology;
};
export function ConsoleApp() {
  const path = usePathname();
  const router = useRouter();
  const [logoutError, setLogoutError] = useState("");
  const view = path.split("/").filter(Boolean)[1] || "";
  return (
    <>
      <header className="rc-top">
        <Link href="/console/" className="rc-brand">
          SORP<span>2026</span>
          <i />
        </Link>
        <span className="rc-top-label">THE RESEARCH CONSOLE</span>
        <div className="rc-owner">
          <span className="rc-avatar">M</span>
          <span>
            Marcus’s workspace<small>Private, by design</small>
          </span>
          <button
            onClick={async () => {
              const r = await fetch("/api/readiness-account/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "logout" }),
              });
              if (r.ok) router.replace("/console/login/");
              else setLogoutError("Sign out failed. Please retry.");
            }}
          >
            Sign out
          </button>
        </div>
      </header>
      <nav className="rc-nav" aria-label="Research console">
        {[
          ["", "The mission"],
          ["firms", "All accountants"],
          ["queue", "Research queue"],
          ["compare", "Compare"],
          ["methodology", "Our methodology"],
        ].map(([url, label]) => (
          <Link
            key={url}
            href={"/console/" + url + (url ? "/" : "")}
            aria-current={view === url ? "page" : undefined}
          >
            {label}
          </Link>
        ))}
        <Link className="rc-nav-end" href="/console/import/">
          Import data <span>→</span>
        </Link>
      </nav>
      <main id="main" className="rc-main">
        {logoutError && <p role="alert">{logoutError}</p>}
        {view === "firm" ? (
          <Report key={path} id={path.split("/").filter(Boolean)[2]} />
        ) : view === "firms" || view === "queue" ? (
          <Database queue={view === "queue"} />
        ) : view === "methodology" ? (
          <MethodologyPage />
        ) : view === "import" ? (
          <ImportPage />
        ) : view === "compare" ? (
          <Compare />
        ) : view === "status" ? (
          <FeatureStatus />
        ) : (
          <Mission />
        )}
      </main>
      <footer className="rc-footer">
        <span>
          One growing body of evidence. <em>For a greater impact.</em>
        </span>
        <Link href="/console/status/">What’s working? →</Link>
        <Link href="/">Visit the public website →</Link>
      </footer>
    </>
  );
}
function Mission() {
  const { data, error } = useData<Dashboard>("dashboard");
  const count = data?.counts;
  useEffect(() => {
    if (data) void api("visit", {}).catch(() => {});
  }, [data]);
  const milestones = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];
  const next =
    milestones.find((n) => n > (count?.researched || 0)) ||
    Math.ceil(((count?.researched || 0) + 1) / 1000) * 1000;
  return (
    <>
      <section className="rc-hero">
        <div>
          <p className="rc-eyebrow">
            <span className="rc-dot" /> THE NEXT GOOD DISCOVERY STARTS HERE
          </p>
          <h1>
            Let’s discover the UK’s
            <br />
            <em>charity-accounting expertise.</em>
          </h1>
          <p className="rc-intro">
            Thousands of accountancy firms. One growing body of evidence.
            <br />A clearer picture of who works with charities, and what they
            demonstrate.
          </p>
        </div>
        <div className="rc-orbit" aria-hidden="true">
          <div />
          <div />
          <div />
          <span>
            Every firm.
            <br />A little clearer.<i>→</i>
          </span>
          <b>✦</b>
        </div>
      </section>
      <CheckAccountant />
      <section className="rc-section">
        <div className="rc-section-heading">
          <div>
            <p className="rc-eyebrow">THE BIG PICTURE</p>
            <h2>Our journey through UK accountancy.</h2>
          </div>
          <Link href="/console/methodology/">Evidence first. Always. →</Link>
        </div>
        {error ? (
          <State error={error} />
        ) : !data ? (
          <State />
        ) : (
          <>
            <div className="rc-mission-grid">
              <div className="rc-population">
                <Badge>THE STARTING POPULATION</Badge>
                <h3>
                  Total UK ICAEW
                  <br />
                  accountancy firms
                </h3>
                {data.baseline ? (
                  <>
                    <strong className="rc-baseline-number">
                      {data.baseline.total.toLocaleString()}
                    </strong>
                    <Source url={data.baseline.source_url} />
                    <p>
                      Established{" "}
                      <DateText value={data.baseline.established_at} />
                    </p>
                    <details>
                      <summary>How we count</summary>
                      <p>{data.baseline.method}</p>
                      <p>{data.baseline.limitations}</p>
                    </details>
                  </>
                ) : (
                  <>
                    <div className="rc-unverified">
                      Awaiting a<br />
                      <em>verified baseline.</em>
                    </div>
                    <p>
                      We’re counting unique firms, not branch offices. A
                      complete, authorised UK population has not yet been
                      established.
                    </p>
                    <Link href="/console/methodology/#baseline">
                      Why this number matters →
                    </Link>
                  </>
                )}
                <div className="rc-population-foot">
                  The charity-specialism search is a starting point.
                  <br />
                  It is not the whole UK population.
                </div>
              </div>
              <div className="rc-coverage">
                <div
                  className="rc-ring"
                  style={
                    {
                      "--progress": data.baseline
                        ? Math.min(
                            100,
                            (data.counts.icaew_researched /
                              data.baseline.total) *
                              100,
                          ) + "%"
                        : "0%",
                    } as React.CSSProperties
                  }
                >
                  <div>
                    <strong>
                      {data.baseline
                        ? Math.round(
                            (data.counts.icaew_researched /
                              data.baseline.total) *
                              100,
                          ) + "%"
                        : "—"}
                    </strong>
                    <span>
                      UK coverage
                      {!data.baseline && <small>Baseline needed</small>}
                    </span>
                  </div>
                </div>
                <h3>The picture is taking shape.</h3>
                <p>
                  <strong>{data.counts.imported.toLocaleString()}</strong>{" "}
                  unique firms in your database.
                  <br />
                  <strong>{data.counts.researched}</strong> completed research
                  assessments.
                </p>
                <div className="rc-workflow">
                  {statuses.map((s, i) => (
                    <div key={s}>
                      <i
                        style={{
                          background: [
                            "#ded9cf",
                            "#e6a56e",
                            "#ba9680",
                            "#f17441",
                            "#708269",
                            "#85726b",
                            "#ceb689",
                          ][i],
                        }}
                      />
                      <span>{s}</span>
                      <b>
                        {data.flows.find((f) => f.status === s)?.count || 0}
                      </b>
                    </div>
                  ))}
                </div>
                <small>
                  Workflow groups are separate. Research and approval totals
                  below are cumulative.
                </small>
              </div>
            </div>
            <div className="rc-stats">
              {[
                [
                  "In the database",
                  data.counts.imported,
                  "Unique firm records",
                ],
                ["Researched", data.counts.researched, "Completed assessments"],
                ["Scored", data.counts.scored, "Evidence-linked scores"],
                [
                  "Awaiting Marcus",
                  data.counts.awaiting,
                  "Ready for your judgement",
                ],
                [
                  "Approved firms",
                  data.counts.approved,
                  "Your directory shortlist",
                ],
                [
                  "SORP 2026 evidence",
                  data.counts.specialists,
                  "Specific, verified sources",
                ],
                [
                  "Research remaining",
                  data.counts.remaining,
                  "Within your database",
                ],
                ["This week", data.counts.week, "Completed assessments"],
              ].map(([label, value, detail]) => (
                <div key={String(label)} className="rc-stat">
                  <span>{label}</span>
                  <strong>{Number(value).toLocaleString()}</strong>
                  <small>{detail}</small>
                </div>
              ))}
            </div>
            <div className="rc-milestone">
              <span className="rc-spark">✦</span>
              <div>
                <h3>
                  {data.counts.researched >= 10
                    ? "A growing body of knowledge."
                    : "Great research starts with one good question."}
                </h3>
                <p>
                  {data.counts.researched} of {next} researched · your next
                  milestone
                </p>
              </div>
              <progress
                aria-label="Progress toward next research milestone"
                value={data.counts.researched}
                max={next}
              />
              <span>
                {data.counts.approved
                  ? `${data.counts.approved} approved — carefully chosen.`
                  : "Your first approval is ahead."}
              </span>
            </div>
          </>
        )}
      </section>
      {data && (
        <div className="rc-achievements">
          <p>
            {data.sinceLastVisit === null
              ? "Your mission begins here."
              : `${data.sinceLastVisit} more completed research records since your last visit.`}
          </p>
          {[10, 25, 50, 100, 250, 500, 1000]
            .filter((n) => data.counts.researched >= n)
            .map((n) => (
              <Badge key={"r" + n}>✦ {n} firms researched</Badge>
            ))}
          {[1, 10, 25, 50, 100]
            .filter((n) => data.counts.approved >= n)
            .map((n) => (
              <Badge key={"a" + n}>✦ {n} approved</Badge>
            ))}
        </div>
      )}
      <section className="rc-section">
        <div className="rc-section-heading">
          <div>
            <p className="rc-eyebrow">ONE GOOD NEXT STEP</p>
            <h2>Keep the discovery going.</h2>
          </div>
        </div>
        <div className="rc-action-grid">
          {[
            [
              "queue",
              "Pick up the next firm",
              "A little curiosity goes a long way.",
              "01",
            ],
            [
              "firms?status=Ready%20for%20Marcus",
              "Ready for your judgement",
              "Bring your experience to the evidence.",
              "02",
            ],
            [
              "compare",
              "Put the evidence side by side",
              "See the differences. Ask better questions.",
              "03",
            ],
          ].map(([href, title, sub, n]) => (
            <Link key={n} href={"/console/" + href} className="rc-action-card">
              <span>
                {n} <i>→</i>
              </span>
              <h3>{title}</h3>
              <p>{sub}</p>
            </Link>
          ))}
        </div>
      </section>
      <section className="rc-section">
        <div className="rc-section-heading">
          <div>
            <p className="rc-eyebrow">THE LATEST CHAPTER</p>
            <h2>Recently researched.</h2>
          </div>
          <Link href="/console/firms/">Explore all firms →</Link>
        </div>
        {data?.recent.length ? (
          <FirmTable firms={data.recent} boundaries={data.method.boundaries} />
        ) : (
          <div className="rc-empty rc-panel">
            <span>✳</span>
            <h3>Your first discovery belongs here.</h3>
            <p>
              Check a firm, inspect its sources and complete an assessment.
              <br />
              Every completed report adds to the bigger picture.
            </p>
            <a href="#check">Check an accountant →</a>
          </div>
        )}
      </section>
    </>
  );
}
function CheckAccountant() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [matches, setMatches] = useState<Firm[] | null>(null);
  const [newFirm, setNewFirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function find(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await api<{ rows: Firm[] }>(
        "firms?q=" + encodeURIComponent(input.trim()),
      );
      setMatches(result.rows);
      setNewFirm(!result.rows.length);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="rc-check" id="check">
      <div className="rc-check-label">
        <span>→</span>
        <div>
          <h2>Who shall we discover next?</h2>
          <p>
            Check any UK accountancy firm. Every enquiry adds to the picture.
          </p>
        </div>
      </div>
      <form onSubmit={find} className="rc-search">
        <label className="sr-only" htmlFor="firm-search">
          Accountancy firm name or website
        </label>
        <span aria-hidden="true">⌕</span>
        <input
          id="firm-search"
          required
          minLength={2}
          maxLength={200}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter an accountancy firm name or website…"
        />
        <button disabled={busy} className="rc-button">
          {busy ? "Checking records…" : "Check this accountant"} <span>→</span>
        </button>
      </form>
      <div className="rc-check-foot">
        <span>Real sources. Open questions. Your judgement.</span>
        <Link href="/console/firms/">Find an existing report →</Link>
      </div>
      {error && <p role="alert">{error}</p>}
      {matches && (
        <div className="rc-search-results">
          <h3>
            {matches.length
              ? "Possible existing records"
              : "Let’s confirm the identity."}
          </h3>
          {matches.map((f) => (
            <div key={f.id}>
              <strong>{f.name}</strong>
              <span>{f.website || "Website unknown"}</span>
              <Link href={"/console/firm/" + f.id + "/"}>
                View existing research / refresh →
              </Link>
            </div>
          ))}
          {!newFirm && (
            <button className="rc-text-button" onClick={() => setNewFirm(true)}>
              This is a different firm — add a confirmed identity
            </button>
          )}
        </div>
      )}
      {newFirm && (
        <div className="rc-panel rc-add">
          <p>
            Name-only web discovery is not connected. Confirm the official
            website below, then the console can collect accessible pages. Never
            choose a similarly named firm without checking.
          </p>
          <a
            href={
              "https://www.google.com/search?q=" +
              encodeURIComponent(input + " UK accountant official website")
            }
            target="_blank"
            rel="noopener noreferrer"
          >
            Find the official website →
          </a>
          <Form
            label="Save firm and open research"
            submit={async (data) => {
              const response = await api<{ firm?: Firm; matches?: Firm[] }>(
                "firms",
                { ...fields(data), distinct: data.get("distinct") === "on" },
              );
              if (response.matches) {
                setMatches(response.matches);
                throw new Error(
                  "A similar record already exists. Open it above, or confirm this is a separate firm.",
                );
              }
              router.push("/console/firm/" + response.firm!.id + "/");
            }}
          >
            <div className="rc-two">
              <label>
                Confirmed firm name
                <input
                  name="name"
                  required
                  maxLength={200}
                  defaultValue={/^https?:/.test(input) ? "" : input}
                />
              </label>
              <label>
                Official website
                <input
                  name="website"
                  type="url"
                  placeholder="https://…"
                  defaultValue={/^https?:/.test(input) ? input : ""}
                />
              </label>
            </div>
            <label className="rc-checkbox">
              <input type="checkbox" name="distinct" />I checked the possible
              matches; this is a separate firm.
            </label>
          </Form>
        </div>
      )}
    </section>
  );
}
function Database({ queue }: { queue: boolean }) {
  const params = useSearchParams();
  const router = useRouter();
  const search = params.toString();
  const { data, error } = useData<{
    rows: Firm[];
    total: number;
    page: number;
  }>("firms?" + search + (queue ? "&queue=true" : ""));
  const [selected, setSelected] = useState<string[]>([]);
  const next = data?.rows.find((f) => f.status !== "Researching");
  return (
    <>
      <div className="rc-page-title">
        <p className="rc-eyebrow">
          {queue ? "THE NEXT CHAPTER" : "YOUR GROWING BODY OF EVIDENCE"}
        </p>
        <h1>
          {queue ? "A little more discovery." : "Every firm. Every finding."}
        </h1>
        <p>
          {queue
            ? "Research candidates, evidence gaps, reviews and due rechecks — in your priority order."
            : "Search the population. Follow the sources. Build a clearer picture."}
        </p>
      </div>
      {queue && next && (
        <Link className="rc-button" href={"/console/firm/" + next.id + "/"}>
          Research next firm <span>→</span>
        </Link>
      )}
      <form
        className="rc-filters"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const p = new URLSearchParams();
          for (const [k, v] of f) if (v) p.set(k, String(v));
          router.push(
            "/console/" + (queue ? "queue" : "firms") + "/?" + p.toString(),
          );
        }}
      >
        <label className="rc-filter-search">
          Search firms, people or places
          <input
            name="q"
            defaultValue={params.get("q") || ""}
            placeholder="Name, website, person, town or postcode"
          />
        </label>
        <label>
          Research status
          <select name="status" defaultValue={params.get("status") || ""}>
            <option value="">All statuses</option>
            {statuses.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label>
          Evidence level
          <select name="level" defaultValue={params.get("level") || ""}>
            <option value="">All levels</option>
            {levelNames.map((l, i) => (
              <option key={l} value={i}>
                {i} · {l}
              </option>
            ))}
          </select>
        </label>
        <label>
          SORP
          <select name="sorp" defaultValue={params.get("sorp") || ""}>
            <option value="">All classifications</option>
            {["None found", "General SORP", "Specific SORP 2026"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <details>
          <summary>More filters</summary>
          <div className="rc-two">
            <label>
              ICAEW charity tag
              <select name="tag">
                <option value="">Any / unverified</option>
                <option value="true">Recorded</option>
                <option value="false">Not recorded</option>
              </select>
            </label>
            <label>
              Country
              <input name="country" placeholder="England, Scotland…" />
            </label>
            <label>
              Review status
              <select name="review_status">
                <option value="">Any</option>
                {[
                  "Unreviewed",
                  "Awaiting review",
                  "Approved",
                  "Re-review needed",
                  "Not qualified",
                ].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label>
              Evidence gaps
              <input name="gap" placeholder="Search recorded gaps" />
            </label>
            {[
              ["services", "Charity service evidence"],
              ["specialist", "Named people recorded"],
              ["dcha", "Verified DChA"],
            ].map(([k, l]) => (
              <label className="rc-checkbox" key={k}>
                <input type="checkbox" name={k} value="true" />
                {l}
              </label>
            ))}
          </div>
        </details>
        <button className="rc-button">Apply filters</button>
        <Link href={"/console/" + (queue ? "queue" : "firms") + "/"}>
          Reset
        </Link>
      </form>
      <div className="rc-section-heading">
        <p>{data?.total ?? "…"} matching firms · 25 per page</p>
        <Link
          className="rc-button rc-secondary"
          aria-disabled={selected.length < 2}
          href={
            selected.length >= 2
              ? "/console/compare/?ids=" + selected.join(",")
              : "#"
          }
        >
          Compare {selected.length} selected
        </Link>
      </div>
      {!data || error ? (
        <State error={error} />
      ) : (
        <>
          <FirmTable
            firms={data.rows}
            selected={selected}
            onSelect={(id) =>
              setSelected((s) =>
                s.includes(id) ? s.filter((x) => x !== id) : [...s, id],
              )
            }
          />
          <div className="rc-pagination">
            {data.page > 1 && (
              <Link
                href={
                  "?" +
                  new URLSearchParams({
                    ...Object.fromEntries(params),
                    page: String(data.page - 1),
                  }).toString()
                }
              >
                ← Previous
              </Link>
            )}
            <span>
              Page {data.page} of {Math.max(1, Math.ceil(data.total / 25))}
            </span>
            {data.page * 25 < data.total && (
              <Link
                href={
                  "?" +
                  new URLSearchParams({
                    ...Object.fromEntries(params),
                    page: String(data.page + 1),
                  }).toString()
                }
              >
                Next →
              </Link>
            )}
          </div>
        </>
      )}
      <CheckAccountant />
    </>
  );
}
function MethodologyPage() {
  const { data, error, reload } = useData<Methodology[]>("methodology");
  if (!data || error) return <State error={error} />;
  const m = data[0];
  return (
    <>
      <div className="rc-page-title">
        <p className="rc-eyebrow">SHOW YOUR WORKING</p>
        <h1>Evidence, before opinion.</h1>
        <p>{m.name}</p>
      </div>
      <div className="rc-notice">
        This assessment measures publicly available evidence of
        charity-accounting experience. It is not a rating of service quality.
        Absence of published evidence is not absence of expertise.
      </div>
      <div className="rc-method-grid">
        {categories.map((c, i) => (
          <article className="rc-panel" key={c.id}>
            <p className="rc-eyebrow">0{i + 1} / FIVE CATEGORIES</p>
            <strong className="rc-method-max">
              {c.max}
              <small>points</small>
            </strong>
            <h2>{c.name}</h2>
            <p>{c.description}</p>
          </article>
        ))}
      </div>
      <section className="rc-panel rc-section">
        <h2>What justifies a score?</h2>
        <p>{m.rules}</p>
        <p>
          Every positive score needs current public sources assigned to that
          category and an explanation of the award. Every zero needs an
          explanation of what was checked. Unfinished research stays unscored.
          The same claim must not earn points twice.
        </p>
        <p>
          Names, qualifications, registration and clients must not be inferred
          from job titles or generic marketing. Keyword extracts are leads to
          inspect, not verified findings. Specific SORP 2026 classification
          needs a dated or explicitly named source.
        </p>
        <h3>What remains unresolved?</h3>
        <p>
          Detailed points within each category, calibration against the missing
          pilot, confidence thresholds, coverage required for a negative finding
          and the treatment of older publications. Manual scores are reviewer
          judgements, not a claimed objective rubric.
        </p>
      </section>
      <section className="rc-two rc-section">
        <div className="rc-panel">
          <h2>Evidence levels</h2>
          <p>
            These labels use the current boundaries. Original scores and
            historical methodology versions stay intact.
          </p>
          {m.boundaries.map((b, i) => (
            <div key={i} className="rc-level-row">
              <span>
                Level {i} · {levelNames[i]}
              </span>
              <b>{i === 0 ? "0" : `${m.boundaries[i - 1] + 1}–${b}`}</b>
            </div>
          ))}
          <details>
            <summary>Revise the boundaries</summary>
            <Form
              submit={async (f) => {
                await api("methodology", {
                  boundaries: String(f.get("boundaries"))
                    .split(",")
                    .map(Number),
                  notes: f.get("notes"),
                });
                reload();
              }}
            >
              <label>
                Six upper boundaries
                <input
                  name="boundaries"
                  defaultValue={m.boundaries.join(",")}
                />
              </label>
              <label>
                Why this revision?
                <textarea name="notes" required minLength={10} />
              </label>
            </Form>
          </details>
        </div>
        <div className="rc-panel">
          <h2>SORP is a separate question.</h2>
          <h3>None found</h3>
          <p>
            No qualifying SORP evidence in adequately examined sources; never a
            claim about all possible sources.
          </p>
          <h3>General SORP</h3>
          <p>
            Published Charity SORP knowledge without verified specific SORP 2026
            content.
          </p>
          <h3>Specific SORP 2026</h3>
          <p>
            Directly verified evidence explicitly about SORP 2026. Automated
            keyword matches need review.
          </p>
          <h3>Not assessed</h3>
          <p>Research is incomplete, unavailable or has not been reviewed.</p>
        </div>
      </section>
      <section id="baseline" className="rc-panel rc-section">
        <h2>The whole UK. Counted carefully.</h2>
        <p>UK ICAEW firms — awaiting verified baseline.</p>
        <p>
          The retained import covers 110 charity-specialism listings plus a
          separately researched firm. It does not establish all unique UK ICAEW
          firms. Directory listings may identify offices and similarly named but
          distinct practices.
        </p>
        <p>
          A defensible baseline needs an authoritative count or an authorised
          comprehensive export with stable firm identifiers, UK scope,
          branch-to-firm mapping, date and documented treatment of trading names
          and mergers. No unrestricted export has been verified. We will not
          extrapolate from the charity tag or bypass access restrictions.
        </p>
        <Source
          url="https://find.icaew.com/"
          label="Open the ICAEW directory →"
        />
      </section>
      <section className="rc-panel rc-section">
        <h2>Methodology history</h2>
        {data.map((v) => (
          <div className="rc-history" key={v.id}>
            <b>{v.name}</b>
            <p>{v.notes}</p>
            <small>
              <DateText value={v.created_at} /> · Boundaries{" "}
              {v.boundaries.join(" / ")}
            </small>
          </div>
        ))}
      </section>
    </>
  );
}
function ImportPage() {
  const { data, reload } = useData<
    {
      id: string;
      filename: string;
      status: string;
      summary: Record<string, unknown>;
      created_at: string;
    }[]
  >("imports");
  const [preview, setPreview] = useState<{
    id: string;
    filename: string;
    status: string;
    summary: Record<string, unknown>;
    raw_rows: Record<string, Record<string, string>[]>;
  } | null>(null);
  return (
    <>
      <div className="rc-page-title">
        <p className="rc-eyebrow">GROW THE RESEARCH POPULATION</p>
        <h1>
          A new batch.
          <br />
          <em>New possibilities.</em>
        </h1>
        <p>Preview first. Keep every source. Never silently overwrite.</p>
      </div>
      <div className="rc-two">
        <section className="rc-panel">
          <h2>Import a spreadsheet</h2>
          <p>
            CSV or XLSX, up to 3 MB / 5,000 rows. Include a{" "}
            <strong>Firm name</strong> column. Website, ICAEW URL, location,
            postcode and evidence columns are recognised.
          </p>
          <Form
            label="Preview import"
            submit={async (f) => {
              const r = await fetch("/api/console/imports/", {
                method: "POST",
                body: f,
              });
              const d = await r.json();
              if (!r.ok) throw new Error(d.error);
              setPreview(d);
            }}
          >
            <label>
              Choose research batch
              <input type="file" name="file" accept=".xlsx,.csv" required />
            </label>
          </Form>
          <p className="rc-muted">
            All sheets and values are archived. This first import flow creates
            unreviewed candidates; it does not automatically approve or score
            them.
          </p>
        </section>
        <section className="rc-panel">
          <h2>Your research, portable.</h2>
          <p>
            XLSX includes firms, evidence, people, offices, research runs,
            scores, review history and methodologies. CSV exports firm records.
            Neither is a substitute for a full database backup.
          </p>
          <div className="rc-export-links">
            <a download href="/api/console/export/?format=xlsx">
              Export research workbook →
            </a>
            <a download href="/api/console/export/?format=csv">
              Export firms as CSV →
            </a>
            <a download href="/api/console/export/?format=xlsx&approved=true">
              Export approved firms & evidence →
            </a>
          </div>
        </section>
      </div>
      {preview && (
        <section className="rc-panel rc-section">
          <Badge>{preview.status}</Badge>
          <h2>{preview.filename}</h2>
          <pre>{JSON.stringify(preview.summary, null, 2)}</pre>
          <details>
            <summary>Inspect original data (first 10 rows per sheet)</summary>
            {Object.entries(preview.raw_rows).map(([name, rows]) => (
              <div key={name}>
                <h3>{name}</h3>
                <pre>{JSON.stringify(rows.slice(0, 10), null, 2)}</pre>
              </div>
            ))}
          </details>
          {preview.status !== "committed" && (
            <Form
              label="Confirm candidate import"
              submit={async () => {
                await api("imports/" + preview.id, {});
                setPreview(null);
                reload();
              }}
            >
              <p>
                Possible duplicates are skipped and listed for review. Existing
                research stays unchanged.
              </p>
            </Form>
          )}
        </section>
      )}
      <section className="rc-panel rc-section">
        <h2>Import history</h2>
        {data?.map((b) => (
          <details key={b.id}>
            <summary>
              {b.filename} · {b.status} · <DateText value={b.created_at} />
            </summary>
            <pre>{JSON.stringify(b.summary, null, 2)}</pre>
          </details>
        ))}
      </section>
    </>
  );
}
function FeatureStatus() {
  const { data, error } = useData<{ database: boolean; auth: boolean }>(
    "status",
  );
  const rows = [
    [
      "Private access",
      data ? "Working" : "Needs attention",
      data
        ? "Every console page and API checks the signed-in account against ADMIN_EMAIL."
        : error || "Checking the connection…",
    ],
    [
      "Research database",
      data ? "Working" : "Needs attention",
      data
        ? "Postgres connection checked. Evidence, assessments and decisions are stored separately."
        : error || "Checking…",
    ],
    [
      "Website research",
      "Working",
      "Collects accessible HTML from a confirmed official website and supplied ICAEW URL. Robots exclusions and failed sources are recorded. Javascript-only sites and documents may need manual research.",
    ],
    [
      "Find any firm by name",
      "Needs configuration",
      "Searches your database now. For an unknown firm, confirm its identity and official website yourself; automatic web discovery is not connected.",
    ],
    [
      "Automatic scores / AI analysis",
      "Needs configuration",
      "No AI assessment service is configured. The detailed scoring rubric is unresolved. Source-linked manual scoring is available.",
    ],
    [
      "ICAEW population baseline",
      "Needs configuration",
      "No authorised complete UK unique-firm population has been verified. Imported records are counted separately.",
    ],
    [
      "Pilot workbook",
      "Needs configuration",
      "The ten-firm pilot was not attached. Import preserves all sheets; automatic mapping of pilot scores, people and office sheets into structured assessments is coming later.",
    ],
    [
      "Review, history and comparison",
      "Working",
      "Source links, manual assessments, notes, approval, evidence flags, firm corrections, queue priority and comparisons are implemented.",
    ],
    [
      "CSV / XLSX",
      "Working",
      "Preview and import candidates; export research workbook or firm CSV. Safe re-imports and duplicate warnings are supported.",
    ],
    [
      "Recurring research and durable retries",
      "Coming later",
      "Runs start when you request them. Interrupted work retains collected evidence and can be retried. No unattended bulk crawler is running.",
    ],
  ];
  return (
    <>
      <div className="rc-page-title">
        <p className="rc-eyebrow">NO SMOKE. NO MIRRORS.</p>
        <h1>What’s working?</h1>
        <p>The honest state of your research console.</p>
      </div>
      <div className="rc-status-list">
        {rows.map(([name, status, description]) => (
          <article className="rc-panel" key={name}>
            <Badge>{status}</Badge>
            <h2>{name}</h2>
            <p>{description}</p>
          </article>
        ))}
      </div>
      <p className="rc-muted">
        Working means implemented and tested in the release checks. Individual
        sources and services can still fail; failures are shown where they
        occur.
      </p>
    </>
  );
}
