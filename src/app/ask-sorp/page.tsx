import type { Metadata } from "next";
import { AskSorpLive } from "@/components/ask-sorp-live";
import { ProductAdviserNote } from "@/components/product-adviser-note";
import { Arrow } from "@/components/ui";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Ask SORP — Live beta",
  description: "Ask questions about SORP 2026 and receive evidence-led answers with source paragraph references.",
  ...(site.live ? { alternates: { canonical: "/ask-sorp/" } } : {}),
};

export default function AskSorp() {
  const liveUrl = site.askSorp!;
  return (
    <main id="main" className="gateway product-page product-ask">
      <section id="ask-overview" className="product-hero product-hero-ask gateway-width">
        <div className="product-hero-copy">
          <p className="gateway-kicker"><span className="product-live-dot" />02 · Live beta · Available now</p>
          <h1>SORP questions?<br /><em>Just ask.</em></h1>
          <p className="product-lead">An intelligent assistant helping charities, accountants and advisers understand SORP 2026—from accounting requirements and disclosures to impact reporting.</p>
          <a className="gateway-action" href="#ask-sorp-live">Ask SORP <Arrow /></a>
          <p className="product-hero-note">Evidence-led guidance with paragraph references. Always use professional judgement alongside the official SORP.</p>
        </div>
        <div className="ask-paper-mark" aria-hidden="true"><span>Ask</span><strong>SORP.</strong><i>?</i></div>
      </section>

      <section id="ask-how" className="ask-trust gateway-width" aria-label="How Ask SORP works">
        {[
          ["01", "Ask in plain English", "Start with the question you actually need to answer."],
          ["02", "See the source", "Answers retain relevant SORP paragraph references and evidence."],
          ["03", "Apply judgement", "Use the research with your charity, accountant or adviser."],
        ].map(([number, title, text]) => <article key={number}><span>{number}</span><h2>{title}</h2><p>{text}</p></article>)}
      </section>

      <div id="ask-sorp-live" className="gateway-width ask-live-wrap">
        <AskSorpLive src={liveUrl} />
        <p className="ask-integration-note">The established Ask SORP service is presented here without copying its evidence index, API credentials or answer infrastructure. Its original address remains independently available.</p>
      </div>

      <ProductAdviserNote title="A faster route into the source.">
        Use Ask SORP to research questions with charity clients, locate relevant paragraphs and begin a better-informed conversation. It supports—not replaces—professional advice and judgement.
      </ProductAdviserNote>
    </main>
  );
}
