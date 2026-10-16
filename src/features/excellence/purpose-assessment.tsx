"use client";
import { currentAccountDestination, registrationHref } from "@/lib/account-navigation";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PURPOSE_OPEN_QUESTIONS, PURPOSE_SCALE, PURPOSE_SECTIONS, normalisePurposeWorkspace, scorePurpose, type PurposeAnswer, type PurposeWorkspace } from "./purpose";
import { PURPOSE_QUESTION_GUIDANCE } from "./purpose-guidance";

type Account = { name?: string; email?: string; organisation?: string };
type ProductData = Record<string, unknown> & { result?: unknown; purpose?: unknown };
type Payload = { account?: Account; productProgress?: { data?: ProductData }; error?: string };

function resumeScreen(workspace: PurposeWorkspace) {
  if (workspace.status === "not_started" || !workspace.participant.name || !workspace.participant.role || !workspace.participant.email) return 0;
  for (let section = 0; section < 4; section += 1) if (workspace.answers.slice(section * 5, section * 5 + 5).some(answer => answer.score === null)) return section + 1;
  return 5;
}

function progressFor(workspace: PurposeWorkspace) {
  if (workspace.status === "assessment_complete" || workspace.status === "complete") return Math.max(65, workspace.progress);
  const identity = workspace.participant.name && workspace.participant.role && workspace.participant.email ? 5 : 0;
  const ratings = workspace.answers.slice(0, 20).filter(answer => answer.score !== null).length * 2;
  const reflections = workspace.answers.slice(20).filter(answer => answer.answer.trim()).length * 4;
  return Math.min(65, identity + ratings + reflections);
}

export function PurposeAssessment() {
  const router = useRouter();
  const [productData, setProductData] = useState<ProductData>();
  const [workspace, setWorkspace] = useState<PurposeWorkspace>();
  const [screen, setScreen] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    void fetch("/api/readiness-account/", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "load-product", productId: "social-impact-excellence" }), cache: "no-store" })
      .then(async response => { const payload = await response.json() as Payload; if (response.status === 401) { router.replace(registrationHref(currentAccountDestination("/social-impact-excellence/purpose/assessment/"))); return; } if (!response.ok) throw new Error(payload.error || "Your Purpose assessment could not be loaded."); if (!payload.productProgress?.data?.result) { router.replace("/social-impact-excellence/assessment/"); return; } const next = normalisePurposeWorkspace(payload.productProgress.data.purpose, payload.account); setProductData(payload.productProgress.data); setWorkspace(next); setScreen(resumeScreen(next)); })
      .catch(caught => setError(caught instanceof Error ? caught.message : "Your Purpose assessment could not be loaded."));
  }, [router]);

  async function save(next: PurposeWorkspace) {
    if (!productData) return false;
    setSaving(true); setError("");
    try {
      const enriched = { ...next, progress: progressFor(next) };
      const nextData = { ...productData, purpose: enriched };
      const response = await fetch("/api/readiness-account/", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "save-product", productId: "social-impact-excellence", status: "complete", data: nextData }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Your Purpose assessment could not be saved.");
      setWorkspace(enriched); setProductData(nextData); return true;
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Your Purpose assessment could not be saved."); return false; }
    finally { setSaving(false); }
  }

  function updateAnswer(index: number, patch: Partial<PurposeAnswer>) {
    if (!workspace) return;
    setWorkspace({ ...workspace, answers: workspace.answers.map((answer, answerIndex) => answerIndex === index ? { ...answer, ...patch } : answer), status: "draft" });
    setError("");
  }

  async function next() {
    if (!workspace) return;
    if (screen === 0 && (!workspace.participant.name.trim() || !workspace.participant.role.trim() || !workspace.participant.email.includes("@"))) { setError("Enter your name, role and a valid email address."); return; }
    if (screen >= 1 && screen <= 4) {
      const start = (screen - 1) * 5;
      if (workspace.answers.slice(start, start + 5).some(answer => answer.score === null)) { setError("Choose a maturity level for each question in this section."); return; }
    }
    if (screen === 5) {
      if (workspace.answers.slice(20).some(answer => !answer.answer.trim())) { setError("Please answer all five reflection questions before submitting."); return; }
      const scored = scorePurpose(workspace.answers);
      if (!scored) { setError("Complete all 20 maturity ratings before submitting."); return; }
      const submitted = { ...workspace, ...scored, status: "assessment_complete" as const, progress: 65 };
      if (await save(submitted)) router.push("/social-impact-excellence/purpose/evidence/");
      return;
    }
    if (await save({ ...workspace, status: "draft" })) { setScreen(current => current + 1); window.scrollTo({ top: 0, behavior: "smooth" }); }
  }

  if (error && !workspace) return <main className="sie-report"><section className="sie-state" role="alert"><h1>We couldn’t open the Purpose assessment.</h1><p>{error}</p><Link href="/social-impact-excellence/purpose/">Return to Purpose</Link></section></main>;
  if (!workspace) return <main className="sie-report"><section className="sie-state" role="status"><p>Opening your Purpose assessment…</p></section></main>;
  if (workspace.status === "assessment_complete" || workspace.status === "complete") return <main className="sie-report"><header><Link href="/social-impact-excellence/" className="sie-wordmark">SOCIAL IMPACT <strong>EXCELLENCE</strong></Link><Link href="/social-impact-excellence/purpose/">Purpose home</Link></header><section className="sie-state"><p className="sie-eyebrow">Assessment complete</p><h1>{workspace.score?.toFixed(1)} out of 5.<br/>{workspace.maturity}.</h1><p>This is a preliminary self-assessment. Supporting evidence and expert review add the necessary context and challenge.</p><Link href="/social-impact-excellence/purpose/evidence/">Continue to supporting evidence →</Link></section></main>;
  const section = screen >= 1 && screen <= 4 ? PURPOSE_SECTIONS[screen - 1] : null;
  return <main className="sie-tool sie-purpose-assessment">
    <header className="sie-tool-header"><Link href="/social-impact-excellence/" className="sie-wordmark">SOCIAL IMPACT <strong>EXCELLENCE</strong></Link><span>Purpose Assessment · {workspace.organisationName}</span><button type="button" disabled={saving} onClick={() => void save(workspace).then(ok => { if (ok) router.push("/dashboard/"); })}>Save &amp; exit</button></header>
    <div className="sie-purpose-progress"><span>Step {screen + 1} of 6</span><i><b style={{ width: `${Math.round(((screen + 1) / 6) * 100)}%` }} /></i><strong>{Math.round(((screen + 1) / 6) * 100)}%</strong></div>
    <section className="sie-purpose-form"><aside><p className="sie-eyebrow">Guided by MSI</p><h2>You are not doing this alone.</h2><p>The platform structures the assessment. My Social Impact provides evidence guidance, review and constructive challenge.</p></aside><div>
      {screen === 0 && <section><p className="sie-eyebrow">Before you begin</p><h1>Tell us who is completing this assessment.</h1><p>Your charity is connected as <strong>{workspace.organisationName}</strong>.</p><div className="sie-purpose-fields"><label>Name<input value={workspace.participant.name} onChange={event => setWorkspace({ ...workspace, participant: { ...workspace.participant, name: event.target.value } })}/></label><label>Role<input value={workspace.participant.role} onChange={event => setWorkspace({ ...workspace, participant: { ...workspace.participant, role: event.target.value } })}/></label><label>Email address<input type="email" value={workspace.participant.email} onChange={event => setWorkspace({ ...workspace, participant: { ...workspace.participant, email: event.target.value } })}/></label></div></section>}
      {section && <section><p className="sie-eyebrow">{section.title}</p><h1>{section.title}</h1><p>{section.introduction}</p><div className="sie-purpose-questions">{section.questions.map((question, localIndex) => { const answerIndex = (screen - 1) * 5 + localIndex, answer = workspace.answers[answerIndex], guidance = PURPOSE_QUESTION_GUIDANCE[answerIndex]; return <article key={question}><div><span>{String(answerIndex + 1).padStart(2, "0")}</span><h2>{question}</h2></div><details><summary>Why are we asking this?</summary><p>{guidance.why}</p></details><details><summary>What do the stars mean?</summary>{guidance.stars.map((description, index) => <p key={description}><strong>{index + 1} ★</strong> {description}</p>)}</details><div className="sie-purpose-rating" role="radiogroup" aria-label={`Maturity rating for question ${answerIndex + 1}`}>{PURPOSE_SCALE.map(option => <button type="button" role="radio" aria-checked={answer.score === option.value} className={answer.score === option.value ? "selected" : ""} onClick={() => updateAnswer(answerIndex, { score: option.value })} key={option.value}><strong>{option.value} ★</strong><span>{option.label}</span></button>)}</div><label>Additional comments or context (optional)<textarea rows={3} value={answer.comment} onChange={event => updateAnswer(answerIndex, { comment: event.target.value })}/></label></article>; })}</div></section>}
      {screen === 5 && <section><p className="sie-eyebrow">Your perspective</p><h1>Tell us about your purpose in your own words.</h1><p>These reflections give your maturity scores the context needed for expert review.</p><div className="sie-purpose-questions">{PURPOSE_OPEN_QUESTIONS.map((question, localIndex) => { const answerIndex = 20 + localIndex; return <article key={question}><div><span>{answerIndex + 1}</span><h2>{question}</h2></div><textarea rows={6} value={workspace.answers[answerIndex].answer} onChange={event => updateAnswer(answerIndex, { answer: event.target.value })}/></article>; })}</div></section>}
      {error && <p className="sie-form-error" role="alert">{error}</p>}
      <nav className="sie-purpose-form-actions"><button type="button" disabled={screen === 0 || saving} onClick={() => setScreen(current => current - 1)}>← Previous</button><button type="button" className="primary" disabled={saving} onClick={() => void next()}>{saving ? "Saving…" : screen === 5 ? "Complete assessment →" : "Save and continue →"}</button></nav>
    </div></section>
  </main>;
}
