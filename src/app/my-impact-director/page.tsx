import type { Metadata } from "next";
import Link from "next/link";
import { Arrow } from "@/components/ui";
import { ProductAdviserNote } from "@/components/product-adviser-note";
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
        <p className="gateway-kicker">06 · Human-led service · Available now</p>
        <h1>Your charity’s Impact Director. <em>Without the full-time salary.</em></h1>
        <p className="product-lead">Flexible expert support to help your charity measure, manage and improve its impact throughout the year.</p>
        <a className="gateway-action" href="#director-support">Explore My Impact Director <Arrow /></a>
        <p className="product-hero-note">Human expertise now. Intelligent agents and tools are clearly labelled while in development.</p>
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
    <section id="director-support" className="product-three gateway-width" aria-label="How My Impact Director can help">
      {[
        ["01", "Direction", "Clarify the change you exist to create and what useful progress looks like."],
        ["02", "Practice", "Build impact into decisions, evidence, trustee conversations and delivery throughout the year."],
        ["03", "Momentum", "Regular human challenge and support, strengthened by intelligent tools where they genuinely help."],
      ].map(([number, title, copy]) => <article key={title}><span>{number}</span><h3>{title}</h3><p>{copy}</p></article>)}
    </section>
    <section className="product-split product-dark">
      <div className="gateway-width">
        <div><p className="gateway-kicker">An extension of your team</p><h2>Expert support.<br/>Responsibility stays with you.</h2></div>
        <div><p>The human-led service is available now, ranging from light-touch periodic reviews to more substantial ongoing involvement. Scope is agreed around the charity’s size, resources and needs.</p><p>Intelligent agents, assistants and tools are in development. We do not replace executive leadership or trustee responsibility; we help your people keep impact moving.</p><a href="mailto:marcus@mysocialimpact.org?subject=Explore%20My%20Impact%20Director">Discuss the right level of support <Arrow diagonal /></a></div>
      </div>
    </section>
    <ProductAdviserNote title="An impact specialist alongside your existing team.">My Impact Director complements trustees, finance teams, accountants and consultants. It adds flexible impact expertise while responsibility and established adviser relationships remain with the charity.</ProductAdviserNote>
    <nav className="product-next gateway-width" aria-label="Product navigation"><span>Back to the index</span><Link href="/#products">Explore all six products <Arrow /></Link></nav>
  </main>;
}

