import type { Metadata } from "next";
import { FolderHero } from "@/components/folder-hero";
import Image from "next/image";
import Link from "next/link";
import { ToolLink } from "@/components/tool-link";
import { Arrow } from "@/components/ui";
import { site } from "@/lib/site";
import "./reports.css";

export const metadata: Metadata = {
  title: "Charity Impact Reports | Go beyond SORP 2026",
  description: "Bring together powerful stories, stronger evidence and clear methodology in a Charity Impact Report that goes beyond the statutory minimum.",
  ...(site.live ? { alternates: { canonical: "/charity-impact-reports/" } } : {}),
};

function ReportArtwork() {
  return <div className="reports-artwork" aria-hidden="true">
    <div className="reports-artwork-sheet reports-artwork-story">
      <span>THE HUMAN STORY</span><strong>People.<br/>Change.<br/>Possibility.</strong><i />
    </div>
    <div className="reports-artwork-sheet reports-artwork-evidence">
      <span>EVIDENCE</span><div className="reports-artwork-chart"><i/><i/><i/><i/></div><small>OUTCOMES · LEARNING · CONTEXT</small>
    </div>
    <div className="reports-artwork-sheet reports-artwork-cover">
      <small>YOUR FULLER IMPACT STORY</small>
      <Image src="/product/charity-impact-reports.png" alt="" width={1787} height={887} priority />
      <span>Stories / evidence / methodology</span>
    </div>
  </div>;
}

export default function CharityImpactReportsPage() {
  return <main id="main" className="gateway reports-page">
    <FolderHero product="charity-impact-reports" id="reports-overview" className="reports-hero">
      <div className="gateway-width reports-hero-grid">
        <div className="reports-hero-copy">
          <p className="gateway-kicker">Charity Impact Reports</p>
          <h1>Go beyond SORP.<br/><span>Tell the full story of your impact.</span></h1>
          <p className="reports-hero-lead">SORP sets the framework. Your impact report tells the fuller story — through evidence, outcomes, photographs and case studies. Get a free assessment through two My Social Impact methodologies.</p>
          <div className="reports-hero-actions">
            <ToolLink className="gateway-action" href="/charity-impact-reports/review/">Get my free report review <Arrow /></ToolLink>
            <Link className="reports-login-link" href="/login/?return=/charity-impact-reports/review/">Already registered? Log in</Link>
            <Link className="reports-login-link" href="/sample-charity/#report">Explore a sample charity review →</Link>
            <Link className="reports-login-link" href="/sample-charity/#request-demo">Request a free demo →</Link>
          </div>
        </div>
        <ReportArtwork />
      </div>
    </FolderHero>

    <section id="reports-connection" className="reports-connection gateway-width">
      <div><p className="gateway-kicker">The SORP connection</p><h2>SORP establishes the reporting framework. <span>Your impact report brings the fuller story to life.</span></h2></div>
      <div className="reports-connection-note">
        <p>The published Charities SORP 2026 allows relevant additional material, including an impact assessment, to sit within or accompany the accounts. It also makes clear that information outside the statutory framework is not a substitute for good statutory reporting.</p>
        <a href="https://www.charitysorp.org/download-a-full-sorp" target="_blank" rel="noreferrer">Read the official SORP · Module 1, paragraphs 1.5 and 1.33 <Arrow diagonal /></a>
      </div>
    </section>

    <section id="reports-value" className="reports-value">
      <div className="gateway-width">
        <header><p className="gateway-kicker">More than a report</p><h2>Evidence of real change.</h2></header>
        <div className="reports-value-grid">
          <article><span>01</span><h3>Stories</h3><p>Bring your impact to life.</p></article>
          <article><span>02</span><h3>Evidence</h3><p>Show what has changed.</p></article>
          <article><span>03</span><h3>Credibility</h3><p>Explain how you know.</p></article>
        </div>
      </div>
    </section>

    <section className="reports-methods gateway-width" aria-label="Two complementary reviews">
      <header><p className="gateway-kicker">One report. Two perspectives.</p><h2>Your first review. Free.</h2><p>New here? Create your free account and start with Are You SORP Ready? Your charity details carry across when you explore report reviews.</p></header>
      <div className="reports-method-grid"><article><span>SICC</span><h3>Are your impact claims credible?</h3><p>Social Impact Claims Code</p><p>Evidence · Proportion · Transparency · Balance · Learning</p><p>Find out how credible, proportionate and well-supported your claims are.</p></article><article><span>SIE</span><h3>How effectively are you demonstrating social impact excellence?</h3><p>Social Impact Excellence</p><p>Purpose · Leadership · Data · Delivery · Communications</p><p>See what your report demonstrates and what needs further organisational assessment.</p></article></div>
      <p className="reports-review-gate">An automated review of published information, with source references and practical improvements. It does not verify underlying evidence or provide audit assurance or certification. Processing time depends on your report.</p>
    </section>
    <section className="reports-methods gateway-width" aria-label="Who it helps"><div className="reports-method-grid"><article><h3>For charities</h3><p>Understand the strengths and weaknesses of your impact report, improve your evidence and tell a more compelling story.</p></article><article><h3>For accountants and advisers</h3><p>We welcome collaboration with accountants and advisers who want to help their charity clients go beyond SORP compliance and demonstrate their impact more effectively.</p></article></div></section>
    <section id="reports-review" className="reports-review gateway-width">
      <div><p className="gateway-kicker">Free · £0</p><h2>Your first Charity Impact Report Review.</h2><p>One report per account. Both SICC and SIE included.</p><ToolLink className="gateway-action" href="/charity-impact-reports/review/">Get my free report review <Arrow /></ToolLink></div>
      <div><p className="gateway-kicker">Professional support · From £1,000</p><h2>Make your next report stronger.</h2><p>Let My Social Impact help create your next Charity Impact Report. Pricing depends on the size and requirements of your charity.</p><Link className="gateway-action" href="/contact/">Talk to us <Arrow /></Link></div>
    </section>

    <nav className="product-next gateway-width" aria-label="Next product"><span>Next section</span><Link href="/social-impact-excellence/">Social Impact Excellence <Arrow /></Link></nav>
  </main>;
}
