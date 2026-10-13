import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { MsiBrand } from "@/components/brand";
import { Arrow } from "@/components/ui";
import { ExperienceCloud } from "@/components/experience-cloud";
import { HomepageContribution } from "@/components/voluntary-contribution";
import { site } from "@/lib/site";
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
            <p className="gateway-kicker">SORP 2026 · An independent online platform</p>
            <h1 id="gateway-title">
              <span className="gateway-hero-context">SORP is the requirement.</span>
              <span className="gateway-hero-opportunity">Better impact is the opportunity.</span>
            </h1>
            <p className="homepage-hero-definition">
              Practical tools, guidance and expert support for <strong>charities,
              accountants and advisers.</strong> Navigate SORP 2026. Improve your social impact.
            </p>
          </div>
          <div className="gateway-intro-aside">
            <span className="gateway-enterprise-label">A UK-based social enterprise initiative</span>
            <p>
              We’re excited about SORP 2026 and better charity reporting. Even more so about
              what charities can achieve with the insight it brings.
            </p>
            <MsiBrand attribution="Developed by" />
            <p className="gateway-enterprise-note">
              Using technology to put valuable tools within reach of smaller
              charities. <strong>Free wherever possible.</strong>
            </p>
          </div>
        </section>
      </div>
      </div>
      <div className="gateway-width">
        <HomepageAudience />
        <section className="gateway-sorp-section" aria-labelledby="sorp-tools-title" id="products">
          <div className="homepage-start">
            <h2 id="sorp-tools-title">Are You SORP Ready?</h2>
            <div className="homepage-start-action">
              <p>Discover how prepared your charity is for impact and sustainability reporting under SORP 2026.</p>
              <Link className="gateway-action" href={site.readiness!}>
                Start your free review <Arrow />
              </Link>
            </div>
          </div>
          <p className="homepage-source">Independent tools, grounded in the requirements. <a href="https://www.charitysorp.org/">Read the official Charities SORP <Arrow diagonal /></a></p>
        </section>
        <section className="homepage-ambition" aria-labelledby="ambition-title">
          <p className="gateway-kicker">Our ambition</p>
          <h2 id="ambition-title">
            Greater impact.
            <span>Accessible to everyone.</span>
          </h2>
          <p>Useful tools, free wherever possible. Expert support when you need it.</p>
        </section>
        <section className="gateway-opening-vision gateway-home-vision homepage-vision" aria-labelledby="home-vision-title">
          <p className="gateway-kicker">Our social enterprise vision</p>
          <h2 id="home-vision-title">
            Imagine a world where social impact was taken as seriously as financial performance.
          </h2>
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
