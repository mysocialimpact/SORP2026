import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { MsiBrand } from "@/components/brand";
import { Arrow } from "@/components/ui";
import { ExperienceCloud } from "@/components/experience-cloud";
import { HomepageContribution } from "@/components/voluntary-contribution";
import { site } from "@/lib/site";
import { excellenceProducts } from "@/lib/products";
export const metadata: Metadata = {
  title: "SORP 2026. Made simpler.",
  ...(site.live ? { alternates: { canonical: "/" } } : {}),
};
export default function Home() {
  return (
    <main id="main" className="gateway">
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
            <p>
              Practical tools for charities, accountants and advisers navigating
              reporting requirements and creating greater impact.
            </p>
            <MsiBrand />
            <p className="gateway-enterprise-note">
              A social enterprise initiative using technology to make
              professional-quality tools accessible—especially to smaller
              charities. <Link href="/our-mission/">Our mission →</Link>
            </p>
          </div>
        </section>
        <section className="gateway-products" aria-label="SORP 2026 tools" id="products">
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
              <span className="gateway-status">Coming soon</span>
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
              Have a question about SORP 2026?
              <br />
              Ask SORP.
            </p>
            <Link className="gateway-line-link" href="/ask-sorp/">
              A first look <Arrow />
            </Link>
            <span className="gateway-product-scope">
              AI-supported guidance across the whole SORP.
              <br />
              Accounting, reporting, disclosures and impact.
            </span>
          </article>
        </section>
        <aside className="gateway-adviser-note" aria-label="Working with accountants and advisers">
          <strong>Already working with an accountant or adviser? Brilliant.</strong>
          <p>Our tools work alongside your existing advisers, not instead of them. We’re here when specialist impact and sustainability reporting support is useful.</p>
        </aside>
        <section className="platform-family" aria-labelledby="platform-family-title">
          <header className="platform-family-head">
            <p className="gateway-kicker">From compliance to excellence</p>
            <h2 id="platform-family-title">Reporting is the beginning.</h2>
            <p>Four ways to make impact clearer, stronger and part of everyday practice.</p>
          </header>
          <div className="platform-family-grid">
            {excellenceProducts.map(product => (
              <Link href={product.href} className={`platform-family-card ${product.className}`} key={product.slug}>
                <span className="platform-family-meta"><b>{product.number}</b>{product.status}</span>
                {product.slug === "social-impact-excellence" && <Image className="platform-family-logo is-excellence" src="/product/social-impact-excellence.svg" alt="Social Impact Excellence" width={1600} height={500} />}
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
      </div>
      <ExperienceCloud />
      <section
        className="gateway-vision"
        id="our-vision"
        aria-labelledby="vision-title"
      >
        <div className="gateway-width gateway-vision-statement">
          <p className="gateway-kicker">Our vision</p>
          <h2 id="vision-title">
            Imagine a world where nothing stood in the way of our potential to
            make a difference.
          </h2>
          <Link className="gateway-quiet-link" href="/our-mission/">
            Read our mission <Arrow diagonal />
          </Link>
        </div>
      </section>
      <div className="gateway-width">
        <section className="gateway-people" aria-labelledby="people-title">
          <div className="gateway-people-intro">
            <p className="gateway-kicker">People behind the tools</p>
            <h2 id="people-title">
              Expertise.
              <br />
              With a human face.
            </h2>
            <p>
              Developed by My Social Impact. Bringing charity reporting and
              real-world impact together.
            </p>
            <Link className="gateway-quiet-link" href="/contact/">
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
          </div>
        </section>
      </div>
      <HomepageContribution />
    </main>
  );
}
