import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ToolLink } from "@/components/tool-link";
import { FolderHero } from "@/components/folder-hero";
import { Arrow } from "@/components/ui";
import { ExcellenceHome } from "@/features/excellence/excellence-home";
import { pillars, site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Social Impact Excellence | My Social Impact",
  description:
    "My Social Impact’s flagship five-pillar methodology for embedding social impact as a management discipline.",
  ...(site.live ? { alternates: { canonical: "/social-impact-excellence/" } } : {}),
};

const journey = [
  { number: "01", title: "Maturity Assessment", text: "Understand where your organisation stands." },
  { number: "02", title: "Diagnostic", text: "Identify strengths, gaps and opportunities." },
  { number: "03", title: "Blueprint", text: "Establish what excellence should look like." },
  { number: "04", title: "Roadmap", text: "Prioritise practical actions and continuous improvement." },
];

export default function ExcellencePage() {
  const publicPage = (
    <main id="main" className="gateway product-page product-excellence excellence-public">
      <FolderHero product="social-impact-excellence" id="excellence-overview" className="excellence-public-hero">
        <div className="gateway-width excellence-public-hero-grid">
          <div className="excellence-public-hero-copy">
            <a className="excellence-msi-brand" href={site.msi} aria-label="Visit My Social Impact">
              <Image src="/brand/my-social-impact.png" alt="My Social Impact" width={1088} height={124} priority sizes="(max-width: 700px) 250px, 360px" />
            </a>
            <p className="excellence-flagship">Our flagship methodology</p>
            <h1>Social Impact{" "}<br />Excellence</h1>
            <p className="excellence-public-principle">We believe social impact should be embedded as a management discipline.</p>
            <p className="excellence-public-lead">A practical framework helping charities understand, manage and continuously improve their social impact.</p>
          </div>
          <div className="excellence-public-mark" aria-label="Social Impact Excellence">
            <Image src="/assets/social-impact-excellence-transparent.png" alt="Social Impact Excellence" width={1200} height={1200} priority sizes="(max-width: 700px) 62vw, 390px" />
            <p>Five pillars.<br /><strong>One management framework.</strong></p>
          </div>
        </div>
      </FolderHero>

      <section className="excellence-public-pillars gateway-width" aria-labelledby="excellence-pillars-title">
        <header>
          <p className="gateway-kicker">The five pillars</p>
          <h2 id="excellence-pillars-title">Excellence is connected.</h2>
          <p>Each pillar strengthens the others. Together, they turn impact into a discipline the whole organisation can use.</p>
        </header>
        <ol tabIndex={0} aria-label="The five pillars of Social Impact Excellence; swipe or use arrow keys to explore">
          {pillars.map((pillar) => <li key={pillar.title}><span>{pillar.number}</span><h3>{pillar.title}</h3><p>{pillar.text}</p></li>)}
        </ol>
        <p className="excellence-pillar-swipe">Swipe to explore all five pillars →</p>
      </section>

      <section className="excellence-public-journey" aria-labelledby="excellence-journey-title">
        <div className="gateway-width">
          <header>
            <p className="gateway-kicker">The Social Impact Excellence journey</p>
            <h2 id="excellence-journey-title">From an honest baseline{" "}<br />to continuous improvement.</h2>
          </header>
          <ol>{journey.map((stage) => <li key={stage.title}><span>{stage.number}</span><div><h3>{stage.title}</h3><p>{stage.text}</p></div></li>)}</ol>
        </div>
      </section>

      <section className="excellence-public-bridge" aria-labelledby="excellence-bridge-title">
        <div className="gateway-width">
          <p className="gateway-kicker">The wider journey</p>
          <h2 id="excellence-bridge-title">Compliance first.{" "}<br /><span>Excellence next.</span></h2>
          <p>SORP 2026 establishes important reporting requirements. Social Impact Excellence helps organisations go further, embedding impact into how they are led, managed and improved.</p>
        </div>
      </section>

      <section id="excellence-start" className="excellence-public-access gateway-width" aria-labelledby="excellence-access-title">
        <div><p className="gateway-kicker">Your starting point on SORP2026.org</p><h2 id="excellence-access-title">Start with<br />your organisation.</h2></div>
        <div>
          <p>Create your SORP2026 account and begin your Social Impact Excellence baseline.</p>
          <ToolLink className="gateway-action" href="/social-impact-excellence/assessment/">Get started with Social Impact Excellence <Arrow /></ToolLink>
          <p className="excellence-access-note">The Social Impact Maturity Assessment is available inside your registered SORP2026 account.</p>
          <Link className="excellence-login-link" href="/login/?return=/social-impact-excellence/">Already registered? Log in <Arrow /></Link>
          <p><Link href="/sample-charity/#maturity">Explore a sample charity baseline →</Link></p>
          <p><Link href="/sample-charity/#request-demo">Request a free demo →</Link></p>
        </div>
      </section>

      <section className="excellence-public-credit gateway-width" aria-label="About My Social Impact">
        <p>Social Impact Excellence is the flagship methodology developed by My Social Impact.</p>
        <a href={site.msi}>Explore My Social Impact <Arrow diagonal /></a>
      </section>
    </main>
  );
  return <ExcellenceHome publicPage={publicPage} />;
}
