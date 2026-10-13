import Link from "next/link";
import { FolderHero } from "@/components/folder-hero";
import SorpFilm from "./sorp-film/sorp-film";
import { sorpSource } from "./sorp-methodology-v1";

const reviewUrl = "/are-you-sorp-ready/review/?entry=intro";

function StartReview({ compact = false }: { compact?: boolean }) {
  return (
    <Link className={compact ? "sr-start sr-start-compact" : "sr-start"} href={reviewUrl}>
      Start Free Review <span aria-hidden="true">→</span>
    </Link>
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
              <a className="sr-play" href="#presentation">Play Presentation <span aria-hidden="true">▶</span></a>
            </div>
          </div>
        </FolderHero>

        <section id="sr-audiences" className="sr-audiences" aria-labelledby="sr-audiences-title">
          <div className="sr-section-heading">
            <p className="sr-eyebrow">Who is it for?</p>
            <h2 id="sr-audiences-title">For charities—and the people who help them.</h2>
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
          <div className="sr-section-heading">
            <p className="sr-eyebrow">What you’ll get</p>
            <h2 id="sr-benefits-title">A clear picture.<br />A practical way forward.</h2>
          </div>
          <ol>
            <li><span>01</span><h3>Your readiness score</h3><p>Understand how prepared you are.</p></li>
            <li><span>02</span><h3>Your gaps and priorities</h3><p>See what needs attention.</p></li>
            <li><span>03</span><h3>Your next steps</h3><p>Know where to focus, with optional expert human support.</p></li>
          </ol>
        </section>

        <section className="sr-presentation" id="presentation" aria-labelledby="sr-presentation-title">
          <div className="sr-presentation-intro">
            <div>
              <p className="sr-eyebrow">Want to know more?</p>
              <h2 id="sr-presentation-title">Watch our short presentation.</h2>
            </div>
            <div>
              <p>Find out how the review works, what it covers and how it can help your charity prepare.</p>
              <a className="sr-text-link" href="#presentation-player">Play Presentation <span aria-hidden="true">→</span></a>
            </div>
          </div>
          <div id="presentation-player" className="sr-presentation-player">
            <SorpFilm embedded startHref={reviewUrl} />
          </div>
        </section>

        <section id="sr-more" className="sr-more" aria-label="More information about the review">
          <details>
            <summary>More about the review <span aria-hidden="true">↓</span></summary>
            <div className="sr-more-content">
              <div>
                <h3>What it covers</h3>
                <p>The impact and sustainability reporting aspects of SORP 2026, focused on Module 1 of the Trustees’ Annual Report. It is not a full accounting compliance review, audit or regulatory certification.</p>
              </div>
              <div>
                <h3>How your score works</h3>
                <p>We combine evidence from your latest published report with your answers to focused questions. Published evidence and your current, self-reported position remain clearly distinguished.</p>
              </div>
              <div>
                <h3>What happens next</h3>
                <p>You receive a free personalised report showing strengths, gaps, priorities and practical next steps. There is no card, paywall or obligation.</p>
              </div>
              <div>
                <h3>Optional human support</h3>
                <p>If useful, you can choose to discuss your results with Marcus Warry ACA. Expert advice is entirely optional and always agreed through a human conversation.</p>
              </div>
              <p className="sr-more-links"><Link href={reviewUrl}>Read the full methodology in the review →</Link><a href={sorpSource} target="_blank" rel="noreferrer">Official SORP 2026 source ↗</a></p>
            </div>
          </details>
        </section>
      </main>

    </>
  );
}
