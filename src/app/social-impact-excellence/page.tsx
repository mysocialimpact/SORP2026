import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Arrow } from "@/components/ui";
import { pillars, site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Social Impact Excellence",
  description: "Assess and systematically improve how your charity understands, manages and delivers social impact.",
  ...(site.live ? { alternates: { canonical: "/social-impact-excellence/" } } : {}),
};

export default function ExcellencePage() {
  return <main id="main" className="gateway product-page product-excellence">
    <section className="product-hero gateway-width">
      <div className="product-hero-copy">
        <p className="gateway-kicker">04 · A practical management discipline</p>
        <h1>Make impact part of <em>how your charity works.</em></h1>
        <p className="product-lead">Assess where you are. Understand what needs attention. Build a stronger, more systematic approach to impact.</p>
        <Link className="gateway-action" href="/social-impact-excellence/assessment/">Start the 10–15 minute assessment <Arrow /></Link>
      </div>
      <div className="product-brand-panel is-excellence"><Image src="/product/social-impact-excellence.svg" alt="Social Impact Excellence" width={1600} height={500} priority /></div>
    </section>
    <section className="product-statement gateway-width"><p className="gateway-kicker">Five connected pillars</p><h2>One honest baseline.<br/>A better way forward.</h2><p>The genuine 25-question Social Impact Maturity Assessment now sits inside SORP2026, with its established scoring, detailed guidance and private results preserved.</p></section>
    <section className="excellence-pillars gateway-width" aria-label="The five pillars of Social Impact Excellence">
      {pillars.map(pillar => <article key={pillar.title}><span>{pillar.number}</span><h3>{pillar.title}</h3><p>{pillar.text}</p></article>)}
    </section>
    <section className="integration-note gateway-width">
      <div><p className="gateway-kicker">One platform account</p><h2>Start here.<br/>Return from your dashboard.</h2></div>
      <div><p>Your SORP2026 account saves this charity edition independently from your readiness review. The established broader Social Impact Excellence platform remains unchanged.</p><Link href="/social-impact-excellence/assessment/">Start or continue the assessment <Arrow /></Link><a href={site.platform!}>Visit the broader platform <Arrow diagonal /></a></div>
    </section>
    <nav className="product-next gateway-width" aria-label="Next product"><span>Also explore</span><Link href="/charity-impact-reports/">Charity Impact Reports <Arrow /></Link></nav>
  </main>;
}

