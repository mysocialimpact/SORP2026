import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Arrow } from "@/components/ui";
import { ProductAdviserNote } from "@/components/product-adviser-note";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Purpose Works",
  description: "Purpose strategy, charity branding, behavioural-change campaigns and credible social impact communications.",
  ...(site.live ? { alternates: { canonical: "/purpose-works/" } } : {}),
};

export default function PurposeWorksPage() {
  return <main id="main" className="gateway product-page product-purpose">
    <section id="purpose-overview" className="product-hero gateway-width">
      <div className="product-hero-copy">
        <p className="gateway-kicker">05 · Advertising · marketing · creative strategy</p>
        <h1>Creative campaigns that <em>make a difference.</em></h1>
        <p className="product-lead">Purpose strategy, branding, advertising and digital marketing that help charities communicate effectively, influence behaviour and turn their mission into meaningful action.</p>
        <a className="gateway-action" href="#purpose-services">Explore Purpose Works <Arrow /></a>
        <p className="product-hero-note">Creative persuasion grounded in credible evidence and responsible claims.</p>
      </div>
      <div className="product-brand-panel is-purpose"><Image src="/product/purpose-works-wordmark.png" alt="Purpose Works" width={1942} height={809} priority /></div>
    </section>
    <section id="purpose-services" className="purpose-intersection gateway-width" aria-label="Purpose Works services">
      {[
        "Purpose & brand strategy", "Charity branding & positioning", "Advertising campaigns", "Direct & digital marketing",
        "Behavioural-change campaigns", "Community engagement", "Communications strategy", "Impact storytelling",
      ].map((item, index) => <span key={item}><b>{String(index + 1).padStart(2, "0")}</b>{item}</span>)}
    </section>
    <section id="purpose-expertise" className="product-split product-dark is-purpose">
      <div className="gateway-width"><div><p className="gateway-kicker">The expertise behind it</p><h2>Creative thinking.<br/>Social impact rigour.</h2></div><div><p>Dr Chris Arnold brings extensive experience in purpose, branding, behavioural-change campaigns, community engagement and social impact communications.</p><p>Work across the team includes ActionAid, Diageo, Traidcraft, Hackney Council and many charities and community organisations. These names describe collective experience, not endorsements.</p><a href="https://mysocialimpact.org/purpose-works">Explore the full Purpose Works story <Arrow diagonal /></a></div></div>
    </section>
    <section id="purpose-claims" className="product-statement gateway-width"><p className="gateway-kicker">Credible claims</p><h2>Say what the evidence allows.<br/>No stronger.</h2><p>Purpose Works connects naturally with the Purpose and Communications pillars of Social Impact Excellence and the Social Impact Claims Code—but remains a distinct creative and strategic service.</p><a className="gateway-quiet-link" href="https://mysocialimpact.org/social-impact-claims-code">Explore the Social Impact Claims Code <Arrow diagonal /></a></section>
    <section id="purpose-review" className="purpose-review gateway-width"><div><p className="gateway-kicker">An accessible place to start</p><h2>Communications review.</h2><strong>From £100</strong></div><div><p>Have your existing communications reviewed and identify practical improvements. More substantial branding, advertising and campaign work is scoped individually.</p><a className="gateway-action" href="mailto:marcus@mysocialimpact.org?subject=Purpose%20Works%20communications%20review">Enquire about a review <Arrow /></a></div></section>
    <ProductAdviserNote title="Bring the right specialists around the same table.">Purpose Works can collaborate with accountants, consultants, lawyers and other advisers already supporting a charity. Creative and behavioural expertise should strengthen that team, not displace it.</ProductAdviserNote>
    <nav className="product-next gateway-width" aria-label="Next product"><span>Next section</span><Link href="/my-impact-director/">My Impact Director <Arrow /></Link></nav>
  </main>;
}

