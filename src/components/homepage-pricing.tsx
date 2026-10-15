"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

const plans = [
  {
    id: "free",
    name: "FREE",
    price: "£0",
    status: "Available now",
    intro: "A serious starting point, with no card and no obligation.",
    highlights: [
      "Full Are You SORP Ready? assessment",
      "Ask SORP and an initial automated report review",
      "Introductory Social Impact Excellence guidance",
    ],
    details: [
      "Complete the full SORP readiness journey and keep your result in your account.",
      "Ask evidence-led SORP questions with official references, subject to reasonable fair use. No numeric allowance is currently published.",
      "Receive an initial automated review of published charity reporting evidence where the readiness journey supports it.",
      "Use the introductory Social Impact Excellence maturity assessment and its guidance.",
      "Save progress and see available products through one basic platform account.",
      "Human review, advice and implementation support are optional and charged separately.",
    ],
  },
  {
    id: "plus",
    name: "PLUS",
    price: "£29",
    suffix: "/month",
    status: "Planned",
    intro: "More depth for one organisation ready to keep improving.",
    highlights: [
      "Greater AI and Ask SORP usage",
      "Deeper impact report analysis",
      "Full improvement framework and tracking",
    ],
    details: [
      "Everything in Free.",
      "Planned higher Ask SORP and AI usage allowances; exact fair-use limits will be published before launch.",
      "Planned more extensive impact report analysis and additional reporting functionality.",
      "Planned access to the full Social Impact Excellence framework.",
      "Planned self-service impact improvement planning, progress tracking and team collaboration.",
      "This subscription is not yet on sale and no checkout is currently available.",
    ],
  },
  {
    id: "adviser",
    name: "ADVISER",
    price: "£99",
    suffix: "/month",
    status: "Planned",
    intro: "A professional workspace for advisers supporting several charities.",
    highlights: [
      "Multiple charity organisations",
      "Client permissions and progress",
      "Adviser and team collaboration",
    ],
    details: [
      "Everything planned for Plus.",
      "Planned adviser dashboard and management of multiple charity organisations.",
      "Planned access to assessments, answers and progress only where the client has authorised it.",
      "Planned ability to complete assessments on behalf of clients and invite clients or team members.",
      "Planned higher usage allowances; exact limits will be published before launch.",
      "This subscription is not yet on sale and no checkout is currently available.",
    ],
  },
  {
    id: "enterprise",
    name: "ENTERPRISE",
    price: "Bespoke",
    status: "By arrangement",
    intro: "For larger teams, portfolios and requirements that need a tailored approach.",
    highlights: [
      "High-volume organisational use",
      "Larger teams and client portfolios",
      "Tailored onboarding and support",
    ],
    details: [
      "Bespoke human-led support and partnership scoping are available by arrangement today.",
      "Potential software scope can include larger teams, client portfolios and high-volume usage.",
      "Advanced integrations and organisation-specific platform requirements are subject to discovery and agreement; they are not off-the-shelf features today.",
      "Onboarding, support, ongoing advice and Impact Director relationships are priced to the agreed scope.",
    ],
  },
] as const;

export function HomepagePricing() {
  const track = useRef<HTMLOListElement>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(true);
  const [plansExpanded, setPlansExpanded] = useState(false);

  const updateControls = useCallback(() => {
    const element = track.current;
    if (!element) return;
    setCanGoBack(element.scrollLeft > 8);
    setCanGoForward(element.scrollLeft + element.clientWidth < element.scrollWidth - 8);
  }, []);

  useEffect(() => {
    const element = track.current;
    if (!element) return;
    updateControls();
    const observer = new ResizeObserver(updateControls);
    observer.observe(element);
    return () => observer.disconnect();
  }, [updateControls]);

  function move(direction: -1 | 1) {
    const element = track.current;
    if (!element) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    element.scrollBy({ left: direction * element.clientWidth * 0.78, behavior: reduceMotion ? "auto" : "smooth" });
  }

  return (
    <section className="homepage-pricing" id="pricing" aria-labelledby="pricing-title">
      <div className="gateway-width homepage-pricing-head">
        <div>
          <p className="gateway-kicker">One platform. A free-first model.</p>
          <h2 id="pricing-title">Powerful tools.<br /><span>Free wherever possible.</span></h2>
          <p>Expert help whenever you need it.</p>
        </div>
        <div className="homepage-pricing-controls" aria-label="Browse plans">
          <button type="button" onClick={() => move(-1)} disabled={!canGoBack} aria-controls="homepage-plans" aria-label="Previous plan">←</button>
          <button type="button" onClick={() => move(1)} disabled={!canGoForward} aria-controls="homepage-plans" aria-label="Next plan">→</button>
        </div>
      </div>

      <ol id="homepage-plans" ref={track} className="homepage-plan-track" onScroll={updateControls} tabIndex={0} aria-label="Membership plans; swipe or use the arrow buttons to explore">
        {plans.map((plan) => (
          <li key={plan.id} className={`homepage-plan is-${plan.id}`}>
            <div className="homepage-plan-top"><span>{plan.name}</span><small>{plan.status}</small></div>
            <p className="homepage-plan-price">{plan.price}{"suffix" in plan && <small>{plan.suffix}</small>}</p>
            <p className="homepage-plan-intro">{plan.intro}</p>
            <ul className="homepage-plan-highlights">{plan.highlights.map(item => <li key={item}>{item}</li>)}</ul>
            <details open={plansExpanded}>
              <summary
                aria-expanded={plansExpanded}
                onClick={event => {
                  event.preventDefault();
                  setPlansExpanded(expanded => !expanded);
                }}
              >{plansExpanded ? "Hide everything included" : "See everything included"}</summary>
              <ul>{plan.details.map(item => <li key={item}>{item}</li>)}</ul>
            </details>
          </li>
        ))}
      </ol>

      <div className="gateway-width">
        <div className="homepage-beta-invitation">
          <div>
            <p className="gateway-kicker">Free early beta access</p>
            <h3>We’re testing Plus and Advisor with a small group of charities, accountants and advisers. We’d love to hear from you if you’d like to get involved and help us make these tools better.</h3>
          </div>
          <a
            href="#say-hello"
            onClick={() => window.dispatchEvent(new CustomEvent("sorp2026:contact-intent", { detail: { message: "I’d like to request free early beta access." } }))}
          >
            Request free beta access →
          </a>
        </div>
      </div>

      <div className="gateway-width homepage-pricing-foot">
        <div className="homepage-human-support">
          <div><p className="gateway-kicker">Software first. Humans when useful.</p><h3>Core technology stays as accessible as we can make it.</h3></div>
          <div>
            <p>Use the software independently, then bring in human expertise only when it would genuinely help.</p>
            <ul>
              <li><strong>£0 — Self-service</strong><span>Free tools and guidance.</span></li>
              <li><Link href="/are-you-sorp-ready/review/booking?session=60"><strong>£100/hour — Expert support</strong><span>Professional support when useful.</span></Link></li>
              <li><strong>Bespoke — Projects and partnerships</strong><span>Tailored support for more substantial engagements.</span></li>
            </ul>
            <p className="homepage-smaller-charity">Smaller charity? We may be able to offer reduced rates. Just ask!</p>
            <p className="homepage-tier-note">Under SORP 2026, Tier 1 covers charities preparing accruals accounts with annual gross income up to £500,000.</p>
            <Link className="homepage-directory-link" href="/accountants-advisers/">Need specialist SORP or accounting advice? Find Accountants &amp; Advisers ↗</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
