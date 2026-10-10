"use client";

import { useEffect, useState } from "react";
import type { Candidate, Lens } from "./sorp-public-model";
import { completedEvent, type PreparedDocument, type StageEvent } from "./sorp-journey-progress";

export function useReportEvents(sessionId: string, waiting: boolean, startedAt: number) {
  const [events, setEvents] = useState<StageEvent[]>([]);
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!waiting) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const since = new Date(startedAt).toISOString();
    const poll = async () => {
      try {
        const response = await fetch(`/api/published-review?sessionId=${encodeURIComponent(sessionId)}&since=${encodeURIComponent(since)}`, { cache: "no-store" });
        if (response.ok) {
          const body = await response.json() as { events?: StageEvent[] };
          if (active && body.events) setEvents(previous => Array.from(new Map([...previous, ...body.events!].map(event => [`${event.stage}:${event.createdAt}:${event.phase}:${event.message}`, event])).values()).sort((a, b) => Date.parse(a.createdAt || "") - Date.parse(b.createdAt || "")));
        }
      } catch { /* The actual request remains authoritative if status polling fails. */ }
      if (active) timer = setTimeout(poll, 1600);
    };
    void poll();
    const clock = setInterval(() => setElapsed(Date.now() - startedAt), 1000);
    return () => { active = false; clearTimeout(timer); clearInterval(clock); };
  }, [sessionId, waiting, startedAt]);
  return { events, elapsed };
}

export function SuccessMark() {
  return <svg className="sj-success-mark" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="28"/><path d="m19 33 9 9 18-21"/></svg>;
}

export function SorpHomeworkExperience({ candidate, tier, document, lens, waiting, startedAt, sessionId }: { candidate: Candidate | null; tier: string; document: PreparedDocument | null; lens: Lens | null; waiting: boolean; startedAt: number; sessionId: string }) {
  const { events, elapsed } = useReportEvents(sessionId, waiting, startedAt);
  const verified = Boolean(document || lens);
  const latest = events.at(-1);
  const complete = (stage: string) => verified || events.some(event => event.stage === stage && completedEvent(event));
  const milestones = [
    { label: "Report located", done: complete("tar-discovery") || complete("pdf-download") },
    { label: "PDF recovered", done: complete("pdf-download") },
    { label: "Every page read", done: complete("pdf-extraction") },
    { label: "Identity validated", done: complete("validation") },
  ];
  const active = milestones.findIndex(item => !item.done);
  const sourceUrl = document?.sourceUrl || lens?.sourceUrl || "";
  const pages = document?.pageCount || lens?.diagnostics?.pageCount;
  const reading = events.filter(event => event.stage === "page-reading").at(-1);
  const count = reading?.result?.match(/^(\d+)\/(\d+)$/);
  const delayed = waiting && elapsed > 30000;
  return <div className={`sj-journey ${verified ? "is-complete" : ""}`}>
    <div className="sj-eyebrow"><span>PUBLISHED REPORT</span><span>{candidate?.name || "YOUR CHARITY"}</span></div>
    <header className="sj-heading"><h1>{verified ? "Your report.\nRead and ready." : waiting ? "Finding the evidence.\nReading every page." : "Your published report."}</h1><p>{verified ? "Your Trustees’ Annual Report and accounts have passed the complete-document and charity-identity checks." : "We’re locating and reading your publicly available Trustees’ Annual Report and accounts."}</p></header>
    <div className="sj-document-grid">
      <div className={`sj-document ${verified ? "is-validated" : ""}`} aria-hidden="true"><div className="sj-paper"><span>TRUSTEES’ ANNUAL REPORT</span><strong>{candidate?.name || "Published evidence"}</strong><div className="sj-paper-lines"><i/><i/><i/><i/><i/></div>{verified ? <SuccessMark/> : <div className="sj-reading-light"/>}<small>{pages ? `${pages} PAGES · VALIDATED` : count ? `${count[1]} / ${count[2]} PAGES EXTRACTED` : "PUBLIC EVIDENCE"}</small></div></div>
      <div className="sj-document-progress"><ol className="sj-milestones" aria-label="Published report progress">{milestones.map((item, index) => <li key={item.label} className={item.done ? "is-complete" : waiting && index === active ? "is-active" : ""}><span aria-hidden="true">{item.done ? "✓" : `0${index + 1}`}</span><div><strong>{item.label}</strong><small>{item.done ? "Complete" : waiting && index === active ? "In progress" : "Next"}</small></div></li>)}</ol>
      <div className={`sj-live-status ${latest?.phase === "retry" ? "is-retrying" : ""}`} role="status" aria-atomic="true">{verified ? <><strong>We have the document needed to begin.</strong><p>{document?.storedCopyUsed ? "The exact stored public PDF was recovered and validated again." : lens ? "Your completed assessment is saved. You can continue without downloading it again." : document?.uploaded ? "Your supplied PDF was read and validated." : `All ${pages} pages were read. Your validated report is saved.`}</p></> : <><strong>{latest?.message || (waiting ? "Checking the charity’s published reporting context." : "Your progress is saved. Continue to locate and read the report.")}</strong>{delayed && <p>We’re sorry this is taking longer. {latest?.phase === "retry" ? "The recovery attempt shown above is in progress." : "This step has not finished yet."} Your charity selection is saved.</p>}{delayed && <p>This tool is still in beta. Unusual delays like this help us identify where the experience needs to improve.</p>}</>}</div></div>
    </div>
    {verified && <div className="sj-document-facts"><div><span>FILING</span><strong>{document?.title || lens?.title}</strong></div><div><span>REPORTING PERIOD</span><strong>{document?.period || lens?.period || "Not established"}</strong></div><div><span>SORP TIER</span><strong>{tier}</strong></div><div><span>PUBLIC SOURCE</span>{sourceUrl.startsWith("https://") ? <a href={sourceUrl} target="_blank" rel="noreferrer">Open published PDF ↗</a> : <strong>User-supplied PDF</strong>}</div></div>}
    {!verified && <p className="sj-footnote">Your published report is the starting point. Next, we assess its evidence against 19 SORP questions.</p>}
  </div>;
}
