import type { Metadata } from "next";
import { FolderHero } from "@/components/folder-hero";
import Link from "next/link";
import Image from "next/image";
import { MsiBrand } from "@/components/brand";
import { Arrow } from "@/components/ui";
import { ExperienceCloud } from "@/components/experience-cloud";
import { HomepageContribution } from "@/components/voluntary-contribution";
import { site } from "@/lib/site";
import { HomepageAudience } from "@/components/homepage-welcome";
import { HomepagePricing } from "@/components/homepage-pricing";
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
      <FolderHero product="home" as="div" className="gateway-home-cover">
      <div className="gateway-width">
        <section className="gateway-opening" id="home-overview" aria-labelledby="gateway-title">
          <div className="gateway-intro">
            <p className="gateway-kicker">SORP 2026 · An independent online platform</p>
            <h1 id="gateway-title">
              Free tools. Affordable expertise.<br /><span>For greater charity impact.</span>
            </h1>
            <p className="homepage-hero-definition">
              We’re a UK-based social enterprise initiative helping charities and their advisers
              navigate SORP 2026 — and achieve greater impact.
            </p>
          </div>
          <div className="gateway-intro-aside">
            <p className="homepage-editorial">SORP is the requirement.<br /><strong>Better impact is the opportunity.</strong></p>
            <MsiBrand attribution="Developed by" />
          </div>
        </section>
      </div>
      </FolderHero>
      <div className="gateway-width">
        <p className="homepage-sorp-enthusiasm">
          We’re excited about SORP 2026 and better charity reporting. <strong>Even more so about what charities can achieve with the insight it brings.</strong>
        </p>
        <HomepageAudience />
        <section className="homepage-ambition" aria-labelledby="ambition-title">
          <p className="gateway-kicker">Our ambition</p>
          <h2 id="ambition-title">Greater impact.<span>Accessible to everyone.</span></h2>
        </section>
        <section className="gateway-opening-vision gateway-home-vision homepage-vision" aria-labelledby="home-vision-title">
          <div className="homepage-vision-copy">
            <p className="gateway-kicker">Our vision</p>
            <h2 id="home-vision-title">Imagine a world where social impact was taken as seriously as financial performance.</h2>
          </div>
          <figure className="homepage-vision-founders">
            <div className="homepage-vision-portraits">
              <div className="homepage-vision-person">
                <Image src="/images/marcus-vision.webp" alt="Marcus Warry" width={600} height={803} sizes="(max-width: 700px) 40vw, 190px" />
                <strong>Marcus Warry <small>ACA</small></strong>
              </div>
              <div className="homepage-vision-person">
                <Image src="/images/chris-vision.webp" alt="Dr Chris Arnold" width={600} height={534} sizes="(max-width: 700px) 40vw, 190px" />
                <strong>Dr Chris Arnold</strong>
              </div>
            </div>
            <figcaption>Co-founders, My Social Impact</figcaption>
          </figure>
        </section>
        <section className="gateway-sorp-section" aria-labelledby="sorp-tools-title" id="products">
          <p className="gateway-kicker">This is where most people start.</p>
          <div className="homepage-start">
            <h2 id="sorp-tools-title">Are You SORP Ready?</h2>
            <div className="homepage-start-action">
              <p>A free assessment of your charity’s impact and sustainability reporting readiness.</p>
              <Link className="gateway-action" href={site.readiness!}>
                Start your free review <Arrow />
              </Link>
            </div>
          </div>
          <p className="homepage-source">Independent tools, grounded in the requirements. <a href="https://www.charitysorp.org/" target="_blank" rel="noopener noreferrer">Read the official Charities SORP <Arrow diagonal /></a></p>
        </section>
      </div>
      <ExperienceCloud />
      <div className="gateway-width">
        <section className="gateway-people" id="home-team" aria-labelledby="people-title">
          <div className="gateway-people-intro">
            <h2 id="people-title">Our team</h2>
            <p>
              Developed by My Social Impact, combining financial rigour,
              monitoring and evaluation, technology, practical charity
              experience and creative thinking.
            </p>
          </div>
          <div className="gateway-portraits" role="region" aria-label="Our team portraits" tabIndex={0}>
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
      <HomepagePricing />
    </main>
  );
}
