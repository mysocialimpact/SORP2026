import type { Metadata } from "next";
import Link from "next/link";
import { Arrow } from "@/components/ui";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Our Mission",
  description:
    "Why the SORP2026 social enterprise uses technology, AI and human expertise to help more organisations create greater impact.",
  ...(site.live ? { alternates: { canonical: "/our-mission/" } } : {}),
};

const promises = [
  [
    "Free wherever possible",
    "Useful digital tools should be open to the charities that need them—not only those with the largest budgets.",
  ],
  [
    "Affordable when people are needed",
    "Human expertise carries a real cost. We keep that support focused, practical and within reach.",
  ],
  [
    "Honest about the limits",
    "We will be clear when a tool can help and when judgement, perspective or professional advice is still required.",
  ],
  [
    "Always aimed at greater impact",
    "Better reporting matters because it should help organisations learn, improve and make a bigger difference.",
  ],
];

export default function OurMissionPage() {
  return (
    <main id="main" className="gateway gateway-mission">
      <section
        className="gateway-width mission-hero"
        aria-labelledby="mission-title"
      >
        <div className="mission-hero-copy">
          <p className="gateway-kicker">
            Our mission · A social enterprise initiative
          </p>
          <h1 id="mission-title">
            Technology should make doing good easier. <em>Not more expensive.</em>
          </h1>
          <p>
            We built SORP2026 to put professional-quality tools within reach of
            charities—especially smaller organisations—so more energy can go
            into solving social and environmental problems.
          </p>
        </div>
        <div
          className="mission-hero-outcome"
          aria-label="Our goal: greater impact"
        >
          <span>Our goal</span>
          <strong>More problems solved.</strong>
          <strong>More potential unlocked.</strong>
          <strong>Greater impact.</strong>
        </div>
      </section>

      <section
        className="mission-vision"
        aria-labelledby="mission-vision-title"
      >
        <div className="gateway-width mission-vision-inner">
          <p className="gateway-kicker">What we believe</p>
          <h2 id="mission-vision-title">
            Imagine a world where nothing stood in the way of our potential to
            make a difference.
          </h2>
          <p>
            Better tools cannot solve every problem. But they can give more
            organisations the time, confidence and capability to act.
          </p>
        </div>
      </section>

      <section
        className="gateway-width mission-judgement"
        aria-labelledby="judgement-title"
      >
        <header>
          <p className="gateway-kicker">Technology, with integrity</p>
          <h2 id="judgement-title">
            Use technology wherever it helps.{" "}
            <span>Bring in people wherever they matter.</span>
          </h2>
        </header>
        <div className="mission-judgement-copy">
          <p>
            We embrace technology and AI because they can make useful insight
            faster, more affordable and more widely available.
          </p>
          <p>
            But technology does not remove the need for judgement, perspective
            or care. We will always be honest about where a tool can take you—and
            where thoughtful human input is still needed.
          </p>
        </div>
        <div
          className="mission-balance"
          aria-label="Technology and people working together"
        >
          <div>
            <span>Technology</span>
            <strong>opens access</strong>
            <p>Reducing friction, cost and time.</p>
          </div>
          <i aria-hidden="true">+</i>
          <div>
            <span>Human expertise</span>
            <strong>adds perspective</strong>
            <p>Bringing judgement, context and care.</p>
          </div>
          <i aria-hidden="true">=</i>
          <div>
            <span>Together</span>
            <strong>greater impact</strong>
            <p>Helping organisations act with confidence.</p>
          </div>
        </div>
      </section>

      <section className="mission-model" aria-labelledby="model-title">
        <div className="gateway-width">
          <header>
            <p className="gateway-kicker">Our social enterprise promise</p>
            <h2 id="model-title">
              Built around access. <em>Measured by impact.</em>
            </h2>
            <p>
              This is how we make practical technology useful to more charities
              without pretending that every challenge has an automated answer.
            </p>
          </header>
          <div className="mission-promises">
            {promises.map(([title, text], index) => (
              <article key={title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        className="gateway-width mission-partners"
        aria-labelledby="partners-title"
      >
        <div>
          <p className="gateway-kicker">Accountants and advisers</p>
          <h2 id="partners-title">
            Already working with an accountant or adviser? <span>Brilliant.</span>
          </h2>
        </div>
        <div>
          <p>
            Our tools are designed to work alongside your existing advisers, not
            replace them. And if you need specialist support with impact and
            sustainability reporting, we’re here to help.
          </p>
          <p>
            We want professional advisers to use SORP2026 with their charity
            clients: a practical shared starting point for clearer reporting and
            greater impact.
          </p>
          <Link className="gateway-quiet-link" href="/for-advisers/">
            For accountants and advisers <Arrow />
          </Link>
        </div>
      </section>
    </main>
  );
}
