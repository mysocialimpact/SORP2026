import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { MsiBrand } from "@/components/brand";
import { Arrow } from "@/components/ui";
import { site } from "@/lib/site";
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
              the new charity reporting requirements.
            </p>
            <MsiBrand />
          </div>
        </section>
        <section className="gateway-products" aria-label="Our tools" id="tools">
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
        <section className="gateway-people" aria-labelledby="people-title">
          <div className="gateway-people-intro">
            <p className="gateway-kicker">People behind the tools</p>
            <h2 id="people-title">
              Expertise.
              <br />
              With a human face.
            </h2>
            <p>
              Built by My Social Impact. Bringing charity reporting and
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
                  Co-founder · Brand, Purpose
                  <br />& Ethical Marketing
                </p>
              </figcaption>
            </figure>
          </div>
        </section>
      </div>
      <section
        className="gateway-vision"
        id="beyond-compliance"
        aria-labelledby="vision-title"
      >
        <div className="gateway-width gateway-vision-inner">
          <div>
            <p className="gateway-kicker">Our ambition goes further</p>
            <h2 id="vision-title">
              Better reporting.
              <br />
              <span>Greater impact.</span>
            </h2>
          </div>
          <div>
            <p className="gateway-vision-lead">
              Imagine a world where every charity had the tools to understand,
              demonstrate and improve the difference it makes.
            </p>
            <p>
              That’s why we build practical tools. SORP readiness is a starting
              point. Greater social impact is the ambition.
            </p>
            <a className="gateway-quiet-link" href={site.platform!}>
              Explore Social Impact Excellence <Arrow diagonal />
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
