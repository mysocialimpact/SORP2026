"use client";

import { createContext, useContext, useEffect, useLayoutEffect, useRef, type CSSProperties, type ReactNode } from "react";
import "./sorp-forward-line.css";

const SPEED = 48; // CSS pixels per second, shared by desktop and mobile.

const screenStations: Record<string, string[]> = {
  scope: ["PUBLISHED EVIDENCE", "YOUR CURRENT VIEW", "PERSONALISED REPORT"],
  "public-methodology": ["PUBLISHED REPORT", "19 QUESTIONS", "ASSESSED RESULT"],
  intro: ["REPORTING REQUIREMENT", "BETTER EVIDENCE", "BETTER IMPACT"],
  find: ["CHARITY IDENTITY", "SORP TIER", "RIGHT REQUIREMENTS"],
  confirmation: ["LEGAL RECORD", "OFFICIAL WEBSITE", "RIGHT CHARITY"],
  homework: ["DOCUMENT", "EVIDENCE", "SORP", "ASSESSMENT"],
  "quick-generating": ["REPORT", "EVIDENCE", "SORP 2026", "ASSESSMENT"],
  "tar-recovery": ["REPORT FOUND", "READING PAUSED", "RETRY OR CONTACT"],
  "quick-ready": ["REPORT READ", "ASSESSMENT COMPLETE", "SNAPSHOT READY"],
  quick: ["REPORTING STRENGTH", "MANDATORY STATUS", "PRIORITIES"],
  "quick-feedback": ["EXPERIENCE", "YOUR FEEDBACK", "NEXT CHARITY"],
  method: ["HISTORICAL SNAPSHOT", "YOUR CURRENT VIEW", "FULLER REPORT", "MY SOCIAL IMPACT"],
  criterion: ["PUBLISHED EVIDENCE", "YOUR VIEW TODAY", "YOUR CONTEXT"],
  complete: ["HISTORICAL VIEW", "CURRENT VIEW", "PERSONALISED REPORT"],
  generating: ["EVIDENCE", "YOUR ANSWERS", "PRIORITIES", "REPORT"],
  "report-ready": ["TWO VIEWS", "ONE REPORT", "READY"],
  report: ["HISTORICAL", "CURRENT", "PRIORITIES"],
  "report-agenda": ["REVIEW", "ACT", "REVISIT"],
  "email-ready": ["REPORT READY", "KEEP IT", "USE IT"],
  "final-feedback": ["EXPERIENCE", "FEEDBACK", "IMPROVE THE BETA"],
  support: ["YOUR REPORT", "OPTIONAL SUPPORT", "CONTINUE"],
  "before-go": ["SORP READY", "BETTER IMPACT", "SOCIAL IMPACT EXCELLENCE"],
  next: ["GET READY", "GET BETTER", "GET EXCELLENT", "COMMUNICATE RESPONSIBLY"],
  help: ["YOUR RESULTS", "A SESSION", "WHAT NEXT"],
  done: ["REVIEW COMPLETE", "REPORT DELIVERED", "PUT IT TO USE"],
  "non-sorp": ["LEGAL STATUS", "SORP APPLICABILITY", "CORRECT ENTITY"],
};

const stationPositions: Record<number, { x: number; y: number }[]> = {
  2: [{ x: 18, y: 44 }, { x: 80, y: 98 }],
  3: [{ x: 10, y: 44 }, { x: 50, y: 98 }, { x: 89, y: 44 }],
  4: [{ x: 8, y: 44 }, { x: 34, y: 98 }, { x: 64, y: 44 }, { x: 91, y: 98 }],
};

const routeFor = (count: number) => count === 4
  ? "M0 44H145C225 44 215 98 295 98H395C475 98 465 44 545 44H695C775 44 765 98 845 98H1000"
  : count === 2
    ? "M0 44H350C440 44 440 98 530 98H1000"
    : "M0 44H205C295 44 285 98 375 98H625C715 98 705 44 795 44H1000";

export const SorpScreenContext = createContext("");

/** The title and the screen's real ideas form one editorial composition. */
export function SorpScreenHero({ children, line = true }: { children: ReactNode; line?: boolean }) {
  const screen = useContext(SorpScreenContext);
  const hero = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const workspace = hero.current?.closest<HTMLElement>(".scr-workspace");
    const navigation = workspace?.parentElement?.querySelector<HTMLElement>(".scr-top");
    if (!workspace || !navigation) return;
    // A wrapped active stage can add a few pixels to the existing navigation.
    // Absorb that in the content gutter, without changing the navigation itself.
    const align = () => workspace.style.setProperty("--scr-nav-extra", `${window.innerWidth > 760 ? Math.max(0, navigation.getBoundingClientRect().height - 47) : 0}px`);
    align();
    const observer = new ResizeObserver(align);
    observer.observe(navigation);
    return () => observer.disconnect();
  }, [screen]);
  const showLine = line;
  return <><header ref={hero} className="scr-screen-hero">{children}</header>{showLine && <SorpForwardLine screen={screen} />}</>;
}

/** Visual continuity only: the traveller never claims task completion. */
export function SorpForwardLine({ screen, working = false }: { screen: string; working?: boolean }) {
  const path = useRef<SVGPathElement>(null);
  const benefits = screen === "benefits";
  const stations = screenStations[screen] || ["STARTING POINT", "WHAT MATTERS", "NEXT STEP"];
  const route = benefits ? "M60 58H195C280 58 260 114 350 114H525C610 114 590 170 680 170H920" : routeFor(stations.length);
  const positions = stationPositions[stations.length] || stationPositions[3];

  useEffect(() => {
    const element = path.current;
    if (!element?.ownerSVGElement) return;
    const measure = () => {
      const transform = element.getScreenCTM();
      if (!transform) return;
      const length = element.getTotalLength();
      let previous = element.getPointAtLength(0).matrixTransform(transform);
      let pixels = 0;
      // Measure the displayed curve, including non-uniform responsive scaling.
      for (let i = 1; i <= 160; i++) {
        const next = element.getPointAtLength(length * i / 160).matrixTransform(transform);
        pixels += Math.hypot(next.x - previous.x, next.y - previous.y);
        previous = next;
      }
      if (!pixels) return;
      const trail = 52 / pixels * 100;
      element.style.setProperty("--forward-trail", String(trail));
      element.style.setProperty("--forward-end", String(-100 - trail));
      element.style.setProperty("--forward-duration", `${(pixels + 52) / SPEED}s`);
      element.dataset.measured = "true";
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element.ownerSVGElement);
    return () => observer.disconnect();
  }, [route, screen]);

  return <div className={`scr-forward-line${benefits ? " scr-forward-line--benefits" : ""}${working ? " is-working" : ""}`} aria-hidden="true">
    <div className="scr-forward-line-inner">
      <svg viewBox={benefits ? "0 0 1000 220" : "0 0 1000 142"} preserveAspectRatio="none" fill="none">
        <path className="scr-forward-track" d={route} pathLength="100" />
        <path key={screen} ref={path} className="scr-forward-trace" d={route} pathLength="100" />
      </svg>
      {!benefits && <ol className="scr-forward-stations">{stations.map((label, index) => <li key={label} className={positions[index].y > 70 ? "is-low" : "is-high"} style={{ "--station-x": `${positions[index].x}%`, "--station-y": `${positions[index].y}px` } as CSSProperties}><span>0{index + 1}</span><strong>{label}</strong></li>)}</ol>}
    </div>
  </div>;
}
