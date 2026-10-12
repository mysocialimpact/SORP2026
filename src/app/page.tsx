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
  title: "SORP 2026. Made simpler.",
  ...(site.live ? { alternates: { canonical: "/" } } : {}),
};
export default function Home() {
  return (
    <main id="main" className="gateway">
      <div className="gateway-home-cover">
      <div className="gateway-width">
        <section className="gateway-opening" aria-labelledby="gateway-title">
          <div className="gateway-intro">
            <p className="gateway-kicker">A new chapter in charity reporting</p>
            <h1 id="gateway-title">
              SORP 2026.
              <br />
              <span>Made simpler.</span>
            </h1>
          </div>
          <div className="gateway-intro-aside">
            <span className="gateway-enterprise-label">A social enterprise initiative</span>
            <p>
              Practical tools for charities, accountants and advisers navigating
              reporting requirements and creating greater impact.
            </p>
            <MsiBrand attribution="Developed by" />
            <p className="gateway-enterprise-note">
              Using technology to make professional-quality tools accessible—
              especially to smaller charities.
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
              Two practical products to help you understand what matters, see
              where you stand and move forward with confidence.
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
        </section>
        <section className="gateway-signature" aria-label="Our approach">
          <p>SORP is the requirement.</p>
          <h2>Better impact is the opportunity.</h2>
        </section>
        <section className="platform-family" aria-labelledby="platform-family-title">
          <header className="platform-family-head">
            <p className="gateway-kicker">Beyond SORP</p>
            <h2 id="platform-family-title">Four more ways to strengthen your impact.</h2>
            <p>Smaller, focused tools for the work that comes after compliance.</p>
          </header>
          <div className="platform-family-grid">
            {excellenceProducts.map(product => (
              <Link href={product.href} className={`platform-family-card ${product.className}`} key={product.slug}>
                <span className="platform-family-meta"><b>{product.number}</b>{product.status}</span>
                {product.slug === "social-impact-excellence" && <Image className="platform-family-logo is-excellence" src="/assets/social-impact-excellence-transparent.png" alt="Social Impact Excellence" width={1200} height={1200} />}
                {product.slug === "charity-impact-reports" && <Image className="platform-family-logo is-reports" src="/product/charity-impact-reports.png" alt="Charity Impact Reports" width={1787} height={887} />}
                {product.slug === "purpose-works" && <Image className="platform-family-logo is-purpose" src="/product/purpose-works-wordmark.png" alt="Purpose Works" width={1942} height={809} />}
                {product.slug === "my-impact-director" && <h3 className="platform-family-director">My <em>Impact</em><br/>Director</h3>}
                <div className="platform-family-card-copy">
                  <p>{product.short}</p>
                  <span>Explore <Arrow /></span>
                </div>
              </Link>
            ))}
          </div>
        </section>
        <section className="gateway-opening-vision gateway-home-vision" aria-labelledby="home-vision-title">
          <p className="gateway-kicker">Our social enterprise vision</p>
          <h2 id="home-vision-title">
            Imagine a world where nothing stood in the way of our potential
            to make a difference.
          </h2>
          <Link className="gateway-vision-link" href="/our-mission/">Our mission <Arrow diagonal /></Link>
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
