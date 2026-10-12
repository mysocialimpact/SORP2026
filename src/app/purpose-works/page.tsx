import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Arrow } from "@/components/ui";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Purpose Works",
  description: "Purpose strategy, charity branding, behavioural-change campaigns and credible social impact communications.",
  ...(site.live ? { alternates: { canonical: "/purpose-works/" } } : {}),
};

export default function PurposeWorksPage() {
  return <main id="main" className="gateway product-page product-purpose">
    <section className="product-hero gateway-width">
      <div className="product-hero-copy">
        <p className="gateway-kicker">05 · Purpose · action · trust</p>
        <h1>Purpose isn’t what you say.<br/><em>It’s what you make happen.</em></h1>
        <p className="product-lead">Helping charities articulate, activate and communicate purpose with creativity—and with evidence.</p>
        <a className="gateway-action" href="mailto:marcus@mysocialimpact.org?subject=Purpose%20Works%20introductory%20discussion">Start a conversation <Arrow /></a>
      </div>
      <div className="product-brand-panel is-purpose"><Image src="/product/purpose-works-wordmark.png" alt="Purpose Works" width={1942} height={809} priority /></div>
    </section>
    <section className="purpose-intersection gateway-width" aria-label="Purpose Works areas">
      {[
        "Purpose strategy", "Charity branding", "Behavioural change", "Creative communications",
        "Impact storytelling", "Community engagement", "Stakeholder involvement", "Organisational strategy",
      ].map((item, index) => <span key={item}><b>{String(index + 1).padStart(2, "0")}</b>{item}</span>)}
    </section>
    <section className="product-split product-dark is-purpose">
      <div className="gateway-width"><div><p className="gateway-kicker">The expertise behind it</p><h2>Creative thinking.<br/>Social impact rigour.</h2></div><div><p>Dr Chris Arnold brings extensive experience in purpose, branding, behavioural-change campaigns, community engagement and social impact communications.</p><p>Work across the team includes ActionAid, Diageo, Traidcraft, Hackney Council and many charities and community organisations. These names describe collective experience, not endorsements.</p><a href="https://mysocialimpact.org/purpose-works">Explore the full Purpose Works story <Arrow diagonal /></a></div></div>
    </section>
    <section className="product-statement gateway-width"><p className="gateway-kicker">Credible claims</p><h2>Say what the evidence allows.<br/>No stronger.</h2><p>Purpose Works connects naturally with the Purpose and Communications pillars of Social Impact Excellence and the Social Impact Claims Code—but remains a distinct creative and strategic service.</p><a className="gateway-quiet-link" href="https://mysocialimpact.org/social-impact-claims-code">Explore the Social Impact Claims Code <Arrow diagonal /></a></section>
    <nav className="product-next gateway-width" aria-label="Next product"><span>Next section</span><Link href="/my-impact-director/">My Impact Director <Arrow /></Link></nav>
  </main>;
}

