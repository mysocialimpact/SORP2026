import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Arrow } from "@/components/ui";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Charity Impact Reports",
  description: "Professional review of your charity's existing impact report, or help developing a complete Charity Impact Report.",
  ...(site.live ? { alternates: { canonical: "/charity-impact-reports/" } } : {}),
};

export default function CharityImpactReportsPage() {
  return <main id="main" className="gateway product-page product-reports">
    <section className="product-hero gateway-width">
      <div className="product-hero-copy">
        <p className="gateway-kicker">05 · Evidence · clarity · improvement</p>
        <h1>Improve your charity’s <em>impact report.</em></h1>
        <p className="product-lead">Upload your existing report. Receive a professional written review. Discuss the findings with an expert.</p>
        <Link className="gateway-action" href="/charity-impact-reports/review/">Start a £100 report review <Arrow /></Link>
      </div>
      <div className="product-brand-panel is-reports"><Image src="/product/charity-impact-reports.png" alt="Charity Impact Reports" width={1787} height={887} priority /></div>
    </section>
    <section className="report-offer gateway-width">
      <header><p className="gateway-kicker">A deliberately simple service</p><h2>Written review + 60-minute meeting</h2><strong>£100</strong></header>
      <ol>{[
        "Sign in with your SORP2026 account.", "Upload your most recent impact report securely.", "Pay £100 through secure checkout.",
        "My Social Impact reviews strengths, weaknesses, evidence and clarity.", "Receive practical written feedback.", "Book a 60-minute meeting to discuss it.",
      ].map((step, index) => <li key={step}><span>{String(index + 1).padStart(2, "0")}</span>{step}</li>)}</ol>
      <p className="report-caveat">A professional review of an existing document—not a regulatory audit, formal assurance engagement or AI-generated analysis.</p>
    </section>
    <section className="product-split product-dark is-reports"><div className="gateway-width"><div><p className="gateway-kicker">A more substantial project</p><h2>Need the full report?</h2><strong className="product-price">From £1,000</strong></div><div><p>My Social Impact can help develop your Charity Impact Report: shaping the evidence, structure, analysis, writing and story around the difference your charity makes.</p><p>This is separate from the £100 review of an existing document.</p><a href="mailto:marcus@mysocialimpact.org?subject=Full%20Charity%20Impact%20Report%20from%20%C2%A31%2C000">Enquire about full report development <Arrow diagonal /></a></div></div></section>
    <nav className="product-next gateway-width" aria-label="Next product"><span>Also explore</span><Link href="/purpose-works/">Purpose Works <Arrow /></Link></nav>
  </main>;
}

