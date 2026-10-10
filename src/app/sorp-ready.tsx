import Link from "next/link";
import Image from "next/image";
import SorpFilm from "./sorp-film/sorp-film";
import { sorpSource } from "./sorp-methodology-v1";

const conversationUrl = "/are-you-sorp-ready/review/?entry=intro";

function StartReview() {
  return <Link className="sr-start" href={conversationUrl}>START THE FREE REVIEW <span aria-hidden="true">→</span></Link>;
}

export function SorpReadyPage() {
  return <>
    <main className="sr-story">
      <header className="sr-hero" id="top">
        <div><p className="sr-eyebrow">Impact &amp; Sustainability Reporting Readiness for SORP 2026</p>
          <h1>Are you <em>SORP ready?</em></h1>
          <p>SORP is the requirement. <strong>Better impact is the opportunity.</strong></p>
        </div>
        <StartReview />
      </header>

      <section className="sr-presentation" aria-label="The SORP readiness story">
        <SorpFilm embedded startHref={conversationUrl} />
      </section>

      <section className="sr-details" aria-labelledby="sr-detail-heading">
        <header><p className="sr-eyebrow">THE DETAIL, WHEN YOU NEED IT</p><h2 id="sr-detail-heading">A little more certainty.</h2><p>Explore the scope, the method and the people behind your report.</p></header>
        <div className="sr-free" id="assessment">
          <h3>What you get for free</h3>
          <dl>
            <div><dt>Historical Snapshot</dt><dd>What your latest published Trustees’ Annual Report and accounts evidenced then.</dd></div>
            <div><dt>Current Readiness</dt><dd>Your answers to 19 focused questions, comments and context bring the picture up to date.</dd></div>
            <div><dt>Personalised Report</dt><dd>Your strengths, gaps and priorities: what to do now, improve when practical and keep doing well.</dd></div>
          </dl>
          <p>Free assessment. Free personalised report. No obligation.</p>
        </div>

        <details id="scope"><summary>What does the review cover?</summary><div className="sr-expanded">
          <p>Impact and sustainability reporting aspects of SORP 2026, focused on Module 1 — the Trustees’ Annual Report. We distinguish published evidence from your current, self-reported position.</p>
          <h3>What it does not cover</h3><p>This is not a full SORP compliance review, statutory audit, audit opinion, assessment of every accounting requirement, or certification by a regulator or the SORP-making body.</p>
        </div></details>
        <details id="language"><summary>MUST / SHOULD / MAY — what do they mean?</summary><div className="sr-expanded">
          <dl><dt>MUST · Required</dt><dd>A requirement where it applies to your charity.</dd><dt>SHOULD · Recommended</dt><dd>A recommendation intended to advance good reporting practice.</dd><dt>MAY · Optional</dt><dd>A choice about adopting an approach, treatment or disclosure.</dd></dl>
          <p>MSI’s evidence judgements are labelled separately. “Judgement” is not an official fourth SORP term.</p>
        </div></details>
        <details id="eligibility"><summary>Does SORP apply, and which tier am I in?</summary><div className="sr-expanded">
          <p>SORP generally applies to UK charities preparing accruals accounts, not receipts-and-payments accounts. Legal form and jurisdiction matter; a CIC is not automatically a charity.</p>
          <p>SORP 2026 applies to reporting periods beginning on or after 1 January 2026. Requirements depend partly on annual gross income:</p>
          <dl><dt>Tier 1</dt><dd>Up to £500,000.</dd><dt>Tier 2</dt><dd>Over £500,000 and up to £15 million.</dd><dt>Tier 3</dt><dd>Over £15 million.</dd></dl>
          <p>Unsure? The review helps establish your public reporting context. Where income is provisional, we explain what a tier change would mean. Organisations outside SORP can still find the impact questions useful.</p>
        </div></details>
        <details id="methodology"><summary>How does the methodology work?</summary><div className="sr-expanded">
          <p>The Historical Snapshot maps exact published evidence to applicable SORP requirements and a defined assessment rubric. Reporting Strength reflects that evidence; it is not proof of the charity’s real-world effectiveness.</p>
          <p>Your 19 answers and comments add your current position. The personalised report keeps THEN and NOW distinct and explains the evidence, reasoning and result behind each conclusion.</p>
          <p>Requirements are tier-aware. MUST, SHOULD and MAY retain their SORP meanings; MSI methodology and human judgement are identified separately.</p>
          <p><Link href={conversationUrl}>Read the full methodology in the review introduction →</Link></p>
          <p><a href={sorpSource} target="_blank" rel="noreferrer">Read the authoritative SORP 2026 source ↗</a></p>
        </div></details>
        <details id="path"><summary>Why My Social Impact? What comes beyond readiness?</summary><div className="sr-expanded">
          <p>We believe social impact should be taken as seriously as financial performance. Better reporting grows from better evidence, learning and decisions throughout the year.</p>
          <h3>Get ready → Get better → Get excellent</h3><p>Start with SORP readiness. Strengthen measurement, data and learning. Then embed impact in how your organisation is managed.</p>
          <h3>Social Impact Excellence</h3><dl><dt>Purpose</dt><dd>Be clear about the change you exist to create.</dd><dt>Leadership</dt><dd>Make impact part of governance and decisions.</dd><dt>Data</dt><dd>Gather useful evidence and measure what matters.</dd><dt>Delivery</dt><dd>Use learning to improve programmes and services.</dd><dt>Communication</dt><dd>Explain your impact clearly and credibly.</dd></dl>
          <Link href="/#beyond-compliance">Explore Social Impact Excellence →</Link>
        </div></details>
        <details id="review"><summary>Optional human support — what does it cost?</summary><div className="sr-expanded">
          <p>Your assessment and personalised report are free. Afterwards, you can choose to discuss them with Marcus.</p>
          <dl><dt>10-minute initial conversation · Free</dt><dd>Discuss whether further help would be useful.</dd><dt>30-minute review · £50</dt><dd>Review the findings and agree practical priorities.</dd><dt>60-minute review · £100</dt><dd>A wider discussion, including a light-touch review of one Impact Report or key wider-evidence source supplied beforehand.</dd><dt>Implementation support · From £250</dt><dd>Practical help where appropriate, agreed through a human conversation.</dd></dl>
          <p>The assessment does not prescribe consultancy. Marcus discusses what help, if any, you need. Paid booking remains optional after the free report.</p>
          <p>If a review leads directly to a larger MSI engagement, its fee can be credited against that work. If cost is a barrier, <a href="mailto:marcus@mysocialimpact.org">contact Marcus</a>.</p>
        </div></details>
        <details id="about"><summary>Who is accountable for this review?</summary><div className="sr-expanded sr-marcus">
          <Image src="/images/marcus-warry-msi.webp" alt="Marcus Warry" width={112} height={140} />
          <div><h3>Marcus Warry ACA</h3><p>Chartered Accountant · Social Impact Consultant<br />Co-founder, My Social Impact</p><p>Marcus brings accounting and social impact expertise to the review and its optional human support.</p><a href="mailto:marcus@mysocialimpact.org">marcus@mysocialimpact.org</a></div>
        </div></details>
        <details id="faq"><summary>A few practical questions</summary><div className="sr-expanded">
          <h3>Is there a paywall for my report?</h3><p>No. The assessment and personalised report are free, with no card and no obligation to buy support.</p>
          <h3>Why answer questions after you have read our report?</h3><p>A published report is historical evidence. Your answers explain what has changed, what exists elsewhere and what is still being developed.</p>
          <h3>What if our latest report cannot be found?</h3><p>The review provides a report-recovery step so you can help supply the correct published report. Missing evidence is not proof that your charity does no impact work.</p>
          <h3>Does a strong result certify compliance or impact?</h3><p>No. It describes the reporting evidence and your current readiness within this review’s scope. It is neither full SORP certification nor independent verification of your impact.</p>
        </div></details>
      </section>
      <section className="sr-final"><div><p className="sr-eyebrow">YOUR NEXT STEP</p><h2>Find your charity.<br /><em>Know what to do next.</em></h2><p>No card. No surprise paywall. No obligation.</p></div><StartReview /></section>
    </main>
  </>;
}
