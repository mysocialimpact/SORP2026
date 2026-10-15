"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AskSorpContinuation } from "@/components/ask-sorp-continuation";

type Citation = {
  reference: string;
  module: string;
  page: number;
  extract: string;
};

type Answer = {
  short_answer: string;
  citations: Citation[];
  requirement: "MUST" | "SHOULD" | "MAY" | "MIXED" | "GUIDANCE" | "NOT SPECIFIED";
  tier_scope: string;
  applicability: "applies" | "does_not_apply" | "depends";
  interpretation: string;
  ambiguity: string;
  missing_information: string[];
  human_judgement: string;
  follow_up_suggestions: string[];
};

type Turn = { question: string; answer: Answer };
type HistoryItem = { role: "user" | "assistant"; content: string };

const storageKey = "sorp2026-ask-sorp-conversation";
const exampleQuestions = [
  "What changes under SORP 2026?",
  "What does my charity need to report?",
  "What are the new income thresholds?",
  "What should trustees know about impact reporting?",
];

type AskSorpLiveProps = {
  mode?: "launcher" | "workspace";
  initialQuestion?: string;
  onBusyChange?: (busy: boolean) => void;
};

function Paragraphs({ children }: { children: string }) {
  const paragraphs = children.split(/\n{2,}/).map(item => item.trim()).filter(Boolean);
  return <>{paragraphs.map((paragraph, index) => <p key={`${index}-${paragraph.slice(0, 24)}`}>{paragraph}</p>)}</>;
}

function validAnswer(value: unknown): value is Answer {
  if (!value || typeof value !== "object") return false;
  const answer = value as Partial<Answer>;
  return typeof answer.short_answer === "string"
    && typeof answer.interpretation === "string"
    && Array.isArray(answer.citations)
    && Array.isArray(answer.follow_up_suggestions);
}

export function AskSorpLive({ mode = "workspace", initialQuestion = "", onBusyChange }: AskSorpLiveProps) {
  const router = useRouter();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [draft, setDraft] = useState(initialQuestion.slice(0, 1200));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const sessionId = useRef("");
  const [continuationSessionId, setContinuationSessionId] = useState("");
  const latestAnswer = useRef<HTMLElement>(null);
  const conversation = useRef<HTMLDivElement>(null);

  useEffect(() => onBusyChange?.(busy), [busy, onBusyChange]);

  useEffect(() => {
    if (mode !== "workspace") return;
    try {
      const saved = JSON.parse(sessionStorage.getItem(storageKey) || "null") as {
        sessionId?: unknown;
        turns?: unknown;
        history?: unknown;
      } | null;
      if (saved && typeof saved.sessionId === "string") sessionId.current = saved.sessionId;
      const restoredTurns = saved && Array.isArray(saved.turns) ? saved.turns.filter((turn): turn is Turn => Boolean(
          turn && typeof turn === "object" && "question" in turn && typeof turn.question === "string"
          && "answer" in turn && validAnswer(turn.answer),
        )).slice(-3) : [];
      const restoredHistory = saved && Array.isArray(saved.history) ? saved.history.filter((item): item is HistoryItem => Boolean(
          item && typeof item === "object" && "role" in item && (item.role === "user" || item.role === "assistant")
          && "content" in item && typeof item.content === "string",
        )).slice(-6) : [];
      const frame = requestAnimationFrame(() => {
        if (restoredTurns.length) {
          if (!sessionId.current) sessionId.current = crypto.randomUUID();
          setContinuationSessionId(sessionId.current);
          setTurns(restoredTurns);
        }
        if (restoredHistory.length) setHistory(restoredHistory);
      });
      return () => cancelAnimationFrame(frame);
    } catch {
      // A new conversation remains available if browser storage is disabled.
    }
  }, [mode]);

  useEffect(() => {
    if (mode !== "workspace") return;
    if (!sessionId.current || (!turns.length && !history.length)) return;
    try {
      sessionStorage.setItem(storageKey, JSON.stringify({ sessionId: sessionId.current, turns, history }));
    } catch {
      // The current conversation still works if browser storage is unavailable.
    }
  }, [turns, history, mode]);

  function getSessionId() {
    if (!sessionId.current) {
      sessionId.current = crypto.randomUUID();
      setContinuationSessionId(sessionId.current);
    }
    return sessionId.current;
  }

  async function ask(question: string) {
    const value = question.trim();
    if (busy || value.length < 3) return;
    if (mode === "launcher") {
      router.push(`/ask-sorp/workspace/?question=${encodeURIComponent(value)}`);
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/ask-sorp/", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          question: value,
          history,
          round: turns.length + 1,
          sessionId: getSessionId(),
          requestId: crypto.randomUUID(),
        }),
      });
      const data = await response.json() as Answer & { error?: string; message?: string; off_topic?: boolean };
      if (!response.ok) throw new Error(data.error || "Ask SORP is temporarily unavailable. Please try again.");
      if (data.off_topic) {
        setNotice(data.message || "Try asking a question about SORP 2026, charity accounting or reporting.");
        setDraft(value);
        return;
      }
      if (!validAnswer(data)) throw new Error("The answer arrived incomplete. Please try that question again.");
      setTurns(current => [...current, { question: value, answer: data }].slice(-3));
      setHistory(current => [...current,
        { role: "user" as const, content: value },
        { role: "assistant" as const, content: `${data.short_answer}\n\n${data.interpretation}` },
      ].slice(-6));
      setDraft("");
      requestAnimationFrame(() => {
        latestAnswer.current?.focus({ preventScroll: true });
        latestAnswer.current?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ask SORP is temporarily unavailable. Please try again.");
      setDraft(value);
    } finally {
      setBusy(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void ask(draft);
  }

  return (
    <section className={`ask-assistant ask-assistant--${mode}`} aria-labelledby="ask-assistant-title">
      <header className="ask-assistant-bar">
        <div>
          <span className="ask-live-dot" aria-hidden="true" />
          <span><strong id="ask-assistant-title">Ask SORP · Live beta</strong><small>Evidence-led answers from the existing MSI service</small></span>
        </div>
        <span className="ask-assistant-status">Free to explore</span>
      </header>

      <div className="ask-assistant-body">
        <div className="ask-assistant-scroll" ref={conversation}>
        {!turns.length && (
          <div className="ask-assistant-welcome">
            <p className="ask-eyebrow">Start with a real question</p>
            <h2>What do you need to know?</h2>
            <p>Ask in plain English. Ask SORP finds relevant passages, explains what they mean and shows you the source.</p>
            <div className="ask-examples" aria-label="Example SORP questions">
              {exampleQuestions.map(question => (
                <button type="button" key={question} disabled={busy} onClick={() => void ask(question)}>
                  <span>{question}</span><span aria-hidden="true">→</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="ask-conversation" role="log" aria-live="polite" aria-relevant="additions">
          {turns.map((turn, index) => (
            <article className="ask-turn" key={`${index}-${turn.question}`} tabIndex={-1} ref={index === turns.length - 1 ? latestAnswer : undefined}>
              <div className="ask-question"><span>You asked</span><p>{turn.question}</p></div>
              <div className="ask-response">
                <div className="ask-answer-heading">
                  <span>Ask SORP answers</span>
                  <div>
                    <strong>{turn.answer.requirement}</strong>
                    {turn.answer.tier_scope && <small>{turn.answer.tier_scope}</small>}
                  </div>
                </div>
                <div className="ask-answer-copy"><Paragraphs>{turn.answer.short_answer}</Paragraphs></div>

                {turn.answer.interpretation && (
                  <section className="ask-interpretation" aria-label="Practical interpretation">
                    <h3>What this means in practice</h3>
                    <Paragraphs>{turn.answer.interpretation}</Paragraphs>
                  </section>
                )}

                <details className="ask-citations" open>
                  <summary>Official SORP references <span>{turn.answer.citations.length}</span></summary>
                  <div>
                    {turn.answer.citations.length ? turn.answer.citations.map(citation => (
                      <article key={`${citation.reference}-${citation.page}`}>
                        <div><strong>SORP {citation.reference}</strong><small>{citation.module} · PDF page {citation.page}</small></div>
                        <p>{citation.extract}</p>
                      </article>
                    )) : <p>The service did not identify a specific paragraph for this answer.</p>}
                    <a href="https://charitysorp.org/" target="_blank" rel="noreferrer">Open the official Charities SORP website ↗</a>
                  </div>
                </details>

                {(turn.answer.human_judgement || turn.answer.missing_information?.length > 0) && (
                  <div className="ask-judgement">
                    <span>Where judgement remains</span>
                    {turn.answer.human_judgement && <p>{turn.answer.human_judgement}</p>}
                    {turn.answer.missing_information?.length > 0 && <ul>{turn.answer.missing_information.map(item => <li key={item}>{item}</li>)}</ul>}
                  </div>
                )}

                {turn.answer.follow_up_suggestions?.length > 0 && turns.length < 3 && (
                  <div className="ask-follow-ups">
                    <span>Ask next</span>
                    {turn.answer.follow_up_suggestions.slice(0, 3).map(question => (
                      <button type="button" key={question} disabled={busy} onClick={() => void ask(question)}>{question} <span aria-hidden="true">→</span></button>
                    ))}
                  </div>
                )}
              </div>
            </article>
          ))}
          {busy && <div className="ask-thinking" role="status"><span aria-hidden="true" /><div><strong>Finding the relevant SORP evidence…</strong><p>Checking the answer against the source before showing it.</p></div></div>}
        </div>

        {turns.length === 3 && continuationSessionId && <AskSorpContinuation turns={turns} sessionId={continuationSessionId} />}
        {notice && <p className="ask-notice" role="status">{notice}</p>}
        {error && <p className="ask-error" role="alert">{error}</p>}
        </div>

        {turns.length < 3 ? <form className="ask-composer" onSubmit={submit}>
          <label htmlFor="ask-sorp-question">Your SORP 2026 question</label>
          <div>
            <textarea
              id="ask-sorp-question"
              value={draft}
              onChange={event => setDraft(event.target.value)}
              placeholder="Ask about reporting tiers, grants, leases, trustees’ reports, impact reporting…"
              maxLength={1200}
              rows={3}
              disabled={busy}
              autoFocus={mode === "workspace" && Boolean(initialQuestion)}
            />
            <button type="submit" disabled={busy || draft.trim().length < 3}>{busy ? "Checking the source…" : "Ask SORP →"}</button>
          </div>
          <p>{mode === "launcher" ? "Your question opens in a focused Ask SORP workspace." : "Evidence-backed guidance to support, not replace, the judgement of trustees, accountants and professional advisers."}</p>
        </form> : <div className="ask-composer ask-composer--complete"><p>Three free answers complete · Your conversation and next steps are above.</p></div>}
      </div>
    </section>
  );
}
