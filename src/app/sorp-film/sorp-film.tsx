"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import { frameAt, scenes, slideTimes } from "./timeline";
import "./sorp-film.css";

type Props = {
  /** Fixed frame for deterministic capture; never a playback clock. */
  time?: number;
  controls?: boolean;
  startHref?: string;
  embedded?: boolean;
  initialSlide?: number;
};
const excerpt = "We support local families through weekly advice sessions.";

function Marcus({ full = false }: { full?: boolean }) {
  return (
    <div className="sf-credential">
      <Image
        className="sf-portrait"
        src="/images/marcus-warry-msi.webp"
        alt="Marcus Warry"
        width={96}
        height={96}
        unoptimized
        loading="eager"
      />
      <div>
        <strong>{full ? "Developed by " : ""}Marcus Warry ACA</strong>
        <span>Chartered Accountant · Social Impact Consultant</span>
        {full && <span>Co-founder, My Social Impact</span>}
      </div>
    </div>
  );
}

/** A single Forward Line, with the story's stages sitting on its route. */
function ForwardLine({
  steps,
  finish = false,
}: {
  steps: string[];
  finish?: boolean;
}) {
  return (
    <div
      className={`sf-forward${finish ? " sf-forward-finish" : ""}`}
      style={{ "--steps": steps.length } as CSSProperties}
    >
      <svg
        className="sf-line"
        viewBox={finish ? "0 0 1000 60" : "0 0 1000 32"}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d={
            finish
              ? "M 0 27 H 992 L 980 15 M 992 27 L 980 39"
              : "M 0 20 H 992 L 980 8 M 992 20 L 980 32"
          }
          pathLength="1"
        />
      </svg>
      <ol>
        {steps.map((step, i) => (
          <li key={step} style={{ "--order": i } as CSSProperties}>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function SorpFilm({
  time,
  controls = true,
  startHref = "/are-you-sorp-ready/review/?entry=intro",
  embedded = false,
  initialSlide = 0,
}: Props) {
  const [slide, setSlide] = useState(Number.isInteger(initialSlide) ? Math.max(0, Math.min(scenes.length - 1, initialSlide)) : 0);
  const [captureTime, setCaptureTime] = useState<number | null>(null);
  const [reduced, setReduced] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = root.current;
    const captureSeek = (event: Event) => {
      const seconds = (event as CustomEvent<number>).detail;
      if (typeof seconds === "number" && Number.isFinite(seconds))
        setCaptureTime(frameAt(seconds).time);
    };
    element?.addEventListener("sorp-film:seek", captureSeek);
    if (element) element.dataset.ready = "true";
    return () => element?.removeEventListener("sorp-film:seek", captureSeek);
  }, []);
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (!controls || time !== undefined) return;
    const navigate = (event: KeyboardEvent) => {
      if (embedded && !root.current?.contains(event.target as Node)) return;
      if (
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        (event.target instanceof HTMLElement &&
          event.target.closest(
            "input, textarea, select, [contenteditable=true]",
          ))
      )
        return;
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      setCaptureTime(null);
      setSlide((current) =>
        Math.max(
          0,
          Math.min(
            scenes.length - 1,
            current + (event.key === "ArrowRight" ? 1 : -1),
          ),
        ),
      );
    };
    window.addEventListener("keydown", navigate);
    return () => window.removeEventListener("keydown", navigate);
  }, [controls, time, embedded]);
  const OpeningHeading = embedded ? "h2" : "h1";
  const frame = frameAt(time ?? captureTime ?? slideTimes[slide]);
  const current = frame.scene;
  const goToSlide = (next: number) => {
    setCaptureTime(null);
    setSlide(Math.max(0, Math.min(scenes.length - 1, next)));
  };

  return (
    <div
      ref={root}
      className={`sorp-film${embedded ? " sorp-film--embedded" : ""}`}
      tabIndex={embedded ? 0 : undefined}
      role="region"
      aria-label="SORP readiness presentation; use Previous, Next or arrow keys"
      data-scene={current}
      data-slide={current}
      data-time={frame.time.toFixed(3)}
      data-reduced-motion={reduced ? "true" : "false"}
      data-still={time !== undefined || captureTime !== null ? "true" : "false"}
    >
      <div
        className="sf-stage"
        role="group"
        aria-label="Are You SORP Ready? animated presentation"
      >
        <div className="sf-brand">
          MY SOCIAL IMPACT <span>ARE YOU SORP READY?</span>
        </div>
        <div className="sf-chapter">
          {String(current + 1).padStart(2, "0")} / {String(scenes.length).padStart(2, "0")}
        </div>
        <section
          key={current}
          className={`sf-scene sf-scene-${current}`}
          aria-label={scenes[current].title}
          aria-live="polite"
          aria-atomic="true"
        >
          {current === 0 && (
            <>
              <p className="sf-eyebrow">
                SORP 2026 · IMPACT &amp; SUSTAINABILITY
              </p>
              <OpeningHeading>
                SORP is the requirement.
                <br />
                <em>
                  Better impact is
                  <br className="sf-mobile-break" /> the opportunity.
                </em>
              </OpeningHeading>
              <ForwardLine steps={["THE REQUIREMENT", "THE OPPORTUNITY"]} />
              <div className="sf-introduction">
                <h2>Are You SORP Ready?</h2>
                <p className="sf-lead">
                  Find out where your charity stands —{" "}
                  <strong>for free.</strong>
                </p>
              </div>
              <Marcus full />
              <p className="sf-scope">
                Focused on the impact and sustainability reporting aspects of
                SORP 2026.
                <br />
                Not a full SORP compliance review.
              </p>
            </>
          )}
          {current === 1 && (
            <>
              <p className="sf-eyebrow">WHY THIS MATTERS NOW</p>
              <h2>The expectations around<br /><em>impact are changing.</em></h2>
              <ForwardLine steps={["TRUSTEES", "FUNDERS & GRANT-MAKERS", "COMMISSIONERS / GOVERNMENT", "DONORS & SUPPORTERS", "STAFF & VOLUNTEERS"]} />
              <div className="sf-expectations">
                {[
                  ["Trustees", "Is the charity achieving its purpose?"],
                  ["Funders & grant-makers", "Evidence of outcomes and impact, beyond activity."],
                  ["Commissioners / government", "Are resources producing meaningful results?"],
                  ["Donors & supporters", "Confidence that their money makes a difference."],
                  ["Staff & volunteers", "Knowing their work matters."],
                ].map(([title, copy]) => <div key={title}><h3>{title}</h3><p>{copy}</p></div>)}
              </div>
              <p className="sf-takeaway">Impact evidence helps organisations earn trust, secure resources and make better decisions.</p>
              <p className="sf-why-payoff">It helps you know whether your work<br /><em>is actually effective.</em></p>
            </>
          )}
          {current === 2 && (
            <>
              <p className="sf-eyebrow">WE DO THE HARD WORK FIRST</p>
              <h2>
                We find <em>your charity.</em>
              </h2>
              <p className="sf-lead">The public homework, done for you.</p>
              <ForwardLine
                steps={[
                  "CHARITY FOUND",
                  "DOES SORP APPLY?",
                  "YOUR REPORTING TIER",
                  "LATEST REPORT & ACCOUNTS",
                ]}
              />
              <div className="sf-homework">
                {[
                  ["01", "Registered charity", "Charity found ✓"],
                  ["02", "SORP applies", "Accruals accounts ✓"],
                  ["03", "Tier 2", "Reporting context established"],
                  [
                    "04",
                    "Latest report found",
                    "Trustees’ Annual Report & accounts ✓",
                  ],
                ].map(([n, heading, text]) => (
                  <div className="sf-card" key={n}>
                    <span className="sf-number">{n}</span>
                    <h3>{heading}</h3>
                    <p>{text}</p>
                  </div>
                ))}
              </div>
              <p className="sf-takeaway">
                We check the public record and establish the relevant reporting
                context <strong>before asking you anything.</strong>
              </p>
              <p className="sf-note">
                Illustrative charity and reporting context.
              </p>
            </>
          )}
          {current === 3 && (
            <>
              <p className="sf-eyebrow">
                <em>THEN</em> · YOUR PUBLISHED REPORT
              </p>
              <h2>
                Your <em>Historical Snapshot.</em>
              </h2>
              <p className="sf-lead">
                What your latest published Trustees’ Annual Report and accounts
                already demonstrate.
              </p>
              <ForwardLine
                steps={[
                  "LATEST TAR",
                  "EXACT EVIDENCE",
                  "SORP REQUIREMENT",
                  "ASSESSMENT",
                  "HISTORICAL SNAPSHOT",
                ]}
              />
              <div className="sf-two-col sf-snapshot">
                <div className="sf-card">
                  <p className="sf-label">YOUR HISTORICAL SNAPSHOT</p>
                  <h3>Reporting Strength</h3>
                  <p>
                    Evidence against the requirements that apply to your
                    charity.
                  </p>
                  <div className="sf-tags">
                    <span>MUST</span>
                    <span>SHOULD</span>
                    <span>MAY</span>
                  </div>
                </div>
                <div className="sf-findings">
                  <p>
                    <span>01</span> Clearly
                  </p>
                  <p>
                    <span>02</span> Mostly
                  </p>
                  <p>
                    <span>03</span> Partly
                  </p>
                  <p><span>04</span> Limited</p>
                  <p><span>05</span> Not yet</p>
                  <small>Illustrative assessment categories</small>
                </div>
              </div>
              <p className="sf-takeaway">
                Your published report shows{" "}
                <strong>what was evidenced then.</strong>
              </p>
            </>
          )}
          {current === 4 && (
            <>
              <p className="sf-eyebrow">
                <em>NOW</em> · YOUR CURRENT POSITION
              </p>
              <h2>
                You tell us where
                <br />
                <em>things stand now.</em>
              </h2>
              <p className="sf-lead">
                <strong>19 focused questions</strong> — with space for your
                comments and context.
              </p>
              <ForwardLine
                steps={[
                  "HISTORICAL SNAPSHOT",
                  "YOUR ANSWERS & COMMENTS",
                  "CURRENT POSITION",
                ]}
              />
              <div className="sf-card sf-question">
                <p className="sf-label">
                  A QUICK CHECK-IN · ILLUSTRATIVE QUESTION
                </p>
                <h3>
                  Do your activities clearly connect to your charity’s purpose?
                </h3>
                <div className="sf-answers">
                  {[
                    "Clearly",
                    "Mostly",
                    "Partly",
                    "Limited",
                    "Not yet",
                    "Not sure",
                  ].map((answer) => (
                    <span
                      className={
                        answer === "Mostly" ? "sf-selected" : undefined
                      }
                      key={answer}
                    >
                      {answer}
                    </span>
                  ))}
                </div>
                <div className="sf-context">
                  <span>COMMENTS</span>
                  <span>CONTEXT</span>
                  <span>EVIDENCE ELSEWHERE</span>
                </div>
              </div>
              <p className="sf-takeaway">
                Tell us <strong>what has changed</strong>, what is already in
                place and what is still being developed.
              </p>
            </>
          )}
          {current === 5 && (
            <>
              <p className="sf-eyebrow">
                <em>NEXT</em> · TWO VIEWS, ONE CLEAR REPORT
              </p>
              <h2>
                Your personalised report
                <br />
                <em>is free.</em>
              </h2>
              <ForwardLine
                steps={[
                  "THEN + NOW",
                  "YOUR PERSONALISED REPORT",
                  "YOUR PRIORITIES",
                ]}
              />
              <div className="sf-two-col sf-report">
                <div className="sf-benefits">
                  <p>What’s strong</p>
                  <p>Where the gaps are</p>
                  <p>What matters most</p>
                  <p>What to do next</p>
                </div>
                <div className="sf-priorities">
                  <p>
                    <span>01</span>
                    <strong>DO NOW</strong>
                  </p>
                  <p>
                    <span>02</span>
                    <strong>IMPROVE WHEN PRACTICAL</strong>
                  </p>
                  <p>
                    <span>03</span>
                    <strong>ALREADY STRONG / NO ACTION</strong>
                  </p>
                </div>
              </div>
              <p className="sf-report-logic">
                Your report showed what was evidenced <strong>then.</strong> You
                told us where things stand <strong>now.</strong> Your
                personalised report shows <strong>what to do next.</strong>
              </p>
              <p className="sf-takeaway">
                Plan improvements with colleagues or trustees.{" "}
                <strong>Prepare for the next reporting period.</strong>
              </p>
              <div className="sf-assurance">
                <span>FREE ASSESSMENT</span>
                <span>FREE PERSONALISED REPORT</span>
                <span>NO OBLIGATION</span>
              </div>
            </>
          )}
          {current === 6 && (
            <>
              <p className="sf-eyebrow">EVERY CONCLUSION EXPLAINED</p>
              <h2>
                See exactly
                <br />
                <em>how we reached it.</em>
              </h2>
              <ForwardLine
                steps={[
                  "PUBLISHED TEXT",
                  "SORP REQUIREMENT",
                  "LOGICAL TEST",
                  "RESULT",
                ]}
              />
              <div className="sf-two-col sf-evidence">
                <div className="sf-card">
                  <p className="sf-label">EXACT TEXT · ILLUSTRATIVE EXTRACT</p>
                  <blockquote>“{excerpt}”</blockquote>
                  <p className="sf-note">
                    Requirement: connect activities to charitable purpose.
                  </p>
                </div>
                <div className="sf-reasoning">
                  <p>✓ Purpose stated</p>
                  <p>✓ Activities described</p>
                  <p>✕ Connection not explicit enough</p>
                  <div className="sf-result">
                    <span>RESULT</span>
                    <strong>Mostly demonstrated</strong>
                  </div>
                </div>
              </div>
              <p className="sf-takeaway">
                <strong>Open any question</strong> to inspect the evidence,
                reasoning and result.
              </p>
              <p className="sf-note">
                No mysterious score. No unexplained AI verdict.
              </p>
            </>
          )}
          {current === 7 && (
            <>
              <p className="sf-eyebrow">BEYOND COMPLIANCE</p>
              <h2>
                SORP ready is<br /><em>the starting point.</em>
              </h2>
              <p className="sf-proposition">
                SORP is the requirement.{" "}
                <strong>Better impact is the opportunity.</strong>
              </p>
              <ForwardLine
                steps={[
                  "GET READY",
                  "GET BETTER",
                  "GET EXCELLENT",
                ]}
              />
              <div className="sf-growth">
                <p>Readiness and stronger reporting.</p>
                <p>Better evidence, measurement, data and learning. Better decisions. Better impact.</p>
                <p><strong>Social Impact Excellence</strong><span>Purpose · Leadership · Data · Delivery · Communication</span></p>
              </div>
              <div className="sf-two-col sf-offer">
                <div className="sf-free-offer">
                  <p className="sf-label">FREE</p>
                  <h3>
                    Assessment +<br />
                    personalised report
                  </h3>
                  <p>Understand where you stand.</p>
                  <p className="sf-note">Yours to use. No obligation.</p>
                </div>
                <div className="sf-paid-offer">
                  <p className="sf-label">OPTIONAL HUMAN SUPPORT</p>
                  <h3>Review the findings with Marcus</h3>
                  <div className="sf-prices">
                    <span>10 MINUTES <strong>FREE</strong></span>
                    <span>
                      30 MINUTES <strong>£50</strong>
                    </span>
                    <span>
                      60 MINUTES <strong>£100</strong>
                    </span>
                  </div>
                  <p>
                    An initial conversation, or a paid review to decide what to do.
                  </p>
                </div>
              </div>
              <div className="sf-human">
                <Marcus />
                <div>
                  <p>
                    My Social Impact helps you understand, manage and
                    communicate impact.
                  </p>
                  <p className="sf-note">
                    Practical implementation support from <strong>£250</strong>,
                    if needed. Your assessment does not prescribe services: the
                    human review agrees what work, if any, you need.
                  </p>
                </div>
              </div>
            </>
          )}
          {current === 8 && (
            <>
              <p className="sf-eyebrow">START WITH WHAT YOU ALREADY HAVE</p>
              <h2 className="sf-end-title">
                Are you
                <br />
                <em>SORP ready?</em>
              </h2>
              <div className="sf-action">
                <p>Find your charity.</p>
                <p>Get your free report.</p>
                <p>
                  <strong>Know what to do next.</strong>
                </p>
              </div>
              <ForwardLine
                steps={["YOUR CHARITY", "YOUR FREE REPORT", "YOUR NEXT STEP"]}
                finish
              />
              <a className="sf-cta" href={startHref}>
                START THE FREE REVIEW <span aria-hidden="true">→</span>
              </a>
              <p className="sf-reassurance">
                No card. No surprise paywall. No obligation.
              </p>
              <Marcus />
            </>
          )}
        </section>
        <div className="sf-footer">
          <span>
            SORP IS THE REQUIREMENT. BETTER IMPACT IS THE OPPORTUNITY.
          </span>
          <span>SORP 2026</span>
        </div>
      </div>
      {controls && (
        <>
          <div className="sf-controls" aria-label="Slide controls">
            <button
              className="sf-previous"
              onClick={() => goToSlide(current - 1)}
              disabled={current === 0}
            >
              ← Previous
            </button>
            <p>Take your time. Move on when you’re ready.</p>
            <output aria-live="polite">
              Slide {current + 1} of {scenes.length}
            </output>
            <button
              className="sf-next"
              onClick={() => goToSlide(current + 1)}
              disabled={current === scenes.length - 1}
            >
              Next →
            </button>
          </div>
          <nav className="sf-chapters" aria-label="Presentation chapters">
            {scenes.map((scene, i) => (
              <button
                key={scene.title}
                aria-label={`${i + 1}. ${scene.title}`}
                title={scene.title}
                aria-current={current === i ? "step" : undefined}
                onClick={() => goToSlide(i)}
              >
                <span aria-hidden="true" />
              </button>
            ))}
          </nav>
        </>
      )}
    </div>
  );
}
