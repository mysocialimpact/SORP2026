import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { MsiBrand } from "@/components/brand";
import { Arrow } from "@/components/ui";
import { ExperienceCloud } from "@/components/experience-cloud";
import { HomepageContribution } from "@/components/voluntary-contribution";
import { site } from "@/lib/site";
import { excellenceProducts } from "@/lib/products";
import { HomepageAudience, HomepageHello } from "@/components/homepage-welcome";
import "./homepage.css";
export const metadata: Metadata = {
  title: "SORP 2026 — Reporting for greater impact",
  description: "Explore SORP 2026 charity reporting tools for charities, trustees, accountants and advisers. A My Social Impact social enterprise initiative: free tools, stronger evidence and support for greater impact.",
  openGraph: { title: "SORP 2026 — Reporting for greater impact", description: "SORP is the requirement. Better impact is the opportunity. Practical tools and human expertise from My Social Impact." },
  ...(site.live ? { alternates: { canonical: "/" } } : {}),
};
export default function Home() {
  return (
    <main id="main" className="gateway homepage-story">
      <div className="gateway-home-cover">
      <div className="gateway-width">
        <section className="gateway-opening" aria-labelledby="gateway-title">
          <div className="gateway-intro">
            <p className="gateway-kicker">SORP 2026 · A new chapter in charity reporting</p>
            <h1 id="gateway-title">
              <span className="gateway-hero-context">SORP is the requirement.</span>
              <span className="gateway-hero-opportunity">Better impact is the opportunity.</span>
            </h1>
          </div>
          <div className="gateway-intro-aside">
            <span className="gateway-enterprise-label">A social enterprise initiative</span>
            <p>
              We’re excited about SORP 2026 and better charity reporting. Even more so about
              what charities can achieve with the insight it brings.
            </p>
            <MsiBrand attribution="Developed by" />
            <p className="gateway-enterprise-note">
              Specialist knowledge. Useful technology. Within reach of smaller charities.
            </p>
          </div>
        </section>
      </div>
      </div>
      <div className="gateway-width">
        <HomepageAudience />
        <section className="gateway-sorp-section" aria-labelledby="sorp-tools-title" id="products">
          <header className="gateway-section-head gateway-sorp-head">
            <p className="gateway-kicker">Your SORP 2026 toolkit</p>
            <h2 id="sorp-tools-title">Start here. Get SORP ready.</h2>
            <p>
              Understand the requirements. Find your starting point.
            </p>
          </header>
          <div className="gateway-products">
            <article className="gateway-ready">
            <div className="gateway-product-top">
              <span className="gateway-status">
                <i />
                Live beta · Available now
              </span>
              <span className="gateway-product-number" aria-hidden="true">
                01
              </span>
            </div>
            <h2>
              Are You
              <br />
              SORP Ready<span>?</span>
            </h2>
            <p>
              Discover how ready your charity is for
              <br className="gateway-desktop-break" /> impact and sustainability
              reporting.
            </p>
            <div className="gateway-product-actions">
              <Link className="gateway-action" href={site.readiness!}>
                Start your free review <Arrow />
              </Link>
              <Link className="gateway-quiet-link" href="/are-you-sorp-ready/">
                Meet the tool <Arrow diagonal />
              </Link>
            </div>
            <span className="gateway-product-scope">
              Impact, sustainability & narrative reporting.
              <br />
              Not a full financial accounting compliance assessment.
            </span>
            </article>
            <article className="gateway-ask">
            <div className="gateway-product-top">
              <span className="gateway-status">
                <i />
                Live beta · Available now
              </span>
              <span className="gateway-product-number" aria-hidden="true">
                02
              </span>
            </div>
            <div className="gateway-ask-heading">
              <h2>
                Ask
                <br />
                SORP<span>.</span>
              </h2>
              <span className="gateway-question" aria-hidden="true">
                ?
              </span>
            </div>
            <p>
              SORP questions? Just ask. Get evidence-led answers grounded in
              the official SORP.
            </p>
            <Link className="gateway-line-link" href="/ask-sorp/">
              Ask SORP now <Arrow />
            </Link>
            <span className="gateway-product-scope">
              AI-supported guidance across the whole SORP.
              <br />
              Accounting, reporting, disclosures and impact.
            </span>
            </article>
          </div>
          <aside className="gateway-adviser-note" aria-labelledby="adviser-note-title">
            <p className="gateway-kicker">For accountants and advisers</p>
            <div>
              <strong id="adviser-note-title">Already working with an accountant or adviser? Brilliant.</strong>
              <p>
                These SORP tools give charities and their advisers a clearer
                shared starting point. They support the relationship—they do
                not replace professional judgement.
              </p>
            </div>
            <Link className="gateway-quiet-link" href="/for-advisers/">
              See how we work together <Arrow diagonal />
            </Link>
          </aside>
          <p className="homepage-source">Independent tools, grounded in the requirements. <a href="https://www.charitysorp.org/">Read the official Charities SORP <Arrow diagonal /></a></p>
        </section>
        <section className="homepage-impact" aria-labelledby="impact-story-title">
          <div className="homepage-impact-heading">
            <h2 id="impact-story-title">Too useful to leave<br /><em>in a filing cabinet.</em></h2>
            <p>A report captures a year. Its insight can shape what happens next.</p>
          </div>
          <ol className="homepage-impact-sheets">
            <li><span className="homepage-sheet-tab" aria-hidden="true">01</span><span className="homepage-evidence-lines" aria-hidden="true"><i /><i /><i /><i /></span><h3>Better evidence.</h3><p>Understand what’s working.<br />And what needs to change.</p></li>
            <li><span className="homepage-sheet-tab" aria-hidden="true">02</span><span className="homepage-decision" aria-hidden="true"><svg viewBox="0 0 72 62" fill="none"><path d="M8 54 56 6M20 6h36v36" stroke="currentColor" strokeWidth="3" /></svg></span><h3>Better decisions.</h3><p>Put that knowledge to work.<br />Choose where to focus next.</p></li>
            <li><span className="homepage-sheet-tab" aria-hidden="true">03</span><span className="homepage-impact-bars" aria-hidden="true"><i /><i /><i /></span><h3>Greater impact.</h3><p>Learn, improve and show the difference<br />to funders and supporters.</p></li>
          </ol>
        </section>
        <section className="platform-family homepage-family" aria-labelledby="platform-family-title">
          <header className="platform-family-head">
            <h2 id="platform-family-title">From Compliance<br /><em>to Excellence.</em></h2>
            <p>Take the next step with our wider family of tools and human expertise.</p>
          </header>
          <div className="platform-family-grid">
            {excellenceProducts.map(product => (
              <Link href={product.href} className={`homepage-product-index ${product.className}`} key={product.slug}>
                <span className="homepage-product-index-number" aria-hidden="true">{product.number}</span>
                <span><strong>{product.name}</strong><small>{product.status}</small></span><Arrow diagonal />
              </Link>
            ))}
          </div>
        </section>
        <section className="homepage-access" aria-labelledby="access-title">
          <div className="homepage-access-copy">
            <h2 id="access-title">Big possibilities.<br /><em>Smaller barriers.</em></h2>
            <p>Smaller charities deserve powerful tools, too. We bring technology and specialist expertise together to put them within reach.</p>
            <p className="homepage-access-promise">Free wherever possible.<br />Affordable expert support where needed.</p>
            <Link className="gateway-quiet-link" href="/our-mission/">The mission behind My Social Impact <Arrow diagonal /></Link>
          </div>
        <div className="gateway-opening-vision gateway-home-vision" aria-labelledby="home-vision-title">
          <p className="gateway-kicker">Our social enterprise vision</p>
          <h2 id="home-vision-title">
            Imagine a world where nothing stood in the way of our potential
            to make a difference.
          </h2>
        </div>
        </section>
      </div>
      <ExperienceCloud />
      <div className="gateway-width">
        <section className="gateway-people" aria-labelledby="people-title">
          <div className="gateway-people-intro">
            <p className="gateway-kicker">Charity reporting meets social impact</p>
            <h2 id="people-title">The people behind the tools.</h2>
            <p>
              Developed by My Social Impact—combining financial rigour,
              monitoring and evaluation, technology, practical charity
              experience and creative thinking.
            </p>
            <Link className="gateway-quiet-link" href="#say-hello">
              Say hello <Arrow diagonal />
            </Link>
          </div>
          <div className="gateway-portraits">
            <figure>
              <Image
                src="/images/marcus-warry.webp"
                alt="Marcus Warry"
                width={480}
                height={520}
                sizes="(max-width: 700px) 44vw, 240px"
              />
              <figcaption>
                <h3>
                  Marcus Warry <span>ACA</span>
                </h3>
                <p>
                  Chartered Accountant
                  <br />& social impact consultant
                </p>
              </figcaption>
            </figure>
            <figure>
              <Image
                src="/images/chris-arnold.webp"
                alt="Dr Chris Arnold"
                width={480}
                height={520}
                sizes="(max-width: 700px) 44vw, 240px"
              />
              <figcaption>
                <h3>Dr Chris Arnold</h3>
                <p>
                  Social impact strategist
                  <br />& creative campaign specialist
                </p>
              </figcaption>
            </figure>
            <figure>
              <Image
                src="/images/gareth-murphy.webp"
                alt="Gareth Murphy"
                width={1123}
                height={1401}
                sizes="(max-width: 700px) 44vw, 240px"
              />
              <figcaption>
                <h3>Gareth Murphy</h3>
                <p>
                  Data, systems
                  <br />& technology
                </p>
              </figcaption>
            </figure>
            <figure>
              <Image
                src="/images/nicholas-demeter.webp"
                alt="Nicholas Demeter"
                width={1023}
                height={1537}
                sizes="(max-width: 700px) 44vw, 240px"
              />
              <figcaption>
                <h3>Nicholas Demeter</h3>
                <p>
                  Monitoring &amp; evaluation
                  <br />USAID &amp; international development
                </p>
              </figcaption>
            </figure>
          </div>
        </section>
      </div>
      <HomepageContribution />
      <HomepageHello />
    </main>
  );
}
