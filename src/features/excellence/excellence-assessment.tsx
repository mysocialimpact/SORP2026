"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PILLARS, QUESTIONS } from "./questions";
import { scoreAssessment, commentaryFor, recommendationFor } from "./scoring";
import { SNAPSHOT_MATURITY, SNAPSHOT_MATURITY_LABELS } from "./snapshot-maturity";
import { mergeSnapshotDrafts, validSnapshotAnswers, type SnapshotDraft } from "./snapshot-draft";

const PRODUCT_ID = "social-impact-excellence";
const LOCAL_KEY = "sorp2026_social_impact_excellence_draft";
const reassurance = [
  "Don’t overthink this. Choose the answer that feels most accurate most of the time.",
  "There are no perfect answers. An honest first impression is enough.",
  "This is a starting point, not an audit. You can explore the detail when it helps.",
  "Keep going. Your progress is saved to your SORP2026 account.",
  "Choose what is generally true today, rather than what you hope will be true soon.",
];

type ProductPayload = {
  signedIn?: boolean;
  account?: { id: string; name: string; organisation?: string };
  productProgress?: { status: string; data?: Partial<SnapshotDraft> } | null;
  error?: string;
};

function newDraft(): SnapshotDraft {
  const now = new Date().toISOString();
  return { requestId: crypto.randomUUID(), route: "assessment", answers: Array(25).fill(null), index: 0, startedAt: now, updatedAt: now };
}

function safeDraft(value: unknown): SnapshotDraft | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<SnapshotDraft>;
  if (!validSnapshotAnswers(candidate.answers)) return null;
  return {
    requestId: typeof candidate.requestId === "string" ? candidate.requestId : crypto.randomUUID(),
    route: "assessment",
    answers: candidate.answers,
    index: Number.isInteger(candidate.index) ? Math.max(0, Math.min(24, Number(candidate.index))) : 0,
    startedAt: typeof candidate.startedAt === "string" ? candidate.startedAt : new Date().toISOString(),
    updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : undefined,
    completedAt: typeof candidate.completedAt === "string" ? candidate.completedAt : undefined,
  };
}

export function ExcellenceAssessment() {
  const router = useRouter();
  const contentRef = useRef<HTMLElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [account, setAccount] = useState<ProductPayload["account"]>();
  const [draft, setDraft] = useState<SnapshotDraft | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [saveState, setSaveState] = useState("Saved to this device");
  const [guidanceOpen, setGuidanceOpen] = useState(false);
  const index = draft?.index || 0;
  const answers = useMemo(() => draft?.answers || Array(25).fill(null), [draft]);
  const question = QUESTIONS[index];
  const pillarIndex = Math.floor(index / 5);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/readiness-account/", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "load-product", productId: PRODUCT_ID }),
      signal: controller.signal,
      cache: "no-store",
    }).then(async response => {
      const payload = await response.json().catch(() => ({})) as ProductPayload;
      if (response.status === 401) { router.replace("/login/?return=/social-impact-excellence/assessment/"); return; }
      if (!response.ok) throw new Error(payload.error || "Your saved assessment could not be opened.");
      let local: SnapshotDraft | null = null;
      try { local = safeDraft(JSON.parse(localStorage.getItem(LOCAL_KEY) || "null")); } catch { /* account copy remains authoritative */ }
      const remote = safeDraft(payload.productProgress?.data);
      const chosen = mergeSnapshotDrafts([remote, local].filter((value): value is SnapshotDraft => Boolean(value))) || newDraft();
      setAccount(payload.account);
      setDraft(chosen);
      try { localStorage.setItem(LOCAL_KEY, JSON.stringify(chosen)); } catch { /* server saving remains available */ }
      setSaveState(remote ? "Saved to your SORP2026 account" : "Ready to save to your account");
      setLoaded(true);
    }).catch(caught => {
      if (!controller.signal.aborted) { setError(caught instanceof Error ? caught.message : "Your assessment could not be opened."); setLoaded(true); }
    });
    return () => controller.abort();
  }, [router]);

  useEffect(() => { contentRef.current?.scrollTo({ top: 0, behavior: "instant" }); }, [index]);

  async function save(next: SnapshotDraft, status = "in_progress") {
    if (saveTimer.current) { clearTimeout(saveTimer.current); saveTimer.current = null; }
    setDraft(next);
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(next)); } catch { /* server save below */ }
    setSaveState("Saving…");
    const response = await fetch("/api/readiness-account/", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "save-product", productId: PRODUCT_ID, status, data: next }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "Your account copy could not be saved.");
    setSaveState("Saved to your SORP2026 account");
  }

  function queueSave(next: SnapshotDraft) {
    setDraft(next);
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(next)); } catch { /* server copy still attempted */ }
    setSaveState("Saving…");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void save(next).catch(caught => { setError(caught instanceof Error ? caught.message : "Saving failed."); setSaveState("Not yet saved to your account"); }), 450);
  }

  function update(nextAnswers: (number | null)[], nextIndex = index) {
    if (!draft) return;
    queueSave({ ...draft, answers: nextAnswers, index: nextIndex, updatedAt: new Date().toISOString() });
  }

  function choose(value: number) {
    setError("");
    update(answers.map((answer, answerIndex) => answerIndex === index ? value : answer));
  }

  function move(nextIndex: number) { setError(""); setGuidanceOpen(false); update(answers, nextIndex); }

  async function next() {
    if (!answers[index]) { setError("Choose the response that is true most of the time."); return; }
    if (index < 24) { move(index + 1); return; }
    if (!draft) return;
    const missing = answers.findIndex(answer => answer === null);
    if (missing !== -1) { move(missing); setError("Answer this question to complete all 25 responses."); return; }
    const completed = { ...draft, answers, index: 24, completedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    const scores = scoreAssessment(answers as number[]);
    try {
      await save({ ...completed, result: { ...scores, commentary: commentaryFor(scores.overall, scores.pillarScores), recommendation: recommendationFor(scores.pillarScores, scores.overall) } } as SnapshotDraft, "complete");
      router.push("/social-impact-excellence/results/");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Your results could not be saved."); }
  }

  if (!loaded) return <main className="sie-tool"><section className="sie-state" role="status"><p>Opening your Social Impact Excellence assessment…</p></section></main>;
  if (!draft || error && !account) return <main className="sie-tool"><section className="sie-state" role="alert"><h1>We couldn’t open the assessment.</h1><p>{error}</p><Link href="/dashboard/">Return to dashboard</Link></section></main>;

  return <main className="sie-tool sie-assessment">
    <header className="sie-tool-header"><Link href="/social-impact-excellence/" className="sie-wordmark">SOCIAL IMPACT <strong>EXCELLENCE</strong></Link><span>{account?.organisation || account?.name || "Your charity"}</span><Link href="/dashboard/">Save &amp; exit</Link></header>
    <div className="sie-workspace">
      <div className="sie-context">
        <div className="sie-progress"><div><strong>{String(index + 1).padStart(2, "0")}</strong><span>of 25</span></div><i><b style={{ width: `${((index + 1) / 25) * 100}%` }} /></i><span>{PILLARS[pillarIndex].label}</span></div>
        <h1>{question.statement}</h1>
      </div>
      <section className="sie-question-scroll" ref={contentRef} tabIndex={0} aria-label={`Question ${index + 1}`}>
        <p className="sie-meaning"><strong>What this means:</strong><br />{question.meaning}</p>
        {!guidanceOpen && <><div className="sie-rating" role="group" aria-label="Select a score from 1 to 5">{[1,2,3,4,5].map(value => <button type="button" aria-pressed={answers[index] === value} className={answers[index] === value ? "selected" : ""} key={value} onClick={() => choose(value)}><strong>{value} ★</strong><span>{SNAPSHOT_MATURITY_LABELS[value - 1]}</span></button>)}</div><p className="sie-reassurance">{reassurance[index % reassurance.length]}</p></>}
        <details className="sie-guidance" open={guidanceOpen} onToggle={event => setGuidanceOpen(event.currentTarget.open)}><summary><strong>Need more guidance?</strong> See what each score means for this question.</summary><div><h2>How maturity develops</h2><p>Compare the five levels, then select the one that best describes your organisation today.</p><div className="sie-ladder">{SNAPSHOT_MATURITY[question.id].map((description, offset) => <button type="button" key={description} aria-pressed={answers[index] === offset + 1} className={answers[index] === offset + 1 ? "selected" : ""} onClick={() => choose(offset + 1)}><strong>{offset + 1} ★ · {SNAPSHOT_MATURITY_LABELS[offset]}</strong><span>{description}</span><b>{answers[index] === offset + 1 ? "✓ Your selected level" : "Select this level"}</b></button>)}</div></div></details>
        <details className="sie-jump"><summary>Jump to a pillar or question</summary><nav>{PILLARS.map((pillar, offset) => <button type="button" key={pillar.key} className={pillarIndex === offset ? "active" : ""} onClick={() => move(offset * 5)}>{pillar.label}<span>{answers.slice(offset * 5, offset * 5 + 5).filter(value => value !== null).length}/5</span></button>)}</nav></details>
      </section>
      <nav className="sie-actions"><button type="button" disabled={index === 0} onClick={() => move(index - 1)}>← Previous</button><p className={error ? "error" : ""} role={error ? "alert" : "status"}>{error || saveState}</p><button type="button" className="primary" onClick={() => void next()}>{index === 24 ? "Complete assessment →" : "Next question →"}</button></nav>
    </div>
  </main>;
}
