import type { Metadata } from "next";
import Link from "next/link";
import { Arrow } from "@/components/ui";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "My Impact Director",
  description: "Ongoing senior impact expertise for charities, combining experienced human support with intelligent tools.",
  ...(site.live ? { alternates: { canonical: "/my-impact-director/" } } : {}),
};

export default function MyImpactDirectorPage() {
  return <main id="main" className="gateway product-page product-director">
    <section className="product-hero gateway-width">
      <div className="product-hero-copy">
        <p className="gateway-kicker">06 · Ongoing impact support</p>
        <h1>Imagine having your own <em>Impact Director.</em></h1>
        <p className="product-lead">Senior impact expertise, ongoing support and useful tools—without needing a full-time appointment.</p>
        <a className="gateway-action" href="mailto:marcus@mysocialimpact.org?subject=My%20Impact%20Director%20enquiry">Talk to My Social Impact <Arrow /></a>
      </div>
      <div className="director-lockup" aria-label="My Impact Director">
        <span>MY</span><strong>Impact</strong><b>DIRECTOR</b><i>Human expertise × intelligent tools</i>
      </div>
    </section>
    <section className="product-statement gateway-width">
      <p className="gateway-kicker">The role</p>
      <h2>Someone who keeps impact moving.</h2>
      <p>An Impact Director helps connect purpose, leadership, evidence, delivery and communications. For many smaller charities, that senior capability matters—but a permanent specialist role may not be realistic.</p>
    </section>
    <section className="product-three gateway-width" aria-label="How My Impact Director can help">
      {[
        ["01", "Direction", "Clarify the change you exist to create and what useful progress looks like."],
        ["02", "Practice", "Build impact into decisions, evidence, trustee conversations and delivery throughout the year."],
        ["03", "Momentum", "Regular human challenge and support, strengthened by intelligent tools where they genuinely help."],
      ].map(([number, title, copy]) => <article key={title}><span>{number}</span><h3>{title}</h3><p>{copy}</p></article>)}
    </section>
    <section className="product-split product-dark">
      <div className="gateway-width">
        <div><p className="gateway-kicker">An extension of your team</p><h2>Expert support.<br/>Responsibility stays with you.</h2></div>
        <div><p>My Impact Director is an honest service proposition in development: flexible senior expertise combining My Social Impact’s human judgement with practical digital tools.</p><p>We do not replace executive leadership or trustee responsibility. We help your people make impact a stronger part of how the charity is run.</p><a href="mailto:marcus@mysocialimpact.org?subject=Explore%20My%20Impact%20Director">Explore the service <Arrow diagonal /></a></div>
      </div>
    </section>
    <nav className="product-next gateway-width" aria-label="Product navigation"><span>Back to the index</span><Link href="/#products">Explore all six products <Arrow /></Link></nav>
  </main>;
}

