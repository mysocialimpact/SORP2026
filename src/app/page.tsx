import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Arrow, Botanical, Button, Eyebrow } from "@/components/ui";
import { pillars, site } from "@/lib/site";
export const metadata: Metadata = {
  alternates: site.live ? { canonical: "/" } : undefined,
};
export default function Home() {
  return (
    <main id="main">
      <section className="hero shell">
        <div className="hero-topline">
          <Eyebrow>A NEW CHAPTER FOR CHARITY REPORTING</Eyebrow>
          <span className="edition">
            INDEPENDENT THINKING. REAL-WORLD IMPACT.
          </span>
        </div>
        <div className="hero-grid">
          <div className="hero-copy">
            <h1>
              Better reporting.
              <br />
              <em>Greater impact.</em>
            </h1>
            <p className="hero-description">
              SORP 2026 guidance, practical tools and expert insight for
              charities and the professionals who support them.
            </p>
            <a href="#tools" className="text-link">
              Find your way forward{" "}
              <span className="round-arrow">
                <Arrow />
              </span>
            </a>
          </div>
          <div className="hero-art">
            <div className="orbit-caption">
              ROOTED IN PURPOSE. GROWING IN IMPACT.
            </div>
            <Botanical />
            <span className="art-footnote">
              A little clarity. A lot of possibility.
            </span>
          </div>
        </div>
        <div className="hero-credit">
          <span className="mini-flower" aria-hidden="true">
            ✳
          </span>
          <span>
            Brought to you by <a href={site.msi}>My Social Impact</a>
          </span>
          <span className="credit-line" />
          <span>For the people making a difference.</span>
        </div>
      </section>
      <section
        className="tools-section shell"
        id="tools"
        aria-labelledby="tools-heading"
      >
        <div className="section-intro">
          <div>
            <Eyebrow>CLARITY STARTS HERE</Eyebrow>
            <h2 id="tools-heading">
              Big changes. <em>Practical tools.</em>
            </h2>
          </div>
          <p>
            A more confident next step,
            <br />
            wherever you’re starting from.
          </p>
        </div>
        <div className="product-grid">
          <article className="readiness-card">
            <div className="product-card-top">
              <span className="status status-live">
                <span />
                LIVE BETA — AVAILABLE NOW
              </span>
              <span className="product-number">
                01 / THE READINESS ASSESSMENT
              </span>
            </div>
            <div className="readiness-content">
              <div>
                <h3>
                  Are You
                  <br />
                  <em>SORP Ready?</em>
                </h3>
                <p>
                  Your impact deserves a clearer story.
                  <br />
                  Discover how ready you are to tell it.
                </p>
                <ul className="check-list">
                  <li>Understand where you stand</li>
                  <li>Spot the gaps in your reporting</li>
                  <li>Find your next practical steps</li>
                </ul>
                <Button href={site.readiness ?? "/readiness"} light>
                  Check your readiness — free
                </Button>
                <p className="product-meta">
                  AI-supported. Human-centred. Built for charities.
                </p>
              </div>
              <div className="readiness-visual" aria-hidden="true">
                <div className="visual-orbit orbit-one" />
                <div className="visual-orbit orbit-two" />
                <div className="readiness-leaf leaf-a" />
                <div className="readiness-leaf leaf-b" />
                <div className="readiness-leaf leaf-c" />
                <div className="readiness-leaf leaf-d" />
                <div className="visual-stem" />
                <span className="visual-tag">
                  Your next chapter
                  <br />
                  <em>starts here.</em>
                </span>
              </div>
            </div>
            <div className="scope-note">
              <Arrow />
              <p>
                Focused on impact, sustainability and narrative reporting
                readiness. Not a comprehensive financial accounting compliance
                assessment.
              </p>
            </div>
          </article>
          <article className="ask-card">
            <div className="product-card-top">
              <span className="status status-soon">COMING SOON — BETA</span>
              <span className="ask-star" aria-hidden="true">
                ✳
              </span>
            </div>
            <div className="ask-illustration" aria-hidden="true">
              <div className="question-line">
                What does this mean for our charity?<span>↗</span>
              </div>
              <div className="answer-lines">
                <span className="answer-spark">✳</span>
                <div>
                  <i />
                  <i />
                  <i />
                </div>
              </div>
            </div>
            <h3>
              Ask <em>SORP.</em>
            </h3>
            <p>Big questions. Clearer answers.</p>
            <p className="ask-description">
              An AI-powered guide to the whole SORP 2026 — from financial
              accounting and disclosures to impact reporting.
            </p>
            <p className="ask-audience">
              For finance teams, trustees,
              <br />
              accountants and advisers.
            </p>
            <Link className="text-link" href="/ask-sorp">
              Meet your future assistant <Arrow />
            </Link>
          </article>
        </div>
      </section>
      <section className="understanding shell" id="understanding">
        <div className="understanding-heading">
          <Eyebrow>LET’S MAKE SENSE OF IT</Eyebrow>
          <h2>
            A new SORP.
            <br />
            <em>A clearer picture.</em>
          </h2>
          <p>
            The Charities Statement of Recommended Practice provides a framework
            for charity accounts and reporting. The 2026 edition is an
            opportunity to make your organisation’s story more useful, too.
          </p>
          <Link className="text-link" href="/understanding-sorp">
            Understanding SORP 2026 <Arrow />
          </Link>
        </div>
        <div className="explainer-list">
          <Link href="/understanding-sorp#who">
            <span className="item-number">01</span>
            <div>
              <h3>Who is it for?</h3>
              <p>
                Charities preparing accruals accounts under FRS 102 in the UK
                and Republic of Ireland.
              </p>
            </div>
            <Arrow />
          </Link>
          <Link href="/understanding-sorp#when">
            <span className="item-number">02</span>
            <div>
              <h3>When does it apply?</h3>
              <p>
                Reporting periods beginning on or after 1 January 2026. Your
                year-end matters.
              </p>
            </div>
            <Arrow />
          </Link>
          <Link href="/understanding-sorp#changes">
            <span className="item-number">03</span>
            <div>
              <h3>What’s changing?</h3>
              <p>
                Changes to financial reporting and a renewed focus on telling
                your charity’s story.
              </p>
            </div>
            <Arrow />
          </Link>
        </div>
      </section>
      <section className="audience-section">
        <div className="shell">
          <Eyebrow>DIFFERENT ROLES. SHARED AMBITION.</Eyebrow>
          <div className="audience-grid">
            <article>
              <span className="audience-icon" aria-hidden="true">
                <Arrow diagonal />
              </span>
              <h2>
                For <em>charities.</em>
              </h2>
              <p>
                You’re here to make a difference. We’re here to help you
                understand what’s expected, recognise what you already do well,
                and prepare with confidence.
              </p>
              <Link className="text-link" href="/for-charities">
                Find your starting point <Arrow />
              </Link>
            </article>
            <article>
              <span className="audience-icon" aria-hidden="true">
                ⌘
              </span>
              <h2>
                For <em>accountants & advisers.</em>
              </h2>
              <p>
                Bring a fresh perspective to your client conversations.
                Practical resources to connect reporting requirements with
                meaningful organisational insight.
              </p>
              <Link className="text-link" href="/for-advisers">
                Support your charity clients <Arrow />
              </Link>
            </article>
          </div>
        </div>
      </section>
      <section className="beyond-section" id="beyond-compliance">
        <div className="shell beyond-inner">
          <Eyebrow>BEYOND COMPLIANCE</Eyebrow>
          <h2>
            Compliance is
            <br />
            the starting point.
            <br />
            <em>Impact is the destination.</em>
          </h2>
          <div className="beyond-bottom">
            <span className="beyond-flower" aria-hidden="true">
              ✳
            </span>
            <div>
              <p>
                Good reporting matters. What it makes possible matters even
                more.
              </p>
              <p>
                At My Social Impact, we help charities understand, manage,
                demonstrate and improve the impact they create. SORP readiness
                can be the first step towards something much bigger.
              </p>
              <a className="text-link" href={site.msi}>
                Discover My Social Impact <Arrow diagonal />
              </a>
            </div>
          </div>
          <div className="beyond-rings" aria-hidden="true" />
        </div>
      </section>
      <section className="excellence shell" id="excellence">
        <div className="section-intro">
          <div>
            <Eyebrow>THE BIGGER PICTURE</Eyebrow>
            <h2>
              Social Impact <em>Excellence.</em>
            </h2>
          </div>
          <p>
            Five connected areas.
            <br />
            One ambition: greater impact.
          </p>
        </div>
        <div className="pillar-grid">
          {pillars.map((p) => (
            <article key={p.number}>
              <span className="pillar-number">{p.number}</span>
              <h3>{p.title}</h3>
              <p>{p.text}</p>
            </article>
          ))}
        </div>
        <div className="excellence-footer">
          <p>Start with your reporting. Build a stronger organisation.</p>
          <a className="text-link" href={site.platform ?? site.msi}>
            {site.platform
              ? "Explore the My Social Impact platform"
              : "Explore My Social Impact"}{" "}
            <Arrow diagonal />
          </a>
        </div>
      </section>
      <section className="resources-section" id="resources">
        <div className="shell resources-inner">
          <div>
            <Eyebrow>GO STRAIGHT TO THE SOURCE</Eyebrow>
            <h2>
              Independent insight.
              <br />
              <em>Official foundations.</em>
            </h2>
            <p>
              Our tools help you explore and prepare. The official SORP remains
              your reference for accounting and reporting requirements.
            </p>
          </div>
          <div className="resource-links">
            <a href={site.official}>
              <span>
                <small>THE AUTHORITATIVE STARTING POINT</small>
                <strong>Charities SORP</strong>
                <span>
                  Read the standard and official supporting resources.
                </span>
              </span>
              <Arrow diagonal />
            </a>
            <Link href="/understanding-sorp#sources">
              <span>
                <small>READ WITH CONFIDENCE</small>
                <strong>Our approach to guidance</strong>
                <span>
                  Sources, scope and the role of professional judgement.
                </span>
              </span>
              <Arrow />
            </Link>
          </div>
        </div>
      </section>
      <section className="about-strip shell">
        <div className="founder-portraits">
          <Image
            src="/images/marcus-warry.webp"
            alt="Marcus Warry"
            width={240}
            height={270}
          />
          <Image
            src="/images/chris-arnold.webp"
            alt="Dr Chris Arnold"
            width={240}
            height={270}
          />
          <span>
            Marcus Warry ACA & Dr Chris Arnold
            <br />
            Co-founders, My Social Impact
          </span>
        </div>
        <div>
          <Eyebrow>HUMAN THINKING. INTELLIGENT TOOLS.</Eyebrow>
          <h2>
            Purpose behind <em>the platform.</em>
          </h2>
          <p>
            Accounting expertise meets social impact thinking. Co-founded by
            Chartered Accountant Marcus Warry and creative strategist Dr Chris
            Arnold, My Social Impact brings a human, practical perspective to
            better reporting.
          </p>
          <Link className="text-link" href="/about">
            Meet the people behind it <Arrow />
          </Link>
        </div>
      </section>
      <section className="final-cta shell">
        <div>
          <Eyebrow>YOUR NEXT CHAPTER</Eyebrow>
          <h2>
            Ready for a <em>clearer start?</em>
          </h2>
        </div>
        <Button href={site.readiness ?? "/readiness"}>
          Check your readiness — free
        </Button>
      </section>
    </main>
  );
}
