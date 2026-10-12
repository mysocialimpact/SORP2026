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
      <div className="product-brand-panel is-excellence"><Image src="/assets/social-impact-excellence-transparent.png" alt="Social Impact Excellence" width={1200} height={1200} priority /></div>
    </section>
    <section className="product-statement gateway-width"><p className="gateway-kicker">Five connected pillars</p><h2>One honest baseline.<br/>A better way forward.</h2><p>The established Social Impact Maturity Assessment, private results and the complete existing Purpose pathway now sit inside SORP2026. Other deeper pillar pathways remain clearly marked until the original product releases them.</p></section>
    <section className="excellence-programmes gateway-width" aria-labelledby="excellence-programmes-title">
      <div><p className="gateway-kicker">Choose how deeply to explore</p><h2 id="excellence-programmes-title">Three programmes.<br/>One Excellence journey.</h2><p>These are Social Impact Excellence programmes—not extra SORP2026 memberships. Your platform account remains free.</p></div>
      <article><span>01 · Free</span><h3>Snapshot</h3><p>One person completes the 25-question maturity assessment and receives a private five-pillar baseline.</p><strong>1 person · 10–15 minutes</strong><Link href="/social-impact-excellence/assessment/">Start your free Snapshot <Arrow /></Link></article>
      <article className="is-team"><span>02 · Fixed-price programme</span><h3>Team Perspective</h3><p>Invite colleagues, track completion and reveal a protected organisation-wide view once at least three people respond.</p><strong>Up to 15 people · self-service</strong><Link href="/social-impact-excellence/team/">Open Team Perspective <Arrow /></Link></article>
      <article><span>03 · Human-led programme</span><h3>Excellence Programme</h3><p>Turn the evidence into structured improvement with expert challenge, deeper pillar work and review checkpoints.</p><strong>Tailored scope · MSI support</strong><a href="mailto:marcus@mysocialimpact.org?subject=Social%20Impact%20Excellence%20Programme">Discuss the Excellence Programme <Arrow diagonal /></a></article>
    </section>
    <section className="excellence-pillars gateway-width" aria-label="The five pillars of Social Impact Excellence">
      {pillars.map(pillar => <article key={pillar.title}><span>{pillar.number}</span><h3>{pillar.title}</h3><p>{pillar.text}</p></article>)}
    </section>
    <section className="integration-note gateway-width">
      <div><p className="gateway-kicker">One platform account</p><h2>Start here.<br/>Continue the full journey.</h2></div>
      <div><p>Your SORP2026 account saves the maturity assessment, Purpose diagnostic and supporting evidence independently from your readiness review. The original Social Impact Excellence platform remains unchanged.</p><Link href="/social-impact-excellence/assessment/">Start or continue the assessment <Arrow /></Link><Link href="/social-impact-excellence/journey/">Open your Excellence journey <Arrow /></Link><a href={site.platform!}>Visit the original platform <Arrow diagonal /></a></div>
    </section>
    <nav className="product-next gateway-width" aria-label="Next product"><span>Next section</span><Link href="/purpose-works/">Purpose Works <Arrow /></Link></nav>
  </main>;
}

