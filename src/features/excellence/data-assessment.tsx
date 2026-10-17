"use client";
import { currentAccountDestination, registrationHref } from "@/lib/account-navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DATA_OPEN_QUESTIONS, DATA_SCALE, DATA_SECTIONS, normaliseDataWorkspace, scoreData, type DataAnswer, type DataWorkspace } from "./data";

type Account = { name?: string; email?: string; organisation?: string };
type ProductData = Record<string, unknown> & { result?: unknown; data?: unknown };
type Payload = { account?: Account; productProgress?: { data?: ProductData }; error?: string };

function resumeScreen(workspace: DataWorkspace) {
  if (workspace.status === "not_started" || !workspace.participant.name || !workspace.participant.role || !workspace.participant.email) return 0;
  for (let section = 0; section < 5; section += 1) if (workspace.answers.slice(section * 4, section * 4 + 4).some(answer => answer.score === null)) return section + 1;
  return 6;
}
function progressFor(workspace: DataWorkspace) {
  if (workspace.status === "assessment_complete" || workspace.status === "evidence_submitted") return Math.max(65, workspace.progress);
  const identity = workspace.participant.name && workspace.participant.role && workspace.participant.email ? 5 : 0;
  const ratings = workspace.answers.slice(0, 20).filter(answer => answer.score !== null).length * 3;
  return Math.min(65, identity + ratings);
}

export function DataAssessment() {
  const router = useRouter();
  const [productData, setProductData] = useState<ProductData>();
  const [workspace, setWorkspace] = useState<DataWorkspace>();
  const [screen, setScreen] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    void fetch("/api/readiness-account/", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "load-product", productId: "social-impact-excellence" }), cache: "no-store" })
      .then(async response => { const payload = await response.json() as Payload; if (response.status === 401) { router.replace(registrationHref(currentAccountDestination("/social-impact-excellence/data/assessment/"))); return; } if (!response.ok) throw new Error(payload.error || "Your Data assessment could not be loaded."); if (!payload.productProgress?.data?.result) { router.replace("/social-impact-excellence/assessment/"); return; } const next = normaliseDataWorkspace(payload.productProgress.data.data, payload.account); setProductData(payload.productProgress.data); setWorkspace(next); setScreen(resumeScreen(next)); })
      .catch(caught => setError(caught instanceof Error ? caught.message : "Your Data assessment could not be loaded."));
  }, [router]);

  async function save(next: DataWorkspace) {
    if (!productData) return false;
    setSaving(true); setError("");
    try {
      const enriched = { ...next, progress: progressFor(next) };
      const nextData = { ...productData, data: enriched };
      const response = await fetch("/api/readiness-account/", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "save-product", productId: "social-impact-excellence", status: "complete", data: nextData }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Your Data assessment could not be saved.");
      setWorkspace(enriched); setProductData(nextData); return true;
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Your Data assessment could not be saved."); return false; }
    finally { setSaving(false); }
  }
  function updateAnswer(index: number, patch: Partial<DataAnswer>) {
    if (!workspace) return;
    setWorkspace({ ...workspace, answers: workspace.answers.map((answer, answerIndex) => answerIndex === index ? { ...answer, ...patch } : answer), status: "draft" }); setError("");
  }
  async function next() {
    if (!workspace) return;
    if (screen === 0 && (!workspace.participant.name.trim() || !workspace.participant.role.trim() || !workspace.participant.email.includes("@"))) { setError("Enter your name, role and a valid email address."); return; }
    if (screen >= 1 && screen <= 5) { const start = (screen - 1) * 4; if (workspace.answers.slice(start, start + 4).some(answer => answer.score === null)) { setError("Choose a maturity level for each question in this section."); return; } }
    if (screen === 6) {
      const scored = scoreData(workspace.answers); if (!scored) { setError("Complete all 20 maturity ratings before submitting."); return; }
      const submission = { assessmentId: workspace.assessmentId, methodologyVersion: workspace.methodologyVersion, submittedAt: new Date().toISOString(), ...scored, answers: workspace.answers.map(answer => ({ ...answer })) };
      if (await save({ ...workspace, ...scored, status: "assessment_complete", reviewStatus: "not_submitted", progress: 65, submissions: [...workspace.submissions.filter(item => item.assessmentId !== workspace.assessmentId), submission] })) router.push("/social-impact-excellence/data/evidence/");
      return;
    }
    if (await save({ ...workspace, status: "draft" })) { setScreen(current => current + 1); window.scrollTo({ top: 0, behavior: "smooth" }); }
  }

  if (error && !workspace) return <main className="sie-report"><section className="sie-state" role="alert"><h1>We couldn’t open the Data assessment.</h1><p>{error}</p><Link href="/social-impact-excellence/data/">Return to Data</Link></section></main>;
  if (!workspace) return <main className="sie-report"><section className="sie-state" role="status"><p>Opening your Data assessment…</p></section></main>;
  if (workspace.status === "assessment_complete" || workspace.status === "evidence_submitted") return <main className="sie-report"><header><Link href="/social-impact-excellence/" className="sie-wordmark">SOCIAL IMPACT <strong>EXCELLENCE</strong></Link><Link href="/social-impact-excellence/data/">Data home</Link></header><section className="sie-state"><p className="sie-eyebrow">Assessment complete</p><h1>{workspace.score?.toFixed(1)} out of 5.<br/>{workspace.maturity}.</h1><p><strong>Provisional self-assessed Data maturity — subject to MSI review.</strong></p><p>Completing the questionnaire does not produce a verified diagnostic. Supporting evidence and expert review add the necessary context and challenge.</p><Link href="/social-impact-excellence/data/evidence/">Continue to supporting evidence →</Link></section></main>;
  const section = screen >= 1 && screen <= 5 ? DATA_SECTIONS[screen - 1] : null;
  return <main className="sie-tool sie-purpose-assessment">
    <header className="sie-tool-header"><Link href="/social-impact-excellence/" className="sie-wordmark">SOCIAL IMPACT <strong>EXCELLENCE</strong></Link><span>Data Assessment · {workspace.organisationName}</span><button type="button" disabled={saving} onClick={() => void save(workspace).then(ok => { if (ok) router.push("/dashboard/"); })}>Save &amp; exit</button></header>
    <div className="sie-purpose-progress"><span>{workspace.answers.slice(0, 20).filter(answer => answer.score !== null).length} of 20 maturity questions answered</span><i><b style={{ width: `${workspace.answers.slice(0, 20).filter(answer => answer.score !== null).length * 5}%` }} /></i><strong>Step {screen + 1} of 7</strong></div>
    <section className="sie-purpose-form"><aside><p className="sie-eyebrow">Technology-enabled. Expert-led.</p><h2>You are not doing this alone.</h2><p>The platform structures the assessment. My Social Impact provides professional review, interpretation, constructive challenge and Blueprint development.</p></aside><div>
      {screen === 0 && <section><p className="sie-eyebrow">Before you begin</p><h1>Tell us who is completing this assessment.</h1><p>Your charity is connected as <strong>{workspace.organisationName}</strong>.</p><div className="sie-purpose-fields"><label>Name<input value={workspace.participant.name} onChange={event => setWorkspace({ ...workspace, participant: { ...workspace.participant, name: event.target.value } })}/></label><label>Role<input value={workspace.participant.role} onChange={event => setWorkspace({ ...workspace, participant: { ...workspace.participant, role: event.target.value } })}/></label><label>Email address<input type="email" value={workspace.participant.email} onChange={event => setWorkspace({ ...workspace, participant: { ...workspace.participant, email: event.target.value } })}/></label></div></section>}
      {section && <section><p className="sie-eyebrow">Section {String.fromCharCode(64 + screen)} · {section.title}</p><h1>{section.title}</h1><p>{section.introduction}</p><div className="sie-purpose-questions">{section.questions.map((question, localIndex) => { const answerIndex = (screen - 1) * 4 + localIndex, answer = workspace.answers[answerIndex]; return <article key={answer.questionId}><div><span>{String(answerIndex + 1).padStart(2, "0")}</span><h2>{question.question}</h2></div><div className="sie-purpose-rating" role="radiogroup" aria-label={`Maturity rating for question ${answerIndex + 1}`}>{DATA_SCALE.map(option => <button type="button" role="radio" aria-label={`${option.value} star out of 5, ${option.label}`} aria-checked={answer.score === option.value} className={answer.score === option.value ? "selected" : ""} onClick={() => updateAnswer(answerIndex, { score: option.value })} key={option.value}><strong>{option.value} ★</strong><span>{option.label}</span></button>)}</div><label>Additional comments or context (optional)<textarea rows={3} value={answer.comment} onChange={event => updateAnswer(answerIndex, { comment: event.target.value })}/></label><div className="sie-purpose-guidance"><details><summary>Why are we asking this?</summary><p>{question.why}</p></details><details><summary>What do the stars mean?</summary>{question.stars.map((description, index) => <p key={description}><strong>{index + 1} ★ · {DATA_SCALE[index].label}</strong><span>{description}</span></p>)}</details></div></article>; })}</div></section>}
      {screen === 6 && <section><p className="sie-eyebrow">Optional reflections</p><h1>Tell us about data in your own words.</h1><p>These five optional reflections provide qualitative context. They do not contribute to your numerical score or prevent you from completing the assessment.</p><div className="sie-purpose-questions">{DATA_OPEN_QUESTIONS.map((item, localIndex) => { const answerIndex = 20 + localIndex; return <article key={item.id}><div><span>{answerIndex + 1}</span><h2>{item.question}</h2></div><p>{item.helperText}</p><textarea aria-label={`Answer to question ${answerIndex + 1}`} rows={7} value={workspace.answers[answerIndex].answer} onChange={event => updateAnswer(answerIndex, { answer: event.target.value })}/></article>; })}</div></section>}
      {error && <p className="sie-form-error" role="alert">{error}</p>}
      <nav className="sie-purpose-form-actions"><button type="button" disabled={screen === 0 || saving} onClick={() => setScreen(current => current - 1)}>← Previous</button><button type="button" className="primary" disabled={saving} onClick={() => void next()}>{saving ? "Saving…" : screen === 6 ? "Complete assessment →" : "Save and continue →"}</button></nav>
    </div></section>
  </main>;
}
