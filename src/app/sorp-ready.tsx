import Image from "next/image";
import Link from "next/link";
import { FolderHero } from "@/components/folder-hero";

const reviewUrl = "/are-you-sorp-ready/review/?entry=intro";

function StartReview({ compact = false }: { compact?: boolean }) {
  return (
    <Link className={compact ? "sr-start sr-start-compact" : "sr-start"} href={reviewUrl}>
      Start Free Review <span aria-hidden="true">→</span>
    </Link>
  );
}

function AccountingIllustration() {
  return (
    <svg className="sr-accounting-illustration" viewBox="0 0 520 340" role="img" aria-label="Financial reports, a calculator and charts">
      <rect className="sr-illustration-shadow" x="32" y="42" width="262" height="236" rx="8" />
      <rect className="sr-illustration-paper" x="52" y="24" width="262" height="236" rx="8" />
      <path className="sr-illustration-line" d="M84 72h112M84 96h172" />
      <path className="sr-illustration-chart" d="M88 209v-42h34v42m18 0v-76h34v76m18 0v-58h34v58m18 0v-99h34v99" />
      <rect className="sr-illustration-calculator" x="286" y="112" width="184" height="204" rx="16" />
      <rect className="sr-illustration-screen" x="312" y="138" width="132" height="44" rx="5" />
      <g className="sr-illustration-keypad">
        <rect x="312" y="202" width="32" height="27" rx="4" /><rect x="356" y="202" width="32" height="27" rx="4" /><rect x="400" y="202" width="44" height="27" rx="4" />
        <rect x="312" y="241" width="32" height="27" rx="4" /><rect x="356" y="241" width="32" height="27" rx="4" /><rect x="400" y="241" width="44" height="66" rx="4" />
        <rect x="312" y="280" width="76" height="27" rx="4" />
      </g>
      <path className="sr-illustration-pencil" d="m232 298 164-164 23 23-164 164-34 11z" />
      <path className="sr-illustration-pencil-tip" d="m221 332 11-34 23 23z" />
    </svg>
  );
}

export function SorpReadyPage() {
  return (
    <>
      <main id="main" className="sr-story">
        <FolderHero product="sorp-ready" as="header" paper="#fbfaf7" className="sr-hero" id="top">
          <div className="sr-hero-copy">
            <p className="sr-eyebrow">A completely free SORP 2026 readiness review</p>
            <h1>Are You<br /><span>SORP Ready?</span></h1>
            <p className="sr-hero-lead">Find out how prepared your charity is for SORP 2026.</p>
          </div>
          <div className="sr-hero-intro">
            <p>Take our completely free readiness review. Get your score, identify what needs attention and discover what to do next.</p>
            <strong>100% free. No obligation.</strong>
            <div className="sr-hero-actions">
              <StartReview />
              <Link className="sr-play" href="/are-you-sorp-ready/presentation/">Play Presentation <span aria-hidden="true">▶</span></Link>
            </div>
          </div>
        </FolderHero>

        <section id="sr-audiences" className="sr-audiences" aria-labelledby="sr-audiences-title">
          <div className="sr-section-heading sr-section-heading-single">
            <h2 id="sr-audiences-title">Who is this for?</h2>
          </div>
          <div className="sr-audience-grid">
            <article>
              <h3>Charities</h3>
              <p>For trustees, charity leaders, finance teams and staff who want to understand their readiness and identify gaps.</p>
            </article>
            <article>
              <h3>Accountants &amp; Advisers</h3>
              <p>For professionals who want to assess their charity clients and help them prepare for SORP 2026.</p>
            </article>
          </div>
        </section>

        <section id="sr-benefits" className="sr-benefits" aria-labelledby="sr-benefits-title">
          <div className="sr-section-heading sr-section-heading-single">
            <h2 id="sr-benefits-title">What you’ll get</h2>
            <p className="sr-benefits-intro">Here’s what you’ll get for free.</p>
          </div>
          <ol>
            <li><span>01</span><h3>Your Historical Snapshot</h3><p>A review of your latest published Trustees’ Annual Report and accounts against SORP 2026.</p></li>
            <li><span>02</span><h3>Your Current Readiness</h3><p>Bring the assessment up to date with your answers, comments and current knowledge.</p></li>
            <li><span>03</span><h3>Your Personalised Report</h3><p>See your strengths, gaps and priorities in one clear report.</p></li>
          </ol>

          <section className="sr-after-review" aria-labelledby="sr-after-review-title">
            <header>
              <p className="sr-eyebrow">Optional next steps</p>
              <h2 id="sr-after-review-title">And when you’ve finished your free review?</h2>
              <p>Your results are just the beginning. If you’d like help taking things further, there are two ways forward.</p>
            </header>
            <div className="sr-support-routes">
              <article className="sr-support-route sr-support-marcus">
                <div className="sr-support-visual">
                  <Image src="/images/marcus-warry-msi.webp" alt="Marcus Warry" width={1122} height={1402} sizes="(max-width: 760px) 160px, 230px" />
                </div>
                <div className="sr-support-copy">
                  <p className="sr-support-label">Impact support</p>
                  <h3>Talk to us</h3>
                  <strong>Marcus Warry ACA — Co-founder, My Social Impact</strong>
                  <p>Want to understand, improve or communicate your charity’s impact? At the end of your free review, you’ll have the option to book a conversation with Marcus.</p>
                  <p>We can explore your results, a more detailed impact review, or practical ways we could help you take things further.</p>
                </div>
              </article>
              <article className="sr-support-route sr-support-accountant">
                <div className="sr-support-visual"><AccountingIllustration /></div>
                <div className="sr-support-copy">
                  <p className="sr-support-label">SORP and accounting support</p>
                  <h3>Talk to your accountant</h3>
                  <p>Your accountant can help you understand your SORP responsibilities, review your reporting and decide what needs to happen next.</p>
                  <p>Already have an accountant? Share your findings with them. Looking for specialist charity accounting advice? We can help you find one.</p>
                  <Link className="sr-accountant-link" href="/accountants-advisers/">Find an accountant <span aria-hidden="true">→</span></Link>
                </div>
              </article>
            </div>
          </section>
        </section>
      </main>

    </>
  );
}
