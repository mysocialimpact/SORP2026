import type { Metadata } from "next";
import Link from "next/link";
import { ToolLink } from "@/components/tool-link";
import { FolderHero } from "@/components/folder-hero";
import { Arrow } from "@/components/ui";
import { site } from "@/lib/site";
import "./ask-sorp.css";

export const metadata: Metadata = {
  title: "Ask SORP 2026: understand the requirements",
  description: "Ask questions about the whole of SORP 2026 and get clear, practical answers with references to the official Charities SORP guidance.",
  ...(site.live ? { alternates: { canonical: "/ask-sorp/" } } : {}),
};

const plans = [
  { name: "FREE", price: "£0", status: "Available now", copy: "Three Ask SORP questions for everyone. Explore the tool at no cost." },
  { name: "PLUS", price: "£29", suffix: "/month", status: "Planned", copy: "Ask SORP is included within the wider Plus platform subscription, with extended access beyond the three free questions." },
  { name: "ADVISER", price: "£99", suffix: "/month", status: "Planned", copy: "Included within the wider Adviser platform subscription for accountants and advisers supporting charity clients." },
  { name: "BESPOKE", price: "Let’s talk", status: "By arrangement", copy: "Tailored solutions and development for organisations, professional practices and larger teams." },
] as const;

export default function AskSorp() {
  return (
    <main id="main" className="ask-page product-page product-ask">
      <FolderHero product="ask-sorp" paper="#fbfaf7" id="ask-overview" className="ask-hero">
        <div className="ask-hero-copy">
          <p className="ask-eyebrow"><span className="ask-live-dot" />Live beta · Available now</p>
          <h1>Over 300 pages of SORP.<br /><span>Now you can just ask.</span></h1>
          <p className="ask-hero-lead">SORP 2026 can be complex. We’ve built Ask SORP to make understanding the requirements simpler, faster and more accessible.</p>
          <p className="ask-hero-support">Ask questions in plain English, explore the relevant guidance and see where the answers come from.</p>
          <ToolLink className="ask-primary-action" href="/ask-sorp/workspace/">Ask SORP a question <Arrow /></ToolLink>
          <p><Link href="/sample-charity/#ask">Explore a sample charity answer →</Link></p>
          <p><Link href="/sample-charity/#request-demo">Request a free demo →</Link></p>
          <p className="ask-reassurance">Relevant references. Uncertainty made clear. Professional judgement where it matters.</p>
        </div>
        <div className="ask-hero-visual" aria-hidden="true">
          <span className="ask-visual-question">?</span>
          <div className="ask-visual-card is-question"><small>You ask</small><strong>What does my charity need to report?</strong></div>
          <div className="ask-visual-card is-answer"><small>Ask SORP finds</small><strong>A clear answer.</strong><span>Relevant SORP references included.</span></div>
          <div className="ask-source-stamp"><span>Charities SORP</span><strong>2026</strong></div>
        </div>
      </FolderHero>

      <section className="ask-audiences" aria-labelledby="ask-audiences-title">
        <div className="ask-section-heading">
          <p className="ask-eyebrow">Who it helps</p>
          <h2 id="ask-audiences-title">Made for charities.<br /><span>Useful to the people who advise them.</span></h2>
        </div>
        <div className="ask-audience-grid">
          <article className="is-charity">
            <p>For charities</p>
            <h3>SORP shouldn’t be difficult to understand.</h3>
            <div>
              <p>We know smaller charities don’t always have the time, resources or budget to seek specialist advice for every question.</p>
              <p>Ask SORP makes the guidance more accessible for charities of every size, helping you understand your responsibilities and recognise when it’s useful to speak to an accountant.</p>
            </div>
          </article>
          <article className="is-adviser">
            <p>For accountants &amp; advisers</p>
            <h3>Help your charity clients more quickly and efficiently.</h3>
            <div>
              <p>Ask SORP helps you navigate complex reporting requirements, explore specific questions and find relevant source references faster.</p>
              <p>Spend less time searching through regulations and more time applying your expertise where it matters.</p>
            </div>
          </article>
        </div>
      </section>

      <section className="ask-access" aria-labelledby="ask-access-title">
        <div className="ask-section-heading">
          <p className="ask-eyebrow">Simple access</p>
          <h2 id="ask-access-title">Start free.<br /><span>Go further when useful.</span></h2>
          <p>Paid plans are in beta and are not currently available to purchase online.</p>
        </div>
        <ol className="ask-plan-grid" aria-label="Ask SORP access options" tabIndex={0}>
          {plans.map(plan => (
            <li key={plan.name}>
              <div><strong>{plan.name}</strong><small>{plan.status}</small></div>
              <p className="ask-plan-price">{plan.price}{"suffix" in plan && <small>{plan.suffix}</small>}</p>
              <p>{plan.copy}</p>
            </li>
          ))}
        </ol>
        <p className="ask-pricing-link"><Link href="/#pricing">See full platform pricing →</Link></p>

        <div className="ask-beta">
          <div>
            <p className="ask-eyebrow">Free early beta access</p>
            <h3>Help us make these tools better.</h3>
            <p>We’re currently testing Plus and Adviser with a small group of charities, accountants and advisers.</p>
            <p>We’re offering free access to selected beta participants and would love to hear from you if you’d like to get involved.</p>
          </div>
          <a href="#say-hello">Request free beta access <Arrow /></a>
        </div>
      </section>

      <section className="ask-start" aria-labelledby="ask-start-title">
        <div>
          <p className="ask-eyebrow">Ready when you are</p>
          <h2 id="ask-start-title">What do you need to know?</h2>
          <p>Ask your question in plain English. We’ll show you the relevant guidance and where the answer comes from.</p>
        </div>
        <ToolLink href="/ask-sorp/workspace/">Ask SORP a question <Arrow /></ToolLink>
      </section>
    </main>
  );
}
