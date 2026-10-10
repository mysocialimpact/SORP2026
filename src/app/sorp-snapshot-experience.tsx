"use client";

import Image from "next/image";
import { SorpScreenHero } from "./sorp-forward-line";
import { useEffect, useState, type ReactNode } from "react";

// Presentation timing only. Never marks an assessment operation complete.
export const SNAPSHOT_MINIMUM_MS = 15000;

export function SnapshotBuilding({ verified }: { verified: boolean }) {
  const [message, setMessage] = useState(0);
  useEffect(() => {
    const timers = [window.setTimeout(() => setMessage(1), 7000), window.setTimeout(() => setMessage(2), 11000)];
    return () => timers.forEach(window.clearTimeout);
  }, []);
  const messages = [
    ["SORP 2026 is our source of truth.", "We review your latest Trustees’ Annual Report and accounts against 19 questions mapped to SORP 2026."],
    ["Evidence first. Judgement explained.", "19 questions. Published evidence. Fixed scoring."],
    ["This is the historical view.", "Next, you bring it up to date."],
  ];
  return <section className="hs-building">
    <SorpScreenHero><p className="scr-kicker">BUILDING YOUR HISTORICAL SNAPSHOT…</p><h1 role="status" aria-live="polite">{messages[message][0]}</h1></SorpScreenHero><p className="hs-build-description">{messages[message][1]}</p>
    <p className="hs-processing-status">{verified ? "✓ Report read and validated · 19-question assessment returned" : "Preparing the validated assessment"}<br/><span>Assembling your Historical Snapshot.</span></p>
  </section>;
}

export function SnapshotReady() {
  return <section className="hs-ready">
    <SorpScreenHero><p className="hs-done">DONE <span>✓</span></p><h1>YOUR HISTORICAL{" "}SNAPSHOT IS READY.</h1></SorpScreenHero>
    <p>We’ve reviewed your published Trustees’ Annual Report and accounts against SORP 2026.</p>
    <ul><li>19 QUESTIONS ASSESSED</li><li>PUBLISHED EVIDENCE REVIEWED</li><li>SORP REQUIREMENTS MAPPED</li></ul>
  </section>;
}

export function SnapshotMethod({ onMethodology }: { onMethodology: () => void }) {
  return <div className="hs-explainers">
    <details className="scr-details"><summary>HOW DID WE ARRIVE AT THIS? <span>+</span></summary>
      <div className="hs-method"><div><h3>SORP 2026 IS OUR SOURCE OF TRUTH.</h3><p>19 questions. Published evidence. Tier-aware requirements. Fixed scoring. Judgement clearly labelled.</p><p>Reporting Strength is the weighted assessment score produced by the fixed answer scoring. Mandatory status is shown separately: a MUST is only clearly demonstrated when the evidence reaches the top threshold. A MOSTLY or PARTLY answer contributes to Reporting Strength without classing that mandatory requirement as clearly demonstrated.</p>
        <div className="hs-human"><Image src="/images/marcus-warry-msi.webp" width={1122} height={1402} sizes="72px" alt="Marcus Warry"/><div><span>METHODOLOGY DEVELOPED BY</span><strong>Marcus Warry ACA</strong><p>Chartered Accountant and social impact consultant</p></div></div>
        <p>The assessment is automated, but the methodology, evidence rules and scoring framework are defined by My Social Impact.</p>
        <button type="button" className="scr-clear" onClick={onMethodology}>VIEW THE FULL METHODOLOGY →</button>
      </div><p className="hs-method-caution">This is an automated readiness assessment based on MSI’s published methodology. It is not an audit or professional assurance opinion. A human should review the underlying evidence and conclusions before relying on them.</p></div>
    </details>
  </div>;
}

/** Show the actual result immediately; the shared Forward Line owns motion. */
export function SnapshotReveal({ children }: { score: number | null; children: ReactNode }) {
  return <div className="scr-quick-result hs-result">{children}</div>;
}
