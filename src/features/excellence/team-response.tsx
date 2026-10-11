"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PILLARS, QUESTIONS } from "./questions";
import { SNAPSHOT_MATURITY_LABELS } from "./snapshot-maturity";

type Payload = { organisationName: string; roundTitle: string; responseMode: "confidential" | "named"; participant: { name: string; email: string }; response: { answers: (number | null)[]; currentIndex: number; completed: boolean }; error?: string };

export function TeamResponse() {
  const [token, setToken] = useState("");
  const [payload, setPayload] = useState<Payload | null>();
  const [answers, setAnswers] = useState<(number | null)[]>(Array(25).fill(null));
  const [index, setIndex] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const fromLink = window.location.hash.slice(1);
      const invitationToken = fromLink || window.sessionStorage.getItem("sie-team-invitation") || "";
      if (!invitationToken) { setError("This invitation link is incomplete."); setPayload(null); return; }
      if (fromLink) { window.sessionStorage.setItem("sie-team-invitation", fromLink); window.history.replaceState(null, "", window.location.pathname); }
      setToken(invitationToken);
      void fetch("/api/readiness-account/", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "team-response-open", invitationToken }), cache: "no-store" }).then(async response => {
        const next = await response.json(); if (!response.ok) throw new Error(next.error || "This invitation could not be opened."); setPayload(next); setAnswers(next.response.answers); setIndex(next.response.currentIndex); setSubmitted(next.response.completed);
      }).catch(caught => { setError(caught instanceof Error ? caught.message : "This invitation could not be opened."); setPayload(null); });
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function save(nextAnswers: (number | null)[], nextIndex: number, submit = false) {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/readiness-account/", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: submit ? "team-response-submit" : "team-response-save", invitationToken: token, answers: nextAnswers, currentIndex: nextIndex }) });
      const next = await response.json(); if (!response.ok) throw new Error(next.error || "Your response could not be saved.");
      setAnswers(nextAnswers); setIndex(nextIndex); if (submit) setSubmitted(true);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Your response could not be saved."); }
    finally { setBusy(false); }
  }

  if (payload === undefined) return <main className="sie-tool"><section className="sie-state" role="status"><p>Opening your private invitation…</p></section></main>;
  if (!payload) return <main className="sie-tool"><section className="sie-state" role="alert"><h1>We couldn’t open this invitation.</h1><p>{error}</p><Link href="/">Visit SORP2026</Link></section></main>;
  if (submitted) return <main className="sie-tool"><section className="sie-state sie-team-thanks"><p className="sie-eyebrow">Response submitted ✓</p><h1>Thank you for adding your perspective.</h1><p>Your response is safely included in {payload.organisationName}’s Team Perspective. You can close this page now.</p><small>{payload.responseMode === "confidential" ? "The organiser can see that you completed, but not your individual answers or score." : "This was a named response, as explained before you began."}</small></section></main>;
  const question = QUESTIONS[index], chosen = answers[index], answered = answers.filter(value => value !== null).length;
  return <main className="sie-tool sie-team-response">
    <header className="sie-tool-header"><span className="sie-wordmark">SOCIAL IMPACT <strong>EXCELLENCE</strong></span><span>{payload.organisationName}</span><b>{answered}/25 answered</b></header>
    <section className="sie-response-privacy"><strong>{payload.responseMode === "confidential" ? "Confidential response" : "Named response"}</strong><span>{payload.responseMode === "confidential" ? `${payload.organisationName} can see when you finish, but not your individual answers or score.` : `${payload.organisationName} can see your completed result.`}</span></section>
    <div className="sie-workspace"><div className="sie-context"><div className="sie-progress"><div><strong>{String(index + 1).padStart(2, "0")}</strong><span>of 25</span></div><i><b style={{ width: `${((index + 1) / 25) * 100}%` }}/></i><span>{PILLARS[Math.floor(index / 5)].label}</span></div><h1>{question.statement}</h1></div><section className="sie-question-scroll"><p className="sie-meaning"><strong>What this means:</strong><br/>{question.meaning}</p><div className="sie-rating" role="group" aria-label="Select a score from 1 to 5">{[1,2,3,4,5].map(value => <button type="button" aria-pressed={chosen === value} className={chosen === value ? "selected" : ""} key={value} onClick={() => setAnswers(current => current.map((answer, offset) => offset === index ? value : answer))}><strong>{value} ★</strong><span>{SNAPSHOT_MATURITY_LABELS[value - 1]}</span></button>)}</div><p className="sie-reassurance">Choose what is generally true today. This is a starting point, not an audit.</p>{error && <p className="sie-team-error" role="alert">{error}</p>}</section><nav className="sie-actions"><button disabled={busy || index === 0} onClick={() => void save(answers, index - 1)}>← Previous</button><p>{busy ? "Saving…" : "Saved securely"}</p><button className="primary" disabled={busy || chosen === null} onClick={() => index === 24 ? void save(answers, index, true) : void save(answers, index + 1)}>{index === 24 ? "Submit response →" : "Save & continue →"}</button></nav></div>
  </main>;
}
