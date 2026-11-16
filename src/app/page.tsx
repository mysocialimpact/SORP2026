import type { Metadata } from "next";
import { FolderHero } from "@/components/folder-hero";
import { MsiBrand } from "@/components/brand";
import { Arrow } from "@/components/ui";
import { ExperienceCloud } from "@/components/experience-cloud";
import { HomepageContribution } from "@/components/voluntary-contribution";
import { site } from "@/lib/site";
import { HomepageAudience, HomepageReviewLink } from "@/components/homepage-welcome";
import { HomepagePricing } from "@/components/homepage-pricing";
import { HomepageManifesto } from "@/components/homepage-manifesto";
import { BetaToolAction } from "@/components/beta-tool-entry";
import "./homepage.css";
export const metadata: Metadata = {
  title: "SORP 2026 — Reporting for greater impact",
  description: "Free tools and affordable expertise to help charities navigate SORP 2026 and achieve greater impact.",
  openGraph: {
    type: "website",
    locale: "en_GB",
    url: "/",
    siteName: "SORP 2026",
    title: "SORP 2026 — Reporting for greater impact",
    description: "Free tools and affordable expertise to help charities navigate SORP 2026 and achieve greater impact.",
    images: [{
      url: "https://sorp2026.org/social-share-sorp2026-v2.png",
      width: 1200,
      height: 630,
      alt: "SORP 2026. Reporting for greater impact. Free tools and affordable expertise for charities.",
    }],
  },
  twitter: {
    card: "summary_large_image",
    title: "SORP 2026 — Reporting for greater impact",
    description: "Free tools and affordable expertise to help charities navigate SORP 2026 and achieve greater impact.",
    images: ["https://sorp2026.org/social-share-sorp2026-v2.png"],
  },
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
              Helping charities get ready for SORP 2026 — and demonstrate the difference they make.
            </p>
            <p className="homepage-beta-note"><strong>Our public beta is now open.</strong> Create a free account to explore our available tools for one charity, save your progress and return whenever you like. No payment or credit card required.</p>
            <div className="homepage-beta-actions"><BetaToolAction href="/are-you-sorp-ready/review/" label="Open Assessment" readiness/><a href="#products">Explore the Platform ↓</a></div>
          </div>
          <div className="gateway-intro-aside">
            <p className="homepage-editorial">SORP is the requirement.<br /><strong>Better impact is the opportunity.</strong></p>
            <MsiBrand attribution="Developed by" />
            <p className="homepage-msi-strapline">Strategy for Social Impact Excellence</p>
          </div>
        </section>
      </div>
      </FolderHero>
      <div className="gateway-width">
        <p className="homepage-sorp-enthusiasm">
          We’re excited about SORP 2026 and better charity reporting. <strong>Even more excited about using technology to help smaller charities make a greater impact.</strong>
        </p>
        <HomepageAudience />
        <HomepageManifesto />
        <section className="gateway-sorp-section" aria-labelledby="sorp-tools-title" id="products">
          <p className="gateway-kicker">Your first step in the live journey.</p>
          <div className="homepage-start">
            <h2 id="sorp-tools-title">Are You SORP Ready?</h2>
            <div className="homepage-start-action">
              <p>A free assessment of your charity’s impact and sustainability reporting readiness.</p>
              <HomepageReviewLink />
            </div>
          </div>
          <ul className="homepage-beta-tools" aria-label="Explore the available beta tools">
            <li><a href="/ask-sorp/"><strong>Ask SORP →</strong><span>Practical guidance. Three free questions.</span></a></li>
            <li><a href="/charity-impact-reports/"><strong>Charity Impact Reports →</strong><span>One report, two free review perspectives.</span></a></li>
            <li><a href="/social-impact-excellence/"><strong>Social Impact Excellence →</strong><span>A baseline across five impact pillars.</span></a></li>
            <li><a href="/my-impact-director/"><strong>My Impact Director →</strong><span>Free AI readiness assessment; expert support by arrangement.</span></a></li>
          </ul>
          <p className="homepage-source">Independent tools, grounded in the requirements. <a href="https://www.charitysorp.org/" target="_blank" rel="noopener noreferrer">Read the official Charities SORP <Arrow diagonal /></a></p>
        </section>
      </div>
      <ExperienceCloud />
      <HomepageContribution />
      <HomepagePricing />
    </main>
  );
}
