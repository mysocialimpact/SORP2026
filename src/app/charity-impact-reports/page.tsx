import type { Metadata } from "next";
import { FolderHero } from "@/components/folder-hero";
import Image from "next/image";
import Link from "next/link";
import { Arrow } from "@/components/ui";
import { ReportReviewEntry, ReportReviewUpload } from "@/components/report-review-entry";
import { site } from "@/lib/site";
import "./reports.css";

export const metadata: Metadata = {
  title: "Charity Impact Reports | One report. Two perspectives.",
  description: "Go beyond SORP. Get two free reviews of your charity’s impact report: Social Impact Claims Code and Social Impact Excellence. Register, upload a PDF and explore practical improvements.",
  ...(site.live ? { alternates: { canonical: "/charity-impact-reports/" } } : {}),
};

export default function CharityImpactReportsPage() {
  return <main id="main" className="gateway reports-page">
    <FolderHero product="charity-impact-reports" id="reports-overview" className="reports-hero">
      <div className="gateway-width reports-hero-grid">
        <div className="reports-hero-copy">
          <p className="gateway-kicker">Charity Impact Reports</p>
          <h1>Go beyond SORP.<br/><span>Tell the full story of your impact.</span></h1>
          <p className="reports-hero-lead">An impact report brings your charity’s evidence, outcomes and stories together. Discover what yours does well — and how to make it stronger.</p>
          <div className="reports-hero-actions"><ReportReviewEntry/><a className="reports-login-link" href="#free-reviews">See the two free reviews ↓</a></div>
          <p className="reports-hero-registration">Create a free account before generating your reviews. Already registered? <Link href="/login/?return=/charity-impact-reports/review/">Log in →</Link></p>
        </div>
        <div className="reports-hero-preview" aria-label="Your report reviewed through two methodologies">
          <p className="gateway-kicker">Your impact report</p><strong>One PDF.<br/>Two perspectives.</strong>
          <div className="reports-preview-logos"><Image src="/assets/social-impact-claims-code-transparent.png" alt="Social Impact Claims Code" width={1078} height={1090} priority/><span aria-hidden="true">+</span><Image src="/assets/social-impact-excellence-transparent.png" alt="Social Impact Excellence" width={1200} height={1200} priority/></div>
          <p>Two complementary review reports.<br/>One clearer way forward.</p>
          <a href="#free-reviews">Explore your free reviews <Arrow/></a>
        </div>
      </div>
    </FolderHero>

    <section id="free-reviews" className="reports-free gateway-width" aria-labelledby="reports-free-title">
      <header className="reports-section-head"><p className="gateway-kicker">Two My Social Impact methodologies · Free</p><h2 id="reports-free-title">One report.<br/><span>Two perspectives.</span></h2><p>Submit your report once. Get two complementary automated reviews, with evidence references and practical recommendations.</p></header>
      <div className="reports-perspectives">
        <article className="reports-perspective reports-perspective-claims">
          <div className="reports-method-brand"><Image src="/assets/social-impact-claims-code-transparent.png" alt="" width={1078} height={1090}/><p>Social Impact<br/><strong>Claims Code</strong><span>SICC · Claims &amp; credibility</span></p></div>
          <h3>Can your impact claims stand up to scrutiny?</h3>
          <p>Understand whether your claims are credible, proportionate and supported by the evidence in your report.</p>
          <ul aria-label="Social Impact Claims Code principles">{["Evidence","Proportion","Transparency","Balance","Learning"].map(p=><li key={p}>{p}</li>)}</ul>
          <p className="reports-method-output">Your review: indicative scores, specific findings and practical ways to strengthen your claims.</p>
        </article>
        <article className="reports-perspective reports-perspective-excellence">
          <div className="reports-method-brand"><Image src="/assets/social-impact-excellence-transparent.png" alt="" width={1200} height={1200}/><p>Social Impact<br/><strong>Excellence</strong><span>SIE · Managing &amp; communicating impact</span></p></div>
          <h3>What does your report show about managing impact?</h3>
          <p>See how clearly your report demonstrates the way your charity understands, manages and communicates social impact.</p>
          <ul aria-label="Social Impact Excellence pillars">{["Purpose","Leadership","Data","Delivery","Communications"].map(p=><li key={p}>{p}</li>)}</ul>
          <p className="reports-method-output">Your review: evidence across five pillars, disclosure gaps and useful next steps. It assesses your report, not your organisation’s full maturity.</p>
        </article>
      </div>
      <ReportReviewUpload/>
      <p className="reports-free-note">One free impact report review per account, with both perspectives included. Automated findings assess the published information; they do not independently verify it or provide audit assurance or certification.</p>
    </section>

    <section id="reports-support" className="reports-support" aria-labelledby="reports-support-title">
      <div className="gateway-width">
        <header className="reports-section-head"><p className="gateway-kicker">AI gets you started. People take you further.</p><h2 id="reports-support-title">Expert help.<br/><span>When you need it.</span></h2><p>Talk to My Social Impact about your results, your next report or bringing an existing report to life online.</p></header>
        <div className="reports-services">
          <article><span className="reports-service-number">01</span><h3>Expert report review.</h3><p>A human review of your report, selected claims and supporting evidence. Deeper scrutiny, independent recommendations and a practical way forward within an agreed scope.</p><Link href="/contact/?service=expert-impact-review">Discuss an expert review <Arrow/></Link></article>
          <article><span className="reports-service-number">02</span><h3>Create an impact report.</h3><p>Find the evidence. Tell the story that matters. Let My Social Impact help create or improve your next Charity Impact Report.</p><p className="reports-service-price">From £1,000 <small>Depending on your charity’s size and requirements.</small></p><Link href="/contact/?service=create-impact-report">Talk about your next report <Arrow/></Link></article>
          <article><span className="reports-service-number">03</span><h3>Digitise your report.</h3><p>Turn your existing impact report into a beautiful, mobile-friendly website that’s easier to explore, understand and share.</p><p className="reports-service-price">From £250 <small>For a straightforward conversion of existing content.</small></p><p className="reports-service-partner">The Ideas Shed × My Social Impact</p><Link href="/contact/?service=digitise-impact-report">Bring your report online <Arrow/></Link></article>
        </div>
        <p className="reports-support-note">Want to explore the options? <Link href="/contact/">Talk to us about your impact report →</Link></p>
      </div>
    </section>

    <section className="reports-audiences gateway-width" aria-label="Who it helps"><article><h2>For charities</h2><p>Understand your report’s strengths, improve your evidence and tell a more compelling story.</p></article><article><h2>For accountants &amp; advisers</h2><p>Help your charity clients go beyond SORP compliance. We welcome collaboration to demonstrate their impact more effectively.</p></article></section>
    <div className="reports-official gateway-width"><p>SORP provides the reporting framework. An impact report helps tell the fuller story.</p><a href="https://www.charitysorp.org/download-a-full-sorp" target="_blank" rel="noreferrer">Read the official Charities SORP <Arrow diagonal/></a></div>
    <nav className="product-next gateway-width" aria-label="Next product"><span>Next section</span><Link href="/social-impact-excellence/">Social Impact Excellence <Arrow/></Link></nav>
  </main>;
}
