import type { Metadata } from "next";
import { AskSorpLive } from "@/components/ask-sorp-live";
import { Arrow } from "@/components/ui";
import { site } from "@/lib/site";
import "./ask-sorp.css";

export const metadata: Metadata = {
  title: "Ask SORP 2026 — Evidence-led answers",
  description: "Ask questions about SORP 2026 and get clear, practical answers with references to the official Charities SORP guidance.",
  ...(site.live ? { alternates: { canonical: "/ask-sorp/" } } : {}),
};

const audiences = ["Charity leaders", "Trustees", "Finance teams", "Chartered accountants", "Auditors", "Professional advisers"];

export default function AskSorp() {
  return (
    <>
      <main id="main" className="ask-page product-page product-ask">
        <section id="ask-overview" className="ask-hero">
          <div className="ask-hero-copy">
            <p className="ask-eyebrow"><span className="ask-live-dot" />Live beta · Available now</p>
            <h1>Ask SORP 2026.<br /><span>Get the answers you need.</span></h1>
            <p className="ask-hero-lead">An AI-powered SORP assistant for UK charities, trustees, accountants and professional advisers.</p>
            <p className="ask-hero-support">Ask questions about SORP 2026 and get clear, practical answers backed by references to the official guidance.</p>
            <a className="ask-primary-action" href="#ask-sorp-live">Ask SORP a question <Arrow /></a>
            <p className="ask-reassurance">Clear answers. Official references. Free to explore.</p>
          </div>
          <div className="ask-hero-visual" aria-hidden="true">
            <span className="ask-visual-question">?</span>
            <div className="ask-visual-card is-question"><small>You ask</small><strong>What changes<br />under SORP 2026?</strong></div>
            <div className="ask-visual-card is-answer"><small>Ask SORP finds</small><strong>A clear answer.</strong><span>Source paragraphs included.</span></div>
            <div className="ask-source-stamp"><span>Charities SORP</span><strong>2026</strong></div>
          </div>
        </section>

        <section id="ask-sorp-live" className="ask-live-section" aria-labelledby="ask-live-section-title">
          <div className="ask-live-intro">
            <p className="ask-eyebrow">The tool—not a demo</p>
            <h2 id="ask-live-section-title">Ask now.<br />See the source.</h2>
            <p>This is the established My Social Impact Ask SORP intelligence, available here in a native SORP2026 experience. The evidence index, answer checks and citation service remain in one place.</p>
          </div>
          <AskSorpLive />
        </section>

        <section id="ask-how" className="ask-how" aria-labelledby="ask-how-title">
          <div>
            <p className="ask-eyebrow">Designed for the people doing the work</p>
            <h2 id="ask-how-title">Professional enough for advisers.<br />Clear enough for everyone.</h2>
          </div>
          <div className="ask-audience-list" aria-label="Who Ask SORP is for">
            {audiences.map(audience => <span key={audience}>{audience}</span>)}
          </div>
          <ol>
            <li><span>01</span><div><h3>Ask in plain English</h3><p>Start with the question you actually need to answer.</p></div></li>
            <li><span>02</span><div><h3>Follow the evidence</h3><p>Every substantive answer is tied back to verified SORP paragraphs.</p></div></li>
            <li><span>03</span><div><h3>Apply professional judgement</h3><p>The tool makes the source easier to navigate. People remain responsible for the decision.</p></div></li>
          </ol>
        </section>
      </main>

      <aside className="ask-fixed-action" aria-label="Ask a question about SORP 2026">
        <span>Questions about SORP 2026?</span>
        <a href="#ask-sorp-live">Ask SORP <span aria-hidden="true">→</span></a>
      </aside>
    </>
  );
}
