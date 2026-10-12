import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Arrow } from "@/components/ui";
import { ProductAdviserNote } from "@/components/product-adviser-note";
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
        <p className="gateway-kicker">03 · Human-led service · Available now</p>
        <h1>Is your impact report telling the <em>whole story?</em></h1>
        <p className="product-lead">Upload your existing impact report for a professional written review and a one-hour discussion about how to make it stronger.</p>
        <Link className="gateway-action" href="/charity-impact-reports/review/">Get your report reviewed · £100 <Arrow /></Link>
        <p className="product-hero-note">Written review and expert meeting. No automated AI analysis.</p>
      </div>
      <div className="product-brand-panel is-reports"><Image src="/product/charity-impact-reports.png" alt="Charity Impact Reports" width={1787} height={887} priority /></div>
    </section>
    <section className="product-statement gateway-width"><p className="gateway-kicker">Reporting beyond the statutory minimum</p><h2>A richer account of the difference you make.</h2><p>A separate impact report can bring evidence, beneficiary stories, outcomes, photographs and learning to life. It can complement and, where permitted, be signposted from the Trustees’ Annual Report—but it does not replace mandatory disclosures.</p></section>
    <section className="report-offer gateway-width">
      <header><p className="gateway-kicker">A deliberately simple service</p><h2>Written review + 60-minute meeting</h2><strong>£100</strong></header>
      <ol>{[
        "Sign in with your SORP2026 account.", "Upload your most recent impact report securely.", "Pay £100 through secure checkout.",
        "My Social Impact reviews strengths, weaknesses, evidence and clarity.", "Receive practical written feedback.", "Book a 60-minute meeting to discuss it.",
      ].map((step, index) => <li key={step}><span>{String(index + 1).padStart(2, "0")}</span>{step}</li>)}</ol>
      <p className="report-caveat">A professional review of an existing document—not a regulatory audit, formal assurance engagement or AI-generated analysis.</p>
    </section>
    <section className="product-split product-dark is-reports"><div className="gateway-width"><div><p className="gateway-kicker">A more substantial project</p><h2>Need the full report?</h2><strong className="product-price">From £1,000</strong></div><div><p>My Social Impact can help develop your Charity Impact Report: shaping the evidence, structure, analysis, writing and story around the difference your charity makes.</p><p>This is separate from the £100 review of an existing document.</p><a href="mailto:marcus@mysocialimpact.org?subject=Full%20Charity%20Impact%20Report%20from%20%C2%A31%2C000">Enquire about full report development <Arrow diagonal /></a></div></div></section>
    <ProductAdviserNote title="Strengthen the story alongside the accounts.">Accountants and advisers can recommend the £100 review to charity clients who want clearer impact communication alongside strong financial reporting. We work alongside the existing adviser, not instead of them.</ProductAdviserNote>
    <nav className="product-next gateway-width" aria-label="Next product"><span>Next section</span><Link href="/social-impact-excellence/">Social Impact Excellence <Arrow /></Link></nav>
  </main>;
}

